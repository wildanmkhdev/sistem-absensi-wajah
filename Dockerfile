FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY frontend/dist/ static/

ENV DATABASE_URL="postgresql://neondb_owner:npg_9wDaLoxCc8Tj@ep-shiny-tree-bcuvpifk-pooler.c-16.us-east-1.aws.neon.tech/neondb?sslmode=require"

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
