import { gristQuery, gristUpdateById } from "../_lib/grist.js";

function isVisible(rec) {
  const f = rec?.fields || {};
  if (f.deleted === true) return false;
  if (typeof f.clicks === "number" && f.clicks < 0) return false;
  if (String(f.code || "").startsWith("del_")) return false;
  return true;
}

function isHttpUrl(u) {
  if (!u || typeof u !== "string") return false;
  if (!/^https?:\/\//i.test(u)) return false;
  try { new URL(u); return true; } catch { return false; }
}

export default async function handler(req, res) {
  // Support GET and HEAD (some QR scanners/bots use HEAD)
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    return res.end("Method not allowed");
  }

  try {
    const raw = req.query.code;
    const code = typeof raw === "string" ? raw.trim() : "";

    if (!code) {
      res.statusCode = 400;
      return res.end("Invalid or missing code");
    }

    // Public: no authenticate()
    const rows = await gristQuery(process.env.LINKS_TABLE, { code });
    const rec = rows.find(isVisible);
    if (!rec) {
      res.statusCode = 404;
      return res.end("Not found");
    }

    const id = rec.id;
    const f = rec.fields || {};
    const target = String(f.real_url || "").trim();

    if (!isHttpUrl(target)) {
      res.statusCode = 400;
      return res.end("Invalid target URL");
    }

    // Best-effort click increment (don't block redirect)
    try {
      const next = (Number(f.clicks) || 0) + 1;
      await gristUpdateById(process.env.LINKS_TABLE, id, { clicks: next });
    } catch (_) {}

    // No-store to avoid caching the short link itself
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    // Avoid search indexing of short hops
    res.setHeader("X-Robots-Tag", "noindex, nofollow");

    // Manual redirect (works on Vercel Node)
    res.statusCode = 302;
    res.setHeader("Location", target);
    return res.end();
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    return res.end("Server error");
  }
}
