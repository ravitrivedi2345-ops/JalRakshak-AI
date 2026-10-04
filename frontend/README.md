# JalRakshak AI — Frontend

Responsive web interface for **JalRakshak AI Watershed Intelligence Platform**, built with React 19, Vite, TypeScript, MapLibre GL, Recharts, and Tailwind CSS.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

The web application runs locally at [http://localhost:8443](http://localhost:8443).

## Connected Mode Backend Integration

The frontend automatically connects to the JalRakshak AI FastAPI backend at `http://localhost:8000`. You can configure a custom API endpoint using `VITE_API_BASE_URL` in `.env`.
