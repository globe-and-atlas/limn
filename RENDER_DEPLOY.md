# Live Limn on Render Free

This package serves the produced-water frontend and public Sentinel-2 COG tile renderer in one Docker web service. No GEE or Sentinel credentials are required. Optional Sentinel analytics, SAR, Atlas, and prewarm endpoints are excluded from this public configuration.

1. Commit the intended app changes and deployment files to a Git repository you can connect to Render. Include `src/vendor/` and the new response helper. Never add `.env`, `config-v1.js`, `.venv`, `.tmp`, or service-account files.
2. Push that repository to your Git host.
3. In Render, choose **New → Blueprint**, connect the repository, and select its branch. Render reads `render.yaml` and creates `limn-produced-water` on the Free plan. Alternatively create a Web Service with Docker runtime, root Dockerfile, Free plan, and health path `/healthz`.
4. Deploy using the Dockerfile's default command. Render supplies PORT; HOST is 0.0.0.0. No environment secrets are needed.
5. Visit the supplied HTTPS URL. Verify `/healthz`, open a bookmark at zoom 14, and wait for an RGB tile plus acquisition ID. Check logs for Python errors, memory exits, or repeated 429 responses.

The free deployment permits one COG renderer process globally and one tile request per browser layer. Busy clients receive 429 and retry; this intentionally trades speed for lower memory use. GDAL cache is limited to 32 MB and numerical-library threads to one. Actual peak resident memory and Render performance still need measurement on the deployed instance.

Free instances sleep after 15 idle minutes and lose temporary tile caches on sleep/restart/redeploy. Cold tile renders can take time. Render free-tier usage limits apply; do not configure artificial keep-awake traffic. See https://render.com/docs/free and https://render.com/docs/docker.

Local image check (Docker daemon required):

```sh
docker build -t limn-render .
docker run --rm -p 10000:10000 --memory=512m limn-render
```

Then visit http://localhost:10000 and test `/healthz`. Confirm `/.env`, `/package.json`, `/server/gee_tile_server.mjs`, and `/execution/render_cog_tile.py` return 404. The server serves an explicit public allowlist; browser configuration is generated without secrets.

No Render service has been created by preparing these files. A successful local route test does not confirm the Docker build or free-instance memory budget.
