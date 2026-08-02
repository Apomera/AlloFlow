FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    PORT=8080 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    ALLOFLOW_MCP_ASSETS_DIR=/app/alloflow \
    ALLOFLOW_MCP_OFFLINE_ASSETS=1 \
    ALLOFLOW_MCP_NO_KEY_FILES=1 \
    ALLOFLOW_MCP_GEMINI_BASE=http://gemini.internal/v1beta/models \
    ALLOFLOW_MCP_GEMINI_KEY=alloflow-container-routing-placeholder \
    ALLOFLOW_RUNNER_STORAGE_HOSTS=r2.internal \
    ALLOFLOW_RUNNER_STATE_DIR=/tmp/alloflow-runner

WORKDIR /app

COPY runner/package.json runner/package-lock.json ./
RUN apt-get update \
    && apt-get install --no-install-recommends -y openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci --omit=dev --no-audit --no-fund \
    && npx playwright install --with-deps chromium \
    && chmod -R a+rX /ms-playwright

COPY runner/server.cjs ./server.cjs
COPY .runner-context/ ./alloflow/

RUN chown -R node:node /app
USER node

EXPOSE 8080
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.cjs"]
