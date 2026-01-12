# Time Tracker 🌳

A beautiful time tracking application built with React, Bun, Hono, and PostgreSQL. Track your productivity and watch your forest grow!

## Features

- ⏱️ **Timer** - Start/stop timer with notes for each session
- 📅 **Calendar** - View daily, weekly, and monthly time summaries
- 📊 **Contribution Graph** - GitHub-style visualization of your productivity
- 🔐 **Authentication** - Secure signup/signin with JWT tokens
- 🌲 **Gamification** - Plant trees based on your tracked time

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Monorepo** | Turborepo |
| **Frontend** | React + Vite + TypeScript |
| **Backend** | Bun + Hono |
| **Database** | PostgreSQL + Drizzle ORM |
| **Auth** | JWT (jose) + Bun native password hashing |
| **Styling** | Vanilla CSS (Dark theme) |

## Project Structure

```
time-tracker/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Bun + Hono backend
├── packages/
│   ├── database/     # Drizzle schema & migrations
│   └── shared/       # Shared types & utilities
├── docker-compose.yml
└── turbo.json
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.1.0+)
- [Docker](https://www.docker.com/) (for PostgreSQL)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd time-tracker
   bun install
   ```

2. **Start the database:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

3. **Push the database schema:**
   ```bash
   cd packages/database
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/time_tracker" bunx drizzle-kit push
   ```

4. **Start the development server:**
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/time_tracker" JWT_SECRET="your-secret-key" bun run dev
   ```

5. **Open the app:**
   - Frontend: http://localhost:5173
   - API: http://localhost:3001

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/time_tracker
JWT_SECRET=your-super-secret-jwt-key
VITE_API_URL=http://localhost:3001
```

## Docker Deployment

To run the full stack with Docker:

```bash
docker compose up -d
```

This will start:
- PostgreSQL database
- API server (Bun + Hono)
- Web frontend (served with Bun)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/signin` | Login user |
| GET | `/auth/me` | Get current user |
| POST | `/timer/start` | Start timer session |
| POST | `/timer/stop/:id` | Stop timer session |
| GET | `/timer/active` | Get active session |
| GET | `/timer/sessions` | List all sessions |
| PATCH | `/timer/:id/notes` | Update session notes |
| DELETE | `/timer/:id` | Delete session |
| GET | `/calendar/daily/:date` | Get daily stats |
| GET | `/calendar/monthly/:year/:month` | Get monthly stats |
| GET | `/calendar/contributions` | Get contribution graph data |

## Development

```bash
# Run all apps in development mode
bun run dev

# Run database studio
cd packages/database
DATABASE_URL="..." bunx drizzle-kit studio

# Generate database migrations
bun run db:generate

# Push schema changes
bun run db:push
```

## License

MIT
