# Stage 1: Build virtual environment using uv
FROM python:3.12-slim AS builder

WORKDIR /build

# Copy uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Optimize uv for container builds (compile bytecode, copy instead of symlink)
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install dependencies using uv into a dedicated /app/.venv
COPY requirements.txt .
RUN uv venv /app/.venv && \
    uv pip install --no-cache -r requirements.txt --python /app/.venv/bin/python

# Stage 2: Minimal, secure runtime
FROM python:3.12-slim AS runner

WORKDIR /app

# Install runtime dependencies (libpq5 for PostgreSQL, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy uv binary into runtime for CLI accessibility
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Create non-root system group and user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/false -m appuser

# Copy virtual environment from builder stage
COPY --from=builder /app/.venv /app/.venv

# Copy application source code
COPY --chown=appuser:appgroup . .

# Set environment paths and security
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

USER 10001:10001

EXPOSE 8000

# Docker healthcheck using the liveness endpoint
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/healthz || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
