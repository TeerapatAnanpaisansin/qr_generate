import jwt from "jsonwebtoken";
import { gristGetById } from "./grist.js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export async function authenticate(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  
  if (!token) throw new Error("No token");

  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const rec = await gristGetById(process.env.USERS_TABLE, payload.id);
  
  if (!rec) throw new Error("User not found");

  const email = (rec.fields.user_email || "").toLowerCase();
  const dbRole = rec.fields.role || "user";
  const role = dbRole === "admin" || ADMIN_EMAILS.includes(email) ? "admin" : "user";

  return {
    id: rec.id,
    user_name: rec.fields.user_name,
    user_email: rec.fields.user_email,
    role,
  };
}