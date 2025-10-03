import { z } from "zod";
import { nanoid } from "nanoid";
import { gristInsert, gristQuery } from "../_lib/grist.js";
import { authenticate } from "../_lib/auth.js";

const createSchema = z.object({
  real_url: z.string().url(),
  code: z.string().min(4).max(32).optional(),
});

function resolveUserId(val) {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const m = val.match(/\[(\d+)\]$/);
    if (m) return Number(m[1]);
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  }
  if (Array.isArray(val)) return Number(val[val.length - 1]) || null;
  if (typeof val === "object" && "id" in val) return Number(val.id) || null;
  return null;
}

// Helper to build the base URL
function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'yourdomain.vercel.app';
  return `${protocol}://${host}`;
}

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const user = await authenticate(req);
    const baseUrl = getBaseUrl(req);

    if (req.method === "POST") {
      const { real_url, code } = createSchema.parse(req.body);
      const shortCode = code || nanoid(8);

      const existing = await gristQuery(process.env.LINKS_TABLE, { code: shortCode });
      if (existing.length) return res.status(409).json({ error: "code already exists" });

      const rec = await gristInsert(process.env.LINKS_TABLE, {
        user_id: Number(user.id),
        code: shortCode,
        real_url,
        created_date: new Date().toISOString(),
        clicks: 0,
      });

      return res.status(201).json({
        id: rec.id,
        code: shortCode,
        short_url: `${baseUrl}/u/${shortCode}`,
        // short_url: `${req.headers.origin || "https://yourdomain.vercel.app"}/u/${shortCode}`,
        real_url,
      });
    }

    if (req.method === "GET") {
      const allRows = await gristQuery(process.env.LINKS_TABLE, {});
      
      let rows = user.role === "admin" 
        ? allRows 
        : allRows.filter(r => resolveUserId(r.fields.user_id) === Number(user.id));

      const visible = rows.filter(r => {
        const f = r.fields || {};
        if (f.deleted === true) return false;
        if (typeof f.clicks === "number" && f.clicks < 0) return false;
        if (String(f.code || "").startsWith("del_")) return false;
        return true;
      });

      const userRows = await gristQuery(process.env.USERS_TABLE, {});
      const userMap = Object.fromEntries(userRows.map(u => [Number(u.id), u.fields]));

      const out = visible.map(r => {
        const f = r.fields || {};
        const uid = resolveUserId(f.user_id);
        const u = uid != null ? userMap[uid] : null;

        return {
          id: r.id,
          full_url: f.real_url,
          code: f.code,
          short_url: `${baseUrl}/u/${f.code}`,
          clicks: Number(f.clicks) || 0,
          user_id: uid != null ? String(uid) : "",
          owner: u ? { user_name: u.user_name, user_email: u.user_email, role: u.role } : null,
        };
      });

      return res.json(out);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    if (e.message === "No token" || e.message === "User not found") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}