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
7. **Cloudinary video storage** — new uploads are staged temporarily on the
   backend, uploaded to Cloudinary, and stored in MongoDB as HTTPS playback
   URLs with Cloudinary-generated video-frame thumbnails. Existing local
   uploads remain playable when their files still exist.

## What is intentionally left incomplete (and why)

- **Subscriptions** (`pages/subscriptions.tsx`) — the original backend has no
  Subscription data model at all. Rather than fake it with static videos,
  this page says plainly that the feature isn't wired up. To make it real:
  add a `Subscription` model (`subscriber` → `channel`), `POST/DELETE
  /subscription/:channelId` and `GET /subscription/:userId` routes, a
  "Subscribe" button on the channel page, and swap the placeholder for a
  `VideoGrid` fed by subscribed channels' videos.
- **Cloudinary credentials are required for new uploads** — add them to the
   backend environment before uploading. Existing local-file records remain
   in MongoDB; use the cleanup command below only after reviewing its dry-run.
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
CLOUDINARY_CLOUD_NAME=<your Cloudinary cloud name>
CLOUDINARY_API_KEY=<your Cloudinary API key>
CLOUDINARY_API_SECRET=<your Cloudinary API secret>
```
Set the Cloudinary values in the backend host environment as well. The API
secret must remain server-side; never put it in `yourtube/.env.local` or a
`NEXT_PUBLIC_` variable. **Do not set `PORT`** — Render provides it.

⚠️ If a MongoDB password or Cloudinary API secret was shared in a chat,
ticket, screenshot, or committed file, revoke/rotate it before using it and
update the backend environment. Do not paste secrets into chat or source files.
For Atlas, use a URI with the intended database name, for example
`mongodb+srv://<user>:<url-encoded-password>@<cluster>/<database>?retryWrites=true&w=majority`.

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
- Env vars: `DB_URL`, `FRONTEND_URL`, `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (do not set `PORT`)

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

### Remove stale local-only video records

The cleanup command targets video documents without a `videoUrl` (the old
local-disk records) and their comments, likes, history, and Watch Later
records. It does not delete Cloudinary-backed videos. It is a dry run unless
you pass `--confirm`.

```bash
cd server
npm run cleanup:legacy-videos
# Review the printed IDs and titles before confirming.
npm run cleanup:legacy-videos -- --confirm
```

Run it only after setting `DB_URL` in `server/.env`. The confirmed command
permanently deletes the listed MongoDB records and related interactions; it
does not delete Cloudinary assets. Back up the database first if there is any
chance those old records are needed. No cleanup is run automatically during
startup or deployment.

### Verify a Cloudinary upload

1. Rotate any credentials previously shared, then set fresh values in local
   `server/.env` and the backend host settings. Include the intended MongoDB
   database name in `DB_URL` (usually `/yourtube`) and URL-encode special
   characters in the database username/password.
2. Start the backend with `cd server && npm ci && npm run dev`. Its health URL
   should return JSON at `http://localhost:5000/`.
3. In another terminal, start the frontend with `cd yourtube && npm ci &&
   npm run dev`. Confirm `NEXT_PUBLIC_BACKEND_URL` points to the backend URL.
4. Sign in, upload a small MP4, and wait for the upload request to finish.
   The API response and MongoDB video document should include `videoUrl`,
   `thumbnailUrl`, and `cloudinaryPublicId`.
5. Confirm the `videoUrl` is HTTPS and opens, the video plays on the watch
   page, and the video-frame poster is visible on the home/explore card.
6. Open the deployed site on a different device/network and repeat playback.
   For deployment, set the same Cloudinary values only in the backend host,
   set the production frontend origin in `FRONTEND_URL`, and set the public
   backend URL in the frontend's `NEXT_PUBLIC_BACKEND_URL`.

If upload returns a configuration error, recheck the three Cloudinary backend
variables and restart/redeploy the backend. If MongoDB connects but the video
catalogue is unexpectedly empty, check that `DB_URL` points to the same
database used by the existing records. Cloudinary's free plan has usage
quotas, so monitor storage, transformations, and delivery in its console.

## Still on you

- [ ] Rotate any exposed MongoDB password and Cloudinary API secret
- [ ] Set Cloudinary credentials in the backend environment (local
   `server/.env` and the deployed backend host)
- [ ] Review and run the stale-video cleanup only if desired
- [ ] Create a Firebase project, enable Google sign-in, fill in the
      frontend env vars
- [ ] Set Render/Vercel env vars and confirm CORS works end-to-end
- [ ] Add server-side auth verification on write routes if this will have
      real users
- [ ] Build out Subscriptions if you want that feature
