FROM node:22-bookworm-slim AS node-runtime
FROM python:3.13-slim-bookworm
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules/npm /opt/npm
WORKDIR /app
COPY package.json package-lock.json ./
RUN node /opt/npm/bin/npm-cli.js ci --omit=dev --ignore-scripts && node /opt/npm/bin/npm-cli.js cache clean --force
COPY requirements-render.txt ./
RUN pip install --no-cache-dir -r requirements-render.txt
COPY server/ server/
COPY execution/render_cog_tile.py execution/render_cog_tile.py
COPY src/ src/
COPY index.html style.css ./
COPY data/rrc_spills.json data/rrc_spills.json
RUN useradd --create-home --uid 10001 limn && mkdir -p /app/.tmp && chown -R limn:limn /app/.tmp
ENV HOST=0.0.0.0 PORT=10000 DEPLOY_COG_ONLY=1 COG_MAX_CONCURRENT=1 COG_PREWARM_ON_START=0 GDAL_CACHEMAX=32 OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 PYTHONUNBUFFERED=1
USER limn
EXPOSE 10000
CMD ["node", "server/gee_tile_server.mjs"]
