# ⚡ Power House

**Power House** is a real-time, single-channel global walkie-talkie platform. Every connected user shares one live audio frequency. **Only one person can speak at a time** — enforced with strict server-side concurrency locks.

Power House can be opened in any desktop or mobile browser and installed directly to your phone's home screen or app drawer as a **Progressive Web App (PWA)** without needing a native APK.

---

## ✨ Core Product Rules & Highlights

- ⚡ **Single Global Live Audio Channel**: Every authenticated user is automatically on the same global channel. No private rooms, no groups, no call requests.
- 🔒 **Server-Enforced Speaker Lock**: When a user holds Push-to-Talk (PTT), `asyncio.Lock` atomically grants the channel. Any other user pressing PTT receives a `"Channel Busy: <Speaker> is speaking"` notice immediately.
- 📱 **Download App (PWA)**: Installable like a college ERP / web application directly on Android, iPhone, and desktop. Opens in its own fullscreen standalone window from the phone's app drawer.
- 🎙️ **Microphone & Audio Reuse**: Requests microphone permission only when first transmitting; reuses the stream and mutes tracks on release without repeatedly prompting the user. Browser audio output initializes once (`Start Listening`) and plays incoming voice transmissions automatically.
- 🌐 **WebRTC Real-Time Audio**: Peer-to-peer audio transmission over WebRTC with WebSocket signaling. No recordings, no saved files, zero persistent audio history.
- ⌨️ **Cross-Platform PTT**: Supports desktop pointer events, spacebar hotkey, mobile touch events (`touch-action: none`), and blur safety releases.

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────┐
│                       POWER HOUSE                      │
│                Single Global Frequency                 │
└────────────────────────────────────────────────────────┘
          ▲                                ▲
          │ WebSocket Signaling            │ WebRTC Audio
          │ (speaker lock, presence)       │ (1-to-N live stream)
          ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐
│   FastAPI Backend     │        │   React 19 Frontend   │
│   (uvicorn / Python)  │        │   (Vite + Tailwind)   │
│                       │        │                       │
│  • SpeakerService     │        │  • PWA Shell & sw.js  │
│    (asyncio.Lock)     │        │  • PushToTalkButton   │
│  • ConnectionManager  │        │  • AudioManager       │
│  • JWT Auth & bcrypt  │        │  • CurrentSpeaker     │
│  • PostgreSQL / SQLite│        │  • DownloadAppModal   │
└───────────────────────┘        └───────────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- Virtual environment in `./venv`

### 1. Start Backend Server

```powershell
$env:PYTHONPATH = "backend"
.\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

- API Base: `http://127.0.0.1:8000`
- Health check: `http://127.0.0.1:8000/health`
- Swagger Docs: `http://127.0.0.1:8000/docs`
- Database: Automatically uses PostgreSQL if available; gracefully falls back to local SQLite (`sqlite:///./walkie_talkie.db`).

### 2. Start Frontend Dev Server

```powershell
$destDir = "$env:LOCALAPPDATA\Programs\nodejs"; $env:PATH = "$destDir;$env:PATH"
cd frontend
npm run dev -- --host 127.0.0.1
```

- Application URL: [http://localhost:5173](http://localhost:5173) (or `http://127.0.0.1:5173`)

---

## 📲 How to Install the App (PWA)

Power House includes a clearly visible **Download App** button on both the login/registration screen and the top header of the main dashboard:

1. **Android (Chrome / Edge / Samsung Internet)**:
   - Click **Download App** or tap the browser's menu (⋮) -> **Install app** / **Add to Home screen**.
   - Power House installs to your device's app drawer with its branded lightning bolt icon and opens in a standalone window.
2. **iPhone / iPad (Safari)**:
   - Tap the **Share** button in Safari -> scroll down and select **Add to Home Screen** -> tap **Add**.
3. **Desktop (Chrome / Edge)**:
   - Click the install icon in the address bar or select **Install Power House** from the browser menu.

---

## 🔐 Authentication & API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register with `name`, `email`, and `password`. Generates unique `user_id` (`USR_XXXXXXX`). |
| `POST` | `/api/auth/login` | Login with email and password to receive JWT access token. |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile. |
| `PUT` | `/api/users/profile` | Update user display name or profile picture. |
| `WS` | `/ws?token=<JWT>` | WebSocket connection to global live audio channel. |

---

## 🧪 Automated Testing

### Backend Test Suite
```powershell
$env:PYTHONPATH = "backend"
.\venv\Scripts\pytest.exe -v backend\tests
```
- Tests cover unique user ID generation (`USR_XXXXXXX`), password hashing, JWT encoding/decoding, single-speaker lock lifecycle, rate limiting, and 5 simultaneous concurrent speaker requests.
- Additional 4-user scenario verification (`Sarafat`, `Rahul`, `Amit`, `Priya`):
  ```powershell
  .\venv\Scripts\python.exe backend\tests\test_power_house_four_users.py
  ```

### Frontend Test Suite
```powershell
$destDir = "$env:LOCALAPPDATA\Programs\nodejs"; $env:PATH = "$destDir;$env:PATH"
cd frontend
npm test
```
- 20 unit tests covering `PushToTalkButton`, `ConnectionBadge`, `CurrentSpeaker`, `AudioVisualizer`, `OnlineUserCount`, and `DownloadAppModal`.

### Production Build
```powershell
npm run build
```
- Compiles production TypeScript bundle into `frontend/dist/`.

---

## 🌍 Production Deployment & Scaling

1. **Domain & HTTPS/WSS**:
   - Progressive Web App installation, browser microphone permissions, and WebRTC require **HTTPS** (and `wss://` for WebSocket) in production.
2. **Environment Variables**:
   - Configure `VITE_BACKEND_URL` on the frontend (e.g. `https://api.yourdomain.com`).
   - Configure `DATABASE_URL` (PostgreSQL) and `JWT_SECRET` on the backend.
3. **STUN/TURN & Media Routing**:
   - Default STUN servers: `stun:stun.l.google.com:19302`.
   - For users behind strict symmetric cellular NATs or firewalls, configure a **TURN server** (e.g., coturn) in `backend/app/config.py` and `frontend/src/hooks/useWebRTC.ts`.
   - For scaling beyond prototype peer mesh (e.g., thousands of simultaneous listeners), attach a WebRTC **Selective Forwarding Unit (SFU)** such as mediasoup or LiveKit.
