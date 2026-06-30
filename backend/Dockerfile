FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Seed runs first (it also applies migrations), but a seed failure must not
# block serving — uvicorn starts regardless and re-runs init_db() on startup.
CMD ["bash", "-c", "python seed.py || echo 'seed step failed; starting server anyway'; uvicorn main:app --host 0.0.0.0 --port 8000"]
