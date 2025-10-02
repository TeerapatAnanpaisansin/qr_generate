import { gristQuery, gristUpdateById } from "../_lib/grist.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const code = req.query.code;
    const rows = await gristQuery(process.env.LINKS_TABLE, { code });

    if (!rows.length) return res.status(404).send("Link not found");

    const rec = rows[0];
    const f = rec.fields || {};

    if (!f.real_url || f.deleted === true || (typeof f.clicks === "number" && f.clicks < 0)) {
      return res.status(404).send("Link not found");
    }

    const current = Number(f.clicks) || 0;
    await gristUpdateById(process.env.LINKS_TABLE, rec.id, { clicks: current + 1 });

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    return res.redirect(302, f.real_url);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
}