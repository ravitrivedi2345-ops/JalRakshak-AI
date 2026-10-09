import sys
import os

# Add the backend directory to Python path so 'app' package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.main import app

# Vercel expects 'app' as the ASGI handler
handler = app
