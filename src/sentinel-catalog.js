/* ==========================================================================
   Shared Sentinel-1/Sentinel-2 STAC catalog lookup.
   Used by both Limn (report.js) and Limn Atlas (atlas-app.js) to build the
   set of dates that have a real Sentinel scene for a given AOI/date range.
   Landsat and other non-Sentinel collections do not count toward validity.
   ========================================================================== */

const CATALOG_URL = 'https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search';
const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const CATALOG_MAX_PAGES = 25; // safety cap (~2500 items/collection) against a runaway cursor
const catalogCache = new Map();

// Pages through the SH Catalog (STAC) API for one collection, collecting every acquisition date.
// SH Catalog pagination is a cursor: a top-level `next` token in the response, echoed back in the
// next request body. A standard STAC `links[rel=next].body.next` shape is also accepted as a
// fallback in case the gateway reshapes the response — this hasn't been exercised against a live
// token in this session, so treat the fallback as defensive rather than verified.
async function fetchCollectionDates(colId, bbox, fromISO, toISO, token, onError) {
    const dates = new Set();
    let nextCursor = null;
    let page = 0;
    let authError = false;

    do {
        const payload = { collections: [colId], datetime: `${fromISO}/${toISO}`, bbox, limit: 100 };
        if (nextCursor) payload.next = nextCursor;

        let resp;
        try {
            resp = await fetch(CATALOG_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
        } catch (networkError) {
            console.warn(`[Catalog] Network error fetching ${colId} (page ${page}):`, networkError);
            break;
        }

        if (!resp.ok) {
            const errBody = await resp.text();
            console.warn(`[Catalog] Failed for ${colId} (page ${page}, ${resp.status}):`, errBody);
            if (onError) onError(resp.status, errBody);
            if (resp.status === 401 || resp.status === 403) authError = true;
            break;
        }

        const data = await resp.json();
        (data?.features || []).forEach(f => {
            if (f?.properties?.datetime) dates.add(f.properties.datetime.split('T')[0]);
        });

        const nextLink = Array.isArray(data?.links) ? data.links.find(l => l.rel === 'next') : null;
        nextCursor = data?.next || nextLink?.body?.next || null;
        page += 1;
    } while (nextCursor && page < CATALOG_MAX_PAGES);

    return { dates, authError };
}

// Fetches (with client-side caching per bbox/date-range) the set of dates that have a real
// Sentinel-1 GRD or Sentinel-2 L2A scene within bbox/[fromISO,toISO]. The cache key ignores which
// app called it, so Limn and Atlas share cache entries for overlapping AOIs within the same page load.
export async function fetchValidSentinelDates(bbox, fromISO, toISO, token, onError) {
    const cacheKey = `${bbox.map(v => v.toFixed(3)).join(',')}|${fromISO}|${toISO.slice(0, 10)}`;
    const cached = catalogCache.get(cacheKey);
    if (cached && (Date.now() - cached.fetchedAt) < CATALOG_CACHE_TTL_MS) {
        return { validDates: cached.validDates, authError: false };
    }

    const collections = ['sentinel-2-l2a', 'sentinel-1-grd'];
    const validDates = new Set();
    let authError = false;

    for (const colId of collections) {
        const { dates, authError: colAuthError } = await fetchCollectionDates(colId, bbox, fromISO, toISO, token, onError);
        dates.forEach(d => validDates.add(d));
        if (colAuthError) authError = true;
    }

    if (!authError) {
        catalogCache.set(cacheKey, { validDates, fetchedAt: Date.now() });
    }

    return { validDates, authError };
}
