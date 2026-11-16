"""Small SQLAlchemy repositories used by domain services."""
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from .models import ActivityLog, Dataset, SimulationRun


class DatasetRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self):
        return list(self.db.scalars(select(Dataset).order_by(desc(Dataset.updated_at))))

    def get(self, dataset_id: int):
        return self.db.get(Dataset, dataset_id)

    def get_named(self, name: str, category: str):
        return self.db.scalar(select(Dataset).where(Dataset.name == name, Dataset.category == category))

    def create(self, **values):
        row = Dataset(**values)
        self.db.add(row)
        self.db.flush()
        return row


class RunRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, limit: int = 100):
        return list(self.db.scalars(select(SimulationRun).order_by(desc(SimulationRun.created_at)).limit(limit)))

    def get(self, run_id: int):
        return self.db.get(SimulationRun, run_id)


class ActivityRepository:
    def __init__(self, db: Session):
        self.db = db

    def record(self, action: str, category: str, status: str, message: str, simulation_id: int | None = None):
        row = ActivityLog(action=action, category=category, status=status, message=message, simulation_id=simulation_id)
        self.db.add(row)
        self.db.flush()
        return row
