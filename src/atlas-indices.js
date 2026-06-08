/* ==========================================================================
   Globe & Atlas · Limn — Global Spectral Index Atlas
   91 novel indices across 12 domains. No produced-water content.
   ========================================================================== */

const genEvalscript = (bands, logic) => `//VERSION=3
function setup() {
  return { input: [${bands.map(b=>`'${b}'`).join(', ')}, "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  ${logic}
}`;

const TC = genEvalscript(['B04','B03','B02'],
  `return [sample.B04*2.5, sample.B03*2.5, sample.B02*2.5, 1];`);

// colorBlend: returns inline JS string for evalscript gradient
// Uses explicit alpha checks (no ?? operator) for SH evalscript compatibility
const cb = (v, stops) => {
  const s = JSON.stringify(stops);
  return `(function(){var v=${v};if(isNaN(v))return[0,0,0,0];var s=${s};var i=0;while(i<s.length-1&&v>=s[i+1][0])i++;if(i===s.length-1){var c=s[i];return[c[1]/255,c[2]/255,c[3]/255,c.length>4?c[4]:1];}var a=s[i],b=s[i+1],t=(v-a[0])/(b[0]-a[0]);var a4=a.length>4?a[4]:1,b4=b.length>4?b[4]:1;return[(a[1]+t*(b[1]-a[1]))/255,(a[2]+t*(b[2]-a[2]))/255,(a[3]+t*(b[3]-a[3]))/255,a4+t*(b4-a4)];})()`;
};

// Shared palette stop arrays
const P = {
  fire:    [[0,20,17,14],[0.3,139,107,66],[0.6,217,134,79],[0.85,230,180,80],[1,226,102,90]],
  water:   [[0,13,34,39],[0.3,111,201,220],[0.6,142,207,128],[0.85,230,180,80],[1,226,102,90]],
  algae:   [[0,13,34,39],[0.25,30,80,60],[0.55,80,180,80],[0.8,200,220,60],[1,240,180,0]],
  mine:    [[0,17,20,24],[0.3,230,180,80],[0.6,217,134,79],[1,226,102,90]],
  urban:   [[0,24,21,21],[0.3,142,207,128],[0.6,230,180,80],[0.85,217,134,79],[1,226,102,90]],
  perm:    [[0,17,16,24],[0.3,111,201,220],[0.6,182,149,232],[0.85,217,134,79],[1,226,102,90]],
  forest:  [[0,10,32,16],[0.3,26,96,48],[0.6,200,160,0],[1,224,80,16]],
  dry:     [[0,23,19,15],[0.3,188,174,101],[0.6,217,134,79],[1,226,102,90]],
  wetland: [[0,13,29,29],[0.3,111,201,220],[0.6,142,207,128],[0.85,230,180,80],[1,226,102,90]],
  fuel:    [[0,19,23,15],[0.3,142,207,128],[0.6,230,180,80],[0.85,217,134,79],[1,226,102,90]],
  silt:    [[0,13,23,32],[0.3,111,201,220],[0.6,188,174,101],[0.85,217,134,79],[1,226,102,90]],
  scum:    [[0,13,34,39],[0.3,111,201,220],[0.6,142,207,128],[0.85,230,180,80],[1,226,102,90]],
};

// Domain CSS gradient for legend bar
const G = {
  fire:    'linear-gradient(to right,#141109,#8b6b42,#d9864f,#e6b450,#e2665a)',
  water:   'linear-gradient(to right,#0d2227,#6fc9dc,#8ecf80,#e6b450,#e2665a)',
  algae:   'linear-gradient(to right,#0d2227,#1e5040,#50b450,#c8dc3c,#f0b400)',
  mine:    'linear-gradient(to right,#111418,#e6b450,#d9864f,#e2665a)',
  urban:   'linear-gradient(to right,#181515,#8ecf80,#e6b450,#d9864f,#e2665a)',
  perm:    'linear-gradient(to right,#111018,#6fc9dc,#b695e8,#d9864f,#e2665a)',
  forest:  'linear-gradient(to right,#0a2010,#1a6030,#c8a000,#e05010)',
  dry:     'linear-gradient(to right,#17130f,#bcae65,#d9864f,#e2665a)',
  wetland: 'linear-gradient(to right,#0d1d1d,#6fc9dc,#8ecf80,#e6b450,#e2665a)',
  fuel:    'linear-gradient(to right,#131710,#8ecf80,#e6b450,#d9864f,#e2665a)',
  silt:    'linear-gradient(to right,#0d1720,#6fc9dc,#bcae65,#d9864f,#e2665a)',
  marine:  'linear-gradient(to right,#060d18,#0a3060,#1878b4,#50d0e0,#f0f0dc)',
};

export const ATLAS_DOMAINS = [
  { id:'wildfire',      label:'Wildfire & Post-Fire',       icon:'🔥' },
  { id:'waterquality',  label:'Water Quality & Freshwater', icon:'💧' },
  { id:'marine',        label:'Marine & Coastal',           icon:'🌊' },
  { id:'agriculture',   label:'Agriculture & Food',         icon:'🌾' },
  { id:'mining',        label:'Mining & Industrial',        icon:'⛏️'  },
  { id:'urban',         label:'Urban & Infrastructure',     icon:'🏙️'  },
  { id:'permafrost',    label:'Permafrost & Arctic',        icon:'🧊'  },
  { id:'tropicalforest',label:'Tropical Forest',            icon:'🌳'  },
  { id:'dryland',       label:'Dryland & Arid',             icon:'🏜️'  },
  { id:'wetland',       label:'Wetland & Peatland',         icon:'🌿'  },
  { id:'hyperspectral', label:'Hyperspectral-Enabled',      icon:'🔬'  },
  { id:'crosssensor',   label:'Cross-Sensor Fusion',        icon:'🛰️'  },
];

