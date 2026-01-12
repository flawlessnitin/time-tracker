import { Hono } from "hono";
import { db, timerSessions } from "@time-tracker/database";
import { eq, and, isNull, desc } from "drizzle-orm";
import { authMiddleware, getUser } from "../middleware/auth";
import type {
  ApiResponse,
  TimerSessionResponse,
  StartTimerRequest,
  UpdateNotesRequest,
} from "@time-tracker/shared";

export const timerRoutes = new Hono();

// Apply auth middleware to all routes
timerRoutes.use("*", authMiddleware);

// Start a new timer session
timerRoutes.post("/start", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json<StartTimerRequest>().catch(() => ({}));

    // Check if there's already an active session
    const activeSession = await db.query.timerSessions.findFirst({
      where: and(
        eq(timerSessions.userId, user.id),
        isNull(timerSessions.endTime)
      ),
    });

    if (activeSession) {
      return c.json<ApiResponse>({
        success: false,
        error: "You already have an active timer session",
      }, 400);
    }

    // Create new session
    const [session] = await db.insert(timerSessions).values({
      userId: user.id,
      startTime: new Date(),
      notes: body.notes || null,
    }).returning();

    return c.json<ApiResponse<TimerSessionResponse>>({
      success: true,
      data: {
        id: session.id,
        userId: session.userId,
        startTime: session.startTime.toISOString(),
        endTime: null,
        duration: null,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
      },
    }, 201);
  } catch (error) {
    console.error("Start timer error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to start timer",
    }, 500);
  }
});

// Stop an active timer session
timerRoutes.post("/stop/:id", async (c) => {
  try {
    const user = getUser(c);
    const sessionId = c.req.param("id");

    // Find the session
    const session = await db.query.timerSessions.findFirst({
      where: and(
        eq(timerSessions.id, sessionId),
        eq(timerSessions.userId, user.id)
      ),
    });

    if (!session) {
      return c.json<ApiResponse>({
        success: false,
        error: "Session not found",
      }, 404);
    }

    if (session.endTime) {
      return c.json<ApiResponse>({
        success: false,
        error: "Session is already stopped",
      }, 400);
    }

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - session.startTime.getTime()) / 1000
    );

    // Update session
    const [updatedSession] = await db
      .update(timerSessions)
      .set({
        endTime,
        duration,
      })
      .where(eq(timerSessions.id, sessionId))
      .returning();

    return c.json<ApiResponse<TimerSessionResponse>>({
      success: true,
      data: {
        id: updatedSession.id,
        userId: updatedSession.userId,
        startTime: updatedSession.startTime.toISOString(),
        endTime: updatedSession.endTime!.toISOString(),
        duration: updatedSession.duration,
        notes: updatedSession.notes,
        createdAt: updatedSession.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Stop timer error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to stop timer",
    }, 500);
  }
});

// Get active session
timerRoutes.get("/active", async (c) => {
  try {
    const user = getUser(c);

    const activeSession = await db.query.timerSessions.findFirst({
      where: and(
        eq(timerSessions.userId, user.id),
        isNull(timerSessions.endTime)
      ),
    });

    if (!activeSession) {
      return c.json<ApiResponse<null>>({
        success: true,
        data: null,
      });
    }

    return c.json<ApiResponse<TimerSessionResponse>>({
      success: true,
      data: {
        id: activeSession.id,
        userId: activeSession.userId,
        startTime: activeSession.startTime.toISOString(),
        endTime: null,
        duration: null,
        notes: activeSession.notes,
        createdAt: activeSession.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get active session error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to get active session",
    }, 500);
  }
});

// Get all sessions (with pagination)
timerRoutes.get("/sessions", async (c) => {
  try {
    const user = getUser(c);
    const limit = Number(c.req.query("limit")) || 20;
    const offset = Number(c.req.query("offset")) || 0;

    const sessions = await db.query.timerSessions.findMany({
      where: eq(timerSessions.userId, user.id),
      orderBy: [desc(timerSessions.startTime)],
      limit,
      offset,
    });

    const data: TimerSessionResponse[] = sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() || null,
      duration: s.duration,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    }));

    return c.json<ApiResponse<TimerSessionResponse[]>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to get sessions",
    }, 500);
  }
});

// Update session notes
timerRoutes.patch("/:id/notes", async (c) => {
  try {
    const user = getUser(c);
    const sessionId = c.req.param("id");
    const body = await c.req.json<UpdateNotesRequest>();

    // Find the session
    const session = await db.query.timerSessions.findFirst({
      where: and(
        eq(timerSessions.id, sessionId),
        eq(timerSessions.userId, user.id)
      ),
    });

    if (!session) {
      return c.json<ApiResponse>({
        success: false,
        error: "Session not found",
      }, 404);
    }

    // Update notes
    const [updatedSession] = await db
      .update(timerSessions)
      .set({ notes: body.notes })
      .where(eq(timerSessions.id, sessionId))
      .returning();

    return c.json<ApiResponse<TimerSessionResponse>>({
      success: true,
      data: {
        id: updatedSession.id,
        userId: updatedSession.userId,
        startTime: updatedSession.startTime.toISOString(),
        endTime: updatedSession.endTime?.toISOString() || null,
        duration: updatedSession.duration,
        notes: updatedSession.notes,
        createdAt: updatedSession.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Update notes error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to update notes",
    }, 500);
  }
});

// Delete a session
timerRoutes.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    const sessionId = c.req.param("id");

    // Find the session
    const session = await db.query.timerSessions.findFirst({
      where: and(
        eq(timerSessions.id, sessionId),
        eq(timerSessions.userId, user.id)
      ),
    });

    if (!session) {
      return c.json<ApiResponse>({
        success: false,
        error: "Session not found",
      }, 404);
    }

    await db.delete(timerSessions).where(eq(timerSessions.id, sessionId));

    return c.json<ApiResponse>({
      success: true,
    });
  } catch (error) {
    console.error("Delete session error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to delete session",
    }, 500);
  }
});
