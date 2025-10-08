// api/links/[key].js
import { authenticate } from "../_lib/auth.js";
import { gristQuery, gristUpdateById, gristDeleteById } from "../_lib/grist.js";

function resolveUserId(val) {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const m = val.match(/\[(\d+)\]$/);
    if (m) return Number(m[1]);
    return Number(val) || null;
  }
  if (Array.isArray(val)) return Number(val[val.length - 1]) || null;
  if (typeof val === "object" && "id" in val) return Number(val.id) || null;
  return null;
}

function isVisible(f) {
  if (f.deleted === true) return false;
  if (typeof f.clicks === "number" && f.clicks < 0) return false;
  if (String(f.code || "").startsWith("del_")) return false;
  return true;
}

export default async function handler(req, res) {
  // CORS mainly handled at the collection route; include minimal here if needed
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const user = await authenticate(req);
    const key = String(req.query.key || "").trim();
    if (!key) return res.status(400).json({ error: "missing key" });

    const all = await gristQuery(process.env.LINKS_TABLE, {});
    const mine = (user.role === "admin")
      ? all
      : all.filter(r => resolveUserId(r.fields.user_id) === Number(user.id));

    const target = /^\d+$/.test(key)
      ? mine.find(r => r.id === Number(key))
      : mine.find(r => r.fields.code === key);

    if (!target) return res.status(404).json({ error: "Link not found" });

    if (req.method === "GET") {
      const f = target.fields || {};
      if (!isVisible(f)) return res.status(404).json({ error: "Link not found" });
      return res.json({
        id: target.id,
        code: f.code,
        real_url: f.real_url,
        clicks: Number(f.clicks) || 0,
        user_id: resolveUserId(f.user_id)
      });
    }

    if (req.method === "DELETE") {
      try {
        await gristDeleteById(process.env.LINKS_TABLE, target.id);
        return res.json({ deleted: true });
      } catch {
        // Soft delete fallback if hard delete fails
        await gristUpdateById(process.env.LINKS_TABLE, target.id, {
          deleted: true,
          deleted_at: new Date().toISOString(),
          real_url: "",
          clicks: -1,
          code: `del_${target.fields.code}_${Date.now()}`,
        });
        return res.json({ deleted: true, soft: true });
      }
    }

    res.setHeader("Allow", "GET,DELETE,OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    if (e.message === "No token" || e.message === "User not found") {
      return res.status(401).json({ error: "unauthorized" });
    }
    console.error("links [key] error:", e);
    return res.status(500).json({ error: "server error" });
  }
}