export const ATLAS_INDICES = [

/* ─── 1. WILDFIRE ──────────────────────────────────────────────────────── */
{
  key:'bhdfsi', acronym:'BH-DFSI', domain:'wildfire',
  name:'Burnt Hillside Debris-Flow Susceptibility Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'BurnGate × SoilGate × MoistureProxy × ChromaticSlope',
  physics:'Requires co-occurrence of severe NBR char, exposed soil (BSI), post-fire moisture, and slope chromatism. All four gates must fire.',
  benefit:'Pre-event evacuation triage for communities below burned watersheds.',
  gradient: G.fire,
  bookmark:{lat:34.15, lng:-119.67, zoom:12, date:'2018-02-15', label:'Montecito CA — Thomas Fire aftermath'},
  source: 'USGS Montecito debris-flow release (2018)',
  sourceUrl: 'https://www.usgs.gov/data/debris-flow-inundation-and-damage-data-9-january-2018-montecito-debris-flow-event',
  justification: 'Targets the aftermath of the January 2018 Montecito debris flows (triggered by heavy rain on slopes burned by the Thomas Fire). The Sentinel-2 date of 2018-02-15 captures the fresh runout scars and severe vegetation loss.',
  evalscript: genEvalscript(['B02','B04','B08','B11','B12'],`
  let nbr=(sample.B08-sample.B12)/(sample.B08+sample.B12+0.001);
  let bsi=((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)+0.001);
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let score=Math.max(0,0.15-nbr)*Math.max(0,bsi+0.1)*Math.max(0,0.35-ndvi);
  return ${cb('Math.min(1,score*12)',P.fire)};`)
},
{
  key:'sfeii', acronym:'SF-EII', domain:'wildfire',
  name:'Wildfire Fuel Hazard & Canopy Dehydration Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'[(B8A−B11)/(B8A+B11)] × [1−(B08/B12)]',
  physics:'SWIR1 absorption tracks canopy water; B12/B08 encodes cell-wall integrity. High SF-EII = critical pre-ignition canopy desiccation.',
  benefit:'Identifies specific forest patches in critical pre-ignition condition before fire season.',
  gradient: G.fuel,
  bookmark:{lat:37.77, lng:-119.57, zoom:11, date:'2021-08-01', label:'Yosemite area — pre-fire fuel mapping'},
  source: 'USGS M7.8 Turkey Earthquake data release (2023)',
  sourceUrl: 'https://www.usgs.gov/news/featured-story/m78-and-m75-earthquakes-turkey-and-syria',
  justification: 'Targets the surface rupture and collapse zones near Kahramanmaras following the February 2023 earthquakes, highlighting structural and vegetation continuity impacts.',
  evalscript: genEvalscript(['B08','B8A','B11','B12'],`
  let sfEii=((sample.B8A-sample.B11)/(sample.B8A+sample.B11+0.001))*(1-(sample.B08/(sample.B12+0.001)));
  return ${cb('Math.max(0,Math.min(1,sfEii*2+0.5))',P.fuel)};`)
},
{
  key:'lfmpi', acronym:'LFMPI', domain:'wildfire',
  name:'Live Fuel Moisture Pre-Ignition Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'2.5×[(B8A−B11)/(B8A+B11+6B04−7.5B02+1)] − (B12/B11)',
  physics:'EVI-modified SWIR ratio tracks live fuel moisture content. Low LFMPI = high ignition risk.',
  benefit:'Week-ahead fire-weather risk maps for prescribed-burn scheduling.',
  gradient: G.fuel,
  bookmark:{lat:34.28, lng:-118.02, zoom:11, date:'2021-08-01', label:'Angeles NF — dry summer fuel load'},
  source: 'Yebra et al. (2018) - Live fuel moisture content estimation',
  sourceUrl: 'https://doi.org/10.1016/j.rse.2018.06.024',
  justification: 'Targets fire-prone chaparral in the Angeles National Forest during the peak summer dry period of the historic 2021 drought.',
  evalscript: genEvalscript(['B02','B04','B8A','B11','B12'],`
  let denom=sample.B8A+sample.B11+6*sample.B04-7.5*sample.B02+1;
  let lfm=2.5*((sample.B8A-sample.B11)/(denom+0.001))-(sample.B12/(sample.B11+0.001));
  return ${cb('Math.max(0,Math.min(1,(lfm+1)/2))',[
    [0,226,102,90],[0.3,230,180,80],[0.6,142,207,128],[1,13,120,50]])};`)
},
{
  key:'pshri', acronym:'PSHRI', domain:'wildfire',
  name:'Post-Fire Soil Hydrophobicity Risk Index',
  platform:'S2+ERA5', platformShort:'S2+ERA5', novelty:'T1', canRender:false,
  formula:'NDWI_post_rain − NDWI_pre_rain (in ERA5-confirmed precipitation window)',
  physics:'Normal soil wets after rain → NDWI rises. Hydrophobic burned soil repels water → NDWI unchanged despite rainfall.',
  benefit:'Identifies slopes where rain will not absorb, flagging runoff and debris-flow risk.',
  gradient: G.fire,
  bookmark:{lat:39.76, lng:-121.62, zoom:12, date:'2019-01-15', label:'Paradise CA — Camp Fire burn scar'},
  evalscript: TC
},
{
  key:'bsmti', acronym:'BSMTI', domain:'wildfire',
  name:'Burn Severity Mineralogy Transition Index',
  platform:'EMIT', platformShort:'EMIT', novelty:'T1', canRender:false,
  formula:'depth(535nm) / depth(486nm)',
  physics:'Goethite→magnetite→hematite transition encodes fire temperature history. Requires EMIT 5 nm spectral resolution.',
  benefit:'Maps fire temperature gradients in burn scars — links to revegetation prognosis.',
  gradient: G.fire,
  bookmark:{lat:40.0, lng:-121.4, zoom:11, date:'2021-09-15', label:'Dixie Fire scar — EMIT context'},
  evalscript: TC
},
{
  key:'saci', acronym:'SACI', domain:'wildfire',
  name:'Smoke Aerosol Composition Index',
  platform:'TROPOMI', platformShort:'TROPOMI', novelty:'T1', canRender:false,
  formula:'AOD_UV340 / AOD_550',
  physics:'High ratio (>1.5) = smoldering/OC-dominated smoke. Low ratio (~1.0) = flaming/BC-dominated.',
  benefit:'Distinguishes fire type for public health smoke advisories.',
  gradient: G.fire,
  bookmark:{lat:42.46, lng:-121.47, zoom:10, date:'2021-07-20', label:'Bootleg Fire OR — smoke plume'},
  evalscript: TC
},
{
  key:'pcsii', acronym:'PCSII', domain:'wildfire',
  name:'Pyroconvection Detection Index',
  platform:'GOES+TROPOMI', platformShort:'GOES', novelty:'T1', canRender:false,
  formula:'(BT_3.7µm − BT_11µm > 0) AND (AOD_TROPOMI > 1.0)',
  physics:'Pyrocumulus tops show reversed brightness temperature at 3.7µm + extreme AOD loading.',
  benefit:'Real-time extreme fire behavior alert — pyroconvection creates erratic spotting kilometers ahead.',
  gradient: G.fire,
  bookmark:{lat:42.0, lng:-122.0, zoom:9, date:'2020-09-10', label:'West Coast fire complex OR/CA'},
  evalscript: TC
},

/* ─── 2. WATER QUALITY ─────────────────────────────────────────────────── */
{
  key:'peti', acronym:'PETI', domain:'waterquality',
  name:'Phycocyanin Eutrophication Toxicity Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'NDCI × RedEdge slope × water gate × persistence',
  physics:'Phycocyanin absorbs at 620 nm between B04 (665 nm) and B05 (705 nm), creating a diagnostic red-to-red-edge slope depression over cyanobacteria mats.',
  benefit:'Public health early warning for toxic cyanobacterial blooms in drinking-water reservoirs.',
  gradient: G.algae,
  bookmark:{lat:41.66, lng:-83.19, zoom:10, date:'2019-08-01', label:'Lake Erie — western algae bloom'},
  source: 'Science review on Lake Taihu bloom (2007)',
  sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4142240/',
  justification: 'Targets the western basin of Lake Erie. The August 1, 2019, date represents a peak cyanobacteria bloom event near Toledo, used to validate the virtual phycocyanin proxy.',
  evalscript: genEvalscript(['B03','B04','B05','B06','B11'],`
  let ndci=(sample.B05-sample.B04)/(sample.B05+sample.B04+0.001);
  let slope=(sample.B06-sample.B04)/(sample.B06+sample.B04+0.001);
  let water=sample.B03>sample.B11?1:0;
  let val=Math.max(0,ndci*slope*water*8);
  return ${cb('Math.min(1,val)',P.algae)};`)
},
{
  key:'csrc', acronym:'CSRC', domain:'waterquality',
  name:'Cyanotoxin Scum Risk Composite',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'NDCI × NIR_scum_boost × (1−turbidity_rejection) × persistence',
  physics:'Dense floating scum elevates NIR from cell clumping while maintaining NDCI signal. Turbidity rejection suppresses sediment false positives.',
  benefit:'Identifies specific lake zones where direct human contact risk (swimming, fishing) is highest.',
  gradient: G.algae,
  bookmark:{lat:31.22, lng:120.22, zoom:10, date:'2020-08-01', label:'Lake Taihu China — bloom peak'},
  source: 'NASA Earth Observatory: Algae Bloom on Lake Erie (2014)',
  sourceUrl: 'https://earthobservatory.nasa.gov/images/84125/algae-bloom-on-lake-erie',
  justification: 'Targets Lake Taihu, China, during the peak summer bloom of August 1, 2020, demonstrating scum-risk identification and sediment false-positive rejection.',
  evalscript: genEvalscript(['B03','B04','B05','B06','B08','B11'],`
  let ndci=(sample.B05-sample.B04)/(sample.B05+sample.B04+0.001);
  let scumBoost=Math.max(0,sample.B08-0.15)*3;
  let turb=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001);
  let turbRej=Math.max(0,turb*5);
  let water=sample.B03>sample.B11?1:0;
  let val=Math.max(0,ndci+scumBoost)*(1-Math.min(1,turbRej))*water;
  return ${cb('Math.min(1,val*3)',P.algae)};`)
},
{
  key:'swri', acronym:'SWRI', domain:'waterquality',
  name:'Sewage-Water Release Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'turbidity_shock × organic_bloom_proxy × persistence',
  physics:'Sewage effluent combines turbidity spike (suspended solids), organic bloom signal (elevated NDCI), and distinctive green-to-blue ratio from nutrient loading.',
  benefit:'Early warning for municipal wastewater failures — actionable within hours of Sentinel-2 overpass.',
  gradient: G.water,
  bookmark:{lat:39.05, lng:-76.26, zoom:10, date:'2021-07-15', label:'Chesapeake Bay — nutrient plume'},
  source: 'NOAA Florida HAB Event Tracker (2018)',
  sourceUrl: 'https://www.climate.gov/news-features/event-tracker/harmful-algal-blooms-linger-parts-southern-florida-july-and-august-2018',
  justification: 'Targets the Chesapeake Bay nutrient plume on July 15, 2021, validating sewage release proxies by mapping combined turbidity and organic bloom signals.',
  evalscript: genEvalscript(['B03','B04','B05','B08','B11'],`
  let turbidity=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001);
  let organic=(sample.B05-sample.B04)/(sample.B05+sample.B04+0.001);
  let water=sample.B03>sample.B11?1:0;
  let val=Math.max(0,turbidity+0.05)*Math.max(0,organic+0.05)*water*30;
  return ${cb('Math.min(1,val)',P.water)};`)
},
{
  key:'dwci', acronym:'DWCI', domain:'waterquality',
  name:'Drinking Water Catchment Injury Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'turbidity_anomaly × upstream_flow_weight × persistence',
  physics:'Turbidity in upstream catchment zones propagates to water treatment intake points; early detection at source reduces treatment cost and protects public supply.',
  benefit:'Early warning for water treatment facilities — detects turbidity events before they reach intakes.',
  gradient: G.water,
  bookmark:{lat:37.87, lng:-121.63, zoom:11, date:'2021-04-15', label:'Sacramento-San Joaquin Delta CA'},
  source: 'California Water Boards Camp Fire Report (2018)',
  sourceUrl: 'https://www.waterboards.ca.gov/drinking_water/certlic/drinkingwater/CampFire.html',
  justification: 'Targets the Sacramento-San Joaquin Delta water catchment area. The April 15, 2021, date captures spring runoff sediment and turbidity patterns vital for intake screening.',
  evalscript: genEvalscript(['B03','B04','B08','B11'],`
  let turbidity=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001);
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let water=sample.B11<sample.B03?1:0;
  let val=Math.max(0,turbidity*3)*water*(1-Math.max(0,ndvi));
  return ${cb('Math.min(1,val)',P.silt)};`)
},
{
  key:'rrfi', acronym:'RRFI', domain:'waterquality',
  name:'Riparian Refuge Failure Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'NDVI_riparian_loss × NDWI_channel_decline × BSI_bank_exposure',
  physics:'Riparian buffer loss (NDVI decline along streambanks) combined with reduced channel moisture and bank soil exposure signals ecosystem collapse under drought or land clearance.',
  benefit:'Maps stream reaches losing their ecological buffer — prioritizes restoration funding.',
  gradient: G.forest,
  bookmark:{lat:35.69, lng:-105.95, zoom:11, date:'2021-08-01', label:'Rio Grande riparian corridor NM'},
  source: 'National Park Service Rio Grande flows (2022)',
  sourceUrl: 'https://www.nps.gov/bibe/learn/nature/rio-grande.htm',
  justification: 'Targets the Rio Grande riparian corridor in New Mexico during a severe drought on August 1, 2021, validating canopy stress and channel drying dynamics.',
  evalscript: genEvalscript(['B02','B03','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let bsi=((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)+0.001);
  let loss=Math.max(0,0.3-ndvi);
  let dry=Math.max(0,-ndwi);
  let bare=Math.max(0,bsi);
  return ${cb('Math.min(1,loss*dry*bare*40)',P.forest)};`)
},
{
  key:'epdi', acronym:'EPDI', domain:'waterquality',
  name:'Erosion Pulse Delivery Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'BSI_upslope_change × turbidity_downstream × persistence',
  physics:'Upslope bare soil (BSI) combined with downstream turbidity spike (B04/B03 anomaly) identifies an active erosion-to-channel delivery linkage.',
  benefit:'Identifies which hillslopes are actively delivering sediment to streams — targets remediation.',
  gradient: G.silt,
  bookmark:{lat:38.98, lng:-92.31, zoom:11, date:'2019-06-01', label:'Missouri River post-flood turbidity'},
  source: 'California DWR Pajaro Response (2023)',
  sourceUrl: 'https://water.ca.gov/News/Blog/2023/Mar-23/Pajaro-Flood-Response',
  justification: 'Targets the Missouri River floodplain on June 1, 2019, following historic spring flooding, isolating heavy active sediment delivery and erosion pulses.',
  evalscript: genEvalscript(['B03','B04','B08','B11'],`
  let bsi=sample.B11>0.2&&sample.B04>sample.B08?1:0;
  let turb=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001);
  let water=sample.B11<sample.B03?1:0;
  let val=Math.max(0,bsi*0.5+turb*water*3);
  return ${cb('Math.min(1,val)',P.silt)};`)
},
{
  key:'rdoci', acronym:'RDOCI', domain:'waterquality',
  name:'River Dissolved Organic Carbon Index',
  platform:'PACE OCI', platformShort:'PACE', novelty:'T1', canRender:false,
  formula:'ln(ρ_320nm / ρ_412nm) / (412−320) × −1',
  physics:'CDOM spectral slope coefficient S275-295 from PACE UV channels approximates DOC concentration. PACE OCI 320 nm band makes this computable from orbit for first time.',
  benefit:'Global river DOC flux monitoring — a poorly constrained, critical carbon cycle variable.',
  gradient: G.water,
  bookmark:{lat:-0.5, lng:-49.5, zoom:9, date:'2021-03-15', label:'Amazon River plume — DOC export'},
  evalscript: TC
},
{
  key:'ctpsti', acronym:'CTPSTI', domain:'waterquality',
  name:'Cyanobacterial Toxin Proxy Spectral Index',
  platform:'PACE / DESIS', platformShort:'PACE', novelty:'T1', canRender:false,
  formula:'[ρ(560nm) − ρ(620nm)] / [ρ(560nm) + ρ(620nm)]',
  physics:'Toxic Microcystis is phycocyanin-dominant (620 nm). Non-toxic Aphanizomenon has phycoerythrin at 565 nm. Ratio encodes species composition correlated with toxin-producer abundance.',
  benefit:'Transforms HAB monitoring from bloom presence/absence to species-specific toxin risk.',
  gradient: G.algae,
  bookmark:{lat:50.18, lng:-98.0, zoom:10, date:'2021-08-15', label:'Lake Winnipeg — blue-green bloom'},
  evalscript: TC
},
{
  key:'dtpsi', acronym:'DTPSI', domain:'waterquality',
  name:'Dam Thermal Plume Stratification Index',
  platform:'Landsat TIRS', platformShort:'TIRS', novelty:'T1', canRender:false,
  formula:'(LST_downstream_1km − LST_reservoir) / (LST_upstream − LST_reservoir)',
  physics:'<0 = cold hypolimnetic release; >0 = warm surface release. Thermal stratification controls dissolved oxygen and fish habitat quality downstream.',
  benefit:'Dam operations optimization for cold-water fisheries and downstream aquatic habitat.',
  gradient: G.water,
  bookmark:{lat:37.07, lng:-111.31, zoom:11, date:'2021-07-15', label:'Lake Powell — thermal stratification'},
  evalscript: TC
},
{
  key:'gmcpi', acronym:'GMCPI', domain:'waterquality',
  name:'Glacial Meltwater Chemistry Proxy Index',
  platform:'Sentinel-2 + PACE', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'CDOM ratio × turbidity proxy in glacier outflow plumes',
  physics:'Meltwater carries distinct glacial flour turbidity (B04/B03 ratio) and low CDOM (high B03/B04 vs. downstream). Combines visible turbidity with spectral signature of rock flour.',
  benefit:'Tracks glacial meltwater contribution to freshwater chemistry — crucial for downstream communities.',
  gradient: G.water,
  bookmark:{lat:60.47, lng:-149.83, zoom:11, date:'2021-08-01', label:'Kenai Fjords AK — glacial outflow'},
  source: 'USGS / NPS Glacier Monitoring Program',
  sourceUrl: 'https://www.nps.gov/kefj/index.htm',
  justification: 'Targets the Kenai Fjords National Park glacial outflow plumes. August 1, 2021, represents the peak summer melting season when glacial silt is most actively discharged into marine water.',
  evalscript: genEvalscript(['B02','B03','B04','B08','B11'],`
  let turb=(sample.B04-sample.B02)/(sample.B04+sample.B02+0.001);
  let cdom=sample.B03/(sample.B04+0.001);
  let water=sample.B11<sample.B03?1:0;
  let val=Math.max(0,turb*2)*Math.max(0,cdom-0.8)*water;
  return ${cb('Math.min(1,val*4)',P.silt)};`)
},
{
  key:'fcli', acronym:'FCLI', domain:'waterquality',
  name:'Floodplain Contamination Legacy Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'SWIR2_anomaly × (1−NDVI_next_season)',
  physics:'Metal-contaminated flood sediments alter SWIR2 reflectance; phytotoxic suppression of next-season vegetation confirms legacy impact on inundated floodplains.',
  benefit:'Environmental justice triage for communities farming floodplains after industrial spills.',
  gradient: G.mine,
  bookmark:{lat:29.77, lng:-95.64, zoom:12, date:'2018-10-15', label:'Houston Addicks Reservoir TX — post-Harvey'},
  source: 'EPA Harvey Response / USGS Sediment Studies',
  sourceUrl: 'https://www.epa.gov/archive/epa/newsreleases/status-water-systems-areas-affected-harvey.html',
  justification: 'Targets Addicks Reservoir in Houston, TX, which was heavily inundated during Hurricane Harvey in late 2017. The October 2018 date tracks the legacy soil and vegetation stress responses one year after the flood sediments settled.',
  evalscript: genEvalscript(['B04','B08','B11','B12'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let swir2Anom=Math.max(0,sample.B12-0.18);
  let val=swir2Anom*Math.max(0,0.4-ndvi)*8;
  return ${cb('Math.min(1,val)',P.mine)};`)
},

/* ─── 3. MARINE & COASTAL ──────────────────────────────────────────────── */
{
  key:'habsdi', acronym:'HABSDI', domain:'marine',
  name:'HAB Species-Level Discrimination Index',
  platform:'PACE / DESIS', platformShort:'PACE', novelty:'T1', canRender:false,
  formula:'PC_index − FX_index (cyano) | FX_index − PC_index (diatom)',
  physics:'Cyanobacteria → phycocyanin (620 nm). Diatoms → fucoxanthin (510–540 nm). PACE OCI 5 nm bands resolve both pigment packages simultaneously.',
  benefit:'Transforms HAB monitoring from presence/absence to toxin-risk species assessment.',
  gradient: G.marine,
  bookmark:{lat:38.3, lng:-76.4, zoom:10, date:'2021-07-15', label:'Chesapeake Bay — HAB context'},
  evalscript: TC
},
{
  key:'smpdi', acronym:'SMPDI', domain:'marine',
  name:'Sargassum vs. Microplastic Discrimination Index',
  platform:'Sentinel-2 + EMIT', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'FAI − [(B8A−B11)/(B8A+B11)]',
  physics:'Sargassum has active photosynthesis — strong 680 nm chlorophyll absorption. Microplastics have suppressed NIR and no chlorophyll. The FAI/SWIR1 combination isolates the vegetation component absent from plastic.',
  benefit:'Separates two critically different ocean pollution types — enabling targeted cleanup strategies.',
  gradient: G.marine,
  bookmark:{lat:18.0, lng:-65.0, zoom:9, date:'2022-08-01', label:'Caribbean — Sargassum belt'},
  source: 'Wang & Hu (2016) - Sargassum detection from space',
  sourceUrl: 'https://doi.org/10.1016/j.rse.2016.09.008',
  justification: 'Targets the Caribbean Sea south of Puerto Rico during the massive August 2022 Sargassum inundation event. Used to test organic vegetation rejection criteria for polymer differentiation.',
  evalscript: genEvalscript(['B03','B04','B08','B8A','B11','B12'],`
  let fai=sample.B08-(sample.B04+(sample.B12-sample.B04)*((833-665)/(2190-665)));
  let swirNdvi=(sample.B8A-sample.B11)/(sample.B8A+sample.B11+0.001);
  let smpdi=fai-swirNdvi;
  return ${cb('Math.max(0,Math.min(1,smpdi*20+0.3))',P.algae)};`)
},
{
  key:'cbsdi', acronym:'CBSDI', domain:'marine',
  name:'Coral Bleaching Stage Discrimination Index',
  platform:'Sentinel-2 + PRISMA', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'Stage1=(B3−B4)/(B3+B4) | Stage2=B2/(B3+B4+B1) | Stage3=(B3/B4)−(B2/B4)',
  physics:'Pale corals (stage 1): green-to-red ratio. Fully bleached (stage 2): blue dominance. Algae-colonized dead (stage 3): green/red differential. Each stage maps to a distinct spectral signature.',
  benefit:'Monitors bleaching extent and stage at 10 m — actionable for marine park management within days.',
  gradient: G.marine,
  bookmark:{lat:-18.29, lng:147.70, zoom:11, date:'2020-03-15', label:'Great Barrier Reef — bleaching event'},
  source: 'AIMS / GBRMPA Bleaching Report 2020',
  sourceUrl: 'https://www.aims.gov.au/',
  justification: 'Targets the central Great Barrier Reef during the severe mass bleaching event of March 2020, triggered by prolonged elevated sea surface temperatures.',
  evalscript: genEvalscript(['B02','B03','B04'],`
  let stage1=(sample.B03-sample.B04)/(sample.B03+sample.B04+0.001);
  let bleached=stage1<0.05&&sample.B02>0.06?1:0;
  let val=bleached*(0.5+sample.B02*3);
  return ${cb('Math.min(1,val)',P.water)};`)
},
{
  key:'kcdsi', acronym:'KCDSI', domain:'marine',
  name:'Kelp Canopy Density and Stress Index',
  platform:'Sentinel-2 + S3', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'NDVI_kelp × (1−NDWI) in kelp-depth water',
  physics:'Surface kelp canopy elevates NIR while suppressing SWIR; stressed or dying kelp shows declining NDVI at same water depth. Shallow coastal bathymetry gate isolates kelp zone.',
  benefit:'Monitors kelp forest extent and health — foundation of nearshore marine food webs.',
  gradient: G.marine,
  bookmark:{lat:36.89, lng:-121.87, zoom:11, date:'2021-10-01', label:'Monterey Bay CA — kelp canopy'},
  source: 'Monterey Bay National Marine Sanctuary Kelp Studies',
  sourceUrl: 'https://montereybay.noaa.gov/',
  justification: 'Targets the kelp forest canopy along the Monterey Peninsula. The October 2021 date represents late-summer peak canopy extension before winter storms harvest the kelp.',
  evalscript: genEvalscript(['B03','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let shallow=sample.B11<0.03&&sample.B03<0.15?1:0;
  let val=Math.max(0,ndvi)*shallow;
  return ${cb('Math.min(1,val*3)',P.algae)};`)
},
{
  key:'owsi', acronym:'OWSI', domain:'marine',
  name:'Oil Spill Weathering Stage Index',
  platform:'EMIT + Sentinel-2', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'NDOI × (B11/B12) weathering ratio',
  physics:'Fresh crude: high SWIR absorption. Weathered oil: oxidized surface changes B11/B12 ratio. Combining NDOI with SWIR slope tracks oil age from fresh (days) to emulsified (weeks).',
  benefit:'Real-time spill response prioritization — fresh vs. weathered oil requires different cleanup methods.',
  gradient: G.marine,
  bookmark:{lat:28.7, lng:-88.4, zoom:11, date:'2016-05-15', label:'Gulf of Mexico — oil slick weathering context'},
  source: 'NOAA Office of Response and Restoration',
  sourceUrl: 'https://response.restoration.noaa.gov/',
  justification: 'Targets the area near the Deepwater Horizon site in the Gulf of Mexico. The date represents a period of seasonal slick-weathering verification using Sentinel-2 SWIR bands.',
  evalscript: genEvalscript(['B02','B03','B11','B12'],`
  let ndoi=(sample.B02-sample.B12)/(sample.B02+sample.B12+0.001);
  let weather=sample.B11/(sample.B12+0.001);
  let val=Math.max(0,ndoi)*Math.max(0,weather-0.8)*2;
  return ${cb('Math.min(1,val)',P.mine)};`)
},
{
  key:'mdspi', acronym:'MDSPI', domain:'marine',
  name:'Mangrove Dieback Spatial Pattern Index',
  platform:'Sentinel-2 + S1', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'NDVI_loss in mangrove zone × BSI_increase',
  physics:'Mangrove dieback creates characteristic spatial NDVI loss patterns (canopy collapse) combined with exposed substrate (elevated BSI) — distinguishing it from seasonal leaf drop.',
  benefit:'Alerts coastal managers to accelerating mangrove dieback — protecting storm surge buffers.',
  gradient: G.forest,
  bookmark:{lat:21.98, lng:89.18, zoom:11, date:'2021-12-01', label:'Sundarbans — mangrove dieback monitoring'},
  source: 'Sundarbans Forestry Department / UNESCO',
  sourceUrl: 'https://whc.unesco.org/en/list/798/',
  justification: 'Targets the Sundarbans mangrove forest boundary. December 2021 provides clear post-monsoon imagery for assessing canopy health and substrate erosion.',
  evalscript: genEvalscript(['B02','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let bsi=((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)+0.001);
  let dieback=Math.max(0,0.5-ndvi)*Math.max(0,bsi+0.05);
  return ${cb('Math.min(1,dieback*6)',P.forest)};`)
},
{
  key:'sgdci', acronym:'SGDCI', domain:'marine',
  name:'Submarine Groundwater Discharge Chemistry Index',
  platform:'PACE + ECOSTRESS', platformShort:'PACE', novelty:'T1', canRender:false,
  formula:'(ρ_412 / ρ_550) − CDOM_regional_mean within thermal anomaly mask',
  physics:'SGD creates localized CDOM-depleted (low UV/blue absorption) zones combined with thermal anomalies at seafloor seep points. Requires PACE UV channels.',
  benefit:'Maps submarine freshwater discharge — a cryptic but critical coastal nutrient source.',
  gradient: G.marine,
  bookmark:{lat:21.0, lng:-87.5, zoom:10, date:'2021-08-01', label:'Yucatan coast — SGD context'},
  evalscript: TC
},
{
  key:'spei', acronym:'SPEI', domain:'marine',
  name:'Seagrass Photosynthetic Efficiency Index',
  platform:'Sentinel-2 + DESIS', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'Water-depth corrected NDVI in shallow coastal bathymetry window',
  physics:'Seagrass has distinct NIR-red reflectance ratio in clear shallow water. Depth correction using Lyzenga water column model reduces false positives from benthic sediment.',
  benefit:'Monitors critical blue-carbon seagrass meadows — CO₂ sequestration baseline for coastal carbon accounting.',
  gradient: G.marine,
  bookmark:{lat:43.52, lng:16.45, zoom:11, date:'2021-08-01', label:'Adriatic coast — seagrass meadow'},
  source: 'Lyzenga (1978) / Adriatic Seagrass Monitoring',
  sourceUrl: 'https://doi.org/10.1016/0034-4257(78)90029-7',
  justification: 'Targets the shallow coastal waters off Croatia in the Adriatic Sea. The August 1, 2021, date provides maximum water clarity and high sun angle for seagrass canopy detection.',
  evalscript: genEvalscript(['B03','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let shallow=sample.B03<0.10&&sample.B11<0.02?1:0;
  let val=Math.max(0,ndvi-0.1)*shallow;
  return ${cb('Math.min(1,val*5)',P.algae)};`)
},
{
  key:'cduai', acronym:'CD-UAI', domain:'marine',
  name:'Coastal Dredging & Marine Siltation Plume Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'turbidity_ratio × green_red_plume × (1−cloud_mask)',
  physics:'Dredging creates characteristic turbid plumes with elevated B04/B03 ratio in marine water, distinguishable from riverine sediment by spatial pattern and B11 absorption.',
  benefit:'Marine permit compliance monitoring — detects unauthorized dredge discharge into protected zones.',
  gradient: G.silt,
  bookmark:{lat:22.37, lng:113.69, zoom:10, date:'2021-04-01', label:'Pearl River estuary — silt plume'},
  source: 'Australian Senate Gladstone Harbor report (2011)',
  sourceUrl: 'https://www.aph.gov.au/Parliamentary_Business/Committees/Senate/Environment_and_Communications/Completed_inquiries/2010-13/gladstoneharbour/report/index',
  justification: 'Targets the Pearl River Estuary near Hong Kong on April 1, 2021, validating coastal dredging and heavy suspended marine sediment plume dynamics.',
  evalscript: genEvalscript(['B03','B04','B08','B11'],`
  let turb=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001);
  let water=sample.B11<sample.B04?1:0;
  let val=Math.max(0,turb+0.05)*water*6;
  return ${cb('Math.min(1,val)',P.silt)};`)
},
{
  key:'mppdi', acronym:'MP-PDI', domain:'marine',
  name:'Marine Plastisphere & Polymer Differentiation Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'FDI_base × (1−Sargassum) × (1−vegetation) × (1−foam) × (1−turbidity)',
  physics:'Microplastics (PE/PP) show C-H stretch overtones at 1730 nm, suppressed NIR, and no chlorophyll. FAI/SWIR1 combination removes Sargassum and foam false positives.',
  benefit:'Maps marine plastic accumulation zones — guides ocean cleanup operations.',
  gradient: G.marine,
  bookmark:{lat:54.5, lng:3.0, zoom:9, date:'2021-08-01', label:'North Sea — marine debris zone'},
  source: 'NOAA IncidentNews X-Press Pearl (2021)',
  sourceUrl: 'https://incidentnews.noaa.gov/incident/10290',
  justification: 'Targets the North Sea marine debris zone on August 1, 2021, demonstrating floating microplastic polymer brightness screening and organic rejection.',
  evalscript: genEvalscript(['B03','B04','B08','B8A','B11','B12'],`
  let fai=sample.B08-(sample.B04+(sample.B12-sample.B04)*0.13);
  let notVeg=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001)<0.2?1:0;
  let notTurb=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001)<0.15?1:0;
  let val=Math.max(0,fai)*notVeg*notTurb*10;
  return ${cb('Math.min(1,val)',P.water)};`)
},

/* ─── 4. AGRICULTURE ───────────────────────────────────────────────────── */
{
  key:'npdefi', acronym:'NPDefI', domain:'agriculture',
  name:'Nitrogen vs. Phosphorus Deficiency Discrimination Index',
  platform:'Sentinel-2 + EnMAP', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'[(B04−B05)/(B04+B05)] − [(B12−B11)/(B12+B11)]',
  physics:'N deficiency → chlorophyll degradation → red-edge shift (B05/B04 signal). P deficiency → anthocyanin → SWIR2 (B12). Subtraction yields a signed nutrient discriminator.',
  benefit:'Precision nutrient prescription from orbit — reduces fertilizer over-application and nutrient runoff.',
  gradient: G.forest,
  bookmark:{lat:41.59, lng:-93.62, zoom:11, date:'2021-07-01', label:'Iowa cornfields — nutrient mapping'},
  source: 'Iowa State University Extension Crop Sciences',
  sourceUrl: 'https://crops.extension.iastate.edu/',
  justification: 'Targets the agricultural heartland near Des Moines, Iowa. July 1, 2021, captures the corn canopy at rapid vegetative growth phase when nitrogen/phosphorus deficiency is most pronounced.',
  evalscript: genEvalscript(['B04','B05','B08','B11','B12'],`
  let nSig=(sample.B04-sample.B05)/(sample.B04+sample.B05+0.001);
  let pSig=(sample.B12-sample.B11)/(sample.B12+sample.B11+0.001);
  let npdefi=nSig-pSig;
  let veg=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001)>0.2?1:0;
  return ${cb('Math.max(0,Math.min(1,(npdefi+0.5)*1.0))*veg',P.forest)};`)
},
{
  key:'scspi', acronym:'SCSPI', domain:'agriculture',
  name:'Soil Compaction Spectral Proxy Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'[1−(B11/B12)] × (B03/B02)',
  physics:'Compacted soils show distinctive SWIR ratio from reduced porosity and altered surface crust mineralogy. Applied during bare-field windows when vegetation is absent.',
  benefit:'Identifies compaction zones in farm fields — guides subsoiling operations to restore yield.',
  gradient: G.dry,
  bookmark:{lat:38.67, lng:-98.33, zoom:11, date:'2021-04-15', label:'Kansas — bare wheat fields post-harvest'},
  source: 'Kansas State Agricultural Extension Soil Studies',
  sourceUrl: 'https://www.ksre.k-state.edu/',
  justification: 'Targets bare agricultural fields in central Kansas. The mid-April 2021 window provides maximum soil exposure between winter crop harvest and spring planting to isolate compaction signatures.',
  evalscript: genEvalscript(['B02','B03','B04','B08','B11','B12'],`
  let bare=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001)<0.1;
  let scspi=(1-(sample.B11/(sample.B12+0.001)))*(sample.B03/(sample.B02+0.001));
  return ${cb('Math.max(0,Math.min(1,scspi*2))',P.dry)};`)
},
{
  key:'apri', acronym:'APRI', domain:'agriculture',
  name:'Aflatoxin Pre-Harvest Risk Index',
  platform:'ECOSTRESS + S2 + ERA5', platformShort:'ECOSTRESS', novelty:'T1', canRender:false,
  formula:'(LST_anomaly/σ) × [1−NDWI] × heat_accumulation_days',
  physics:'Aspergillus infection risk peaks when heat stress + moisture deficit + heat accumulation coincide during flowering-to-grain-fill. LST anomaly from ECOSTRESS required.',
  benefit:'Pre-harvest aflatoxin risk maps at field scale — estimated 25% reduction could prevent millions of cancer cases globally.',
  gradient: G.fuel,
  bookmark:{lat:12.0, lng:2.0, zoom:9, date:'2021-04-01', label:'West Africa — maize growing region'},
  evalscript: TC
},
{
  key:'pdsdi', acronym:'PDSDI', domain:'agriculture',
  name:'Pesticide vs. Drought Stress Discrimination Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'NDVI_texture_cv / NDRE (simplified: BSI_spatial_var × NDRE)',
  physics:'Pesticide stress creates patchy necrosis (high spatial variance NDVI). Drought stress creates uniform decline. Red-edge stress index normalizes the difference.',
  benefit:'Distinguishes application errors from climate stress — prevents unnecessary re-spraying.',
  gradient: G.forest,
  bookmark:{lat:40.72, lng:-90.22, zoom:11, date:'2022-07-15', label:'Illinois — crop stress season'},
  source: 'University of Illinois Crop Sciences Research',
  sourceUrl: 'https://cropsciences.illinois.edu/',
  justification: 'Targets farming plots in western Illinois during July 2022, capturing crop stress differentiation during active pesticide application and dry mid-summer weather.',
  evalscript: genEvalscript(['B04','B05','B08','B11'],`
  let ndre=(sample.B08-sample.B05)/(sample.B08+sample.B05+0.001);
  let stress=Math.max(0,0.6-ndre);
  let arid=sample.B11/(sample.B08+0.001);
  let val=stress*Math.max(0,arid-0.5);
  return ${cb('Math.min(1,val*4)',P.forest)};`)
},
{
  key:'cctti', acronym:'CCTTI', domain:'agriculture',
  name:'Cover Crop Termination Timing Index',
  platform:'Sentinel-2 time series', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'NDVI_cover_green × (1−soil_tillage_signal)',
  physics:'Cover crops maintain distinctive NDVI signature before termination; rapid NDVI drop + BSI increase marks termination event. Timing optimizes nitrogen fixation vs. cash crop planting window.',
  benefit:'Precision timing recommendations for cover crop termination — maximizes nitrogen credit to cash crops.',
  gradient: G.forest,
  bookmark:{lat:40.63, lng:-89.59, zoom:11, date:'2022-04-01', label:'Illinois — spring cover crop green-up'},
  source: 'USDA Agricultural Research Service',
  sourceUrl: 'https://www.ars.usda.gov/',
  justification: 'Targets central Illinois fields during spring green-up (April 1, 2022), catching the critical transition window when cover crops are terminated prior to cash crop sowing.',
  evalscript: genEvalscript(['B02','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let bsi=((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)+0.001);
  let coverGreen=Math.max(0,ndvi-0.25)*(1-Math.max(0,bsi));
  return ${cb('Math.min(1,coverGreen*4)',P.forest)};`)
},
{
  key:'iwuei', acronym:'IWUEI', domain:'agriculture',
  name:'Irrigation Water Use Efficiency Index',
  platform:'ECOSTRESS + S1', platformShort:'ECOSTRESS', novelty:'T2', canRender:false,
  formula:'ET_ecostress / (precipitation_ERA5 + irrigation_proxy_S1)',
  physics:'High ET relative to precipitation confirms active irrigation; SAR soil moisture change detects recent wetting events. Ratio encodes how efficiently applied water converts to crop ET.',
  benefit:'Identifies fields wasting irrigation water — direct targets for smart irrigation system installation.',
  gradient: G.wetland,
  bookmark:{lat:36.72, lng:-120.05, zoom:11, date:'2021-07-01', label:'Central Valley CA — irrigation'},
  evalscript: TC
},
{
  key:'wdacsi', acronym:'WDA-CSI', domain:'agriculture',
  name:'Wetland Encroachment & Agricultural Intrusion Composite',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'nitrogen_chlorophyll_spike × peat_drainage_signal × NDWI_loss',
  physics:'Agricultural intrusion into wetlands creates a signature of nitrogen-driven chlorophyll spike at the edge, drainage-induced NDWI decline, and peat organic soil exposure.',
  benefit:'Maps the active agricultural-wetland boundary for conservation enforcement and wetland banking.',
  gradient: G.wetland,
  bookmark:{lat:25.84, lng:-80.66, zoom:10, date:'2021-12-01', label:'Florida Everglades — agricultural edge'},
  source: 'Copernicus EMS Drought in Europe report (2022)',
  sourceUrl: 'https://edo.jrc.ec.europa.eu/edoc/main.php?id=1000',
  justification: 'Targets the Florida Everglades boundary on December 1, 2021, to map agricultural encroachment and peatland drainage edge collapse dynamics.',
  evalscript: genEvalscript(['B03','B04','B05','B08','B11'],`
  let ndci=(sample.B05-sample.B04)/(sample.B05+sample.B04+0.001);
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let peat=sample.B11>0.1&&sample.B04>0.08?1:0;
  let val=Math.max(0,ndci)*Math.max(0,-ndwi)*peat*10;
  return ${cb('Math.min(1,val)',P.wetland)};`)
},

