import { gristQuery, gristUpdateById, TABLES } from "./_lib/grist.js";

function isVisible(rec) {
  const f = rec?.fields || {};
  if (f.deleted === true) return false;
  if (typeof f.clicks === "number" && f.clicks < 0) return false;
  if (String(f.code || "").startsWith("del_")) return false;
  return true;
}

function isHttpUrl(u) {
  try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:"; }
  catch { return false; }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      return res.status(405).end("Method Not Allowed");
    }

    const code = (req.query?.code || "").toString();
    if (!code) return res.status(404).end("Not found");

    const rows = await gristQuery(TABLES.LINKS, { code });
    const rec = rows.find(isVisible);
    if (!rec) return res.status(404).end("Not found");

    const f = rec.fields || {};
    const real = String(f.real_url || "");
    if (!isHttpUrl(real)) return res.status(400).end("Invalid destination");

    // best-effort click increment
    try {
      const next = (typeof f.clicks === "number" ? f.clicks : 0) + 1;
      await gristUpdateById(TABLES.LINKS, rec.id, { clicks: next });
    } catch {}

    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 302;
    res.setHeader("Location", real);
    res.end();
  } catch (err) {
    console.error("hop error:", err);
    res.status(500).end("Internal error");
  }
}
