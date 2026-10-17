from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_healthz_endpoint():
    """Verify Kubernetes liveness/readiness probe returns 200 and expected schema"""
    response = client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "pod" in data
    assert "database" in data
    assert "connected" in data["database"]

def test_prometheus_metrics_endpoint():
    """Verify Prometheus metrics are exposed with required counters and gauges"""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    content = response.text
    assert "http_requests_total" in content
    assert "app_db_connected" in content

def test_api_status_endpoint():
    """Verify live telemetry API returns pod metadata and system statistics"""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "app_name" in data
    assert "pod" in data
    assert "name" in data["pod"]
    assert "system" in data
    assert "cpu_percent" in data["system"]
    assert "memory_percent" in data["system"]

def test_dashboard_ui_renders():
    """Verify HTML UI renders and contains NTI platform branding"""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "NTI DevOps Final Project" in response.text

def test_api_db_records_endpoint():
    """Verify db-records endpoint returns list of records"""
    response = client.get("/api/db-records")
    assert response.status_code == 200
    data = response.json()
    assert "records" in data
    assert isinstance(data["records"], list)

def test_api_stop_load_endpoint():
    """Verify emergency stop-load returns success status"""
    response = client.post("/api/stop-load")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
