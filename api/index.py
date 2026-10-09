import sys
import os

# Add backend package to python path for Vercel Serverless Function entry point
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

# Export FastAPI app instance for Vercel Python runtime
handler = app
