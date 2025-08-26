## No‑BS Chat

A minimal, production‑ready chat application with Google OAuth, multiple rooms, optional room passwords, and real‑time messaging via Socket.IO. The project is split into a React (Vite) client and a Node.js/Express server using MongoDB.


Short architecture note & future improvements
- Architecture: The client is a Vite/React app using Socket.IO for realtime and a small REST layer for auth/profile, room CRUD, and message history. The server is modularized into config, routes, middleware, auth (Passport), sockets, and models. Sessions back Passport, and Socket.IO reuses the same session for authenticated sockets. MongoDB (Mongoose) stores users, rooms (with number/passwordHash), and messages.
- With more time: I’d add E2E tests (Playwright/Cypress) and API tests (Jest/Supertest), production TLS and cookie hardening, rate‑limiting and input validation (zod/celebrate), structured logging (pino/winston) with request IDs, horizontal scalability for Socket.IO (Redis adapter) and Mongo (indexes, TTL if needed), CI/CD with lint/tests, better error boundaries on the client, and a permissions model (owners/mods per room).


### Tech Stack
- Client: React + TypeScript, Vite, TailwindCSS
- Realtime: Socket.IO
- Server: Node.js, Express, Passport (Google), bcryptjs
- DB: MongoDB/Mongoose
- Auth: Session‑based (cookies)

---

## Architecture

Monorepo with two apps:

```
no-bs-chat/
  client/                 # React app (Vite)
  server/                 # Express API + Socket.IO + Passport
```

Server modules:
- `server/config.js`: Centralized env + derived config
- `server/config/session.js`: Session middleware factory
- `server/auth/passport.js`: Passport strategy + serialize/deserialize
- `server/middleware/auth.js`: `authCheck` middleware
- `server/routes/auth.js`: OAuth routes (`/auth/google`)
- `server/routes/api.js`: REST API (`/api/...`)
- `server/sockets/index.js`: Socket.IO server + event handlers
- `server/models/*`: `User`, `Room`, `Message`

Client modules:
- `client/src/types/chat.ts`: Shared domain types
- `client/src/utils/config.ts`: Env‑driven API/SOCKET URLs
- `client/src/components/*`: Pages and UI components
- `client/src/socket.ts`: Socket.IO client (with credentials)

---

## Prerequisites
- Node.js LTS (>= 18)
- npm (>= 9)
- MongoDB running locally or in the cloud (e.g., Atlas)

---

## Environment Variables

Create `server/.env` with:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/no-bs-chat
CLIENT_ORIGIN=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
# Optional: if hostname is localhost without port, server auto-injects PORT
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Session
SESSION_SECRET=replace_with_strong_secret
```

Create `client/.env` with:
```
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
# Optional fallback port used by config helper
VITE_SERVER_PORT=5000
```

---

## Setup & Run

Install dependencies:
```
# from repo root
cd server && npm install && cd ..
cd client && npm install && cd ..
```

Start server (port 5000 by default):
```
cd server
npm start
# or: npm run dev (if you have nodemon configured)
```

Start client (Vite dev server on 5173):
```
cd client
npm run dev
```

Open the app at `http://localhost:5173`.

---

## Getting a MongoDB URI (MONGO_URI)

You can run MongoDB locally or use a hosted provider like MongoDB Atlas.

### Option A: Local MongoDB
1. Install MongoDB Community Server for your OS from `https://www.mongodb.com/try/download/community`.
2. Start the MongoDB daemon (depends on OS). On many systems:
   - macOS (Homebrew): `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`
   - Windows: Start the MongoDB service from Services or run `mongod`.
3. Default local URI:
```
MONGO_URI=mongodb://localhost:27017/no-bs-chat
```
This creates/uses a database named `no-bs-chat`.

### Option B: MongoDB Atlas (Hosted)
1. Go to `https://www.mongodb.com/cloud/atlas` and create an account (free tier available).
2. Create a project and a free cluster.
3. Create a database user (username/password) and set Network Access → IP Access List to allow your IP (or 0.0.0.0/0 for dev only).
4. Click “Connect” → “Connect your application” → copy the connection string. It looks like:
```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/no-bs-chat?retryWrites=true&w=majority
```
Replace `<username>`, `<password>`, and `<cluster>` with your values.

---

## Getting Google OAuth Credentials

1. Go to Google Cloud Console: `https://console.cloud.google.com/` and sign in.
2. Create or select a project.
3. Enable APIs & Services → “OAuth consent screen”:
   - Choose “External” for dev/testing.
   - Fill in app name, user support email, developer contact email.
   - Add scopes if needed (basic profile and email are sufficient).
   - Add test users (your Google account) if the app is not published.
4. Create Credentials → “OAuth client ID”:
   - Application type: “Web application”.
   - Name: e.g., `NoBSChat Web`.
   - Authorized JavaScript origins:
     - `http://localhost:5173`
   - Authorized redirect URIs (must match server callback):
     - `http://localhost:5000/auth/google/callback`
5. After creation, copy:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client Secret → `GOOGLE_CLIENT_SECRET`
6. (Optional) If you change server port or host, update `GOOGLE_CALLBACK_URL` in `server/.env` accordingly. The server auto-injects the port for localhost if missing.

Example server `.env` updates:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
```

---

## Important Notes
- Cookies must be sent cross‑origin; both server and client are configured to allow credentials.
- When changing ports/origins, update `CLIENT_ORIGIN` and client `VITE_*` vars.

---

## Scripts

Server (`server/package.json`):
- `npm start` – start Express server
- `npm run dev` – run in dev (if nodemon configured)

Client (`client/package.json`):
- `npm run dev` – start Vite dev server
- `npm run build` – build for production
- `npm run preview` – preview production build

---

## Project Structure (condensed)
```
server/
  auth/passport.js
  config.js
  config/session.js
  middleware/auth.js
  models/{User.js, Room.js, Message.js}
  routes/{auth.js, api.js}
  sockets/index.js
  server.js

client/
  src/
    components/{ChatPage.tsx, ChatRooms.tsx, ChatWindow.tsx, JoinRoomModal.tsx, LoginPage.tsx}
    types/chat.ts
    utils/config.ts
    socket.ts
    App.tsx
```

---

## Security & Production
- Use a strong `SESSION_SECRET` and rotate it periodically.
- Enable HTTPS in production and set `cookie.secure=true` for sessions.
- Restrict `CLIENT_ORIGIN` to your production domain.
- Store secrets in a vault (not in VCS), use environment‑specific configs.
- Configure CORS carefully; only allow known origins.

---

## License
MIT

