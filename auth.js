/**
 * Sentinel Hub Authentication Module
 * Handles OAuth2 token lifecycle for Copernicus Data Space Ecosystem (CDSE).
 */

let cachedAccessToken = null;
let tokenExpiry = null;

/**
 * Retrieves a valid CDSE access token, refreshing it if expired.
 * @param {Object} config - Configuration object containing CDSE_CLIENT_ID and CDSE_CLIENT_SECRET.
 * @returns {Promise<string>} Bearer token.
 */
export async function getCDSEToken(config = window.CONFIG) {
    if (cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }

    // The Copernicus Keycloak server blocks direct frontend CORS requests.
    // We route the authentication handshake securely through a standard CORS proxy.
    const authUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token');

    try {
        const resp = await fetch(authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: config.CDSE_CLIENT_ID,
                client_secret: config.CDSE_CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Copernicus OAuth failed (HTTP ${resp.status}): ${errText.substring(0, 100)}`);
        }

        const data = await resp.json();
        cachedAccessToken = data.access_token;
        tokenExpiry = Date.now() + ((data.expires_in - 60) * 1000);
        return cachedAccessToken;
    } catch (e) {
        console.error("Auth Error:", e);
        cachedAccessToken = null;
        throw e;
    }
}
