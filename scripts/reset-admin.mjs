// Explicit operator action only. Uses local .env; never expose credentials in chat.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
try {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 12) throw new Error("Set ADMIN_USERNAME and ADMIN_PASSWORD (at least 12 characters) in your private local .env first.");
  const admin = await db.admin.findUnique({ where: { username } });
  if (!admin) throw new Error("No matching admin exists. Check the exact existing username; this command does not create accounts.");
  await db.admin.update({ where: { id: admin.id }, data: { password: await bcrypt.hash(password, 12) } });
  console.log("Password reset for the specified administrator. Role unchanged.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await db.$disconnect(); }
