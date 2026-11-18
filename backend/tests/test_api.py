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
    seeded = client.get("/api/datasets").json()["items"]
    assert {item["name"] for item in seeded} == {"Bundled Baseline", "Bundled Unsafe"}
    saved = client.post("/api/datasets", json={
        "name": "My CPU case", "description": "editor test", "category": "cpu",
        "config": {"processes": [{"pid": "A", "arrival": 0, "burst": 2}], "quantum": 1},
    })
    assert saved.status_code == 201
    dataset_id = saved.json()["id"]
    assert client.get(f"/api/datasets/{dataset_id}/export").json()["config"]["processes"][0]["pid"] == "A"
    update = client.put(f"/api/datasets/{dataset_id}", json={
        "name": "My CPU case v2", "description": "updated", "category": "cpu",
        "config": {"processes": [{"pid": "A", "arrival": 0, "burst": 3}], "quantum": 1},
    })
    assert update.status_code == 200
    assert client.get(f"/api/datasets/{dataset_id}").json()["name"] == "My CPU case v2"
    app_after_restart = create_app(client.app.state.session_factory, client.app.state.database_engine, initialize=True)
    with TestClient(app_after_restart) as restarted:
        persisted = restarted.get(f"/api/datasets/{dataset_id}")
        assert persisted.status_code == 200
        assert persisted.json()["config"]["processes"][0]["burst"] == 3


def test_integrated_results_and_exports_are_persisted(client):
    baseline = next(item for item in client.get("/api/datasets").json()["items"] if item["name"] == "Bundled Baseline")
    run = client.post("/api/simulations/integrated", json={"dataset_id": baseline["id"], "dataset": baseline["config"]})
    assert run.status_code == 200
    record = run.json()
    assert record["result"]["storage"][2]["total_head_movement"] == 331
    json_export = client.get(f"/api/reports/{record['id']}/export?format=json")
    csv_export = client.get(f"/api/reports/{record['id']}/export?format=csv")
    assert json_export.status_code == 200 and json_export.json()["id"] == record["id"]
    assert csv_export.status_code == 200 and "total_head_movement" in csv_export.text
    assert client.get("/api/analytics/comparisons").json()["groups"] == []


def test_declared_totals_and_unsafe_banker(client):
    bad_totals = client.post("/api/simulations/deadlock", json={
        "available": [1, 0], "maximum": [[1, 1]], "allocation": [[0, 0]], "declared_totals": [2, 0],
    })
    assert bad_totals.status_code == 422
    unsafe = client.post("/api/simulations/deadlock", json={
        "available": [0], "maximum": [[2], [2]], "allocation": [[1], [1]],
    })
    assert unsafe.status_code == 200
    assert unsafe.json()["result"]["safe"] is False
    assert unsafe.json()["result"]["unfinished"] == ["P0", "P1"]


def test_csv_run_report_exports(client):
    run = client.post("/api/simulations/memory", json={"references": [1, 2, 1, 3], "frames": 2}).json()
    response = client.get(f"/api/reports/{run['id']}/export?format=csv")
    assert response.status_code == 200
    assert "FIFO" in response.text and "faults" in response.text


def test_simulation_delete_preserves_activity_without_link(client):
    run = client.post("/api/simulations/memory", json={"references": [1, 2], "frames": 1}).json()
    deleted = client.delete(f"/api/simulations/{run['id']}")
    assert deleted.status_code == 200
    assert client.get(f"/api/simulations/{run['id']}").status_code == 404
