# YourTube

A full-stack YouTube-style video sharing app.
- `server/` — Node.js + Express 5 + MongoDB (Mongoose) API
- `yourtube/` — Next.js 15 (Pages Router) + React 19 + Tailwind 4 frontend

This build was regenerated from a project audit and rebuild spec. It targets
the same routes, models, and pages as the original project, and fixes the
bugs the audit found wherever a fix was possible without your actual original
source files.

## What was fixed in this build

1. **Malformed video URLs** — `server/filehelper/pathHelper.js` normalizes
   any stored path (`uploads\file.mp4`, double-prefixed, etc.) down to a
   clean filename before it's sent to the frontend. The frontend mirrors this
   in `yourtube/src/lib/videoUrl.ts`, so URLs are always built as
   `BACKEND_URL + "/uploads/" + normalizedFilename`.
2. **CORS** — reads `FRONTEND_URL` from env; set it to your real Vercel
   origin in production (see below).
3. **Search using mock data** — `GET /video/getall?q=...` now does a real
   MongoDB regex search; `SearchResult.tsx` calls it instead of using
   hardcoded sample videos.
4. **Auth state not restoring on refresh** — `AuthContext.tsx` now treats
   Firebase's `onAuthStateChanged` as the source of truth (with an
   optimistic localStorage read only to avoid a flash of "signed out"),
   instead of only reading localStorage once on mount.
5. **Channel page only showing the logged-in user** — added
   `GET /user/:id` on the backend and a `?channel=` filter on
   `GET /video/getall`. The channel page (`pages/channel/[id].tsx`) now
   fetches the channel in the URL, and `ChannelVideos.tsx` fetches only that
   channel's uploads.
6. **Route/response consistency** — every controller validates ObjectIds,
   returns JSON (never leaves a request hanging), and errors return a
   consistent `{ success, message }` shape. A catch-all 404 handler always
   returns JSON instead of an HTML 404 page.

## What is intentionally left incomplete (and why)

- **Subscriptions** (`pages/subscriptions.tsx`) — the original backend has no
  Subscription data model at all. Rather than fake it with static videos,
  this page says plainly that the feature isn't wired up. To make it real:
  add a `Subscription` model (`subscriber` → `channel`), `POST/DELETE
  /subscription/:channelId` and `GET /subscription/:userId` routes, a
  "Subscribe" button on the channel page, and swap the placeholder for a
  `VideoGrid` fed by subscribed channels' videos.
- **Persistent video storage** — uploaded files still write to
  `server/uploads/` on local disk. This is fine for local development but
  **will lose files on Render after a restart or redeploy**. Before relying
  on this in production, swap `server/filehelper/upload.js`'s multer
  `diskStorage` for an S3/Cloudinary/Azure Blob storage engine.
- **Auth/authorization checks on write routes** — routes like
  `/video/upload`, `/comment/postcomment`, `/like/:videoId`, etc. currently
  trust whatever `userId`/`uploader` the client sends. There's no server-side
  verification (e.g. a Firebase ID token check) that the request really came
  from that user. Add a middleware that verifies a Firebase ID token sent in
  an `Authorization` header before trusting any user id in the request body.
- **Category tabs are cosmetic** — `CategoryTabs.tsx` renders the UI but
  doesn't filter anything, because the `Video` model has no category field.

## Environment variables

### `server/.env` (copy from `server/.env.example`)
```
DB_URL=<your MongoDB connection string>
FRONTEND_URL=<your deployed frontend origin, e.g. https://your-app.vercel.app>
```
**Do not set `PORT`** — Render provides it automatically.

⚠️ If a MongoDB password was ever pasted into a chat, ticket, or committed
file, rotate it in MongoDB Atlas now and update `DB_URL` everywhere it's used.

### `yourtube/.env.local` (copy from `yourtube/.env.example`)
```
NEXT_PUBLIC_BACKEND_URL=<your Render backend URL>
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Running locally

```bash
# backend
cd server
npm install
cp .env.example .env   # then fill in DB_URL
npm run dev            # http://localhost:5000

# frontend (separate terminal)
cd yourtube
npm install
cp .env.example .env.local   # then fill in values
npm run dev             # http://localhost:3000
```

## Deployment

**Render (backend)**
- Root Directory: `server`
- Build Command: `npm ci`
- Start Command: `npm start`
- Env vars: `DB_URL`, `FRONTEND_URL` (do not set `PORT`)

**Vercel (frontend)**
- Root Directory: `yourtube`
- Framework: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`
- Env vars: `NEXT_PUBLIC_BACKEND_URL` + the Firebase `NEXT_PUBLIC_FIREBASE_*` vars

After both are deployed:
1. Set Render's `FRONTEND_URL` to your exact Vercel production URL (no
   trailing slash).
2. Add your Vercel domain to Firebase Console → Authentication →
   Settings → Authorized domains, or Google sign-in will fail there.

## Still on you

- [ ] Rotate the exposed MongoDB password
- [ ] Run `npm install` in both `server/` and `yourtube/` (this build
      environment has no network access, so dependencies were never
      installed or tested — review `package.json` versions before trusting
      them blindly)
- [ ] Create a Firebase project, enable Google sign-in, fill in the
      frontend env vars
- [ ] Set Render/Vercel env vars and confirm CORS works end-to-end
- [ ] Decide on and wire up persistent storage (S3/Cloudinary/etc.) before
      relying on uploads in production
- [ ] Add server-side auth verification on write routes if this will have
      real users
- [ ] Build out Subscriptions if you want that feature
