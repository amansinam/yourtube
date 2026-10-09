# YourTube

YourTube is a full-stack video-sharing platform with Google sign-in, video playback, uploads, comments, likes, watch history, Watch Later, and light/dark themes.

| Part | Stack |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Express 5, MongoDB/Mongoose |
| Authentication | Firebase Google Authentication, Firebase Admin, cookie-backed app sessions |
| Video storage | Cloudinary |

## Repository structure

```text
yourtube/   Next.js frontend
server/     Express API
```

## Deployment status

The project is ready to deploy to a resume/demo environment once all environment variables below are configured. Server-side session checks protect account-data and write operations (uploads/deletion, comments, likes, Watch Later, and signed-in history), and controllers use the verified session user rather than client-supplied user IDs.

For an unrestricted public product, add rate limiting, production monitoring, a privacy policy, and automated end-to-end tests. These are sensible production hardening improvements, not deployment blockers for the stated resume/demo use case.

## Prerequisites

- Node.js 20 LTS or later
- MongoDB Atlas or another reachable MongoDB deployment
- A Firebase project with Google sign-in enabled
- Firebase service-account credentials for the backend
- Cloudinary account/API credentials for uploads

## Environment variables

Never commit `.env` or `.env.local` files. The included example files are the source of truth:

- `server/.env.example`
- `yourtube/.env.example`

### Backend: `server/.env`

```env
DB_URL=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/yourtube?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:3000

FIREBASE_SERVICE_ACCOUNT_JSON={...single-line Firebase service-account JSON...}

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Optional backend settings are documented in `server/.env.example`, including session duration, local temporary upload directory, and history completion threshold.

### Frontend: `yourtube/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

`NEXT_PUBLIC_*` values are intentionally visible to the browser. Do not put Firebase Admin, MongoDB, Cloudinary secret, or other private credentials there.

## Run locally

Install dependencies in both applications:

```powershell
cd server
npm ci

cd ..\yourtube
npm ci
```

Create local environment files from the examples and fill in values. Then use two terminals:

```powershell
# Terminal 1: backend
cd server
npm run dev

# Terminal 2: frontend
cd yourtube
npx next dev -p 3000
```

- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:5000/`

## Deploy to Vercel and Render

### 1. Deploy the backend (Render)

Create a Web Service from this repository.

| Render setting | Value |
| --- | --- |
| Root Directory | `server` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/` |

Set all backend variables listed above in Render's environment/secret settings. Do not set `PORT`; Render supplies it. Initially set `FRONTEND_URL` to the production Vercel URL after it is created, without a trailing slash.

### 2. Deploy the frontend (Vercel)

Import the same repository as a separate Vercel project.

| Vercel setting | Value |
| --- | --- |
| Root Directory | `yourtube` |
| Framework | Next.js |
| Install Command | `npm ci` |
| Build Command | `npm run build` |

Set all frontend variables above. `NEXT_PUBLIC_BACKEND_URL` must be the HTTPS URL of the deployed Render service, without a trailing slash. Next.js uses it as the destination for the same-origin `/api/backend/*` rewrite; the browser itself calls that Vercel path so the session cookie remains first-party.

### 3. Connect the services

1. Set Render `FRONTEND_URL` to the exact Vercel production origin, for example `https://yourtube.example.vercel.app`.
2. Redeploy the backend after changing `FRONTEND_URL`.
3. In Firebase Console, add the Vercel domain to **Authentication → Settings → Authorized domains**.
4. The frontend sends API requests through a same-origin Vercel rewrite to Render. This keeps the session cookie first-party in the browser; keep `NEXT_PUBLIC_BACKEND_URL` set to the HTTPS Render URL so the rewrite can reach the backend.
5. Confirm the frontend Firebase settings and `FIREBASE_SERVICE_ACCOUNT_JSON` on the backend belong to the same Firebase project. The user completes Google sign-in with Firebase, and the backend verifies that identity before creating the app session.

## Pre-launch checklist

- [ ] Set every backend and frontend environment variable in the host dashboards.
- [ ] Ensure `FRONTEND_URL` exactly matches the Vercel origin—protocol and no trailing slash included.
- [ ] Add the frontend domain to Firebase authorized domains.
- [ ] Test Google sign-in, logout, and session restoration.
- [ ] Upload a small MP4 and verify Cloudinary playback and thumbnail delivery from a separate device/network.
- [ ] Test comments, likes, Watch Later, history, and video deletion as both owner and non-owner after authorization is fixed.
- [ ] Run `npm run build` in `yourtube` and deploy only when it succeeds.
- [ ] Rotate any credential that has ever been committed, pasted into chat, or shared in screenshots.
- [ ] Configure database backups and monitor MongoDB, Cloudinary, and hosting usage/limits.

## Verification commands

```powershell
cd yourtube
npx tsc --noEmit
npm run build
```

The backend health check should return JSON:

```json
{ "status": "ok", "message": "YourTube backend is running" }
```

## Operational notes

- Uploads accept MP4 files up to 50 MB. Files are staged temporarily by the backend, uploaded to Cloudinary, then deleted locally.
- Cloudinary credentials are required for new uploads.
- Google sign-in requires the Firebase frontend configuration and matching Firebase Admin service-account credentials on the backend.
- The Subscriptions screen is currently a placeholder because the project has no subscription model or API.
- The current API CORS configuration supports one frontend origin through `FRONTEND_URL`. Add an explicit origin allowlist before supporting preview domains or multiple production domains.

## Legacy video cleanup

The optional cleanup script removes old database records that do not have a Cloudinary `videoUrl`, plus associated interactions. It is a dry run by default.

```powershell
cd server
npm run cleanup:legacy-videos
npm run cleanup:legacy-videos -- --confirm
```

Review the dry run and back up MongoDB before using `--confirm`.
