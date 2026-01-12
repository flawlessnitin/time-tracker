import { Context, Next } from "hono";
import { jwtVerify } from "jose";
import type { AuthUser } from "@time-tracker/shared";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-this"
);

export interface AuthContext {
  user: AuthUser;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    c.set("user", {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
    });

    await next();
  } catch (error) {
    return c.json({ success: false, error: "Invalid token" }, 401);
  }
}

export function getUser(c: Context): AuthUser {
  return c.get("user") as AuthUser;
}
