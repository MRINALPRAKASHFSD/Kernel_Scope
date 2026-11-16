"""Idempotently seed the bundled baseline and unsafe datasets."""
from .database import SessionLocal, engine
from .models import Base
from .repositories import DatasetRepository
from .services import bundled_datasets, log_activity


def seed(session_factory=SessionLocal, target_engine=engine):
    Base.metadata.create_all(target_engine)
    with session_factory() as db:
        repo = DatasetRepository(db)
        for key, config in bundled_datasets().items():
            name = f"Bundled {'Baseline' if key == 'baseline' else 'Unsafe'}"
            if repo.get_named(name, "integrated") is None:
                row = repo.create(name=name, description=f"Bundled {key} teaching dataset", category="integrated", config_json=config)
                log_activity(db, "dataset.seeded", "integrated", "completed", f"Added {name}")
        db.commit()
    print("Seeded bundled datasets (existing records retained).")


if __name__ == "__main__":
    seed()
