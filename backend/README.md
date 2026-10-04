# JalRakshak AI — Backend API

Backend service for **JalRakshak AI**, built with Python, FastAPI, SQLAlchemy, Pillow, ExifRead, ReportLab, and Pytest.

## Quick Start

### 1. Installation

```bash
cd backend
python -m venv .venv
# On Windows:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Seed Database

```bash
python scripts/seed_demo_data.py
```

### 4. Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health Check: `http://localhost:8000/api/v1/health`
- Interactive API Docs (Swagger UI): `http://localhost:8000/docs`

### 5. Run Automated Tests

```bash
pytest -v
```
