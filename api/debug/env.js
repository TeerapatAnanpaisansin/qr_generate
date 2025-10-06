export default function handler(req, res) {
  const keys = [
    "GRIST_BASE_URL","GRIST_API_KEY","GRIST_DOC_ID",
    "USERS_TABLE","LINKS_TABLE","JWT_SECRET","ADMIN_EMAILS",
  ];
  const seen = Object.fromEntries(keys.map(k => [k, !!(process.env[k] && String(process.env[k]).trim())]));
  res.status(200).json({ ok: true, seen });
}
