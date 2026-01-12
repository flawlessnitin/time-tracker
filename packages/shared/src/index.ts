// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// Timer types
export interface TimerSessionResponse {
  id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  notes: string | null;
  createdAt: string;
}

export interface StartTimerRequest {
  notes?: string;
}

export interface StopTimerRequest {
  notes?: string;
}

export interface UpdateNotesRequest {
  notes: string;
}

// Calendar types
export interface DailyStats {
  date: string;
  totalDuration: number; // in seconds
  sessions: TimerSessionResponse[];
}

export interface ContributionDay {
  date: string;
  count: number; // number of sessions
  duration: number; // total duration in seconds
  level: 0 | 1 | 2 | 3 | 4; // intensity level for coloring
}

export interface ContributionData {
  days: ContributionDay[];
  totalSessions: number;
  totalDuration: number;
}

// Utility functions
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
