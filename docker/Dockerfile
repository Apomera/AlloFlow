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

# Copy external modules from shared/
COPY shared/modules/stem_lab/stem_lab_module.js ./public/shared/modules/stem_lab/stem_lab_module.js
COPY shared/modules/word_sounds_module.js ./public/shared/modules/word_sounds_module.js
COPY shared/modules/behavior_lens_module.js ./public/shared/modules/behavior_lens_module.js
COPY shared/modules/report_writer_module.js ./public/shared/modules/report_writer_module.js

# Copy supporting files from shared/
COPY shared/ui_strings.js ./public/shared/ui_strings.js
COPY shared/help_strings.js ./public/shared/help_strings.js
COPY shared/shared.css ./public/shared/shared.css
COPY src/dataProvider.js ./public/dataProvider.js
COPY src/dataLayer.js ./public/dataLayer.js

# Run the build script in dev mode (local paths for modules)
RUN node build.js --mode=dev

# Security audit (warns but doesn't fail build)
RUN npm audit --audit-level=moderate || true

# Build the production bundle
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────
FROM nginx:alpine

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy external modules to be served statically
COPY --from=builder /app/public/shared /usr/share/nginx/html/shared
COPY --from=builder /app/public/dataProvider.js /usr/share/nginx/html/
COPY --from=builder /app/public/dataLayer.js /usr/share/nginx/html/

EXPOSE 80

# Run as non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx

CMD ["nginx", "-g", "daemon off;"]
