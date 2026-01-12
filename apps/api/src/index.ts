import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { timerRoutes } from "./routes/timer";
import { calendarRoutes } from "./routes/calendar";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// Health check
app.get("/", (c) => {
  return c.json({ message: "Time Tracker API is running!", status: "ok" });
});

// Routes
app.route("/auth", authRoutes);
app.route("/timer", timerRoutes);
app.route("/calendar", calendarRoutes);

// Start server
const port = Number(process.env.PORT) || 3001;
console.log(`🚀 Server is running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
