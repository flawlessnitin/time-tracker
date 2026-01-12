import { Hono } from "hono";
import { db, timerSessions } from "@time-tracker/database";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { authMiddleware, getUser } from "../middleware/auth";
import type {
  ApiResponse,
  DailyStats,
  ContributionData,
  ContributionDay,
  TimerSessionResponse,
} from "@time-tracker/shared";

export const calendarRoutes = new Hono();

// Apply auth middleware to all routes
calendarRoutes.use("*", authMiddleware);

// Get sessions for a specific date
calendarRoutes.get("/daily/:date", async (c) => {
  try {
    const user = getUser(c);
    const dateStr = c.req.param("date"); // Format: YYYY-MM-DD

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const sessions = await db.query.timerSessions.findMany({
      where: and(
        eq(timerSessions.userId, user.id),
        gte(timerSessions.startTime, startOfDay),
        lte(timerSessions.startTime, endOfDay)
      ),
      orderBy: [desc(timerSessions.startTime)],
    });

    const sessionsData: TimerSessionResponse[] = sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() || null,
      duration: s.duration,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    }));

    const totalDuration = sessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0
    );

    return c.json<ApiResponse<DailyStats>>({
      success: true,
      data: {
        date: dateStr,
        totalDuration,
        sessions: sessionsData,
      },
    });
  } catch (error) {
    console.error("Get daily stats error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to get daily stats",
    }, 500);
  }
});

// Get sessions within a date range
calendarRoutes.get("/range", async (c) => {
  try {
    const user = getUser(c);
    const startDate = c.req.query("start"); // Format: YYYY-MM-DD
    const endDate = c.req.query("end"); // Format: YYYY-MM-DD

    if (!startDate || !endDate) {
      return c.json<ApiResponse>({
        success: false,
        error: "Start and end dates are required",
      }, 400);
    }

    const startOfRange = new Date(`${startDate}T00:00:00.000Z`);
    const endOfRange = new Date(`${endDate}T23:59:59.999Z`);

    const sessions = await db.query.timerSessions.findMany({
      where: and(
        eq(timerSessions.userId, user.id),
        gte(timerSessions.startTime, startOfRange),
        lte(timerSessions.startTime, endOfRange)
      ),
      orderBy: [desc(timerSessions.startTime)],
    });

    const sessionsData: TimerSessionResponse[] = sessions.map((s) => ({
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
      data: sessionsData,
    });
  } catch (error) {
    console.error("Get range sessions error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to get sessions",
    }, 500);
  }
});

// Get contribution graph data (last 365 days)
calendarRoutes.get("/contributions", async (c) => {
  try {
    const user = getUser(c);

    // Calculate date range (last 365 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const sessions = await db.query.timerSessions.findMany({
      where: and(
        eq(timerSessions.userId, user.id),
        gte(timerSessions.startTime, startDate),
        lte(timerSessions.startTime, endDate)
      ),
    });

    // Group sessions by date
    const dailyData = new Map<string, { count: number; duration: number }>();

    sessions.forEach((session) => {
      const dateKey = session.startTime.toISOString().split("T")[0];
      const existing = dailyData.get(dateKey) || { count: 0, duration: 0 };
      dailyData.set(dateKey, {
        count: existing.count + 1,
        duration: existing.duration + (session.duration || 0),
      });
    });

    // Calculate max duration for level scaling
    const maxDuration = Math.max(
      ...Array.from(dailyData.values()).map((d) => d.duration),
      1
    );

    // Generate all days in range
    const days: ContributionDay[] = [];
    let totalSessions = 0;
    let totalDuration = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      const data = dailyData.get(dateKey);

      if (data) {
        totalSessions += data.count;
        totalDuration += data.duration;

        // Calculate level (0-4) based on duration
        const ratio = data.duration / maxDuration;
        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (ratio > 0.75) level = 4;
        else if (ratio > 0.5) level = 3;
        else if (ratio > 0.25) level = 2;
        else if (ratio > 0) level = 1;

        days.push({
          date: dateKey,
          count: data.count,
          duration: data.duration,
          level,
        });
      } else {
        days.push({
          date: dateKey,
          count: 0,
          duration: 0,
          level: 0,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return c.json<ApiResponse<ContributionData>>({
      success: true,
      data: {
        days,
        totalSessions,
        totalDuration,
      },
    });
  } catch (error) {
    console.error("Get contributions error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to get contribution data",
    }, 500);
  }
});

// Get monthly summary
calendarRoutes.get("/monthly/:year/:month", async (c) => {
  try {
    const user = getUser(c);
    const year = parseInt(c.req.param("year"));
    const month = parseInt(c.req.param("month")); // 1-12

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const sessions = await db.query.timerSessions.findMany({
      where: and(
        eq(timerSessions.userId, user.id),
        gte(timerSessions.startTime, startOfMonth),
        lte(timerSessions.startTime, endOfMonth)
      ),
      orderBy: [desc(timerSessions.startTime)],
    });

    // Group by day
    const dailyStats: Record<string, DailyStats> = {};

    sessions.forEach((session) => {
      const dateKey = session.startTime.toISOString().split("T")[0];
      
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          totalDuration: 0,
          sessions: [],
        };
      }

      dailyStats[dateKey].totalDuration += session.duration || 0;
      dailyStats[dateKey].sessions.push({
        id: session.id,
        userId: session.userId,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() || null,
        duration: session.duration,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
      });
    });

    return c.json<ApiResponse<Record<string, DailyStats>>>({
      success: true,
      data: dailyStats,
    });
  } catch (error) {
    console.error("Get monthly summary error:", error);
    return c.json<ApiResponse>({
      success: false,
      error: "Failed to get monthly summary",
    }, 500);
  }
});
