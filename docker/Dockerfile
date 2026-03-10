# AlloFlow Docker Build
#
# Multi-stage build:
#   Stage 1: Build the React app with npm
#   Stage 2: Serve static files with Nginx
#
# Usage:
#   docker build -f docker/Dockerfile -t alloflow .

# ── Stage 1: Build ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy the deploy project
COPY prismflow-deploy/package*.json ./
RUN npm ci --production=false

# Copy source files
COPY prismflow-deploy/ ./

# Copy the build script and source
COPY build.js ./build.js
COPY AlloFlowANTI.txt ./AlloFlowANTI.txt

# Copy external modules
COPY stem_lab_module.js ./public/stem_lab_module.js
COPY word_sounds_module.js ./public/word_sounds_module.js
COPY behavior_lens_module.js ./public/behavior_lens_module.js
COPY report_writer_module.js ./public/report_writer_module.js

# Copy supporting files
COPY ui_strings.js ./public/ui_strings.js
COPY help_strings.js ./public/help_strings.js
COPY shared.css ./public/shared.css

# Run the build script in dev mode (local paths for modules)
RUN node build.js --mode=dev

# Build the production bundle
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────
FROM nginx:alpine

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy external modules to be served statically
COPY --from=builder /app/public/stem_lab_module.js /usr/share/nginx/html/
COPY --from=builder /app/public/word_sounds_module.js /usr/share/nginx/html/
COPY --from=builder /app/public/behavior_lens_module.js /usr/share/nginx/html/
COPY --from=builder /app/public/report_writer_module.js /usr/share/nginx/html/
COPY --from=builder /app/public/ui_strings.js /usr/share/nginx/html/
COPY --from=builder /app/public/help_strings.js /usr/share/nginx/html/
COPY --from=builder /app/public/shared.css /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
