# JalRakshak AI — 1-Click Production Cloud Deployment Guide

This guide walks through deploying **JalRakshak AI** live to cloud hosting (**Render** for FastAPI + PostgreSQL backend and React + Vite static frontend, or Docker / Self-Hosted VPS).

---

## 📋 Prerequisites

Before deploying, ensure you have:
1. A **GitHub account** with this repository pushed to your remote.
2. A free account on **[Render.com](https://render.com)** (for full-stack backend, database, and frontend hosting).
3. *(Optional)* Live API keys for:
   - **Google Gemini AI**: [Google AI Studio](https://aistudio.google.com/)
   - **Sentinel Hub / Copernicus**: [Sentinel Hub Dashboard](https://apps.sentinel-hub.com/)

---

## 🚀 Step 1: Deploy Full-Stack on Render (1-Click Blueprint)

1. Log into **[Render Dashboard](https://dashboard.render.com)**.
2. Click **New +** ➔ **Blueprint**.
3. Connect your GitHub repository (`JalRakshak-AI`).
4. Render will automatically detect `render.yaml` and provision:
   - **Database**: `jalrakshak-postgres` (Managed PostgreSQL 16)
   - **Backend Web Service**: `jalrakshak-backend` (FastAPI Uvicorn server)
   - **Frontend Static Site**: `jalrakshak-frontend` (React + Vite PWA)
5. Click **Apply**. Render will automatically build and deploy both services.

---

## 🔑 Step 2: Configure Backend Environment Secrets on Render

In your Render `jalrakshak-backend` Web Service dashboard ➔ **Environment**, verify or configure:

| Environment Variable | Recommended Value / Description |
| :--- | :--- |
| `APP_ENV` | `production` |
| `DATABASE_URL` | Auto-populated by Render PostgreSQL connection string |
| `JWT_SECRET_KEY` | Generate a strong secret string |
| `FRONTEND_ORIGINS` | `https://*.onrender.com,https://your-custom-domain.com` |
| `GEMINI_API_KEY` | Your Google Gemini API Key |
| `SATELLITE_PROVIDER` | `sentinel-hub` |
| `SENTINEL_HUB_CLIENT_ID` | Your Sentinel Hub OAuth Client ID |
| `SENTINEL_HUB_CLIENT_SECRET` | Your Sentinel Hub OAuth Client Secret |
| `SENTINEL_HUB_INSTANCE_ID` | Your Sentinel Hub OGC Instance ID |

*Once saved, Render will trigger an automatic redeploy.*

---

## 🌐 Step 3: Configure Frontend Environment Variables

In your Render `jalrakshak-frontend` Static Site dashboard ➔ **Environment**:
- `VITE_API_BASE_URL`: Auto-linked to `jalrakshak-backend` (or set manually to `https://jalrakshak-backend.onrender.com`)

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
   Open your frontend deployment URL (`https://jalrakshak-frontend.onrender.com` or custom domain).
   - Check the top right **Backend Connected** pill.
   - Click the profile avatar to switch roles (**Super Admin**, **Field Verifier**, **Viewer**).
   - Test offline capabilities by opening Chrome DevTools ➔ Network ➔ **Offline**.

---

## 📱 Mobile PWA Installation Instructions

1. Open your live application URL on Android Chrome or iOS Safari.
2. Android: Tap menu ➔ **"Add to Home screen"** or **"Install app"**.
3. iOS: Tap Share button ➔ **"Add to Home Screen"**.
4. Launch **JalRakshak AI** directly from your device home screen with full offline field support.