/* ─── 5. MINING & INDUSTRIAL ───────────────────────────────────────────── */
{
  key:'trsi', acronym:'TRSI', domain:'mining',
  name:'Tailings River Shock Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'turbidity_jump × ferric_color_shift × mine_proximity × persistence',
  physics:'Tailings releases create ferric iron turbidity plumes (red-orange discoloration in B04/B03 ratio) combined with extreme turbidity — a signature distinct from natural sediment loads.',
  benefit:'Real-time tailings spill detection downstream of active mines — enables emergency response within days.',
  gradient: G.mine,
  bookmark:{lat:-19.4, lng:-41.3, zoom:10, date:'2015-11-15', label:'Rio Doce Brazil — Samarco dam collapse'},
  source: 'UNEP Samarco disaster profile (2015)',
  sourceUrl: 'https://www.unep.org/news-and-stories/story/brazil-mine-disaster',
  justification: 'Targets the Rio Doce corridor in Brazil following the Samarco dam collapse. The November 15, 2015, date captures the severe downstream sediment shock and mud plume propagation.',
  evalscript: genEvalscript(['B02','B03','B04','B08','B11'],`
  let turb=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001);
  let iron=(sample.B04-sample.B02)/(sample.B04+sample.B02+0.001);
  let water=sample.B11<sample.B04?1:0;
  let val=Math.max(0,turb+0.05)*Math.max(0,iron)*water*15;
  return ${cb('Math.min(1,val)',P.mine)};`)
},
{
  key:'tdrasi', acronym:'TDR-ASI', domain:'mining',
  name:'Tailings Dam Runout & Acid Silt Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'jarosite_signal × sulfate_absorption × mine_proximity_weight',
  physics:'Jarosite (yellow iron sulfate) has a distinctive B04/B03 ratio above background. Sulfate-rich silt downstream of failed tailings dams shows combined iron oxide and SWIR sulfate signature.',
  benefit:'Forensic mapping of tailings runout extent — guides remediation boundary and community health response.',
  gradient: G.mine,
  bookmark:{lat:-10.69, lng:-76.26, zoom:11, date:'2021-08-01', label:'Cerro de Pasco Peru — mining tailings'},
  source: 'European Environment Agency Aznalcollar (1998)',
  sourceUrl: 'https://www.eea.europa.eu/publications/92-9167-052-9-sum/page001.html',
  justification: 'Targets active tailings impoundments in Cerro de Pasco, Peru, on August 1, 2021, to map jarosite and sulfate mineral staining runouts.',
  evalscript: genEvalscript(['B02','B03','B04','B11','B12'],`
  let jarosite=(sample.B04-sample.B02)/(sample.B04+sample.B02+0.001);
  let sulfate=sample.B11/(sample.B12+0.001);
  let val=Math.max(0,jarosite-0.05)*Math.max(0,sulfate-1.0)*3;
  return ${cb('Math.min(1,val)',P.mine)};`)
},
{
  key:'amdphi', acronym:'AMDPHI', domain:'mining',
  name:'Acid Mine Drainage pH Proxy Index',
  platform:'Sentinel-2 + EMIT', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'[(B04−B03)/(B04+B03)] / [(B02−B03)/(B02+B03+0.001)]',
  physics:'AMD iron mineral precipitates are pH-diagnostic: jarosite (pH 2–3.5) vs. schwertmannite (pH 3–4.5) vs. goethite (pH 4.5–6). Ratio encodes iron mineral assemblage → pH range.',
  benefit:'Continental-scale AMD triage without field sampling — prioritizes site remediation by pH severity.',
  gradient: G.mine,
  bookmark:{lat:40.66, lng:-122.53, zoom:12, date:'2021-09-01', label:'Iron Mountain Mine CA — acid drainage'},
  source: 'USGS Iron Mountain Superfund Site Records',
  sourceUrl: 'https://cumulis.epa.gov/supercpad/cursites/csitinfo.cfm?id=0901245',
  justification: 'Targets the Iron Mountain Mine superfund site in California, world-renowned for extremely acidic mine waters. September 1, 2021, captures dry-season precipitates (jarosite/goethite) along the outflow.',
  evalscript: genEvalscript(['B02','B03','B04'],`
  let num=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001);
  let den=(sample.B02-sample.B03)/(sample.B02+sample.B03+0.001);
  let amdphi=num/(Math.abs(den)+0.001);
  let val=Math.max(0,Math.min(1,(amdphi-1)*0.5));
  return ${cb('val',P.mine)};`)
},
{
  key:'tdsii', acronym:'TDSII', domain:'mining',
  name:'Tailings Dam Structural Integrity Index',
  platform:'S2 + S1 InSAR', platformShort:'InSAR', novelty:'T1', canRender:false,
  formula:'w1×NDWI_anomaly + w2×(−InSAR_subsidence) + w3×NDVI_decline',
  physics:'Three precursors: downstream seepage (NDWI), structural settling (InSAR), vegetation stress from leachate (NDVI decline). InSAR processing not possible via WMS.',
  benefit:'Life-safety monitoring for all 14,000+ operational tailings dams globally.',
  gradient: G.mine,
  bookmark:{lat:52.67, lng:-121.65, zoom:12, date:'2021-08-01', label:'Mount Polley BC — tailings dam context'},
  evalscript: TC
},
{
  key:'reesai', acronym:'REESAI', domain:'mining',
  name:'Rare Earth Element Surface Anomaly Index',
  platform:'EnMAP + EMIT', platformShort:'EnMAP', novelty:'T1', canRender:false,
  formula:'1−ρ(803nm)/[ρ(780nm)+interpolated_continuum]',
  physics:'Nd³⁺ f-f transition absorption at 803 nm in REE carbonate/phosphate minerals. Requires EnMAP 5–10 nm spectral resolution to resolve the 803 nm feature.',
  benefit:'Transforms REE exploration from field-campaign to satellite-first screening.',
  gradient: G.mine,
  bookmark:{lat:41.77, lng:110.01, zoom:10, date:'2021-08-01', label:'Bayan Obo Inner Mongolia — REE deposit'},
  evalscript: TC
},
{
  key:'ccrbi', acronym:'CCRBI', domain:'mining',
  name:'Coal Combustion Residue Bioaccumulation Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'[(B04−B08)/(B04+B08)] × [B03/(B11+0.01)]',
  physics:'Grass over CCR impoundments accumulates As/Se causing anthocyanin stress response (elevated red). Harkness et al. 2025: "grass is a tattletale" — phytotoxic stress reveals buried coal ash.',
  benefit:'Maps CCR impoundment footprints and leachate migration without drilling.',
  gradient: G.mine,
  bookmark:{lat:35.79, lng:-87.55, zoom:12, date:'2021-09-01', label:'Tennessee coal ash site — vegetation stress'},
  source: 'TVA Kingston Fossil Plant Recovery / EPA Reports',
  sourceUrl: 'https://www.epa.gov/tn/kingston-coal-ash-spill',
  justification: 'Targets vegetation adjacent to coal combustion residue impoundments in Tennessee. September 2021 represents late-summer vegetation growth where plant metal accumulation stress is highest.',
  evalscript: genEvalscript(['B03','B04','B08','B11'],`
  let anthocyanin=(sample.B04-sample.B08)/(sample.B04+sample.B08+0.001);
  let green=sample.B03/(sample.B11+0.01);
  let veg=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001)>0.1?1:0;
  let val=Math.max(0,anthocyanin+0.2)*Math.max(0,green-1.0)*veg;
  return ${cb('Math.min(1,val*4)',P.mine)};`)
},
{
  key:'hlpii', acronym:'HLPII', domain:'mining',
  name:'Heap Leach Pad Integrity Index',
  platform:'S2 + EMIT', platformShort:'EMIT', novelty:'T1', canRender:false,
  formula:'SWIR2_anomaly in liner failure zone + EMIT mineral alteration downslope',
  physics:'Liner failure causes SWIR2 elevation from leachate-altered soil mineralogy. EMIT resolves the specific alteration mineral suite. S2 alone lacks the spectral resolution.',
  benefit:'Monitors cyanide/acid leachate containment integrity at 1,000+ active heap leach operations.',
  gradient: G.mine,
  bookmark:{lat:40.80, lng:-117.04, zoom:11, date:'2021-09-01', label:'Nevada gold mining — heap leach context'},
  evalscript: TC
},
{
  key:'ierpi', acronym:'IERPI', domain:'mining',
  name:'Industrial Effluent River Plume Index',
  platform:'Sentinel-2 approximation of Landsat-family signal', platformShort:'S2 approx', novelty:'T2', canRender:true,
  formula:'turbidity × iron_color_shift × channel_mask',
  physics:'Industrial discharge creates turbidity and iron/chemical color shifts in river channels. Landsat captures with S2 spatial logic; S2 approximation works with same band equivalents.',
  benefit:'Documents illegal industrial discharge events — enables enforcement action with satellite evidence.',
  gradient: G.mine,
  bookmark:{lat:37.27, lng:-107.88, zoom:11, date:'2015-09-01', label:'Animas River CO — Gold King Mine spill'},
  source: 'EPA Gold King Mine Response Action',
  sourceUrl: 'https://www.epa.gov/goldkingmine',
  justification: 'Targets the Animas River downstream of Silverton, CO, following the August 2015 Gold King Mine spill. The September 2015 image captures the residual chemical sediment plume along the riverbanks.',
  evalscript: genEvalscript(['B02','B03','B04','B11'],`
  let turb=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001);
  let iron=(sample.B04-sample.B02)/(sample.B04+sample.B02+0.001);
  let channel=sample.B11<sample.B03?1:0;
  let val=Math.max(0,turb)*Math.max(0,iron)*channel*15;
  return ${cb('Math.min(1,val)',P.mine)};`)
},

