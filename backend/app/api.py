"""HTTP endpoints. Handlers validate, delegate to services and serialize records."""
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import PROJECT_ROOT
from .database import get_db
from .models import ActivityLog, Dataset, SimulationRun
from .repositories import DatasetRepository, RunRepository
from .schemas import (CpuSimulationRequest, DatasetWrite, DeadlockSimulationRequest,
                      DiskSimulationRequest, IntegratedSimulationRequest,
                      MemorySimulationRequest)
from .services import (ALGORITHMS, SimulationError, compatible_comparisons, create_dataset,
                       dashboard_summary, dataset_out, log_activity, run_cpu,
                       run_deadlock, run_disk, run_integrated, run_memory, run_out,
                       validate_dataset, csv_for_run)

router = APIRouter(prefix="/api")


def require_dataset(db: Session, dataset_id: int | None):
    if dataset_id is None:
        return None
    row = db.get(Dataset, dataset_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return row


@router.get("/health")
def health():
    return {"status": "ok", "service": "os-resource-lab-api"}


@router.get("/algorithms")
def algorithms():
    return {"algorithms": ALGORITHMS}


@router.get("/dashboard/summary")
def dashboard(db: Session = Depends(get_db)):
    return dashboard_summary(db)


@router.post("/simulations/cpu")
def simulate_cpu(payload: CpuSimulationRequest, db: Session = Depends(get_db)):
    require_dataset(db, payload.dataset_id)
    try:
        return run_cpu(db, payload)
    except SimulationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/simulations/memory")
def simulate_memory(payload: MemorySimulationRequest, db: Session = Depends(get_db)):
    require_dataset(db, payload.dataset_id)
    try:
        return run_memory(db, payload)
    except SimulationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/simulations/deadlock")
def simulate_deadlock(payload: DeadlockSimulationRequest, db: Session = Depends(get_db)):
    require_dataset(db, payload.dataset_id)
    try:
        return run_deadlock(db, payload)
    except SimulationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/simulations/disk")
def simulate_disk(payload: DiskSimulationRequest, db: Session = Depends(get_db)):
    require_dataset(db, payload.dataset_id)
    try:
        return run_disk(db, payload)
    except SimulationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/simulations/integrated")
def simulate_integrated(payload: IntegratedSimulationRequest, db: Session = Depends(get_db)):
    require_dataset(db, payload.dataset_id)
    try:
        return run_integrated(db, payload.dataset, payload.dataset_id)
    except SimulationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/simulations")
def list_simulations(limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db)):
    return {"items": [run_out(row) for row in RunRepository(db).list(limit)]}


@router.get("/simulations/{run_id}")
def get_simulation(run_id: int, db: Session = Depends(get_db)):
    row = RunRepository(db).get(run_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return run_out(row)


@router.delete("/simulations/{run_id}")
def delete_simulation(run_id: int, db: Session = Depends(get_db)):
    row = RunRepository(db).get(run_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    db.query(ActivityLog).filter(ActivityLog.simulation_id == run_id).update({ActivityLog.simulation_id: None})
    db.delete(row)
    db.commit()
    log_activity(db, "simulation.deleted", row.category, "completed", f"Deleted simulation {run_id}")
    db.commit()
    return {"deleted": run_id}


@router.get("/datasets")
def list_datasets(db: Session = Depends(get_db)):
