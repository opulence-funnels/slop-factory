# CLAUDE.md — Workspace Documentation

This file provides an overview of the slop-factory monorepo for AI assistants and developers.

## Overview

**Slop Factory** is a media content management platform that handles images, video, and text content. It uses a pnpm workspaces monorepo with three packages.

## Tech Stack

- **Runtime:** Node.js >= 20
- **Package Manager:** pnpm 9+ (workspaces)
- **Language:** TypeScript (strict mode, ES2022 target)
- **Server:** Express 4 with Mongoose ODM
- **Database:** MongoDB
- **Client:** Next.js 15 (App Router) with React 19
- **Validation:** Zod (server-side)
- **File Uploads:** Multer (local disk storage)

## Workspace Structure



```
slop-factory/
├── CLAUDE.md                  # This file — workspace docs
├── README.md                  # Project readme with setup instructions
├── package.json               # Root package.json (private, scripts: dev/build/lint)
├── pnpm-workspace.yaml        # Defines packages/* as workspace members
├── tsconfig.base.json         # Shared TS compiler options (strict, ES2022)
├── .npmrc                     # pnpm config (shamefully-hoist for Next.js compat)
├── .gitignore
├── .dockerignore
├── .env.example
├── docker-compose.yml         # Coolify-compatible compose (mongo + server + client)
│
├── packages/
│   ├── shared/                # @slop-factory/shared — shared types & constants
│   │   ├── package.json       # Builds with tsc to dist/
│   │   ├── tsconfig.json      # Extends ../../tsconfig.base.json
│   │   └── src/
│   │       ├── index.ts       # Barrel export
│   │       └── types/
│   │           ├── media.ts   # MediaType enum, MediaItem, TextContent, mime constants
│   │           ├── api.ts     # ApiResponse<T>, PaginatedResponse<T>
│   │           └── stream.ts  # StreamEvent (reserved for future streaming)
│   │
│   ├── server/                # @slop-factory/server — Express + MongoDB API
│   │   ├── package.json       # Dev runner: tsx watch
│   │   ├── tsconfig.json      # Extends ../../tsconfig.base.json
│   │   ├── Dockerfile         # Multi-stage build: deps → build → runner
│   │   ├── .env.example       # PORT, MONGODB_URI, UPLOAD_DIR
│   │   └── src/
│   │       ├── index.ts       # App bootstrap: Express setup, DB connect, route registration
│   │       ├── config/
│   │       │   ├── env.ts     # Zod-validated environment variables
│   │       │   └── db.ts      # Mongoose connection manager
│   │       ├── models/
│   │       │   ├── media.model.ts  # Mongoose schema: Media (image/video files)
│   │       │   └── text.model.ts   # Mongoose schema: TextContent
│   │       ├── routes/
│   │       │   ├── media.routes.ts # CRUD + upload for media files
│   │       │   └── text.routes.ts  # CRUD for text content
│   │       └── middleware/
│   │           ├── upload.ts  # Multer config: storage, file filter, size limits
│   │           └── error.ts   # Global Express error handler
│   │
│   └── client/                # @slop-factory/client — Next.js frontend
│       ├── package.json
│       ├── tsconfig.json      # Extends ../../tsconfig.base.json, JSX preserve
│       ├── Dockerfile         # Multi-stage build: deps → build → standalone runner
│       ├── next.config.ts     # standalone output, API proxy rewrites, transpile shared
│       └── src/
│           ├── lib/
│           │   └── api.ts     # Typed fetch wrappers for all API endpoints
│           └── app/
│               ├── layout.tsx    # Root layout with nav header
│               ├── globals.css   # Dark theme global styles
│               ├── page.tsx      # Home page — media gallery (server component)
│               └── upload/
│                   └── page.tsx  # Upload page — file picker + upload form (client component)
```

## Package Dependencies

```
@slop-factory/client  ──depends on──▶  @slop-factory/shared
@slop-factory/server  ──depends on──▶  @slop-factory/shared
```

**Build order:** `shared` must be built first. The root `build` script handles this automatically.

## Key Commands

| Command             | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `pnpm install`      | Install all workspace dependencies                            |
| `pnpm dev`          | Run all packages in parallel (server + client + shared watch) |
| `pnpm dev:server`   | Run only the Express server (port 4000)                       |
| `pnpm dev:client`   | Run only the Next.js client (port 3000)                       |
| `pnpm build`        | Build all packages (shared first, then rest in parallel)      |
| `pnpm build:shared` | Build only the shared types package                           |
| `pnpm typecheck`    | Run TypeScript type checking across all packages              |
| `pnpm clean`        | Remove all build artifacts                                    |

