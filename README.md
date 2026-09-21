<p align="center">
  <img src="docs/logo/openwa_logo.webp" alt="OpenWA Logo" width="200"/>
</p>

<h1 align="center">OpenWA</h1>
<p align="center">
  <strong>Open Source WhatsApp API Gateway</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-render-deployment">Deploy</a> •
  <a href="#-api-examples">API</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/Aswinajay/OpenWA/actions/workflows/ci.yml"><img src="https://github.com/Aswinajay/OpenWA/actions/workflows/ci.yml/badge.svg?branch=lightweight" alt="CI"/></a>
  <img src="https://img.shields.io/github/package-json/v/Aswinajay/OpenWA?label=version&color=blue" alt="Version"/>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"/>
  <img src="https://img.shields.io/badge/node-22_LTS-brightgreen.svg" alt="Node"/>
  <img src="https://img.shields.io/github/package-json/dependency-version/Aswinajay/OpenWA/@nestjs/core?label=NestJS&color=red" alt="NestJS"/>
  <img src="https://img.shields.io/badge/docker-ready-blue.svg" alt="Docker"/>
  <img src="https://img.shields.io/github/package-json/dependency-version/Aswinajay/OpenWA/dev/typescript?label=TypeScript&color=3178C6" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/deployed-wa.eletroclay.com-brightgreen" alt="Deployed"/>
</p>

---

## Why OpenWA?

**OpenWA** is a free, open-source WhatsApp API Gateway designed for developers who need full control over their messaging infrastructure—without vendor lock-in or hidden paywalls.

Built on a **pluggable architecture**, OpenWA lets you select database engines (SQLite/PostgreSQL), backup/migration storage backends (Local/S3), and cache layers (disabled/Redis) through configuration rather than application-code changes.

