# AlloFlow "School Box" Docker Build
#
# Multi-stage build:
#   Stage 1: Build the React app with all modules
#   Stage 2: Serve static files with Nginx
#
# Usage:
#   docker build -f docker/Dockerfile -t alloflow ..
#   (run from project root, or use docker-compose which sets context)

# ── Stage 1: Build ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy the deploy project (package.json first for layer caching)
COPY prismflow-deploy/package*.json ./
RUN npm ci --production=false

# Copy prismflow-deploy source
COPY prismflow-deploy/ ./

# Copy the build script and monolith source
COPY build.js ./build.js
COPY AlloFlowANTI.txt ./AlloFlowANTI.txt

# Copy ALL module files (root-level *_module.js)
COPY *_module.js ./public/

# Copy STEM Lab modules (host + all tool plugins)
COPY stem_lab/ ./public/stem_lab/

# Copy SEL Hub modules (host + all tool plugins)
COPY sel_hub/ ./public/sel_hub/

# Copy supporting files
COPY ui_strings.js ./public/ui_strings.js
COPY help_strings.js ./public/help_strings.js
COPY shared.css ./public/shared.css

# Copy data layer (PocketBase/Firebase/localStorage adapters)
COPY src/dataProvider.js ./public/dataProvider.js
COPY src/dataLayer.js ./public/dataLayer.js

# Run the build script in dev mode (local paths for all modules)
RUN node build.js --mode=dev

# Build the production bundle
ARG REACT_APP_DATA_BACKEND=auto
ARG REACT_APP_POCKETBASE_URL=http://localhost:8090
ENV REACT_APP_DATA_BACKEND=$REACT_APP_DATA_BACKEND
ENV REACT_APP_POCKETBASE_URL=$REACT_APP_POCKETBASE_URL
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────
FROM nginx:alpine

# Copy custom nginx config (with API proxy routes)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy ALL module files to be served statically alongside the app
# (These are loaded dynamically at runtime via loadModule())
COPY --from=builder /app/public/*.js /usr/share/nginx/html/
COPY --from=builder /app/public/stem_lab/ /usr/share/nginx/html/stem_lab/
COPY --from=builder /app/public/sel_hub/ /usr/share/nginx/html/sel_hub/
COPY --from=builder /app/public/*.css /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
