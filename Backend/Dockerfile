# Use a lightweight Python image
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy your requirements and code
COPY . .

# Install your libraries
RUN pip install --no-cache-dir -r requirements.txt

# Cloud Run uses port 8080 by default
CMD ["uvicorn", "live_server:app", "--host", "0.0.0.0", "--port", "8080"]