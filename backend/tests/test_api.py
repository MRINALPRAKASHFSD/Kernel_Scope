from fastapi.testclient import TestClient

from backend.app.main import create_app

from backend.app.models import ActivityLog, Dataset, SimulationRun


def test_health_and_algorithm_catalog(client):
    assert client.get("/api/health").json()["status"] == "ok"
    catalog = client.get("/api/algorithms").json()["algorithms"]
    assert len(catalog) == 10
    assert any(item["name"] == "SCAN" for item in catalog)


def test_cpu_simulation_persists_trace_and_activity(client):
    response = client.post("/api/simulations/cpu", json={
        "processes": [{"pid": "A", "arrival": 0, "burst": 5}, {"pid": "B", "arrival": 1, "burst": 2}],
        "quantum": 2,
        "algorithms": ["FCFS", "SJF", "RR"],
    })
    assert response.status_code == 200
    run = response.json()
    assert run["status"] == "completed"
    assert [item["algorithm"] for item in run["result"]["algorithms"]] == ["FCFS", "SJF", "RR"]
    assert client.get(f"/api/simulations/{run['id']}").json()["input_snapshot"]["processes"][1]["pid"] == "B"
    assert client.get("/api/dashboard/summary").json()["total_runs"] == 1


def test_invalid_payload_is_rejected_with_field_detail(client):
    response = client.post("/api/simulations/cpu", json={
        "processes": [{"pid": "A", "arrival": -1, "burst": 1}],
    })
    assert response.status_code == 422
    assert "arrival" in response.text
    assert client.get("/api/simulations").json()["items"] == []
    with client.app.state.session_factory() as db:
        invalid = db.query(ActivityLog).filter_by(action="request.invalid", category="cpu", status="invalid").one()
        assert "arrival" in invalid.message
        assert "simulation.started" not in [row.action for row in db.query(ActivityLog).all()]


def test_full_sweep_scan_uses_existing_python_engine(client):
    response = client.post("/api/simulations/disk", json={
        "requests": [10, 50], "head": 20, "cylinders": 100, "direction": "up", "algorithms": ["SCAN"],
    })
    assert response.status_code == 200
    scan = response.json()["result"]["algorithms"][0]
    assert scan["route"] == [20, 50, 99, 10]
    assert scan["total_head_movement"] == 168


def test_dataset_crud_seed_and_restart_persistence(client):
