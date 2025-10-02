// links/[key].js

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
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await authenticate(req);
    const key = String(req.query.key).trim();
    const allLinks = await gristQuery(process.env.LINKS_TABLE, {});

    let target = null;
    if (user.role === "admin") {
      target = /^\d+$/.test(key)
        ? allLinks.find(r => r.id === Number(key))
        : allLinks.find(r => r.fields.code === key);
    } else {
      const mine = allLinks.filter(r => resolveUserId(r.fields.user_id) === Number(user.id));
      target = /^\d+$/.test(key)
        ? mine.find(r => r.id === Number(key))
        : mine.find(r => r.fields.code === key);
    }

    if (!target) {
      return res.status(404).json({ error: "Link not found" });
    }

    try {
      await gristDeleteById(process.env.LINKS_TABLE, target.id);
      return res.json({ ok: true, hardDeleted: true });
    } catch {
      await gristUpdateById(process.env.LINKS_TABLE, target.id, {
        deleted: true,
        deleted_at: new Date().toISOString(),
        real_url: "",
        clicks: -1,
        code: `del_${target.fields.code}_${Date.now()}`,
      });
      return res.json({ ok: true, softDeleted: true });
    }
  } catch (e) {
    if (e.message === "No token" || e.message === "User not found") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}