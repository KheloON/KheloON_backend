# === Build Stage ===
FROM python:3.10-slim as builder

WORKDIR /app

# Copy application code
COPY . .

# Manually install Uvicorn and FastAPI
RUN pip install --no-cache-dir fastapi uvicorn

# === Final Stage ===
FROM python:3.10-slim

WORKDIR /app

# Copy application from the builder stage
COPY --from=builder /app /app

# Set a non-root user for security (optional)
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

# Cloud Run requires the container to listen on PORT
EXPOSE 8080

# Run the FastAPI app with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]