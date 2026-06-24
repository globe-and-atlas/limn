import { getAtlasVerification } from './atlas-verification.js?v=3';

const COPERNICUS_BROWSER_URL = 'https://browser.dataspace.copernicus.eu/';

const PLATFORM_REFERENCES = {
  s1: {
    type: 'Sensor',
    label: 'Sentinel Hub Sentinel-1 GRD data documentation',
    url: 'https://docs.sentinel-hub.com/api/latest/data/sentinel-1-grd/',
    note: 'Confirms the SAR collection used for this live Atlas layer.',
    countsAsCitation: false,
    technical: true,
  },
  s2: {
    type: 'Sensor',
    label: 'Sentinel Hub Sentinel-2 L2A data documentation',
    url: 'https://docs.sentinel-hub.com/api/latest/data/sentinel-2-l2a/',
    note: 'Confirms the optical MSI collection and band basis used by this live Atlas layer.',
    countsAsCitation: false,
    technical: true,
  },
  s5p: {
    type: 'Sensor',
    label: 'Copernicus Sentinel Hub Sentinel-5P L2 documentation',
    url: 'https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S5PL2.html',
    note: 'Confirms the TROPOMI Level-2 atmospheric collection used for this live Atlas layer.',
    countsAsCitation: false,
    technical: true,
  },
  ogc: {
    type: 'Service',
    label: 'Copernicus Sentinel Hub OGC WMS documentation',
    url: 'https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/OGC/WMS.html',
    note: 'Confirms the WMS service path used to render the bookmark.',
    countsAsCitation: false,
    technical: true,
  },
};

const TECHNICAL_TYPES = new Set(['imagery', 'sensor', 'service']);
const NON_INCIDENT_REFERENCE_TYPES = new Set(['method']);

function sensorKey(index) {
  const layer = String(index.wmsLayer || '').toUpperCase();
  const platform = `${index.platform || ''} ${index.platformShort || ''}`.toUpperCase();
  if (layer.includes('SENTINEL1') || platform.includes('SENTINEL-1') || platform.includes('S1')) return 's1';
  if (layer.includes('SENTINEL-5P') || layer.includes('SP5') || platform.includes('SENTINEL-5P') || platform.includes('TROPOMI')) return 's5p';
  return 's2';
}

function bookmarkEvidenceUrl(index) {
  const bm = index.bookmark || {};
  const params = new URLSearchParams();
  if (Number.isFinite(Number(bm.lat))) params.set('lat', String(bm.lat));
  if (Number.isFinite(Number(bm.lng))) params.set('lng', String(bm.lng));
  if (Number.isFinite(Number(bm.zoom))) params.set('zoom', String(bm.zoom));
  if (bm.date) {
    params.set('fromTime', `${bm.date}T00:00:00.000Z`);
    params.set('toTime', `${bm.date}T23:59:59.999Z`);
  }
  params.set('themeId', 'DEFAULT-THEME');
  return `${COPERNICUS_BROWSER_URL}?${params.toString()}`;
}

export function getAtlasEvidence(index) {
  const bm = index.bookmark || {};
  const verification = getAtlasVerification(index);
  const evidence = [];

  if (verification?.sources?.length) {
    verification.sources.forEach(item => evidence.push({
      countsAsCitation: true,
      technical: false,
      ...item,
    }));
  }

  if (index.sourceUrl && index.source) {
    const alreadyIncluded = evidence.some(item => item.url === index.sourceUrl);
    if (!alreadyIncluded) {
      evidence.push({
        type: 'Source',
        label: index.source,
        url: index.sourceUrl,
        note: 'Primary event, method, or domain source attached to this bookmark.',
        countsAsCitation: true,
        technical: false,
      });
    }
  }

  evidence.push({
    type: 'Imagery',
    label: `Copernicus Browser check: ${bm.label || index.acronym} (${bm.date || 'bookmark date'})`,
    url: bookmarkEvidenceUrl(index),
    note: 'Independent map/date check for the bookmarked location and acquisition window.',
    countsAsCitation: false,
    technical: true,
  });

  evidence.push(PLATFORM_REFERENCES[sensorKey(index)] || PLATFORM_REFERENCES.s2);
  evidence.push(PLATFORM_REFERENCES.ogc);

  return evidence;
}

export function countsAsAtlasCitation(item) {
  if (!item?.url) return false;
  if (item.countsAsCitation === false || item.technical === true) return false;
  const type = String(item.type || '').toLowerCase();
  return !TECHNICAL_TYPES.has(type) && !NON_INCIDENT_REFERENCE_TYPES.has(type);
}

export function getAtlasCitationSources(index) {
  return getAtlasEvidence(index).filter(countsAsAtlasCitation);
}

export function getAtlasTechnicalLinks(index) {
  return getAtlasEvidence(index).filter(item => item.url && item.technical === true);
}

export function getAtlasReferenceLinks(index) {
  return getAtlasEvidence(index).filter(item => item.url && !item.technical && !countsAsAtlasCitation(item));
}

export function getAtlasTrust(index) {
  const verification = getAtlasVerification(index);
  const evidence = getAtlasEvidence(index);
  const citationCount = evidence.filter(countsAsAtlasCitation).length;
  const technicalCount = evidence.filter(item => item.url && !countsAsAtlasCitation(item)).length;
  if (!index.canRender) {
    return {
      tier: 'Context',
      label: 'Context only',
      citationCount,
      technicalCount,
      sourceCount: citationCount,
      description: 'Concept bookmark; not a live proof-grade render target yet.',
    };
  }
  if (citationCount >= 3 && index.sourceUrl && index.bookmark?.date) {
    return {
      tier: verification?.tier || 'Gold',
      label: verification?.tier === 'Strong' ? 'Strong verified' : 'Gold evidence',
      citationCount,
      technicalCount,
      sourceCount: citationCount,
      description: verification?.basis || 'Three cited incident/domain sources plus separate technical verification links.',
    };
  }
  if (citationCount >= 2) {
    return {
      tier: 'Silver',
      label: 'Silver evidence',
      citationCount,
      technicalCount,
      sourceCount: citationCount,
      description: 'Two cited sources; needs one more incident/domain source for Gold. Technical platform links are not counted.',
    };
  }
  return {
    tier: 'Bronze',
    label: 'Bronze evidence',
    citationCount,
    technicalCount,
    sourceCount: citationCount,
    description: 'Insufficient cited incident/domain evidence for proof-grade trust. Technical platform links are not counted.',
  };
}