|                               |                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **100% Open Source**       | No licensing fees, no feature locks, full source code access                                                                             |
| **Pluggable Architecture** | Swap adapters for database, storage, and cache via config                                                                                |
| **Full Dashboard**         | Modern React UI for session, webhook, and API key management                                                                             |
| **Multi-Session Ready**    | Run multiple WhatsApp sessions concurrently on one instance                                                                              |
| **Docker Native**          | Production-ready with zero configuration                                                                                                 |
| **Official Plugins**       | Chatwoot, Typebot & more as sandboxed plugins — [OpenWA-plugins](https://github.com/rmyndharis/OpenWA-plugins) |
| **Render Free Tier**       | Micro-optimized for 512 MB RAM — Neon PostgreSQL + Cloudflare R2 persistence                                       |

---

## Before you connect a number

OpenWA connects to WhatsApp through **reverse-engineered clients** (`whatsapp-web.js` and `@whiskeysockets/baileys`), **not** Meta's official Cloud API.

- **There is always a non-zero risk of account restriction or ban.**
- **Never connect your primary personal or business number.** Use a dedicated number.
- **The two engines trade off differently:**

  | Engine            | Ban-risk profile | Resource cost |
  | ----------------- | ---------------- | ------------- |
  | `whatsapp-web.js` | Lower            | High RAM (~300-500 MB / session) |
  | `baileys`         | Higher           | Low RAM (~30-80 MB / session) |

### Safe-sending guidelines

1. **Warm up fresh numbers** — behave like a normal user for several days.
2. **Don't cold-blast strangers** — first-ever messages to unknown numbers get flagged fast.
3. **Rate-limit yourself** — use the built-in `RATE_LIMIT_*` env vars.
4. **Use opted-in recipients** — replies, OTPs, order updates.
5. **Keep a fallback** — SMS / email / official Cloud API for auth-critical flows.

---

## Features

### Core

| Feature       | Description |
| ------------- | ----------- |
| REST API      | Full WhatsApp API via HTTP endpoints |
| Multi-Session | Manage multiple WhatsApp accounts |
| Webhooks      | Real-time events with HMAC signature and smart filters |
| Web Dashboard | Visual management interface |
| API Key Auth  | Secure API authentication with session scoping |
| Swagger Docs  | Interactive API documentation |

### Messaging

| Feature           | Description |
| ----------------- | ----------- |
| Text Messages     | Send/receive text messages |
| Media Messages    | Images, videos, documents, audio |
| Message Reactions | React to messages with emoji |
| Message Editing   | Send edits + live `message.edited` events |
| Bulk Messaging    | Send to multiple recipients |
| Message Status    | Track delivery and read receipts |

### Advanced

| Feature             | Description |
| ------------------- | ----------- |
| Groups API          | Create, manage, join, and configure groups |
| Profile Management  | Set display name, about text, and profile picture |
| Call Handling       | `call.received` events, reject calls, auto-reject |
| Channels/Newsletter | WhatsApp Channels support |
| Labels Management   | Organize chats with labels |
| Proxy Support       | Per-session proxy configuration |
| Rate Limiting       | Configurable request limits |
| CIDR Whitelisting   | IP-based access control |
| Audit Logging       | Full audit trail for all admin operations |
| MCP Server          | 25-51 tools for AI agents (Claude, Cursor) |

### Infrastructure

| Feature          | Description |
| ---------------- | ----------- |
| SQLite           | Zero-config embedded database |
| PostgreSQL       | Production-grade database (Neon, Supabase, etc.) |
| Redis Cache      | Optional performance caching |
| S3/MinIO Storage | Media-directory backup/migration + session persistence |
| Docker           | One-command deployment |
| Render Free Tier | Micro-optimized for 512 MB RAM |
| Health Checks    | Kubernetes-ready probes |
| Data Migration   | Export/import between backends |

---

## Quick Start

### Option A: Docker (Recommended)

```bash
git clone https://github.com/Aswinajay/OpenWA.git
cd OpenWA
docker compose -f docker-compose.dev.yml up -d

# Dashboard: http://localhost:2785
# API: http://localhost:2785/api
# Swagger: http://localhost:2785/api/docs
```

### Option B: Local Development

```bash
git clone https://github.com/Aswinajay/OpenWA.git
cd OpenWA
npm ci
npm run dev

# Dashboard: http://localhost:2886
# API: http://localhost:2785/api
```

### Option C: Render Free Tier (Production-Ready, $0/month)

Deploy to [Render](https://render.com) with **Neon PostgreSQL** + **Cloudflare R2** for persistent storage that survives restarts.

**Architecture:**

```
Render Free (512 MB RAM)
├── Node.js 22 + NestJS 11
├── Baileys WebSocket engine (OUTBOUND_ONLY)
├── Neon PostgreSQL (free tier, persistent DB)
├── Cloudflare R2 (free tier, S3-compatible session storage)
└── UptimeRobot cron ping (prevents 15-min sleep)
```

**Step 1: Deploy via Render Blueprint**

1. Push the `lightweight` branch to your GitHub fork
2. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint**
3. Connect your `OpenWA` repo, select `lightweight` branch
4. Click **Apply** — Render auto-creates the service from `render.yaml`

**Step 2: Set Secret Environment Variables**

In Render dashboard → **openwa** → **Env** tab, add:

```
DATABASE_HOST=ep-polished-band-b3o67zju.c-4.ap-southeast-1.aws.neon.tech
DATABASE_NAME=neondb
DATABASE_USERNAME=neondb_owner
DATABASE_PASSWORD=<your-neon-password>
S3_ACCESS_KEY_ID=<your-r2-access-key>
S3_SECRET_ACCESS_KEY=<your-r2-secret-key>
```

**Step 3: Deploy**

Click **Manual Deploy** → **Clear build cache & deploy**

**Step 4: Keep Awake 24/7**

1. Register on [Cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com)
2. Create an HTTP monitor:
   - URL: `https://<your-app>.onrender.com/api/health`
   - Interval: Every 10 minutes
   - Method: `GET`

**Step 5: Pair WhatsApp**

1. Open `https://<your-app>.onrender.com`
2. Enter your `API_MASTER_KEY` for dashboard access
3. **New Session** → Select **Baileys** → Scan QR code

> **Why Neon + R2?** Render Free has ephemeral disk — local SQLite and session files are wiped on every restart. Neon PostgreSQL stores the database externally, and Cloudflare R2 stores Baileys auth state via S3 protocol. Both survive restarts at zero cost.

---

## Send-Only Micro-Optimizations

When using OpenWA for **sending only** (alerts, notifications, OTPs), these optimizations reduce RAM to ~45-75 MB:

| Component | Normal | Optimized |
| :--- | :--- | :--- |
| **Inbound Messages** | Decodes protobuf, emits webhooks, saves to DB | `OUTBOUND_ONLY=true` — drops at socket level |
| **Auxiliary Modules** | 30+ NestJS modules loaded | `LITE_MODE=true` — omits ~25 MB of modules |
| **History Sync** | Downloads past messages | `BAILEYS_SYNC_HISTORY=false` |
| **Inbound Media** | Downloads images/video/audio | `MEDIA_DOWNLOAD_ENABLED=false` |
| **Message Store** | 5,000 messages in memory | `BAILEYS_MESSAGE_STORE_LIMIT=50` |
| **LRU Caches** | 5,000 entries per map | `BAILEYS_SESSION_STORE_MAX_ENTRIES=100` |
| **Online Presence** | Broadcasts online status | `BAILEYS_MARK_ONLINE_ON_CONNECT=false` |
| **V8 Heap** | Unbounded | `--max-old-space-size=256` |

**Outgoing delivery acknowledgments (sent/delivered/read) remain active** even in send-only mode.

---

## Environment Variables

### Core

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `NODE_ENV` | `development` | `production` for deployed instances |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `2785` | HTTP port |
| `NODE_OPTIONS` | — | V8 flags (e.g. `--max-old-space-size=256`) |

### WhatsApp Engine

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `ENGINE_TYPE` | `whatsapp-web.js` | `baileys` for lightweight mode |
| `SESSION_DATA_PATH` | `./data/sessions` | Local session file storage |
| `AUTO_START_SESSIONS` | `false` | Auto-connect on boot |
| `PUPPETEER_SKIP_DOWNLOAD` | `false` | Skip Chromium download (baileys mode) |

### Send-Only Optimizations

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `OUTBOUND_ONLY` | `false` | Drop all inbound messages |
| `LITE_MODE` | `false` | Omit auxiliary modules |
| `BAILEYS_SYNC_HISTORY` | `true` | Skip history sync |
| `BAILEYS_SYNC_FULL_HISTORY` | `true` | Skip full history sync |
| `MEDIA_DOWNLOAD_ENABLED` | `true` | Disable inbound media downloads |
| `BAILEYS_MARK_ONLINE_ON_CONNECT` | `true` | Stay invisible on connect |
| `BAILEYS_MESSAGE_STORE_LIMIT` | `5000` | Reduce to 50 |
| `BAILEYS_SESSION_STORE_MAX_ENTRIES` | `5000` | Reduce to 100 |

### Database

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `DATABASE_TYPE` | `sqlite` | `sqlite` or `postgres` |
| `DATABASE_NAME` | `./data/openwa.sqlite` | SQLite path or Postgres DB name |
| `DATABASE_HOST` | — | Postgres host (required when `postgres`) |
| `DATABASE_USERNAME` | — | Postgres username (required when `postgres`) |
| `DATABASE_PASSWORD` | — | Postgres password (required when `postgres`) |

### Storage

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `STORAGE_TYPE` | `local` | `local` or `s3` |
| `S3_BUCKET` | — | S3/R2 bucket name |
| `S3_ACCESS_KEY_ID` | — | S3 access key |
| `S3_SECRET_ACCESS_KEY` | — | S3 secret key |
| `S3_ENDPOINT` | — | S3 endpoint URL |
| `S3_REGION` | `auto` | S3 region |

### Optional Services

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `REDIS_ENABLED` | `false` | Enable Redis cache |
| `QUEUE_ENABLED` | `false` | Enable message queue |
| `SEARCH_ENABLED` | `false` | Enable search |
| `MCP_ENABLED` | `false` | Enable MCP server for AI agents |
| `SERVE_DASHBOARD` | `true` | Serve the web dashboard |

### Security

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `API_MASTER_KEY` | — | Admin API key (32+ chars, auto-generated in Render) |

---

## API Examples

### Create a Session

```bash
curl -X POST http://localhost:2785/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"name": "my-bot"}'
```

### Start Session & Get QR Code

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/start \
  -H "X-API-Key: YOUR_API_KEY"

curl http://localhost:2785/api/sessions/{sessionId}/qr \
  -H "X-API-Key: YOUR_API_KEY"
```

### Send a Message

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/messages/send-text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "chatId": "628123456789@c.us",
    "text": "Hello from OpenWA!"
  }'
```

### Setup Webhook

```bash
curl -X POST http://localhost:2785/api/sessions/{sessionId}/webhooks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["message.received", "session.status"],
    "secret": "your-hmac-secret"
  }'
```

### MCP Server (AI Agents)

```bash
MCP_ENABLED=true npm run start:prod
```

Point an MCP client at `POST /mcp` — 25 read-only tools by default, 51 with `MCP_READONLY=false`.

---

## Tech Stack

| Layer         | Technology |
| ------------- | ---------- |
| **Runtime**   | Node.js 22 LTS |
| **Framework** | NestJS 11.x |
| **Language**  | TypeScript 6.x |
| **WA Engine** | whatsapp-web.js (default) / baileys |
| **Database**  | SQLite / PostgreSQL |
| **Cache**     | Redis (optional) |
| **Storage**   | Local / S3 / MinIO / Cloudflare R2 |
| **ORM**       | TypeORM |
| **Container** | Docker + Docker Compose |
| **Free Cloud**| Render + Neon + Cloudflare R2 |

---

## Project Structure

```
openwa/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── config/                 # Configuration
│   ├── common/                 # Shared utilities
│   ├── core/                   # Core systems (hooks, plugins)
│   ├── engine/                 # WhatsApp engine abstraction
│   └── modules/
│       ├── session/            # Session management
│       ├── message/            # Message handling
│       ├── webhook/            # Webhook management
│       ├── group/              # Groups API
│       ├── contact/            # Contacts API
│       ├── auth/               # API key authentication
│       ├── infra/              # Infrastructure management
│       └── health/             # Health checks
├── dashboard/                  # React web dashboard
├── docs/                       # Documentation
├── render.yaml                 # Render Blueprint (auto-deploy)
├── .env.render.example         # Render env var reference
├── Dockerfile.render           # Render Docker build
├── docker-compose.yml          # Docker production stack
└── package.json
```

---

## Documentation

| Document | Description |
| -------- | ----------- |
| [Project Overview](./docs/01-project-overview.md) | Introduction and goals |
| [Requirements](./docs/02-requirements-specification.md) | Feature specifications |
| [Architecture](./docs/03-system-architecture.md) | System design |
| [Security](./docs/04-security-design.md) | Security implementation |
| [Database](./docs/05-database-design.md) | Data models and migrations |
| [API Spec](./docs/06-api-specification.md) | Complete API reference |
| [Development](./docs/08-development-guidelines.md) | Coding standards |
| [Migration Guide](./docs/14-migration-guide.md) | Database & storage migration |
| [Render Deployment](./RENDER_DEPLOYMENT.md) | Render Free Tier deployment guide |

---

## Live Deployment

**Production URL**: `https://wa.eletroclay.com`

| Component | Details |
| --- | --- |
| **Platform** | Render Free Tier (512 MB RAM) |
| **Engine** | Baileys (WebSocket, OUTBOUND_ONLY mode) |
| **Database** | Neon PostgreSQL (free tier) — `ep-polished-band-b3o67zju` |
| **Session Storage** | Cloudflare R2 — `openwa-sessions` bucket |
| **RAM Usage** | ~45-75 MB (send-only optimized) |
| **Sleep Prevention** | UptimeRobot cron ping every 10 minutes |

### Environment Variables (Render Dashboard)

```
# Core
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=256
HOST=0.0.0.0
ENGINE_TYPE=baileys
OUTBOUND_ONLY=true
LITE_MODE=true

# Database (Neon PostgreSQL)
DATABASE_TYPE=postgres
DATABASE_HOST=ep-polished-band-b3o67zju.c-4.ap-southeast-1.aws.neon.tech
DATABASE_NAME=neondb
DATABASE_USERNAME=neondb_owner
DATABASE_PASSWORD=<neon-password>

# Storage (Cloudflare R2)
STORAGE_TYPE=s3
S3_BUCKET=openwa-sessions
S3_ENDPOINT=https://e6c5136e76b8d4e558655935bb86d510.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=<r2-access-key>
S3_SECRET_ACCESS_KEY=<r2-secret-key>

# Disabled (save RAM)
BAILEYS_SYNC_HISTORY=false
MEDIA_DOWNLOAD_ENABLED=false
BAILEYS_MARK_ONLINE_ON_CONNECT=false
BAILEYS_MESSAGE_STORE_LIMIT=50
BAILEYS_SESSION_STORE_MAX_ENTRIES=100
QUEUE_ENABLED=false
REDIS_ENABLED=false
CACHE_ENABLED=false
SEARCH_ENABLED=false
MCP_ENABLED=false
SERVE_DASHBOARD=true
PUPPETEER_SKIP_DOWNLOAD=true
```

---

## RentalApp Integration

OpenWA powers WhatsApp notifications for [RentalApp](https://github.com/Aswinajay/RentalApp) — a serverless dress rental management system on Cloudflare Workers.

### How It Connects

```
RentalApp (Cloudflare Worker)
    |
    +-- POST /api/v1/whatsapp/send (enqueue job)
    |
    +-- Cloudflare Queue (whatsapp-jobs)
    |
    +-- Worker queue consumer
            |
            +-- POST https://wa.eletroclay.com/api/sessions/{sessionId}/messages/send-text
            |       Authorization: Bearer <OPENWA_API_KEY>
            |
            +-- OpenWA → WhatsApp (Baileys WebSocket)
```

### RentalApp Secrets

```bash
# Set in Cloudflare Worker
wrangler secret put OPENWA_API_KEY   # OpenWA master API key
wrangler secret put OPENWA_URL       # https://wa.eletroclay.com
wrangler secret put JWT_SECRET       # openssl rand -hex 32
```

### Message Types Sent

| Trigger | Message Type | Description |
| --- | --- | --- |
| Booking confirmed | `booking_confirmation` | Rental details, dress info, amount |
| Payment received | `payment_receipt` | Payment amount, balance due |
| Status update | `status_update` | Booked → Picked Up → Delivered → Returned |
| Return reminder | `return_reminder` | Upcoming return date notification |
| Overdue alert | `overdue_alert` | Late fee warning |
| Invoice | `invoice` | Full rental invoice with all charges |

### Webhook (Delivery Tracking)

OpenWA sends delivery status back to RentalApp:

```bash
POST https://rental-api.aswinajay949.workers.dev/api/v1/whatsapp/webhook
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256>

{
  "event": "message.delivery",
  "data": {
    "id": "job-uuid",
    "status": "delivered",
    "timestamp": "2026-09-21T10:00:00Z"
  }
}
```

### Keep-Alive

RentalApp's Cloudflare cron triggers pings OpenWA every 10 minutes:

```
GET https://wa.eletroclay.com/api/health
```

This prevents Render Free Tier from spinning down the service after 15 minutes of inactivity.

---

## Contributing

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please read [Development Guidelines](./docs/08-development-guidelines.md) for coding standards.

---

## License

This project is licensed under the **MIT License** — free for personal and commercial use.

See [LICENSE](./LICENSE) for details.

---

<div align="center">

**OpenWA** — Free, Open Source WhatsApp API Gateway

[Documentation](./docs/README.md) · [API Docs](http://localhost:2785/api/docs) · [Report Bug](https://github.com/rmyndharis/OpenWA/issues) · [Request Feature](https://github.com/rmyndharis/OpenWA/issues)

<br/>

<sub>Made with ❤️ by <a href="https://github.com/rmyndharis">Yudhi Armyndharis</a> and the OpenWA Community</sub>

</div>
