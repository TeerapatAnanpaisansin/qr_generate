// api/_lib/auth.js
import jwt from "jsonwebtoken";

function mustEnv(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === "") throw new Error(`Missing env: ${name}`);
  return String(v).trim();
}

const JWT_SECRET = mustEnv("JWT_SECRET");
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

export function signToken(payload) {
  // 7d expiry is reasonable for this app; adjust if you need shorter sessions
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export async function authenticate(req) {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error("No token");
  try {
    const user = jwt.verify(m[1], JWT_SECRET);
    if (!user) throw new Error("User not found");
    return user;
  } catch {
    throw new Error("User not found");
  }
}

export function roleFor(email, dbRole = "user") {
  const e = String(email || "").toLowerCase();
  return dbRole === "admin" || ADMIN_EMAILS.includes(e) ? "admin" : "user";
}
