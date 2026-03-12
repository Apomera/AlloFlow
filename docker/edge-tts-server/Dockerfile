FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir edge-tts flask flask-cors
COPY server.py .
EXPOSE 5001
CMD ["python", "server.py"]
