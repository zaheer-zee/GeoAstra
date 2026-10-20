# GeoAstra

**Hyperspectral Intelligence & Geospatial Detection Platform**

## System Architecture

- **`backend/`**: Application backend (Node.js + Express, Prisma, BullMQ).
- **`ai-engine/`**: Scientific backend (Python 3.13 + FastAPI, NumPy, SciPy, Rasterio, scikit-learn).
- **`storage/`**: Local filesystem storage (`input/`, `intermediate/`, `output/`, `previews/`).
- **`docker-compose.yml`**: PostgreSQL (PostGIS) and Redis local services.

---

## Quickstart

### Prerequisites
- Node.js >= 20
- Python 3.13
- Docker & Docker Compose (for PostgreSQL and Redis)

### 1. Start Infrastructure (PostgreSQL & Redis)
Ensure Docker Desktop is running, then:
```bash
docker compose up -d
```

### 2. Start Scientific Engine (`ai-engine`)
```bash
cd ai-engine
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Health endpoint: `http://127.0.0.1:8000/health`
API Docs: `http://127.0.0.1:8000/docs`

### 3. Start Application Backend (`backend`)
```bash
cd backend
npm run dev
```
Health endpoint: `http://127.0.0.1:5001/health`
Integrated service health: `http://127.0.0.1:5001/api/v1/health/services`

---

## Testing

- **Backend tests:**
  ```bash
  cd backend && npm test
  ```
- **Scientific engine tests:**
  ```bash
  cd ai-engine && ./.venv/bin/pytest tests/
  ```

