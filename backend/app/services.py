"""Application services call the existing os_sim implementation directly."""
import csv
import hashlib
import io
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from os_sim.deadlock import banker
from os_sim.memory import simulate as simulate_memory
from os_sim.reporting import analyze
from os_sim.scheduling import schedule
from os_sim.storage import disk_schedule

from .config import PROJECT_ROOT
from .models import ActivityLog, Dataset, SimulationRun
from .repositories import ActivityRepository, DatasetRepository, RunRepository
from .schemas import CpuSimulationRequest, DeadlockSimulationRequest, DiskSimulationRequest, MemorySimulationRequest

logger = logging.getLogger("os_resource_lab")

ALGORITHMS = [
    {"category": "cpu", "name": "FCFS", "label": "First-Come, First-Served"},
    {"category": "cpu", "name": "SJF", "label": "Non-preemptive Shortest Job First"},
    {"category": "cpu", "name": "RR", "label": "Round Robin"},
    {"category": "memory", "name": "FIFO", "label": "First-In, First-Out"},
    {"category": "memory", "name": "LRU", "label": "Least Recently Used"},
    {"category": "memory", "name": "OPT", "label": "Optimal (future-aware benchmark)"},
    {"category": "deadlock", "name": "BANKER", "label": "Banker's Safety Algorithm"},
    {"category": "storage", "name": "FCFS", "label": "First-Come, First-Served"},
    {"category": "storage", "name": "SSTF", "label": "Shortest Seek Time First"},
    {"category": "storage", "name": "SCAN", "label": "Full-sweep SCAN"},
]


class SimulationError(Exception):
    """A computation failed after the run record had been created."""


def iso(value):
    return value.isoformat() if value else None


def dataset_out(row: Dataset) -> dict:
    return {"id": row.id, "name": row.name, "description": row.description,
            "category": row.category, "config": row.config_json,
            "created_at": iso(row.created_at), "updated_at": iso(row.updated_at)}


def run_out(row: SimulationRun) -> dict:
    return {"id": row.id, "dataset_id": row.dataset_id, "category": row.category,
            "selected_algorithm": row.selected_algorithm, "input_snapshot": row.input_snapshot,
            "result": row.result_json, "status": row.status, "error_message": row.error_message,
            "created_at": iso(row.created_at), "completed_at": iso(row.completed_at)}


def log_activity(db: Session, action: str, category: str, status: str, message: str, simulation_id=None):
    ActivityRepository(db).record(action, category, status, message, simulation_id)


def execute_run(db: Session, category: str, selected: str, snapshot: dict, compute, dataset_id: int | None = None):
    row = SimulationRun(category=category, selected_algorithm=selected, input_snapshot=snapshot,
                        dataset_id=dataset_id, status="running")
    db.add(row)
    db.commit()
    db.refresh(row)
    log_activity(db, "simulation.started", category, "running", f"Started {selected} simulation", row.id)
    db.commit()
    try:
        result = compute()
        row.status = "completed"
        row.result_json = result
        row.completed_at = datetime.now(timezone.utc)
        row.error_message = None
        log_activity(db, "simulation.completed", category, "completed", f"Completed {selected} simulation", row.id)
        db.commit()
        db.refresh(row)
        return run_out(row)
    except Exception as exc:
        logger.exception("Simulation %s failed", row.id)
        db.rollback()
        row = db.get(SimulationRun, row.id)
        if row is not None:
            row.status = "failed"
            row.error_message = str(exc)
            row.completed_at = datetime.now(timezone.utc)
            log_activity(db, "simulation.failed", category, "failed", str(exc), row.id)
            db.commit()
        raise SimulationError(str(exc)) from exc


def run_cpu(db: Session, request: CpuSimulationRequest):
    snapshot = request.model_dump(exclude={"dataset_id"})
