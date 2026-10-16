from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST, REGISTRY

# HTTP Traffic Metrics
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests handled by the application",
    ["method", "endpoint", "status_code"]
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# Database Observability
DB_CONNECTED = Gauge(
    "app_db_connected",
    "Database connection status (1 = connected, 0 = disconnected)"
)

DB_QUERY_DURATION_SECONDS = Gauge(
    "app_db_query_duration_seconds",
    "Last database query round-trip time in seconds"
)

# Synthetic Load & Fault Injection Tracking
SIMULATED_LOAD_ACTIVE = Gauge(
    "app_simulated_load_active",
    "Indicates if simulated CPU/Memory stress is currently active (1 or 0)"
)

SIMULATED_LOAD_TOTAL = Counter(
    "app_simulated_load_total",
    "Total number of simulated stress test triggers"
)

def render_metrics() -> tuple[bytes, str]:
    """Generates Prometheus formatted telemetry."""
    return generate_latest(REGISTRY), CONTENT_TYPE_LATEST
