// auth/register.js

import bcrypt from "bcryptjs";
import { z } from "zod";
import { gristInsert, gristQuery } from "../_lib/grist.js";
import { signToken } from "../_lib/auth.js";

const schema = z.object({
  user_name: z.string().min(3),
  user_email: z.string().email(),
  user_password: z.string().min(6),
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_name, user_email, user_password } = schema.parse(req.body);

    const [byName, byEmail] = await Promise.all([
      gristQuery(process.env.USERS_TABLE, { user_name }),
      gristQuery(process.env.USERS_TABLE, { user_email }),
    ]);

    if (byName.length) return res.status(409).json({ error: "user_name already exists" });
    if (byEmail.length) return res.status(409).json({ error: "user_email already exists" });

    const hash = await bcrypt.hash(user_password, 10);
    const now = new Date().toISOString();
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase());
    const role = adminEmails.includes(user_email.toLowerCase()) ? "admin" : "user";

    const rec = await gristInsert(process.env.USERS_TABLE, {
      user_name,
      user_email,
      password_hash: hash,
      created_date: now,
      login_date: now,
      role,
    });

    const token = signToken({ id: rec.id, user_name, user_email, role });

    res.status(201).json({
      token,
      user: { id: rec.id, user_name, user_email, role, created_date: now },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}