// api/auth/login.js
import bcrypt from "bcryptjs";
import { z } from "zod";
import { gristQuery, gristUpdateById } from "../_lib/grist.js";
import { signToken, roleFor } from "../_lib/auth.js";

const schema = z.object({
  user_name_or_email: z.string().min(3),
  user_password: z.string().min(6),
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_name_or_email, user_password } = schema.parse(req.body || {});
    // try by username first, then by email
    let users = await gristQuery(process.env.USERS_TABLE, { user_name: user_name_or_email });
    if (users.length === 0) {
      users = await gristQuery(process.env.USERS_TABLE, { user_email: user_name_or_email });
    }

    const rec = users[0];
    if (!rec) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(user_password, rec.fields.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const role = roleFor(rec.fields.user_email, rec.fields.role);
    const now = new Date().toISOString();
    await gristUpdateById(process.env.USERS_TABLE, rec.id, { login_date: now });

    const token = signToken({
      id: rec.id,
      user_name: rec.fields.user_name,
      user_email: rec.fields.user_email,
      role,
    });

    return res.json({
      token,
      user: {
        id: rec.id,
        user_name: rec.fields.user_name,
        user_email: rec.fields.user_email,
        role,
        created_date: rec.fields.created_date,
        login_date: now,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error("auth/login error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