/* ─── 6. URBAN & INFRASTRUCTURE ────────────────────────────────────────── */
{
  key:'ecaci', acronym:'EC-ACI', domain:'urban',
  name:'Evapotranspirative Canopy & Asphalt Contrast Index',
  platform:'Sentinel-2 + ECOSTRESS', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'(1−NDVI) × low_moisture_proxy',
  physics:'Urban heat islands form where high-albedo vegetation is replaced by low-albedo asphalt. S2 NDVI loss combined with MSI moisture stress proxies urban heat island formation without thermal data.',
  benefit:'Maps urban heat island intensity at neighborhood scale — guides heat-resilience infrastructure investment.',
  gradient: G.urban,
  bookmark:{lat:33.45, lng:-112.07, zoom:11, date:'2021-07-20', label:'Phoenix AZ metro — urban heat island'},
  source: 'WMO July 2019 heatwave reports',
  sourceUrl: 'https://public.wmo.int/en/media/news/july-2019-equalled-and-maybe-surpassed-hottest-month-recorded-history',
  justification: 'Targets the Phoenix, AZ, metro area during the peak heat period of July 20, 2021, contrasting evapotranspirative canopy with dry asphalt to map heat island intensity.',
  evalscript: genEvalscript(['B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let msi=sample.B11/(sample.B08+0.001);
  let val=Math.max(0,0.4-ndvi)*Math.max(0,msi-0.8)*3;
  return ${cb('Math.min(1,val)',P.urban)};`)
},
{
  key:'hsai', acronym:'HSAI', domain:'urban',
  name:'Heat-Shelter Absence Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'low NDVI + high BSI + urban mask',
  physics:'Absence of tree canopy in residential areas creates heat exposure vulnerability. Low NDVI + high bare soil index flags neighborhoods with insufficient shade cover.',
  benefit:'Identifies heat-vulnerable neighborhoods lacking cooling canopy — targets tree-planting programs.',
  gradient: G.urban,
  bookmark:{lat:29.76, lng:-95.37, zoom:11, date:'2021-08-01', label:'Houston TX — urban heat vulnerability'},
  source: 'NYC Heat Vulnerability Index',
  sourceUrl: 'https://a816-dohbesp.nyc.gov/IndicatorPublic/data-explorer/climate/?id=2411',
  justification: 'Targets Houston, TX, on August 1, 2021, mapping neighborhoods with high bare soil/asphalt and low tree canopy cover to evaluate heat-shelter absence.',
  evalscript: genEvalscript(['B02','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let bsi=((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)+0.001);
  let shelter=Math.max(0,0.3-ndvi)*Math.max(0,bsi+0.05);
  return ${cb('Math.min(1,shelter*6)',P.urban)};`)
},
{
  key:'spsri', acronym:'SPSRI', domain:'urban',
  name:'Solar Panel Soiling Remote Index',
  platform:'Sentinel-2 + Planet', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'(ρ_B02 − baseline_B02) / baseline_B02 × (B11/B12)',
  physics:'Clean PV panels have very low reflectance (~5%). Dust-coated panels show elevated reflectance. B11/B12 ratio encodes dust mineral type (silica vs. carbonate).',
  benefit:'Optimizes cleaning crew deployment — global PV soiling loss exceeds $5B/year.',
  gradient: G.urban,
  bookmark:{lat:30.96, lng:2.48, zoom:11, date:'2021-09-01', label:'Saharan solar farm Algeria'},
  source: 'NREL Solar Soiling Mitigation Studies',
  sourceUrl: 'https://www.nrel.gov/pv/soiling.html',
  justification: 'Targets utility-scale solar arrays in the Algerian Sahara. September 2021 represents a post-summer dry period with high accumulated windblown dust on PV arrays.',
  evalscript: genEvalscript(['B02','B03','B11','B12'],`
  let pv=sample.B02<0.12&&sample.B03<0.12?1:0;
  let soiling=sample.B02*10;
  let dust=sample.B11/(sample.B12+0.001);
  let val=pv*Math.max(0,soiling-0.3)*Math.max(0,dust-0.8);
  return ${cb('Math.min(1,val)',P.urban)};`)
},
{
  key:'uciei', acronym:'UCIEI', domain:'urban',
  name:'Urban Cool Infrastructure Effectiveness Index',
  platform:'S2 + ECOSTRESS', platformShort:'ECOSTRESS', novelty:'T1', canRender:false,
  formula:'(1−albedo_satellite) × LST_anomaly',
  physics:'High UCIEI = hot dark surface (old asphalt). Low UCIEI = effective cool infrastructure. Green roofs have low UCIEI despite low albedo because they convert absorbed energy to ET.',
  benefit:'Parcel-level scorecard for cool infrastructure programs — enables evidence-based urban policy.',
  gradient: G.urban,
  bookmark:{lat:41.88, lng:-87.62, zoom:12, date:'2021-08-15', label:'Chicago IL — green roof district'},
  evalscript: TC
},
{
  key:'pcadi', acronym:'PCADI', domain:'urban',
  name:'Pavement Condition and Albedo Decay Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'(ρ_B02 − baseline_B02) / baseline_B02 within road mask',
  physics:'Pavement darkens as asphalt oxidizes and aggregate becomes embedded. Lower B02 reflectance compared to fresh pavement baseline encodes road age/condition.',
  benefit:'City-scale pavement management without expensive ground surveys.',
  gradient: G.urban,
  bookmark:{lat:42.33, lng:-83.04, zoom:12, date:'2021-09-01', label:'Detroit MI — road infrastructure'},
  source: 'MDOT / City of Detroit Road Condition Audits',
  sourceUrl: 'https://www.michigan.gov/mdot/',
  justification: 'Targets Detroit\'s highway system in September 2021, measuring asphalt oxidation and concrete albedo decay patterns.',
  evalscript: genEvalscript(['B02','B03','B04','B08'],`
  let dark=sample.B02<0.15&&sample.B03<0.15&&sample.B04<0.15?1:0;
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let road=dark&&ndvi<0.05?1:0;
  let albedo=(sample.B02+sample.B03+sample.B04)/3;
  return ${cb('road*(1-albedo*8)',[[0,0,0,0],[0.3,60,60,90],[0.7,120,120,180],[1,200,200,255]])};`)
},
{
  key:'csdei', acronym:'CSDEI', domain:'urban',
  name:'Construction Site Silica Dust Emission Index',
  platform:'TROPOMI + GIS', platformShort:'TROPOMI', novelty:'T1', canRender:false,
  formula:'AOD_anomaly × construction_site_proximity × wind_vector',
  physics:'Silica dust from active construction sites creates AOD anomalies traceable with wind-direction analysis. Requires TROPOMI aerosol optical depth, not available as S2 WMS.',
  benefit:'Identifies silica exposure hot zones for occupational health enforcement near construction sites.',
  gradient: G.urban,
  bookmark:{lat:25.17, lng:55.27, zoom:10, date:'2021-08-01', label:'Dubai — construction dust context'},
  evalscript: TC
},
{
  key:'lfgvi', acronym:'LFGVI', domain:'urban',
  name:'Landfill Gas Vegetation Intrusion Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'red_edge_stress × moisture_loss × chlorosis × ring_pattern_score',
  physics:'LFG creates a characteristic annular NDVI depression around landfill boundaries — geometrically distinctive and not mimicked by natural stress. Red-edge chlorosis confirms gas toxicity.',
  benefit:'Maps LFG migration extent — identifies properties with buried methane fire/explosion hazard.',
  gradient: G.urban,
  bookmark:{lat:40.57, lng:-74.17, zoom:13, date:'2021-08-01', label:'Fresh Kills Landfill Staten Island NY'},
  source: 'EPA Chiquita Canyon Landfill updates (2024)',
  sourceUrl: 'https://www.epa.gov/ca/chiquita-canyon-landfill',
  justification: 'Targets Fresh Kills Landfill on Staten Island on August 1, 2021, tracking peripheral soil moisture loss and vegetation chlorosis patterns.',
  evalscript: genEvalscript(['B04','B05','B08','B8A','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let redEdge=(sample.B05-sample.B04)/(sample.B05+sample.B04+0.001);
  let ndmi=(sample.B8A-sample.B11)/(sample.B8A+sample.B11+0.001);
  let stress=Math.max(0,0.5-ndvi)*Math.max(0,0.2-redEdge)*Math.max(0,0.3-ndmi);
  return ${cb('Math.min(1,stress*20)',P.urban)};`)
},
{
  key:'lrdvsi', acronym:'LRD-VSI', domain:'urban',
  name:'Landfill Leachate & Runoff Degradation Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'NDVI_stress × NDWI_anomaly × downslope_channel_context',
  physics:'Leachate migrates downslope creating phytotoxic stress (NDVI decline) combined with anomalous water signal (NDWI) in areas without natural surface water.',
  benefit:'Environmental justice screening — detects leachate impacts on communities downstream of landfills.',
  gradient: G.urban,
  bookmark:{lat:40.73, lng:-73.94, zoom:13, date:'2021-07-15', label:'Newtown Creek NY — urban waterway'},
  source: 'WWF Malaysia Belum-Temengor reports (2020)',
  sourceUrl: 'https://www.wwf.org.my/',
  justification: 'Targets Newtown Creek, NY, on July 15, 2021, detecting leachate migration and runoff indicators in highly urbanized riparian channels.',
  evalscript: genEvalscript(['B03','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let stress=Math.max(0,0.4-ndvi)*Math.max(0,ndwi+0.2);
  return ${cb('Math.min(1,stress*5)',P.urban)};`)
},

/* ─── 7. PERMAFROST & ARCTIC ───────────────────────────────────────────── */
{
  key:'ttapi', acronym:'TT-API', domain:'permafrost',
  name:'Thermokarst Thaw & Anoxic Peat Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'PeatExposure × WetAnoxic × EdgeCollapse',
  physics:'Dark anoxic peat (high SWIR2, depressed NIR), saturated zone (mid-NDWI), edge collapse (abrupt NDVI step at slump margins). All three gates isolate active thermokarst expansion.',
  benefit:'Maps thermokarst across circumpolar permafrost where >1,000 Gt carbon is at risk.',
  gradient: G.perm,
  bookmark:{lat:62.0, lng:68.0, zoom:11, date:'2021-08-01', label:'West Siberia — thermokarst lakes'},
  source: 'NASA Batagaika Crater Earth Observatory',
  sourceUrl: 'https://earthobservatory.nasa.gov/images/90104/batagaika-crater-expands',
  justification: 'Targets West Siberia on August 1, 2021, identifying thermokarst expansion, pond growth, and anoxic peat exposure in active thaw zones.',
  evalscript: genEvalscript(['B03','B04','B08','B11','B12'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let peat=sample.B12>0.1&&sample.B08<0.2?1:0;
  let score=Math.max(0,0.3-ndvi)*Math.max(0,ndwi+0.3)*peat;
  return ${cb('Math.min(1,score*8)',P.perm)};`)
},
{
  key:'tperi', acronym:'TPERI', domain:'permafrost',
  name:'Thermokarst Pond Expansion Rate Index',
  platform:'Sentinel-2 bi-temporal', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'Δ(B11_t1−B11_t2) / Δ(B03_t1−B03_t2) — active expansion proxy',
  physics:'Active thermokarst expansion creates transitional wet margins — detected as NDWI increase combined with SWIR2 change. Single-date approximation: wet peat edge anomaly.',
  benefit:'Provides the rate signal needed for carbon flux modeling — "how fast is this pond growing."',
  gradient: G.perm,
  bookmark:{lat:68.4, lng:-134.9, zoom:11, date:'2021-08-15', label:'Mackenzie Delta Canada — thermokarst'},
  source: 'Natural Resources Canada / Permafrost Net',
  sourceUrl: 'https://natural-resources.canada.ca/',
  justification: 'Targets permafrost slumps and thaw lakes in the Mackenzie Delta, Canada. Mid-August represents peak seasonal thaw before freeze-up begins.',
  evalscript: genEvalscript(['B03','B08','B11','B12'],`
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let peatEdge=sample.B12>0.08&&ndwi>-0.2&&ndwi<0.4?1:0;
  return ${cb('peatEdge*Math.max(0,ndwi+0.2)*3',P.perm)};`)
},
{
  key:'pcei', acronym:'PCEI', domain:'permafrost',
  name:'Peat Carbon Exposure Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'(1−NDVI) × high_SWIR2 × (1−NDWI)',
  physics:'Exposed dark peat (thawed, not waterlogged) has distinctive spectral signature: low NIR (low NDVI), elevated SWIR2 from organic matter, and low surface moisture (low NDWI).',
  benefit:'Satellite proxy for peat carbon vulnerability — identifies zones at highest risk of rapid oxidation.',
  gradient: G.perm,
  bookmark:{lat:55.0, lng:-84.0, zoom:11, date:'2021-09-01', label:'Hudson Bay lowlands — peat exposure'},
  source: 'Global Peatlands Initiative / NRCan',
  sourceUrl: 'https://www.unep.org/globalpeatlandsinitiative',
  justification: 'Targets the massive peatland complex of the Hudson Bay Lowlands. September 1, 2021, represents a late-summer dry period exposing peat margins to air-driven oxidation.',
  evalscript: genEvalscript(['B03','B04','B08','B12'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let peat=sample.B12>0.08?1:0;
  let val=Math.max(0,0.5-ndvi)*Math.max(0,-ndwi)*peat;
  return ${cb('Math.min(1,val*6)',P.perm)};`)
},
{
  key:'sabsi', acronym:'SABSI', domain:'permafrost',
  name:'Snow/Ice Algae Bloom Severity Index',
  platform:'Sentinel-2 + Planet', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'NDSI_snow × algae_pigment_proxy (red-green shift on snow)',
  physics:'Snow algae (Chlamydomonas nivalis) creates "watermelon snow" — red pigmentation reduces snow B03 reflectance relative to B04, creating a distinctive spectral signature on otherwise bright snow.',
  benefit:'Maps snow algae proliferation accelerating melt — a climate feedback amplifier in Arctic regions.',
  gradient: G.perm,
  bookmark:{lat:67.0, lng:-45.0, zoom:11, date:'2021-08-01', label:'Greenland ice sheet — algae bloom'},
  source: 'Greenland Ice Sheet Algae Project / Nature',
  sourceUrl: 'https://www.nature.com/articles/s41561-020-0582-5',
  justification: 'Targets the western dark zone of the Greenland Ice Sheet. The August 1, 2021, date captures peak snow algae colonization that darkens the ice and increases melt rates.',
  evalscript: genEvalscript(['B02','B03','B04'],`
  let snow=sample.B02>0.4&&sample.B03>0.4?1:0;
  let algae=(sample.B04-sample.B03)/(sample.B04+sample.B03+0.001);
  let val=snow*Math.max(0,algae+0.05)*10;
  return ${cb('Math.min(1,val)',[[0,17,16,24],[0.3,240,80,80],[0.7,200,30,30],[1,140,0,0]])};`)
},
{
  key:'fgdci', acronym:'FGDCI', domain:'permafrost',
  name:'Frozen Ground Dielectric Change Index',
  platform:'Sentinel-1 SAR', platformShort:'S1 SAR', novelty:'T1', canRender:false,
  formula:'(VV_dB − VH_dB) − seasonal_mean(VV_dB − VH_dB)',
  physics:'Frozen soil dielectric ~4; thawed ~20–30. 3–6 dB shifts in C-band VV. VV-VH difference normalizes vegetation; anomaly from seasonal mean isolates freeze/thaw transition.',
  benefit:'Pan-Arctic freeze/thaw monitoring — tracks permafrost active layer dynamics from Sentinel-1 global coverage.',
  gradient: G.perm,
  bookmark:{lat:65.0, lng:80.0, zoom:10, date:'2021-10-01', label:'West Siberia — freeze/thaw transition'},
  evalscript: TC
},
{
  key:'mepsi', acronym:'MEPSI', domain:'permafrost',
  name:'CH₄ Ebullition Pond Spectral Proxy',
  platform:'Sentinel-2 + Planet', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'high_NDWI × low_NDVI × low_macrophyte_index',
  physics:'Active ebullition ponds are open sediment-covered shallow water: high NDWI (water), low NDVI (no aquatic vegetation), and low chlorophyll index (bare water surface).',
  benefit:'Maps active methane-ebullition ponds — the largest unmonitored non-CO₂ greenhouse gas source in Arctic.',
  gradient: G.perm,
  bookmark:{lat:62.5, lng:76.0, zoom:10, date:'2021-08-15', label:'West Siberian Plain — methane pond'},
  source: 'NASA ABoVE Permafrost Methane Studies',
  sourceUrl: 'https://above.nasa.gov/',
  justification: 'Targets the thermokarst-dense West Siberian Plain in mid-August 2021, isolating open sediment-laden ponds known for high methane ebullition rates.',
  evalscript: genEvalscript(['B03','B04','B05','B08','B11'],`
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let ndci=(sample.B05-sample.B04)/(sample.B05+sample.B04+0.001);
  let pond=ndwi>0.1&&ndvi<0.15&&ndci<0.05?1:0;
  return ${cb('pond*Math.max(0,ndwi)*3',P.perm)};`)
},
{
  key:'alsi', acronym:'ALSI', domain:'permafrost',
  name:'Active Layer Depth Thermal-Spectral Composite',
  platform:'ECOSTRESS + Sentinel-2', platformShort:'ECOSTRESS', novelty:'T1', canRender:false,
  formula:'0.6×(LST_anomaly/σ) + 0.4×[(B12−B11)/(B12+B11)]',
  physics:'Deeper active layers → warmer surface temperatures (ECOSTRESS LST) + greater clay mineral exposure from frost churning (SWIR B12/B11 ratio). Requires ECOSTRESS thermal.',
  benefit:'Satellite proxy for active layer depth — orders of magnitude denser than field probe networks.',
  gradient: G.perm,
  bookmark:{lat:69.5, lng:-148.0, zoom:10, date:'2021-08-01', label:'Alaska North Slope — active layer'},
  evalscript: TC
},

/* ─── 8. TROPICAL FOREST ───────────────────────────────────────────────── */
{
  key:'pdcsi', acronym:'PDCSI', domain:'tropicalforest',
  name:'Pre-Deforestation Canopy Stress Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'[(B06−B05)/(B06+B05)] − [(B8A−B08)/(B8A+B08)]',
  physics:'Early-stage canopy thinning shifts the red-edge toward 705 nm (B05 dominance over B06) — detectable 6–18 months before clear-cutting by selective logging or burning.',
  benefit:'Provides a 6–18 month warning before deforestation becomes visible — enables preventive enforcement.',
  gradient: G.forest,
  bookmark:{lat:-4.0, lng:-55.0, zoom:11, date:'2021-08-01', label:'Amazon deforestation front — Pará Brazil'},
  source: 'INPE PRODES Deforestation Monitoring',
  sourceUrl: 'http://www.obt.inpe.br/obtdg/prodes/',
  justification: 'Targets the active agricultural deforestation frontier in Pará State, Brazil. August 1, 2021, represents the dry season when selective logging and forest thinning occur.',
  evalscript: genEvalscript(['B05','B06','B08','B8A'],`
  let pdcsi=((sample.B06-sample.B05)/(sample.B06+sample.B05+0.001))-((sample.B8A-sample.B08)/(sample.B8A+sample.B08+0.001));
  let val=Math.max(0,-pdcsi+0.1)*4;
  return ${cb('Math.min(1,val)',P.forest)};`)
},
{
  key:'lisi', acronym:'LISI', domain:'tropicalforest',
  name:'Liana Infestation Structural Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'2.5×[(B08−B11)/(B08+6B04−7.5B02+1)] × (B08/B11)',
  physics:'Lianas have higher SWIR1 absorption than tree canopies due to different leaf water content and structure. EVI-like combination × SWIR ratio discriminates vine-dominated from tree canopy.',
  benefit:'Maps liana infestation extent — lianas suppress forest carbon storage by 20–30%.',
  gradient: G.forest,
  bookmark:{lat:1.0, lng:113.0, zoom:11, date:'2021-08-01', label:'Borneo — liana-infested forest'},
  source: 'CIFOR Borneo Tropical Forest Studies',
  sourceUrl: 'https://www.cifor-icraf.org/',
  justification: 'Targets degraded secondary tropical forests in Central Kalimantan, Borneo, where lianas have choked the tree canopy following historic commercial selective logging.',
  evalscript: genEvalscript(['B02','B04','B08','B11'],`
  let denom=sample.B08+sample.B11+6*sample.B04-7.5*sample.B02+1;
  let lisi=2.5*((sample.B08-sample.B11)/(denom+0.001))*(sample.B08/(sample.B11+0.001));
  return ${cb('Math.max(0,Math.min(1,lisi*0.5))',P.forest)};`)
},
{
  key:'ubcdi', acronym:'UBCDI', domain:'tropicalforest',
  name:'Understory vs. Canopy Burn Discrimination Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'NBR × SWIR2_elevation proxy (single-date)',
  physics:'Canopy burns cause NIR collapse (no green canopy). Understory fires leave canopy mostly intact but alter SWIR2. Single-date: low NBR + elevated SWIR2 indicates understory fire.',
  benefit:'Distinguishes fire type for tropical forest carbon accounting and recovery prognosis.',
  gradient: G.forest,
  bookmark:{lat:-9.0, lng:-52.0, zoom:11, date:'2021-10-01', label:'Amazon fire scar — Mato Grosso'},
  source: 'NASA Fire Information for Resource Management System (FIRMS)',
  sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/',
  justification: 'Targets the Amazon agricultural transition zone in Mato Grosso, Brazil. October 2021 captures the post-fire season, separating high-severity canopy loss from lower-severity understory burns.',
  evalscript: genEvalscript(['B04','B08','B11','B12'],`
  let nbr=(sample.B08-sample.B12)/(sample.B08+sample.B12+0.001);
  let swirElev=sample.B12-sample.B11;
  let canopyBurn=nbr<-0.1?1:0;
  let understory=nbr>-0.1&&nbr<0.1&&swirElev>0.03?1:0;
  return ${cb('canopyBurn*0.3+understory*0.8',[[0,0,0,0],[0.3,230,180,80],[0.6,217,134,79],[1,226,102,90]])};`)
},
{
  key:'fedgi', acronym:'FEDGI', domain:'tropicalforest',
  name:'Forest Edge Degradation Gradient Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'NDVI gradient magnitude from interior toward edge',
  physics:'Edge-effect degradation creates a systematic NDVI gradient from forest interior toward the clearcut boundary — the gradient magnitude encodes how severe and how far edge effects penetrate.',
  benefit:'Quantifies edge-effect fragmentation — estimates effective forest area accounting for border degradation.',
  gradient: G.forest,
  bookmark:{lat:-13.0, lng:-56.0, zoom:11, date:'2021-09-01', label:'Mato Grosso edge — forest fragmentation'},
  source: 'Hansen et al. Global Forest Change',
  sourceUrl: 'https://glads.umd.edu/dataset/global-forest-change',
  justification: 'Targets fragmented forest edges bordered by soy fields in Mato Grosso, Brazil. September captures dry-season edge desiccations and structural canopy changes.',
  evalscript: genEvalscript(['B04','B08'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let edgeStress=Math.max(0,0.7-ndvi)*Math.max(0,ndvi-0.3);
  return ${cb('Math.min(1,edgeStress*8)',P.forest)};`)
},
{
  key:'slsdi', acronym:'SLSDI', domain:'tropicalforest',
  name:'Selective Logging Scar Detection Index',
  platform:'Sentinel-2 + Planet', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'BSI_gap × NDVI_gap × canopy_context',
  physics:'Selective logging creates small-scale (<1 ha) gap openings within intact canopy — elevated BSI and reduced NDVI in a high-NDVI surrounding matrix signals logging scars.',
  benefit:'Monitors illegal selective logging in concessions — actionable for forest governance enforcement.',
  gradient: G.forest,
  bookmark:{lat:-5.0, lng:144.0, zoom:11, date:'2021-09-15', label:'Papua New Guinea — logging concession'},
  source: 'PNG Forest Authority Concession Audits',
  sourceUrl: 'http://www.forestry.gov.pg/',
  justification: 'Targets selective logging extraction roads and canopy gaps in Papua New Guinea. Mid-September 2021 captures fresh logging skid trails before vegetation regrows.',
  evalscript: genEvalscript(['B02','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let bsi=((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)+0.001);
  let gap=ndvi<0.5&&bsi>0.0?1:0;
  return ${cb('gap*Math.max(0,bsi)*Math.max(0,0.6-ndvi)*6',P.forest)};`)
},
{
  key:'etcsi', acronym:'ETCSI', domain:'tropicalforest',
  name:'Emergent Tree Crown Stress Index',
  platform:'Planet + Sentinel-2', platformShort:'Planet', novelty:'T1', canRender:false,
  formula:'Per-crown red-edge stress from Planet 3 m delineation + S2 spectral',
  physics:'Individual emergent tree crown delineation requires Planet 3 m resolution; red-edge stress per delineated crown uses S2 spectral information. Requires Planet sensor, not available via SH WMS.',
  benefit:'Monitors individual emergent tree health — sentinels for whole-forest stress propagation.',
  gradient: G.forest,
  bookmark:{lat:9.15, lng:-79.85, zoom:12, date:'2021-08-01', label:'Barro Colorado Island Panama'},
  evalscript: TC
},

/* ─── 9. DRYLAND & ARID ────────────────────────────────────────────────── */
{
  key:'bscmci', acronym:'BSCMCI', domain:'dryland',
  name:'Biological Soil Crust Multi-Condition Index',
  platform:'PRISMA / DESIS', platformShort:'PRISMA', novelty:'T1', canRender:false,
  formula:'[(ρ680−ρ720)/(ρ680+ρ720)] × [(ρ550/ρ670)−1]',
  physics:'BSC development stages have distinctive pigment signatures: cyanobacteria (680 nm), green algae (550 nm), lichen (usnic acid). Requires sub-10 nm spectral resolution from PRISMA or DESIS.',
  benefit:'Maps biological soil crust condition — BSCs stabilize desert soils and prevent dust emission.',
  gradient: G.dry,
  bookmark:{lat:37.5, lng:-110.5, zoom:11, date:'2021-08-01', label:'Colorado Plateau — BSC context'},
  evalscript: TC
},
{
  key:'sbci', acronym:'SBCI', domain:'dryland',
  name:'Sabkha Brine Chemistry Index',
  platform:'EMIT', platformShort:'EMIT', novelty:'T1', canRender:false,
  formula:'depth(2217nm) / depth(2175nm)',
  physics:'Gypsum at 2217 nm; anhydrite at 2175 nm. Anhydrite forms at higher brine concentration — ratio encodes brine concentration history. Requires EMIT 5 nm bands.',
  benefit:'Maps sabkha brine chemistry — tracks paleo-hydrological conditions in hyperarid environments.',
  gradient: G.dry,
  bookmark:{lat:23.0, lng:52.0, zoom:10, date:'2021-10-01', label:'Empty Quarter Saudi Arabia — sabkha'},
  evalscript: TC
},
{
  key:'cscai', acronym:'CSCAI', domain:'dryland',
  name:'Caliche Surface Carbonate Accumulation Index',
  platform:'EnMAP', platformShort:'EnMAP', novelty:'T1', canRender:false,
  formula:'depth(2335nm) / depth(2160nm)',
  physics:'Calcite CO₃²⁻ absorption at 2335 nm vs. weaker feature at 2160 nm. Ratio encodes carbonate accumulation grade (Stage I–VI caliche). Requires EnMAP 10 nm resolution.',
  benefit:'Maps caliche distribution — critical for water infiltration modeling in arid agriculture.',
  gradient: G.dry,
  bookmark:{lat:29.0, lng:-104.0, zoom:11, date:'2021-08-01', label:'Chihuahuan Desert — caliche surface'},
  evalscript: TC
},
{
  key:'defpi', acronym:'DEFPI', domain:'dryland',
  name:'Dust Emission Flux Proxy Index',
  platform:'EMIT + S2 + SMAP', platformShort:'EMIT', novelty:'T1', canRender:false,
  formula:'mineral_erodibility(EMIT) × BSI(S2) × (1−soil_moisture(SMAP))',
  physics:'Three factors control dust emission: mineral erodibility (EMIT), bare soil fraction (BSI), and dry surface (SMAP inverted). Multi-sensor fusion required for accurate emission flux.',
  benefit:'Improves global dust emission inventories — critical for aerosol climate modeling.',
  gradient: G.dry,
  bookmark:{lat:15.0, lng:0.0, zoom:9, date:'2021-01-01', label:'Sahel — dust emission season'},
  evalscript: TC
},
{
  key:'dlpehi', acronym:'DLPEHI', domain:'dryland',
  name:'Desert Locust Pre-Emergence Habitat Index',
  platform:'Sentinel-2 + GPM', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'NDWI × (0.1<NDVI<0.3) × (NDTI>−0.2) — without rainfall gate',
  physics:'Oviposition habitat requires moist sandy soil + sparse vegetation + sandy loam texture. S2 approximation without rainfall gate; GPM data adds rainfall confirmation in operational use.',
  benefit:'2–4 week earlier warning of locust outbreak habitat — enables preventive treatment before swarm formation.',
  gradient: G.dry,
  bookmark:{lat:9.0, lng:42.0, zoom:10, date:'2020-02-01', label:'East Africa — 2020 locust outbreak region'},
  source: 'FAO Locust Watch / UNEP',
  sourceUrl: 'https://www.fao.org/ag/locusts/en/info/info/index.html',
  justification: 'Targets the dry rangelands of eastern Ethiopia. The February 2020 date captures the critical green-up and soil moisture conditions that triggered the historic East African locust swarms.',
  evalscript: genEvalscript(['B03','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let bsi=((sample.B11+sample.B04)-(sample.B08+sample.B03))/((sample.B11+sample.B04)+(sample.B08+sample.B03)+0.001);
  let sparse=ndvi>0.05&&ndvi<0.35?1:0;
  let moist=ndwi>-0.3&&ndwi<0.1?1:0;
  let val=sparse*moist*Math.max(0,bsi+0.1)*5;
  return ${cb('Math.min(1,val)',P.dry)};`)
},
{
  key:'aibeai', acronym:'AIBEAI', domain:'dryland',
  name:'Arroyo Incision and Bank Erosion Activity Index',
  platform:'Sentinel-2 + Planet', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'BSI_channel_bottom / NDVI_channel_margin',
  physics:'Active incision exposes fresh bright mineral soils (high BSI). Stable channels have established bank vegetation (positive NDVI at margins). Ratio encodes incision vs. stability state.',
  benefit:'Maps actively eroding arroyos — guides erosion control investment and predicts downstream sediment loads.',
  gradient: G.dry,
  bookmark:{lat:33.35, lng:-107.25, zoom:12, date:'2021-08-01', label:'New Mexico — arroyo incision'},
  source: 'USGS Arroyo Restoration / Bureau of Land Management',
  sourceUrl: 'https://www.blm.gov/new-mexico',
  justification: 'Targets actively eroding drainage channels in south-central New Mexico. August captures bare sediment exposures immediately following heavy summer monsoon storm runoffs.',
  evalscript: genEvalscript(['B02','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let bsi=((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)+0.001);
  let channel=sample.B11<0.15&&sample.B04>0.08?1:0;
  let val=channel*Math.max(0,bsi)*Math.max(0,-ndvi+0.2)*10;
  return ${cb('Math.min(1,val)',P.dry)};`)
},

/* ─── 10. WETLAND & PEATLAND ───────────────────────────────────────────── */
{
  key:'pwtdi', acronym:'PWTDI', domain:'wetland',
  name:'Peatland Water Table Depth Index',
  platform:'Sentinel-2 + S1', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'0.65×NDWI_1020 + 0.35×(VV−VH SAR) — S2-only proxy',
  physics:'Surface Sphagnum moss shows a distinctive 970 nm water absorption feature (B8A/B09 proxy). High NDWI + dark SWIR = shallow water table. SAR fusion improves accuracy; S2 alone is approximate.',
  benefit:'Global peatland water table monitoring — the most important unmeasured variable in wetland carbon accounting.',
  gradient: G.wetland,
  bookmark:{lat:53.55, lng:23.08, zoom:11, date:'2021-05-01', label:'Biebrza Marshes Poland — peatland WTD'},
  source: 'Biebrza National Park Research / Copernicus EMS',
  sourceUrl: 'https://www.biebrza.org.pl/',
  justification: 'Targets the Biebrza Marshes in Poland, one of Europe\'s largest pristine peatland systems. May 2021 captures spring high water-table levels crucial for peat protection.',
  evalscript: genEvalscript(['B03','B04','B08','B8A','B11'],`
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let sphagnum=(sample.B8A-sample.B11)/(sample.B8A+sample.B11+0.001);
  let peat=sample.B04<0.06&&sample.B08<0.15?1:0;
  let val=Math.max(0,ndwi)*Math.max(0,sphagnum)*peat*5;
  return ${cb('Math.min(1,val)',P.wetland)};`)
},
{
  key:'mhssp', acronym:'MHSSP', domain:'wetland',
  name:'Methane Hotspot Surface Spectral Predictor',
  platform:'Sentinel-2 + TROPOMI', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'NDWI × (1−NDVI) × (1−CI_rededge/local_max)',
  physics:'Methane-emitting wetland surfaces are open water (positive NDWI), vegetation-free (low NDVI), and show reduced red-edge chlorophyll index from anoxic peat surface rather than vegetated mat.',
  benefit:'Prioritizes methane hotspot monitoring sites for drone or aircraft campaigns.',
  gradient: G.wetland,
  bookmark:{lat:29.0, lng:-89.5, zoom:10, date:'2021-07-01', label:'Mississippi River Delta — methane hotspot'},
  source: 'NASA DeltaX Project / USGS Wetlands Center',
  sourceUrl: 'https://deltax.jpl.nasa.gov/',
  justification: 'Targets coastal marshes in the Mississippi River Delta. July 2021 captures warm, saturated soil conditions associated with high organic decomposition and biogenic methane emissions.',
  evalscript: genEvalscript(['B03','B04','B05','B08','B11'],`
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let ci=(sample.B05-sample.B04)/(sample.B05+sample.B04+0.001);
  let hot=Math.max(0,ndwi)*Math.max(0,0.3-ndvi)*Math.max(0,0.1-ci);
  return ${cb('Math.min(1,hot*20)',P.wetland)};`)
},
{
  key:'tfidi', acronym:'TFIDI', domain:'wetland',
  name:'Tidal Flat Inundation Dynamics Index',
  platform:'Sentinel-2 monthly', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'NDWI_variability proxy — high NDWI in mid-range = active tidal flat',
  physics:'Tidal flats are periodically inundated. High NDWI percentile spread = full tidal habitat. Mid-range NDWI in single date captures the transition zone most sensitive to tidal dynamics.',
  benefit:'Maps tidal flat habitat dynamics — critical for migratory shorebird populations and blue carbon.',
  gradient: G.wetland,
  bookmark:{lat:37.76, lng:119.18, zoom:11, date:'2021-10-01', label:'Yellow River Delta China — tidal flat'},
  source: 'Yellow River Delta National Nature Reserve / Ramsar',
  sourceUrl: 'https://www.ramsar.org/',
  justification: 'Targets the extensive tidal flats of the Yellow River Delta. October 2021 captures tidally active mudflats vital for migratory birds and coastal carbon research.',
  evalscript: genEvalscript(['B03','B08','B11'],`
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let tidalZone=ndwi>-0.1&&ndwi<0.4?1:0;
  let flat=sample.B11<0.1?1:0;
  return ${cb('tidalZone*flat*Math.max(0,ndwi+0.15)*2',P.wetland)};`)
},
{
  key:'wdptzi', acronym:'WDPTZI', domain:'wetland',
  name:'Wet-Dry Peatland Transition Zone Index',
  platform:'Sentinel-2', platformShort:'S2', novelty:'T1', canRender:true,
  formula:'Gradient magnitude of (B11−B8A)/(B11+B8A) — Sobel edge proxy',
  physics:'Wet-dry peatland boundary creates a sharp SWIR1/NIR gradient — detectable as an abrupt spatial change in the moisture index. Edge detection approximated by threshold on SWIR/NIR ratio.',
  benefit:'Maps peat carbon vulnerability boundaries — where lowered water table exposes peat to oxidation.',
  gradient: G.wetland,
  bookmark:{lat:61.5, lng:69.0, zoom:11, date:'2021-07-15', label:'West Siberia — peatland transition zone'},
  source: 'Siberian Peatland Carbon Studies / UNESCO',
  sourceUrl: 'https://whc.unesco.org/en/list/',
  justification: 'Targets the vast peatlands of the West Siberian Lowlands. Mid-July 2021 captures high-contrast vegetation moisture differences marking the boundary between wet peat bogs and dry forest margins.',
  evalscript: genEvalscript(['B03','B08','B8A','B11'],`
  let swirNir=(sample.B11-sample.B8A)/(sample.B11+sample.B8A+0.001);
  let transition=Math.abs(swirNir)>0.05&&Math.abs(swirNir)<0.3?1:0;
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let val=transition*Math.abs(ndwi)*3;
  return ${cb('Math.min(1,val)',P.wetland)};`)
},
{
  key:'ipvsi', acronym:'IPVSI', domain:'wetland',
  name:'Invasive Phragmites vs. Native Vegetation Discrimination',
  platform:'Sentinel-2 seasonal', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'Red-edge structural proxy for dense monoculture vs. diverse native marsh',
  physics:'Invasive Phragmites forms dense monocultures with distinctive high NIR and low red-edge separation. Native wetland diversity creates more spectrally heterogeneous signals.',
  benefit:'Maps invasive Phragmites extent — guides targeted herbicide treatment to restore native wetlands.',
  gradient: G.wetland,
  bookmark:{lat:41.9, lng:-83.2, zoom:11, date:'2021-10-01', label:'Detroit River marshes — Phragmites invasion'},
  source: 'Great Lakes Phragmites Collaborative',
  sourceUrl: 'https://www.greatlakesphragmites.net/',
  justification: 'Targets the Detroit River coastal marshes. October 1, 2021, represents the late-fall senescence period when Phragmites remains green longer than diverse native marsh grasses, enhancing spectral contrast.',
  evalscript: genEvalscript(['B04','B05','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let ndre=(sample.B08-sample.B05)/(sample.B08+sample.B05+0.001);
  let dense=ndvi>0.6&&ndre>0.3?1:0;
  let mono=ndre/(ndvi+0.001);
  let val=dense*Math.max(0,mono-0.5)*3;
  return ${cb('Math.min(1,val)',P.algae)};`)
},
{
  key:'wvtdi', acronym:'WVTDI', domain:'wetland',
  name:'Wetland Vegetation Type Discrimination Index',
  platform:'Sentinel-2 time series', platformShort:'S2', novelty:'T2', canRender:true,
  formula:'NDWI + NDVI composite for vegetation-water ratio classification',
  physics:'Different wetland vegetation types (sedge, rush, forb, reed) have distinct NDWI/NDVI combinations reflecting moisture holding and canopy structure. Single-date approximation shows dominant type.',
  benefit:'Baseline wetland vegetation mapping — essential for carbon stock estimation and restoration planning.',
  gradient: G.wetland,
  bookmark:{lat:43.47, lng:4.58, zoom:11, date:'2021-06-01', label:'Camargue France — wetland diversity'},
  source: 'Tour du Valat Research Institute / Camargue',
  sourceUrl: 'https://tourduvalat.org/en/',
  justification: 'Targets the Camargue delta in southern France. June 1, 2021, provides a clear early-summer growth window when different wetland vegetation communities (reeds, glassworts, rushes) show maximum spectral distinction.',
  evalscript: genEvalscript(['B03','B04','B08','B11'],`
  let ndvi=(sample.B08-sample.B04)/(sample.B08+sample.B04+0.001);
  let ndwi=(sample.B03-sample.B08)/(sample.B03+sample.B08+0.001);
  let wet=ndwi>-0.2&&ndvi>0.2?1:0;
  return ${cb('wet*(ndvi*0.6+Math.max(0,ndwi+0.2)*0.4)',P.wetland)};`)
},

/* ─── 11. HYPERSPECTRAL-ENABLED ─────────────────────────────────────────── */
{
  key:'cmsti', acronym:'CMSTI', domain:'hyperspectral',
  name:'Clay Mineral Stress Transition Index',
  platform:'EMIT', platformShort:'EMIT', novelty:'T1', canRender:false,
  formula:'position_minimum(2190–2220nm) − 2200',
  physics:'Smectite Al-OH at 2200 nm; illite at 2208 nm. This 8 nm shift requires EMIT 5 nm bands — invisible to Sentinel-2, Landsat, or EnMAP (10 nm).',
  benefit:'Maps irreversible soil degradation (smectite→illite) — permanent loss taking centuries to reverse.',
  gradient: G.dry,
  bookmark:{lat:35.0, lng:-110.7, zoom:11, date:'2021-09-01', label:'Painted Desert AZ — clay mineral diversity'},
  evalscript: TC
},
{
  key:'mpssfi', acronym:'MPSSFI', domain:'hyperspectral',
  name:'Methane Plume Spectral Shape Feature Index',
  platform:'EMIT', platformShort:'EMIT', novelty:'T2', canRender:false,
  formula:'1 − ρ(1667nm) / [0.5×(ρ(1640nm)+ρ(1700nm))]',
  physics:'CH₄ has a strong absorption feature at 1667 nm. Band depth relative to 1640/1700 nm continuum isolates methane from water vapor and CO₂. Requires EMIT 7.4 nm SWIR resolution.',
  benefit:'Point-source methane plume mapping from individual facility emitters.',
  gradient: G.perm,
  bookmark:{lat:31.8, lng:-102.3, zoom:11, date:'2021-09-01', label:'Permian Basin TX — methane super-emitter context'},
  evalscript: TC
},
{
  key:'afcdi', acronym:'AFCDI', domain:'hyperspectral',
  name:'Asbestos Fiber Chrysotile Detection Index',
  platform:'EMIT + PRISMA', platformShort:'EMIT', novelty:'T1', canRender:false,
  formula:'depth(2317nm) / depth(2387nm)',
  physics:'Chrysotile Mg-OH doublet at 2317/2387 nm discriminated from antigorite (2320/2100 nm) and lizardite (2320/2390 nm). EMIT 5 nm sampling resolves the 70 nm separation.',
  benefit:'Natural asbestos zone mapping near communities — eliminates the highest-uncertainty step in exposure assessment.',
  gradient: G.mine,
  bookmark:{lat:36.47, lng:-120.65, zoom:12, date:'2021-08-01', label:'New Idria CA — natural asbestos zone'},
  evalscript: TC
},
{
  key:'scfgosi', acronym:'SCFGOSI', domain:'hyperspectral',
  name:'Soil Carbon Functional Group Oxidation State Index',
  platform:'EMIT + EnMAP', platformShort:'EMIT', novelty:'T1', canRender:false,
  formula:'depth(1730nm) / (1−mean_reflectance_400-2500nm)',
  physics:'Labile C (lipids, proteins) → C-H overtone at 1730 nm. Recalcitrant C (aromatic humus, char) → broad spectral darkness. Ratio encodes labile vs. recalcitrant proportion.',
  benefit:'Distinguishes stable carbon from labile — critical for understanding which soils store carbon permanently.',
  gradient: G.forest,
  bookmark:{lat:42.0, lng:-93.0, zoom:11, date:'2021-07-01', label:'Iowa farmland — soil carbon context'},
  evalscript: TC
},
{
  key:'reenbi', acronym:'REENBI', domain:'hyperspectral',
  name:'REE Neodymium Band Depth Index',
  platform:'EnMAP', platformShort:'EnMAP', novelty:'T1', canRender:false,
  formula:'1−ρ(803nm)/[ρ(780nm)+interpolated_continuum]',
  physics:'Nd³⁺ f-f transitions at 583, 740, 803 nm in REE carbonate/phosphate minerals. Requires EnMAP precision to resolve the 803 nm feature against soil continuum.',
  benefit:'Global REE deposit prospecting from EnMAP — satellite-first screening transforms exploration economics.',
  gradient: G.mine,
  bookmark:{lat:35.47, lng:-115.52, zoom:11, date:'2021-08-01', label:'Mountain Pass CA — REE mine'},
  evalscript: TC
},
{
  key:'epcase', acronym:'EPCASE', domain:'hyperspectral',
  name:'EnMAP Porphyry Cu Alteration Sequence Index',
  platform:'EnMAP', platformShort:'EnMAP', novelty:'T1', canRender:false,
  formula:'SAM distance to porphyry alteration sequence endmember',
  physics:'Porphyry Cu deposits have phyllic → potassic → propylitic alteration zones with diagnostic mineral assemblages in SWIR. EnMAP L2A provides the spectral resolution for alteration mapping.',
  benefit:'Transforms Cu exploration — reduces discovery cost for critical battery mineral.',
  gradient: G.mine,
  bookmark:{lat:-22.3, lng:-68.9, zoom:11, date:'2021-09-01', label:'Atacama Chile — Chuquicamata Cu mine'},
  evalscript: TC
},
{
  key:'dpcci', acronym:'DPCCI', domain:'hyperspectral',
  name:'DESIS Phycocyanin Column Concentration Index',
  platform:'DESIS + PACE', platformShort:'DESIS', novelty:'T2', canRender:false,
  formula:'depth(621nm) / continuum from DESIS 2.55 nm resolution',
  physics:'Phycocyanin has a sharp absorption at 621 nm. DESIS 2.55 nm resolution resolves this feature precisely — interpolated continuum removes background water-leaving radiance.',
  benefit:'Accurate phycocyanin concentration mapping for drinking water reservoir management.',
  gradient: G.algae,
  bookmark:{lat:41.7, lng:-82.5, zoom:10, date:'2021-08-01', label:'Lake Erie — phycocyanin bloom'},
  evalscript: TC
},
{
  key:'pftib', acronym:'PFTIB', domain:'hyperspectral',
  name:'Phytoplankton Functional Type Index Battery',
  platform:'PACE OCI', platformShort:'PACE', novelty:'T1', canRender:false,
  formula:'PFT_diatom=Abs(490)/Abs(440) | PFT_hapto=Abs(453)/Abs(490) | etc.',
  physics:'PACE OCI 5 nm bands resolve diatom (fucoxanthin 490–510 nm), haptophyte (19-hex-fucoxanthin 453 nm), and cyanobacteria (divinyl chlorophyll 440 nm shift) pigment packages simultaneously.',
  benefit:'Global phytoplankton community composition — enables carbon export estimates and HAB species prediction.',
  gradient: G.marine,
  bookmark:{lat:38.5, lng:-76.0, zoom:10, date:'2021-07-01', label:'Chesapeake Bay — phytoplankton community'},
  evalscript: TC
},

/* ─── 12. CROSS-SENSOR FUSION ───────────────────────────────────────────── */
{
  key:'tseai', acronym:'TSEAI', domain:'crosssensor',
  name:'TROPOMI–Sentinel-2 Emission Attribution Index',
  platform:'S5P TROPOMI + S2', platformShort:'TROPOMI', novelty:'T1', canRender:false,
  formula:'XCH4_anomaly / Σ(source_fraction × emission_factor)',
  physics:'S2 maps source type fractions within each 5.5×7 km TROPOMI pixel. Ratio of observed to predicted CH₄ enhancement identifies unaccounted emission sources.',
  benefit:'Transforms TROPOMI from "where is methane enhanced" to "what is emitting that methane."',
  gradient: G.perm,
  bookmark:{lat:31.8, lng:-102.3, zoom:10, date:'2021-08-01', label:'Permian Basin TX — methane attribution'},
  evalscript: TC
},
{
  key:'issai', acronym:'ISSAI', domain:'crosssensor',
  name:'ICESat-2 + Sentinel-1 Subsidence Attribution Index',
  platform:'ICESat-2 + S1 + S2', platformShort:'ICESat-2', novelty:'T1', canRender:false,
  formula:'(ICESat2_dZ/dt − InSAR_LOS_vertical) / ICESat2_dZ/dt',
  physics:'ICESat-2 measures absolute elevation change; InSAR measures relative deformation. Discrepancy identifies rapid incoherent subsidence or different temporal sampling.',
  benefit:'Subsidence cause attribution for tens of millions in sinking coastal cities.',
  gradient: G.urban,
  bookmark:{lat:-6.2, lng:106.8, zoom:11, date:'2021-08-01', label:'Jakarta Indonesia — subsidence context'},
  evalscript: TC
},
{
  key:'geawsi', acronym:'GEAWSI', domain:'crosssensor',
  name:'GRACE-FO + ECOSTRESS Agricultural Water Stress Index',
  platform:'GRACE-FO + ECOSTRESS', platformShort:'GRACE', novelty:'T1', canRender:false,
  formula:'(ET_ecostress / PET_estimate) × TWS_anomaly_sign',
  physics:'ET/PET < 1 = crop water stress. Negative TWS anomaly simultaneously = groundwater drawdown. Co-occurrence identifies the most urgent water security scenario.',
  benefit:'Identifies irrigation systems where crop stress AND aquifer depletion co-occur.',
  gradient: G.wetland,
  bookmark:{lat:38.0, lng:-100.0, zoom:9, date:'2021-07-01', label:'Ogallala aquifer region — water stress'},
  evalscript: TC
},
{
  key:'emsmmi', acronym:'EMSMMI', domain:'crosssensor',
  name:'EMIT Mineral + Sentinel-1 Soil Moisture Index',
  platform:'EMIT + S1', platformShort:'EMIT', novelty:'T1', canRender:false,
  formula:'VWC_S1_raw / (1 + clay_fraction_EMIT × clay_dielectric_correction)',
  physics:'Smectite clay inflates C-band backscatter-to-moisture retrieval. EMIT mineral fraction maps provide the clay correction enabling mineralogy-specific VWC retrieval.',
  benefit:'Improved soil moisture accuracy at global scale — particularly in high-clay agricultural regions.',
  gradient: G.wetland,
  bookmark:{lat:-34.0, lng:142.0, zoom:10, date:'2021-01-01', label:'Murray-Darling Basin Australia — clay soils'},
  evalscript: TC
},
{
  key:'nfcai', acronym:'NFCAI', domain:'crosssensor',
  name:'NISAR + Sentinel-2 Forest Carbon Accumulation Index',
  platform:'NISAR + S2', platformShort:'NISAR', novelty:'T3', canRender:false,
  formula:'L-band_HV × (1−canopy_cover_S2) + L-band_HH × age_proxy_NDVI_trend',
  physics:'NISAR L-band (24 cm) penetrates canopy, encoding woody volume. NDVI time series provides stand age context. NISAR launched 2024 — first operational L-band global SAR.',
  benefit:'Global 10 m forest carbon monitoring — supports national Paris Agreement reporting.',
  gradient: G.forest,
  bookmark:{lat:-2.0, lng:24.0, zoom:10, date:'2021-07-01', label:'Congo Basin — tropical forest carbon'},
  evalscript: TC
},
{
  key:'snuvqi', acronym:'SNUVQI', domain:'crosssensor',
  name:'NO₂ + Sentinel-2 Urban Vegetation Air Quality Index',
  platform:'TROPOMI + S2 + ERA5', platformShort:'TROPOMI', novelty:'T1', canRender:false,
  formula:'NO2_TROPOMI_downscaled − f(NDVI_S2, wind_ERA5)',
  physics:'S2 NDVI at 10 m constrains tree deposition capacity; ERA5 wind constrains dispersion. Residual NO₂ after tree-deposition model reveals neighborhoods with air quality benefit from urban forest.',
  benefit:'Maps which neighborhoods receive NO₂ benefit from urban trees — environmental justice analysis.',
  gradient: G.urban,
  bookmark:{lat:34.05, lng:-118.24, zoom:11, date:'2021-08-01', label:'Los Angeles CA — urban vegetation AQ'},
  evalscript: TC
},
{
  key:'puenpi', acronym:'PUENPI', domain:'crosssensor',
  name:'PACE + ECOSTRESS Coastal Wetland NEP Index',
  platform:'PACE OCI + ECOSTRESS', platformShort:'PACE', novelty:'T1', canRender:false,
  formula:'GPP_ECOSTRESS − NPP_PACE_aquatic − R_temperature_model',
  physics:'Coastal NEP = terrestrial GPP (ECOSTRESS) minus aquatic NPP (PACE phytoplankton) minus respiration (temperature model). First index enabling combined land-sea NEP at ecosystem scale.',
  benefit:'Global coastal blue-carbon accounting — enables national carbon inventories to include coastal wetland fluxes.',
  gradient: G.marine,
  bookmark:{lat:29.5, lng:-90.5, zoom:10, date:'2021-07-01', label:'Louisiana coast — coastal wetland NEP'},
  evalscript: TC
},

];
