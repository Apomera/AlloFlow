FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir edge-tts flask flask-cors
COPY server.py .
EXPOSE 5001

# python:3.11-slim ships no curl; probe with the interpreter that is present.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5001/health',timeout=5).status==200 else 1)"]

CMD ["python", "server.py"]
