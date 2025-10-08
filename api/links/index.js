import { z } from "zod";
import { nanoid } from "nanoid";
import { authenticate } from "../_lib/auth.js";
import { setCors, getBaseUrl } from "../_lib/http.js";
import { gristInsert, gristQuery, gristDeleteById, TABLES } from "../_lib/grist.js";

const createSchema = z.object({
  real_url: z.string().url(),
  code: z.string().min(4).max(32).optional()
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

function visibleRow(r) {
  const f = r.fields || {};
  if (f.deleted === true) return false;
  if (typeof f.clicks === "number" && f.clicks < 0) return false;
  if (String(f.code || "").startsWith("del_")) return false;
  return true;
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;

  try {
    const user = await authenticate(req);       // throws 401-like errors
    const baseUrl = getBaseUrl(req);

    if (req.method === "POST") {
      const { real_url, code } = createSchema.parse(req.body || {});
      const shortCode = code || nanoid(8);

      const exists = await gristQuery(TABLES.LINKS, { code: shortCode });
      if (exists.length) return res.status(409).json({ error: "code already exists" });

      const rec = await gristInsert(TABLES.LINKS, {
        user_id: Number(user.id),
        code: shortCode,
        real_url,
        created_date: new Date().toISOString(),
        clicks: 0
      });

      return res.status(201).json({
        id: rec.id,
        code: shortCode,
        real_url,
        short_url: `${baseUrl}/u/${shortCode}`
      });
    }

    if (req.method === "GET") {
      const all = await gristQuery(TABLES.LINKS, {});
      const rows = (user.role === "admin")
        ? all
        : all.filter(r => resolveUserId(r.fields?.user_id) === Number(user.id));

      const visible = rows.filter(visibleRow);

      const out = visible.map(r => ({
        id: r.id,
        full_url: r.fields?.real_url || "",
        code: r.fields?.code || "",
        short_url: `${baseUrl}/u/${r.fields?.code || ""}`,
        clicks: Number(r.fields?.clicks) || 0
      }));

      return res.json(out);
    }

    if (req.method === "DELETE") {
      const key = (req.query?.id || req.query?.code || "").toString();
      if (!key) return res.status(400).json({ error: "missing id/code" });

      // Try by numeric id first
      const idNum = Number(key);
      if (Number.isFinite(idNum)) {
        await gristDeleteById(TABLES.LINKS, idNum);
        return res.json({ deleted: true });
      }

      // Fallback: lookup by code
      const rows = await gristQuery(TABLES.LINKS, { code: key });
      if (!rows.length) return res.status(404).json({ error: "not found" });
      await gristDeleteById(TABLES.LINKS, rows[0].id);
      return res.json({ deleted: true });
    }

    res.setHeader("Allow", "GET,POST,DELETE,OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    if (e.message === "No token" || e.message === "User not found") {
      return res.status(401).json({ error: "unauthorized" });
    }
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    console.error("links error:", e);
    return res.status(500).json({ error: "server error" });
  }
}
