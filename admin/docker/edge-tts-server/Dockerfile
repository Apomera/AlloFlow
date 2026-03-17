FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir edge-tts flask flask-cors
COPY server.py .

# Run as non-root user
RUN useradd -m -u 1000 tts && chown -R tts:tts /app
USER 1000

EXPOSE 5001
CMD ["python", "server.py"]
