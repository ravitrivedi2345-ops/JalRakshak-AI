# JalRakshak AI — 1-Click Production Cloud Deployment Guide

This guide walks through deploying **JalRakshak AI** live to cloud hosting (**Render** for FastAPI + PostgreSQL backend and **Vercel** for React + Vite PWA frontend).

---

## 📋 Prerequisites

Before deploying, ensure you have:
1. A **GitHub account** with this repository pushed to your remote.
2. A free account on **[Render.com](https://render.com)** (for backend & PostgreSQL).
3. A free account on **[Vercel.com](https://vercel.com)** (for frontend PWA hosting).
4. *(Optional)* Live API keys for:
   - **Google Gemini AI**: [Google AI Studio](https://aistudio.google.com/)
   - **Sentinel Hub / Copernicus**: [Sentinel Hub Dashboard](https://apps.sentinel-hub.com/)

---

## 🚀 Step 1: Deploy Backend + PostgreSQL on Render

### Option A: Using Render Blueprint (Recommended — 1-Click)

1. Log into **[Render Dashboard](https://dashboard.render.com)**.
2. Click **New +** ➔ **Blueprint**.
3. Connect your GitHub repository (`JalRakshak-AI`).
4. Render will automatically detect `render.yaml` and prompt to create:
   - **Database**: `jalrakshak-postgres` (Managed PostgreSQL 16)
   - **Web Service**: `jalrakshak-backend` (FastAPI Uvicorn server)
5. Click **Apply**. Render will automatically provision the PostgreSQL database and deploy the FastAPI API.

### Option B: Manual Service Creation on Render

If creating services manually:
1. **Create Database**:
   - Click **New +** ➔ **PostgreSQL**.
   - Name: `jalrakshak-postgres`, Database Name: `jalrakshak_db`, User: `jalrakshak_user`.
   - Copy the **Internal Database URL** (`postgres://...`).
2. **Create Web Service**:
   - Click **New +** ➔ **Web Service**.
   - Root Directory: `backend`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/api/v1/health`

---

## 🔑 Step 2: Configure Backend Environment Secrets on Render

In your Render `jalrakshak-backend` Web Service dashboard ➔ **Environment**, add the following keys:

| Environment Variable | Recommended Value / Description |
| :--- | :--- |
| `APP_ENV` | `production` |
| `DATABASE_URL` | Auto-populated by Render PostgreSQL connection string |
| `JWT_SECRET_KEY` | Generate a strong secret string |
| `FRONTEND_ORIGINS` | `https://jalrakshak.vercel.app,https://your-custom-domain.com` |
| `GEMINI_API_KEY` | Your Google Gemini API Key |
| `SATELLITE_PROVIDER` | `sentinel-hub` |
| `SENTINEL_HUB_CLIENT_ID` | Your Sentinel Hub OAuth Client ID |
| `SENTINEL_HUB_CLIENT_SECRET` | Your Sentinel Hub OAuth Client Secret |
| `SENTINEL_HUB_INSTANCE_ID` | Your Sentinel Hub OGC Instance ID |

*Once saved, Render will trigger an automatic redeploy.*

---

## 🌐 Step 3: Deploy Frontend on Vercel

1. Log into **[Vercel Dashboard](https://vercel.com/dashboard)**.
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository (`JalRakshak-AI`).
4. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (or `frontend`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://jalrakshak-backend.onrender.com` (Your Render backend live URL)
6. Click **Deploy**.

*Vercel will build the React application, attach security headers, deploy the PWA service worker (`/sw.js`), and route `/api/*` traffic automatically to your Render backend via `vercel.json` rewrites.*

---

## ✅ Step 4: Live Post-Deployment Health Check

Once both services finish deploying:

1. **Verify Backend Health**:
   Open `https://jalrakshak-backend.onrender.com/api/v1/health`
   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "status": "healthy",
       "database": "connected",
       "satellite_provider": "sentinel-hub",
       "ai_detector": "active (YOLO weights loaded)",
       "gemini": { "status": "configured" }
     }
   }
   ```

2. **Verify Interactive Swagger UI**:
   Open `https://jalrakshak-backend.onrender.com/docs`

3. **Verify Live Frontend**:
   Open your Vercel deployment URL (`https://jalrakshak.vercel.app`).
   - Check the top right **Backend Connected** pill.
   - Click the profile avatar to switch roles (**Super Admin**, **Field Verifier**, **Viewer**).
   - Test offline capabilities by opening Chrome DevTools ➔ Network ➔ **Offline**.

---

## 📱 Mobile PWA Installation Instructions

1. Open your Vercel live URL on Android Chrome or iOS Safari.
2. Android: Tap menu ➔ **"Add to Home screen"** or **"Install app"**.
3. iOS: Tap Share button ➔ **"Add to Home Screen"**.
4. Launch **JalRakshak AI** directly from your device home screen with full offline field support.
