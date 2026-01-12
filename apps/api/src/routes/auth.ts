import { Hono } from "hono";
import { SignJWT } from "jose";
import { db, users } from "@time-tracker/database";
import { eq } from "drizzle-orm";
import type { SignupRequest, SigninRequest, ApiResponse, AuthResponse } from "@time-tracker/shared";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-this"
);

export const authRoutes = new Hono();

// Signup
authRoutes.post("/signup", async (c) => {
  try {
    const body = await c.req.json<SignupRequest>();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return c.json<ApiResponse>({
        success: false,
        error: "Email, password, and name are required",
      }, 400);
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return c.json<ApiResponse>({
        success: false,
        error: "User with this email already exists",
      }, 409);
    }

    // Hash password using Bun's native API
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // Create user
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
    }).returning();

    // Generate JWT
    const token = await new SignJWT({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    return c.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        token,
      },
    }, 201);
  } catch (error: any) {
    console.error("Signup error:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return c.json<ApiResponse>({
      success: false,
      error: `Failed to create user: ${error?.message || 'Unknown error'}`,
    }, 500);
  }
});

// Signin
authRoutes.post("/signin", async (c) => {
  try {
    const body = await c.req.json<SigninRequest>();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return c.json<ApiResponse>({
        success: false,
        error: "Email and password are required",
      }, 400);
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return c.json<ApiResponse>({
        success: false,
        error: "Invalid email or password",
      }, 401);
    }

    // Verify password using Bun's native API
    const isValidPassword = await Bun.password.verify(password, user.password);
    if (!isValidPassword) {
      return c.json<ApiResponse>({
        success: false,
        error: "Invalid email or password",
      }, 401);
    }

    // Generate JWT
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    return c.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to sign in",
    }, 500);
  }
});

// Get current user (protected)
authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json<ApiResponse>({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, JWT_SECRET);

    return c.json<ApiResponse>({
      success: true,
      data: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
      },
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: "Invalid token" }, 401);
  }
});
