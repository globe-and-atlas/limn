# Limn Deployment Guide (Sentinel Hub-Only Mode)

This guide walks you through setting up and deploying **Limn** on a new computer. 

Since GEE (Google Earth Engine) and COG (Cloud-Optimized GeoTIFFs) are not available or required in your new target environment, the application is configured to run in **Sentinel Hub-only mode**. In this mode, Leaflet requests map tiles directly from Copernicus Sentinel Hub WMS endpoints client-side, and the local Node.js server acts purely as a static file server.

---

## Prerequisites

1. **Node.js** (v18+)
2. **Python 3** (if running backend batch analysis scripts)
3. **Copernicus Data Space Ecosystem (CDSE) Account**:
   - Register at [dataspace.copernicus.eu](https://dataspace.copernicus.eu/).
   - Create an OAuth Client in the CDSE dashboard to get your **Client ID** and **Client Secret**.
   - Create a WMS configuration instance under the Sentinel Hub dashboard to get a **WMS URL**.

---

## Step 1: Configure Frontend Credentials (`config-v1.js`)

The frontend configures how Leaflet loads and authenticates WMS tile overlays.

1. **Copy the example configuration file** to create the active config file:
   ```bash
   cp config.example.js config-v1.js
   ```
2. **Open `config-v1.js`** and configure the following parameters to run in **Sentinel Hub-only mode**:
   ```javascript
   window.CONFIG = {
       // Force Sentinel Hub WMS tiles instead of COG/GEE
       IMAGE_PROVIDER: "sentinelhub",
       ALLOW_SENTINEL_FALLBACK: true,
       
       // Disable accidental spend guards to auto-enable tiles on load
       SENTINEL_CREDIT_GUARD: false,
       SENTINEL_LIVE_TILES: true,
       
       // Enter your Copernicus credentials
       CDSE_CLIENT_ID: "your-copernicus-oauth-client-id",
       CDSE_CLIENT_SECRET: "your-copernicus-oauth-client-secret",
       
       // Enter your Sentinel Hub WMS endpoint URL
       SH_WMS_URL: "https://sh.dataspace.copernicus.eu/ogc/wms/your-wms-instance-id",
       ATLAS_WMS_LAYER: "AGRICULTURE"
   };
   ```
   > [!NOTE]
   > `config-v1.js` is included in `.gitignore` and must never be committed to repository branches to protect your active secrets.

---

## Step 2: Configure Python Scripts (`.env`)

If you plan to run local backend analysis tools (`execution/batch_analyze_spills.py`, `execution/sweep_dates.py`, etc.), they require Copernicus credentials configured in a local `.env` file.

1. **Copy the example environment file**:
   ```bash
   cp .env.example .env
   ```
2. **Open `.env`** and enter your credentials:
   ```env
   PORT=4177
   
   # CDSE Copernicus Client Credentials
   CDSE_CLIENT_ID=your-copernicus-oauth-client-id
   CDSE_CLIENT_SECRET=your-copernicus-oauth-client-secret
   ```
   > [!NOTE]
   > GEE service account configurations are optional and can be left blank or commented out in `.env` since GEE tile rendering is bypassed in Sentinel Hub-only mode.

---

## Step 3: Run the Application

### 1. Run the Frontend App
To serve the website locally (on port `4177` by default):
```bash
# Install Node dependencies
npm install

# Start the static file server
npm start
```
Open a browser and navigate to `http://localhost:4177` (or the custom port you configured in `.env`).

### 2. Run Python Scripts
If running statistics extraction or spill analysis tools:
```bash
# Install Python dependencies
pip3 install python-dotenv requests pandas numpy pillow

# Run the batch analyzer script
python3 execution/batch_analyze_spills.py
```
The script will load credentials automatically from `.env` and output its reports to the `.tmp/` folder.
