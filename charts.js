/* ==========================================================================
   Sentinel Explorer – Chart & Hover Highlight Logic
   Extracted from app.js for modularity
   ========================================================================== */

let hoverHighlightDebounce = null;
    let lastHoverKey = '';
    const hotspotCache = {}; // key → [{lat, lng, intensity}]
    const peakCache = {}; // key → {lat, lng, intensity}

export function detectPeakAnomaly(imgUrl, bounds) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 512; 
            canvas.height = img.height || 512;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            
            let maxVal = -1;
            let peakPos = null;
            
            // Scan Alpha channel for binary anomaly mask, OR R-channel for gradient
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                const a = data[i+3];
                
                if (a > 10) { 
                    const x = (i / 4) % canvas.width;
                    const y = Math.floor((i / 4) / canvas.width);
                    
                    // Skip the bottom 15% to avoid the Sentinel Hub WMS watermark
                    if (y > canvas.height * 0.85) continue;
                    
                    const intensity = (r << 16) | (g << 8) | b;
                    if (intensity > maxVal) {
                        maxVal = intensity;
                        peakPos = { x, y };
                    }
                }
            }
            
            if (peakPos) {
                const sw = bounds.getSouthWest();
                const ne = bounds.getNorthEast();
                const lat = ne.lat - (peakPos.y / canvas.height) * (ne.lat - sw.lat);
                const lng = sw.lng + (peakPos.x / canvas.width) * (ne.lng - sw.lng);
                
                const norm = maxVal / 16777215;
                const origVal = (norm * 4.0) - 1.0;
                
                resolve({ lat, lng, value: origVal });
            } else {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = imgUrl;
    });
}

    export function showHoverHighlight(date, indexKey, chartValue) {
        const hoverKey = `${date}_${indexKey}`;
        if (hoverKey === lastHoverKey) return;
        lastHoverKey = hoverKey;
        const currentReqDate = Date.now();
        state.currentHoverRequest = currentReqDate;

        if (hoverHighlightDebounce) clearTimeout(hoverHighlightDebounce);
        hoverHighlightDebounce = setTimeout(async () => {
            hideHoverHighlight(true); // cleanup previous

            let bounds = state.map.getBounds();
            if (state.drawnItems && state.drawnItems.getLayers().length > 0) {
                bounds = state.drawnItems.getBounds();
            }

            const hexColor = CHART_COLORS[indexKey] || '#FF00AA';
            const imgUrl = buildHighlightUrl(date, indexKey, bounds, hexColor, chartValue);
            if (!imgUrl) return;

        // 1. Full raster highlight (subtle) - REMOVED AT USER REQUEST
            // (Only the point marker will be shown now)

            // 2. Peak Detection & Target Marker
            const peak = peakCache[hoverKey] || await detectPeakAnomaly(imgUrl, bounds);
            
            // If the user has hovered over something else while we were processing, abort.
            if (state.currentHoverRequest !== currentReqDate) return;
            
            if (peak) {
                peakCache[hoverKey] = peak;
                const markerColor = hexColor === '#FFFFFF' ? '#FF00FF' : hexColor;
                
                // Double check cleanup right before adding new marker
                if (state.hoverMarker) {
                    state.map.removeLayer(state.hoverMarker);
                }
                
                state.hoverMarker = L.circleMarker([peak.lat, peak.lng], {
                    radius: 8,
                    color: '#fff',
                    weight: 2,
                    fillColor: markerColor,
                    fillOpacity: 0.9,
                    className: 'pulse-marker'
                }).addTo(state.map);

                state.hoverMarker.bindTooltip(`
                    <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px;">
                        <strong style="color: ${markerColor}; text-shadow: 0 0 4px rgba(0,0,0,0.8);">${indexKey.toUpperCase()} PEAK</strong><br/>
                        DATE: ${date}<br/>
                        LAT: ${peak.lat.toFixed(5)}<br/>
                        LNG: ${peak.lng.toFixed(5)}<br/>
                        MEAN AOI VAL: ${parseFloat(chartValue).toFixed(4)}
                    </div>
                `, { permanent: true, direction: 'top', offset: [0, -10] });
            }

            // Record into cache
            hotspotCache[hoverKey] = imgUrl;
        }, 120);
    }

    // renderHotspotMarkers and extractHotspots completely removed in favor of native L.imageOverlay

    // Helper to generate WKT from user drawn polygon to restrict peak detection
    export function getDrawnWKT() {
        if (!state.drawnItems || state.drawnItems.getLayers().length === 0) return null;
        try {
            const geojson = state.drawnItems.toGeoJSON();
            if (geojson.features.length > 0 && geojson.features[0].geometry) {
                const geom = geojson.features[0].geometry;
                if (geom.type === 'Polygon') {
                    const rings = geom.coordinates.map(ring => {
                        return '(' + ring.map(c => `${c[0]} ${c[1]}`).join(', ') + ')';
                    });
                    return `POLYGON(${rings.join(', ')})`;
                }
            }
        } catch (e) { console.error(e); }
        return null;
    }

    export function buildHighlightUrl(date, indexKey, bounds, hexColor, chartValue, includeContext = false) {
        const script = getHighlightScript(indexKey, hexColor, chartValue, includeContext, state.activeBasin);
        if (!script) return null;

        const dStart = new Date(date);
        dStart.setUTCDate(dStart.getUTCDate() - 1);
        const dEnd = new Date(date);
        dEnd.setUTCDate(dEnd.getUTCDate() + 7);
        const timeParam = `${dStart.toISOString().split('T')[0]}/${dEnd.toISOString().split('T')[0]}`;

        let wktParam = '';
        const wkt = getDrawnWKT();
        if (wkt) wktParam = `&geometry=${encodeURIComponent(wkt)}`;

        let wmsLayerParam = 'AGRICULTURE';
        const cfg = INDICES[indexKey];
        if (indexKey === 's1_sar' || (cfg && cfg.sensor === 'Sentinel-1 GRD')) wmsLayerParam = 'SENTINEL1-GRD';

        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const bboxStr = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
        const b64 = btoa(unescape(encodeURIComponent(script)));

        return `${SH_WMS_URL}?service=WMS&request=GetMap&version=1.3.0` +
            `&layers=${wmsLayerParam}&format=image/png&transparent=true` +
            `&width=512&height=512&crs=CRS:84&bbox=${bboxStr}` +
            `&time=${timeParam}&maxcc=100&showlogo=false${wktParam}&evalscript=${encodeURIComponent(b64)}`;
    }

    // Pre-fetch hotspot positions for top anomaly dates after scan completes

    export async function renderScanThumbnails(dates, bounds) {
        const gallery = document.getElementById('scan-thumbnail-gallery');
        const strip = document.getElementById('thumbnail-strip');
        if (!gallery || !strip) return;

        gallery.style.display = 'block';
        strip.innerHTML = '';

        // Only show top 8 anomalies to avoid clutter
        const topDates = dates.slice(0, 8);

        // Use the currently selected index, or default to pwi if none
        const renderIndex = (state.activeIndex && state.activeIndex !== 'none') ? state.activeIndex : 'pwi';
        const renderColor = CHART_COLORS[renderIndex] || '#FF00FF';

        topDates.forEach(date => {
            const item = document.createElement('div');
            item.className = 'thumbnail-item';
            
            // Build a small WMS URL for the thumbnail using the selected index, including context
            const url = buildHighlightUrl(date, renderIndex, bounds, renderColor, undefined, true);
            
            item.innerHTML = `
                <div class="thumbnail-badge" style="color: ${renderColor}">${renderIndex.toUpperCase()} ANOMALY</div>
                <div class="thumbnail-img-wrapper">
                    <img src="${url}" class="thumbnail-img" alt="${date}" loading="lazy">
                </div>
                <div class="thumbnail-date">${date}</div>
            `;
            
            item.addEventListener('click', () => {
                // Find matching index in ALL_DATES (objects, not strings)
                const idx = ALL_DATES.findIndex(d => d.value === date);
                if (idx !== -1) {
                    state.monthIndex = idx;
                    const dateDropdown = document.getElementById('date-single');
                    if (dateDropdown) dateDropdown.value = idx;
                    
                    // Switch to single mode if not already
                    if (state.mode !== 'single') {
                        const mSing = document.getElementById('mode-single');
                        if (mSing) mSing.click();
                    } else {
                        applyIndex();
                    }
                    
                    // Center map on the anomaly
                    state.map.flyTo(bounds.getCenter(), 15);
                }
            });
            
            strip.appendChild(item);
        });
    }

    export function prefetchHighlights(dates, indexKey, bounds) {
        if (!dates || dates.length === 0) return;
        const top = dates.slice(0, 10);
        const hexColor = CHART_COLORS[indexKey] || '#FF00AA';
        top.forEach(date => {
            const key = `${date}_${indexKey}`;
            if (hotspotCache[key]) return;
            const url = buildHighlightUrl(date, indexKey, bounds, hexColor);
            if (!url) return;
            
            // Force browser to fetch and cache the heavy raster image payload silently in the background
            const img = new Image();
            img.src = url;
            hotspotCache[key] = url;
        });
    }

export function hideHoverHighlight(keepKey) {
    if (!keepKey) lastHoverKey = '';
    if (hoverHighlightDebounce) clearTimeout(hoverHighlightDebounce);
    if (state.hoverHighlightLayer) {
        state.map.removeLayer(state.hoverHighlightLayer);
        state.hoverHighlightLayer = null;
    }
    if (state.hoverMarker) {
        state.map.removeLayer(state.hoverMarker);
        state.hoverMarker = null;
    }
}

