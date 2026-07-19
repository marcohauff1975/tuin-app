# Single-service image: the FastAPI backend also serves the frontend (same origin).
FROM python:3.12-slim

# uv for fast, reproducible installs
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app/backend

# Install dependencies first for better layer caching (project itself is not a package).
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Application code
COPY backend/ ./
COPY frontend/ /app/frontend/

# Real Pl@ntNet mode by default; PLANTNET_API_KEY is injected as a secret at runtime.
ENV PLANTNET_MODE=real
EXPOSE 8000

# Render provides $PORT; default to 8000 for local runs.
CMD ["sh", "-c", ".venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
