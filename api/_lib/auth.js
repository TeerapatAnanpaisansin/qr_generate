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
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error("No token");
  try {
    const user = jwt.verify(m[1], process.env.JWT_SECRET || "secret");
    if (!user) throw new Error("User not found");
    return user;
  } catch {
    throw new Error("User not found");
  }
}