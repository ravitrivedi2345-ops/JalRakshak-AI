import sys
import os

# Ensure backend root is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import engine, Base, SessionLocal
from app.models.user import User
from app.models.watershed import Watershed
from app.models.intervention import Intervention
from app.core.security import get_password_hash

def seed():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if not db.query(User).filter_by(username="ravi").first():
            user = User(
                username="ravi",
                email="ravi.trivedi@jalrakshak.gov.in",
                full_name="Ravi Trivedi",
                role="officer",
                hashed_password=get_password_hash("password")
            )
            db.add(user)

        if not db.query(Watershed).filter_by(name="Luni River Sub-basin").first():
            ws = Watershed(
                name="Luni River Sub-basin",
                district="Barmer",
                state="Rajasthan",
                area_sq_km=1420.5,
                center_latitude=25.75,
                center_longitude=71.38
            )
            db.add(ws)

        db.commit()
        print("Database seeded successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
