# ⚡ YouTube Summariser AI

> Turn any YouTube video into clear, structured summaries and chat directly with its content using cutting-edge LLMs and serverless edge architecture.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://youtube-video-summarizer-ai-beta.vercel.app)
[![Cloudflare Workers](https://img.shields.io/badge/Backend-Cloudflare%20Workers-orange?style=for-the-badge&logo=cloudflare)](https://workers.cloudflare.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Turso](https://img.shields.io/badge/Database-Turso%20libSQL-008080?style=for-the-badge&logo=sqlite)](https://turso.tech/)
[![Tailwind CSS v4](https://img.shields.io/badge/Styles-Tailwind%20v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

---

## 🌟 Highlights

- 🎯 **Instant Structured Summaries**: Generates high-yield overviews, key insights, takeaways, action items, and notable quotes.
- 💬 **Interactive Follow-up Chat**: Ask questions directly about any video; conversation history is preserved per video.
- 🎨 **Adaptive Tones**: Switch between `Bullet points`, `Detailed`, `Gen-Z`, and `Formal` tones to match your preferred reading style.
- 🔑 **B2B Developer API**: First-class developer dashboard with self-service, revocable API keys (`yt_live_...`) to summarize videos programmatically.
- ⚡ **Edge-Powered Architecture**: Global ultra-low latency with Cloudflare Workers + Hono and Turso's distributed SQLite database.
- 🛡️ **Anti-Bot Resilient**: Built-in proxy fallback using Apify to reliably extract transcripts even when YouTube datacenter egress IPs are restricted.
- 🌓 **Sleek Responsive UI**: Modern dark/light theme support, glassmorphism aesthetics, mobile drawer, and bottom navigation.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, React Router 6, DOMPurify, Marked |
| **Backend** | Cloudflare Workers, Hono, TypeScript, `@libsql/client/web` |
| **Database** | Turso (distributed edge libSQL / SQLite) |
| **AI / LLM** | OpenAI-compatible API interface (supports Gemini, OpenAI, Claude via proxy) |
| **Transcript Pipeline** | Watch-page captions + Apify transcript extractor actor fallback |
| **Authentication** | PBKDF2 password hashing (100k rounds) + WebCrypto HS256 JWT + Google & GitHub OAuth |
| **Deployment** | Vercel (Frontend SPA) + Cloudflare Workers (Edge API) |

---

## 📐 Architecture Overview

```
 ┌────────────────────────┐
 │   Vite + React SPA     │  (Vercel)
 │ (Tailwind v4, UI/UX)   │
 └───────────┬────────────┘
             │ HTTPS / REST
             ▼
 ┌────────────────────────┐
 │ Cloudflare Worker API  │  (Hono Router)
 │  - JWT & API Key Auth  │
 │  - Session & Rate Limit│
 └─────┬────────────┬─────┘
       │            │
       │            ▼
       │     ┌───────────────────────────────────┐
       │     │    Turso (libSQL Edge DB)         │
       │     │  - Users, Chats, Messages, Keys   │
       │     └───────────────────────────────────┘
       ▼
 ┌───────────────────────────────────────────────┐
 │ External Services                             │
 │  - YouTube (Watch page / oEmbed metadata)     │
 │  - Apify (Residential transcript extraction)  │
 │  - LLM Provider (Structured summary + chat)   │
 └───────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/)
- A free [Turso](https://turso.tech/) account
- A free [Apify](https://apify.com/) account (for YouTube transcript token)
- An LLM API key (OpenAI or Google Gemini via OpenAI-compatible endpoint)

---

### 1. Database Setup (Turso)

1. Create a database in your Turso dashboard or CLI:
   ```bash
   turso db create youtube-summarizer
   turso db show youtube-summarizer --url
   turso db tokens create youtube-summarizer
   ```
2. Apply the database schema:
   ```bash
   cd backend
   npm install
   # Ensure your backend/.env has TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
   npm run db:migrate
   ```

---

### 2. Backend Setup (Cloudflare Worker)

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   npm install
   ```
2. Create your local secrets file by copying the template:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
3. Fill in the values in `backend/.dev.vars`:
   ```env
   TURSO_DATABASE_URL="libsql://your-db.turso.io"
   TURSO_AUTH_TOKEN="your-turso-token"
   JWT_SECRET="replace-with-a-random-32-char-secret"
   LLM_API_KEY="your-llm-api-key"
   APIFY_API_TOKEN="your-apify-token"
   ```
4. Start the local backend development server:
   ```bash
   npm run dev
   ```
   *The backend will boot up at `http://localhost:8787`.*

---

### 3. Frontend Setup (React + Vite)

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   npm install
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Point to your backend in `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:8787
   ```
4. Launch the frontend development server:
   ```bash
   npm run dev
   ```
   *The app is accessible at `http://localhost:5173`.*

---

## 🌐 Production Deployment

### Backend (Cloudflare Workers)
Deploy the worker and configure production secrets directly via Wrangler:
```bash
cd backend
npm run deploy

# Configure production secrets on Cloudflare:
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put JWT_SECRET
npx wrangler secret put LLM_API_KEY
npx wrangler secret put APIFY_API_TOKEN
```

### Frontend (Vercel)
Deploy the React single page application with the configured `vercel.json` SPA routing:
```bash
cd frontend
npx vercel --prod
```
*Remember to add `VITE_API_URL` to your Vercel Project Environment Variables.*

---

## 📡 API Reference

### User & Chat Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Create a new user account |
| `POST` | `/api/auth/login` | None | Authenticate with email/password and obtain JWT |
| `GET` | `/api/auth/me` | JWT | Fetch current user session details |
| `POST` | `/api/chats` | JWT | Summarize a YouTube video (`{ url, tone? }`) |
| `GET` | `/api/chats` | JWT | List all user chat summaries |
| `GET` | `/api/chats/:id` | JWT | Retrieve full conversation with transcript & summary |
| `POST` | `/api/chats/:id/messages` | JWT | Send a follow-up question in a chat thread |
| `DELETE` | `/api/chats/:id` | JWT | Delete a chat summary conversation |
| `GET` / `PUT` | `/api/preferences` | JWT | Read or update tone and theme preferences |
| `GET` / `POST` | `/api/keys` | JWT | List or generate developer API keys |
| `DELETE` | `/api/keys/:id` | JWT | Revoke an API key |

---

### B2B Developer Endpoint

Summarize YouTube videos programmatically into structured JSON using an API key:

```bash
curl -X POST https://your-worker-subdomain.workers.dev/api/v1/summarize \
  -H "Authorization: Bearer yt_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "tone": "Bullet points"
  }'
```

#### Response Example
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
  "channel": "Rick Astley",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "summary": "...",
  "structured": {
    "overview": "A detailed synthesis of the core topic...",
    "keyInsights": ["Point 1", "Point 2"],
    "actionItems": ["Action 1", "Action 2"],
    "takeaways": ["Takeaway 1"],
    "quotes": ["A memorable quote from the speaker."]
  }
}
```

---

## 🔒 Security Best Practices

- **Never Commit Secrets**: Environment variables (`.env`, `.dev.vars`) are strictly ignored via `.gitignore`.
- **Hashed API Keys**: All developer API keys are generated with secure entropy (`yt_live_...`) and stored solely as SHA-256 hashes in the database.
- **Edge Crypto**: Passwords hashed using PBKDF2 with 100,000 iterations and authenticated sessions verified with WebCrypto HS256 JWTs.

---

## 👤 Author

**Arnav Jain**
- GitHub: [@Arnavjain0805](https://github.com/Arnavjain0805)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
