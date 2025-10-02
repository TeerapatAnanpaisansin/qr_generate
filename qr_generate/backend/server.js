// backend/server.js

import express from "express";
import "dotenv/config";
import cors from "cors"; 
import helmet from "helmet";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { nanoid } from "nanoid";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { 
  gristInsert, 
  gristQuery, 
  gristUpdateById, 
  gristDeleteById, 
  gristGetById,
} from "./grist.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "./dist");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("tiny"));

const USERS = process.env.USERS_TABLE;
const LINKS = process.env.LINKS_TABLE;

// Load admin emails once
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

console.log('Admin emails:', ADMIN_EMAILS);

// ----------- HELPER FUNCTIONS -----------
function resolveUserId(val) {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const m = val.match(/\[(\d+)\]$/);
    if (m) return Number(m[1]);
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  }
  if (Array.isArray(val)) {
    const last = val[val.length - 1];
    const n = Number(last);
    return Number.isNaN(n) ? null : n;
  }
  if (typeof val === "object" && "id" in val) {
    const n = Number(val.id);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    // Decode the JWT to get the user ID
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[Auth] JWT payload:', { id: payload.id, user_name: payload.user_name });
    
    // Fetch fresh user data from Grist
    const rec = await gristGetById(USERS, payload.id);
    if (!rec) return res.status(401).json({ error: "User not found" });

    const email = (rec.fields.user_email || "").toLowerCase();
    const dbRole = rec.fields.role || "user";
    
    if (Number(rec.id) !== Number(payload.id)) {
      console.warn("[Auth] Mismatched user! token.id =", payload.id, "but Grist returned id =", rec.id);
    }
    
    const role = (dbRole === 'admin' || ADMIN_EMAILS.includes(email)) ? 'admin' : 'user';

    req.user = {
      id: rec.id,
      user_name: rec.fields.user_name,
      user_email: rec.fields.user_email,
      role,
    };

    console.log('[Auth] Authenticated user:', req.user.id, req.user.user_name, 'Role:', req.user.role);
    next();
  } catch (e) {
    console.error("Auth error:", e.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ----------- INPUT SCHEMAS -----------
const registerSchema = z.object({
  user_name: z.string().min(3),
  user_email: z.string().email(),
  user_password: z.string().min(6),
});

const loginSchema = z.object({
  user_name_or_email: z.string().min(3),
  user_password: z.string().min(6),
});

const createLinkSchema = z.object({
  real_url: z.string().url(),
  code: z.string().min(4).max(32).optional(),
});

// ----------- ROUTES -----------
app.get("/", (_req, res) => {
  res.send("QR API is running.");
});

// ----------- AUTH ROUTES -----------
app.post("/auth/register", async (req, res) => {
  try {
    const { user_name, user_email, user_password } = registerSchema.parse(req.body);

    const [byName, byEmail] = await Promise.all([
      gristQuery(USERS, { user_name }),
      gristQuery(USERS, { user_email }),
    ]);
    if (byName.length) return res.status(409).json({ error: "user_name already exists" });
    if (byEmail.length) return res.status(409).json({ error: "user_email already exists" });

    const hash = await bcrypt.hash(user_password, 10);
    const now = new Date().toISOString();
    const role = ADMIN_EMAILS.includes(user_email.toLowerCase()) ? 'admin' : 'user';

    const rec = await gristInsert(USERS, {
      user_name,
      user_email,
      password_hash: hash,
      created_date: now,
      login_date: now,
      role,
    });

    const token = signToken({ id: rec.id, user_name, user_email, role });
    
    console.log('[Register] Created user:', rec.id, user_name, 'Role:', role);
    
    res.status(201).json({ 
      token, 
      user: { id: rec.id, user_name, user_email, role, created_date: now }
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { user_name_or_email, user_password } = loginSchema.parse(req.body);
    
    console.log('\n=== LOGIN ATTEMPT ===');
    console.log('Input:', user_name_or_email);

    // Try username first, then email
    let userRecords = await gristQuery(USERS, { user_name: user_name_or_email });
    
    if (userRecords.length === 0) {
      userRecords = await gristQuery(USERS, { user_email: user_name_or_email });
    }
    
    const rec = userRecords[0];
    if (!rec) {
      console.log('No user found');
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(user_password, rec.fields.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // Compute role correctly
    const email = (rec.fields.user_email || "").toLowerCase();
    const dbRole = rec.fields.role || "user";
    const role = (dbRole === 'admin' || ADMIN_EMAILS.includes(email)) ? 'admin' : 'user';

    // Update login date
    const now = new Date().toISOString();
    await gristUpdateById(USERS, rec.id, { login_date: now });

    // Create fresh JWT with correct user ID
    const token = signToken({
      id: rec.id,
      user_name: rec.fields.user_name,
      user_email: rec.fields.user_email,
      role,
    });
    
    console.log('[Login] Success - User ID:', rec.id, 'Name:', rec.fields.user_name, 'Role:', role);
    console.log('[Login] Generated token for ID:', rec.id);
    
    res.json({
      token,
      user: {
        id: rec.id,
        user_name: rec.fields.user_name,
        user_email: rec.fields.user_email,
        role,
        created_date: rec.fields.created_date,
        login_date: now,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error('Login error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

// ----------- LINKS ROUTES -----------
app.post("/links", auth, async (req, res) => {
  try {
    const { real_url, code } = createLinkSchema.parse(req.body);
    let shortCode = code || nanoid(8);

    const existing = await gristQuery(LINKS, { code: shortCode });
    if (existing.length) return res.status(409).json({ error: "code already exists" });

    const userId = Number(req.user.id);
    console.log('[Create Link] User ID:', userId, 'Name:', req.user.user_name);

    const rec = await gristInsert(LINKS, {
      user_id: userId,  // Store as plain number - Grist will handle it
      code: shortCode,
      real_url,
      created_date: new Date().toISOString(),
      clicks: 0,
    });

    console.log('[Create Link] Success - Record ID:', rec.id, 'Code:', shortCode);

    res.status(201).json({
      id: rec.id,
      code: shortCode,
      short_url: `${req.protocol}://${req.get("host")}/u/${shortCode}`,
      real_url,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error('[Create Link] Error:', e?.response?.data || e.message);
    res.status(500).json({ error: "Server error", details: e?.response?.data || e.message });
  }
});

app.get("/links", auth, async (req, res) => {
  try {
    console.log('\n=== GET /links ===');
    console.log('[Links] Request from User ID:', req.user.id, 'Name:', req.user.user_name, 'Role:', req.user.role);
    
    const allRows = await gristQuery(LINKS, {});
    console.log('[Links] Total in DB:', allRows.length);

    let rows;
    if (req.user.role === "admin") {
      rows = allRows;
      console.log('[Links] Admin - showing all', rows.length);
    } else {
      const userIdNum = Number(req.user.id);
      rows = allRows.filter(r => {
        const uid = resolveUserId(r.fields.user_id);
        return uid === userIdNum;
      });
      console.log('[Links] User - filtered to', rows.length, 'links');
    }

    // Filter out deleted
    const visible = rows.filter(r => {
      const f = r.fields || {};
      if (f.deleted === true) return false;
      if (typeof f.clicks === "number" && f.clicks < 0) return false;
      if (String(f.code || "").startsWith("del_")) return false;
      return true;
    });

    // Get user info
    const userRows = await gristQuery(USERS, {});
    const userMap = Object.fromEntries(userRows.map(u => [Number(u.id), u.fields]));

    const out = visible.map(r => {
      const f = r.fields || {};
      const uid = resolveUserId(f.user_id);
      const u = uid != null ? userMap[uid] : null;

      return {
        id: r.id,
        full_url: f.real_url,
        code: f.code,
        short_url: `${req.protocol}://${req.get("host")}/u/${f.code}`,
        clicks: Number(f.clicks) || 0,
        user_id: uid != null ? String(uid) : "",
        owner: u ? { 
          user_name: u.user_name, 
          user_email: u.user_email, 
          role: u.role 
        } : null,
      };
    });

    console.log('[Links] Returning', out.length, 'links');
    res.json(out);
  } catch (e) {
    console.error('[Links] Error:', e);
    res.status(500).json({ error: "Server error", details: e.message });
  }
});

app.delete("/links/:key", auth, async (req, res) => {
  try {
    const key = String(req.params.key).trim();
    const allLinks = await gristQuery(LINKS, {});

    let target = null;
    if (req.user.role === "admin") {
      if (/^\d+$/.test(key)) {
        target = allLinks.find(r => r.id === Number(key));
      }
      if (!target) {
        target = allLinks.find(r => r.fields.code === key);
      }
    } else {
      const userIdNum = Number(req.user.id);
      const mine = allLinks.filter(r => resolveUserId(r.fields.user_id) === userIdNum);
      
      if (/^\d+$/.test(key)) {
        target = mine.find(r => r.id === Number(key));
      }
      if (!target) {
        target = mine.find(r => r.fields.code === key);
      }
    }

    if (!target) {
      return res.status(404).json({ error: "Link not found" });
    }

    try {
      await gristDeleteById(LINKS, target.id);
      return res.json({ ok: true, hardDeleted: true });
    } catch {
      await gristUpdateById(LINKS, target.id, {
        deleted: true,
        deleted_at: new Date().toISOString(),
        real_url: "",
        clicks: -1,
        code: `del_${target.fields.code}_${Date.now()}`,
      });
      return res.json({ ok: true, softDeleted: true });
    }
  } catch (e) {
    console.error("Delete error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ----------- PUBLIC REDIRECT -----------
app.get("/u/:code", async (req, res) => {

  // -------------------------------------------------------------------------------------

  // try {
  //   const rows = await gristQuery(LINKS, { code: req.params.code });
  //   if (!rows.length) return res.status(404).send("Link not found");

  //   const rec = rows[0];
  //   const f = rec.fields || {};

  //   if (!f.real_url || f.deleted === true || (typeof f.clicks === "number" && f.clicks < 0)) {
  //     return res.status(404).send("Link not found");
  //   }

  //   // Async increment
  //   (async () => {
  //     for (let i = 0; i < 3; i++) {
  //       try {
  //         const success = await gristIncrementClicks(LINKS, rec.id);
  //         if (success) break;
  //         if (i < 2) await new Promise(r => setTimeout(r, 100 * (i + 1)));
  //       } catch (e) {
  //         console.warn(`Increment attempt ${i + 1} failed:`, e?.message);
  //       }
  //     }
  //   })();

  //   res.set({
  //     'Cache-Control': 'no-store',
  //     'Pragma': 'no-cache',
  //     'Expires': '0'
  //   });
  //   return res.redirect(302, f.real_url);
  // } catch (e) {
  //   console.error(e);
  //   res.status(500).send("Server error");
  // }

  // -------------------------------------------------------------------------------------

  // const code = req.params.code;

  // const { records } = await gristSelect(LINKS, {
  //   filter: JSON.stringify({ code: [code] }),
  // });

  // const link = records?.[0];
  // if (!link) return res.status(404).send("Not found");

  // const currentClicks = Number(link.fields.clicks) || 0;
  // const newClicks = currentClicks + 1;

  // await gristUpdate(LINKS, link.id, { clicks: newClicks });

  // console.log(`[clicks] incremented ${link.id}: ${currentClicks} -> ${newClicks}`);

  // return res.redirect(link.fields.real_url);

  // -------------------------------------------------------------------------------------

  try {
    const rows = await gristQuery(LINKS, { code: req.params.code });
    if (!rows.length) return res.status(404).send("Link not found");

    const rec = rows[0];
    const f = rec.fields || {};

    if (!f.real_url || f.deleted === true || (typeof f.clicks === "number" && f.clicks < 0)) {
      return res.status(404).send("Link not found");
    }

    const current = Number(f.clicks) || 0;
    const next = current + 1;
    await gristUpdateById(LINKS, rec.id, { clicks: next });

    console.log(`[clicks] incremented ${rec.id}: ${current} -> ${next}`);

    res.set({
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    return res.redirect(302, f.real_url);
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }

});

// ----------- SPA STATIC -----------
app.use(express.static(distDir));
app.get(/^\/app(?:\/.*)?$/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// ----------- DEBUG -----------
app.get("/debug/users", async (_req, res) => {
  try {
    const rows = await gristQuery(USERS, {});
    res.json(rows.map(r => ({
      id: r.id,
      user_name: r.fields.user_name,
      user_email: r.fields.user_email,
      role: r.fields.role,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/debug/links", async (_req, res) => {
  try {
    const rows = await gristQuery(LINKS, {});
    res.json(rows.map(r => ({
      id: r.id,
      code: r.fields.code,
      user_id_raw: r.fields.user_id,
      user_id_resolved: resolveUserId(r.fields.user_id),
      real_url: r.fields.real_url,
      clicks: r.fields.clicks,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));