## API Routes

All routes are prefixed with `/api`. The client proxies requests to the server via Next.js rewrites in development.

### Media (`/api/media`)

- `POST /api/media/upload` — Multipart file upload (field: `files`, max 10)
- `GET /api/media?page=1&limit=20&type=image` — Paginated list, optional type filter
- `GET /api/media/:id` — Get single media item
- `DELETE /api/media/:id` — Delete media item

### Text (`/api/text`)

- `POST /api/text` — Create text content (body: `{ title, body, metadata? }`)
- `GET /api/text?page=1&limit=20` — Paginated list
- `GET /api/text/:id` — Get single text item
- `DELETE /api/text/:id` — Delete text item

### Health

- `GET /api/health` — Returns `{ status: "ok", timestamp }`

## Response Format

All API responses follow the `ApiResponse<T>` shape from `@slop-factory/shared`:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

Paginated endpoints add:

```typescript
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: { page; limit; total; totalPages }
}
```

## Media Types

Accepted upload types (defined in `@slop-factory/shared`):

- **Images:** JPEG, PNG, GIF, WebP (max 10 MB)
- **Video:** MP4, WebM, QuickTime/MOV (max 100 MB)

Uploaded files are stored to the local `uploads/` directory (configurable via `UPLOAD_DIR`) and served statically at `/uploads/<filename>`.

## Environment Variables (Server)

| Variable      | Default                                  | Description                        |
| ------------- | ---------------------------------------- | ---------------------------------- |
| `PORT`        | `4000`                                   | Express server port                |
| `MONGODB_URI` | `mongodb://localhost:27017/slop-factory` | MongoDB connection string          |
| `UPLOAD_DIR`  | `./uploads`                              | Local directory for uploaded files |
| `NODE_ENV`    | `development`                            | Environment mode                   |

## Conventions

- **TypeScript strict mode** is enabled globally via `tsconfig.base.json`
- **ESM modules** throughout (`"type": "module"` in all package.json files)
- **Bracket notation** for index access (`obj["key"]`) due to `noUncheckedIndexedAccess`
- **`.js` extensions** in import paths (required for ESM with TypeScript)
- **Zod** for runtime validation of environment variables and request bodies
- **Mongoose** schemas in `models/` directory, one file per collection
- **Express routes** in `routes/` directory, one file per resource
- All shared types live in `packages/shared/src/types/` and are re-exported from barrel `index.ts`

## Docker / Deployment

The project includes a Coolify-compatible `docker-compose.yml` with health checks on all services.

### Services

| Service  | Image / Build                | Ports             | Healthcheck                                |
| -------- | ---------------------------- | ----------------- | ------------------------------------------ |
| `mongo`  | `mongo:7`                    | internal only     | `mongosh --eval "db.adminCommand('ping')"` |
| `server` | `packages/server/Dockerfile` | `4000` (internal) | `GET /api/health`                          |
| `client` | `packages/client/Dockerfile` | `3000` (exposed)  | `GET /`                                    |

### Startup Order

`mongo` (healthy) → `server` (healthy) → `client`

### Volumes

- `mongo_data` — MongoDB data directory (`/data/db`)
- `uploads` — Uploaded media files (`/app/uploads` on server)

### Coolify Notes

- Only the `client` service exposes a port (`$PORT` env var, default 3000). Coolify maps this to the public domain.
- `server` and `mongo` are on an internal bridge network only.
- All services use `restart: unless-stopped`.
- The client reaches the server via Docker internal DNS (`http://server:4000`) using the `INTERNAL_API_URL` env var.
- Coolify can override any environment variable at deploy time.

### Docker Commands

```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Destroy volumes too
docker compose down -v
```

### Dockerfiles

Both Dockerfiles use multi-stage builds from the **repo root** context:

1. **`base`** — `node:22-alpine` + pnpm via corepack
2. **`deps`** — Copies only `package.json` / lockfile for layer-cached installs
3. **`build`** — Copies source & compiles (`shared` first, then target package)
4. **`runner`** — Minimal production image with built artifacts only

Server runs `node packages/server/dist/index.js`. Client uses Next.js standalone output (`node packages/client/server.js`).

## Future / Reserved

- **Streaming:** `StreamEvent` type is defined in shared but not yet wired up. Intended for SSE or WebSocket streaming responses.
- **Storage:** Currently local disk via multer. Storage layer can be swapped to S3-compatible by replacing the multer storage engine.
