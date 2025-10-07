import { gristQuery, gristUpdateById, TABLES } from "../_lib/grist.js";

function isVisible(rec) {
  const f = rec?.fields || {};
  if (f.deleted === true) return false;
  if (typeof f.clicks === "number" && f.clicks < 0) return false;
  if (String(f.code || "").startsWith("del_")) return false;
  return true;
}

function isHttpUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  try {
    // only support GET/HEAD for the hop
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      return res.status(405).end("Method Not Allowed");
    }

    const code = req.query?.code;
    if (!code || typeof code !== "string") {
      return res.status(404).end("Not found");
    }

    // find link by code
    const rows = await gristQuery(TABLES.LINKS, { code });
    const rec = rows.find(isVisible);
    if (!rec) return res.status(404).end("Not found");

    const { id } = rec;
    const f = rec.fields || {};
    const real = String(f.real_url || "");
    if (!isHttpUrl(real)) return res.status(400).end("Invalid destination");

    // increment clicks (best-effort; ignore errors)
    try {
      const nextClicks = (typeof f.clicks === "number" ? f.clicks : 0) + 1;
      await gristUpdateById(TABLES.LINKS, id, { clicks: nextClicks });
    } catch (_) {}

    // no-store so QR scans don't get cached by CDNs
    res.setHeader("Cache-Control", "no-store");

    // manual 302 for GET/HEAD
    res.statusCode = 302;
    res.setHeader("Location", real);
    return res.end();
  } catch (err) {
    console.error("hop error:", err);
    return res.status(500).end("Internal error");
  }
}
