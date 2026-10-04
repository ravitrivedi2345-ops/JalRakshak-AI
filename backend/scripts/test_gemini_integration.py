"""
Quick integration test: verifies the Gemini service returns a response.

Run from the backend/ directory:
    python scripts/test_gemini_integration.py

Exit 0 = success, Exit 1 = failure.
"""

import sys
import os

# Ensure the backend package is importable when running from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    print("=" * 60)
    print("JalRakshak · Gemini Integration Test")
    print("=" * 60)

    # 1. Check config
    try:
        from app.core.config import settings
        key = settings.GEMINI_API_KEY
        if not key:
            print("[FAIL] GEMINI_API_KEY is empty — check backend/.env")
            sys.exit(1)
        masked = key[:8] + "..." + key[-4:]
        print(f"[OK]   GEMINI_API_KEY loaded from settings: {masked}")
    except Exception as exc:
        print(f"[FAIL] Could not load settings: {exc}")
        sys.exit(1)

    # 2. Check get_status (no network call)
    try:
        from app.services.gemini_service import get_status
        status = get_status()
        print(f"[OK]   Gemini status: {status}")
    except Exception as exc:
        print(f"[FAIL] get_status() raised: {exc}")
        sys.exit(1)

    # 3. Real API call — generate_text
    print("\n[...] Sending test prompt to Gemini API...")
    try:
        from app.services.gemini_service import generate_text
        reply = generate_text(
            "In one sentence, confirm that Gemini is working and say hello to the JalRakshak watershed monitoring system."
        )
        print(f"[OK]   Gemini response received:\n       {reply.strip()}")
    except Exception as exc:
        print(f"[FAIL] generate_text() raised: {exc}")
        sys.exit(1)

    # 4. Watershed-specific analysis
    print("\n[...] Testing watershed image analysis...")
    try:
        from app.services.gemini_service import analyze_watershed_image
        insight = analyze_watershed_image(
            image_id="test-001",
            category="Check dam",
            confidence=87.5,
        )
        print(f"[OK]   Watershed insight received:\n       {insight.strip()}")
    except Exception as exc:
        print(f"[FAIL] analyze_watershed_image() raised: {exc}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("All tests passed! Gemini integration is working correctly.")
    print("=" * 60)
    sys.exit(0)


if __name__ == "__main__":
    main()
