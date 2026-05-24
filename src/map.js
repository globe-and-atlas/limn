import { 
    genEvalscript, 
    genDiffEvalscript, 
    genDeepFusionEvalscript, 
    genCumulativeEvalscript,
    colorBlend,
    CALIBRATION_PRESETS,
    PALETTE_NDMI,
    PALETTE_NDWI,
    PALETTE_VEG,
    PALETTE_MSI,
    PALETTE_BRINE,
    PALETTE_CSI,
    PALETTE_HCAI,
    PALETTE_HMRI,
    PALETTE_PWI,
    PALETTE_BSI,
    PALETTE_TRI,
    PALETTE_BPI,
    PALETTE_VSI,
    PALETTE_CMA,
    PALETTE_PHI,
    PALETTE_HMI,
    PALETTE_SCRI,
    PALETTE_MSI_INV,
    PALETTE_LBI,
    PALETTE_APEX,
    INDICES
} from './indices.js';

import { renderScanThumbnails } from './charts.js';

/**
 * Initializes the Leaflet map.
 * @param {string} id - Map container ID.
 * @param {Object} startLoc - {lat, lng, zoom}.
 * @returns {L.Map}
 */
export function initLeafletMap(id, startLoc) {
    return L.map(id, {
        center: [startLoc.lat, startLoc.lng],
        zoom: startLoc.zoom,
        zoomControl: false,
        attributionControl: true
    });
}

/**
 * Generates the evalscript content for WMS requests.
 */
export function getScriptContent(config, activeIndex, isDiff, isCumulative = false, state = {}) {
    if (activeIndex === 'none') return '';
    const cfg = INDICES[activeIndex];
    if (!cfg) return '';
    let scriptContent = cfg.evalscript;

    // Apply Dynamic Calibration Placeholders
    const cal = CALIBRATION_PRESETS[state.activeBasin || 'permian'];
    scriptContent = scriptContent
        .replace(/__BSI_MASK__/g, cal.bsiMask)
        .replace(/__BSI_OFFSET__/g, cal.bsiOffset)
        .replace(/__NDWI_OFFSET__/g, cal.ndwiOffset)
        .replace(/__PWI_SALINITY_OFFSET__/g, cal.pwiSalinityOffset)
        .replace(/__PWI_HC_OFFSET__/g, cal.pwiHydrocarbonOffset)
        .replace(/__PWI_HMRI_OFFSET__/g, cal.pwiHmriOffset);

    if (isCumulative) {
        let logic = "";
        let palette = "[[0,0,0,0], [1,255,255,255]]"; // fallback

        if (activeIndex === 'ndmi') { logic = "(sample.B8A - sample.B11) / (sample.B8A + sample.B11) + 0.3"; palette = PALETTE_NDMI; }
        else if (activeIndex === 'ndwi') { logic = "(sample.B03 - sample.B11) / (sample.B03 + sample.B11) + 0.3"; palette = PALETTE_NDWI; }
        else if (activeIndex === 'ndvi') { logic = "(sample.B08 - sample.B04) / (sample.B08 + sample.B04)"; palette = PALETTE_VEG; }
        else if (activeIndex === 'savi') { logic = "((sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.5)) * 1.5 + 0.2"; palette = PALETTE_VEG; }
        else if (activeIndex === 'msi') { logic = "sample.B11 / sample.B08"; palette = PALETTE_MSI; }
        else if (activeIndex === 'si') { logic = "(sample.B11 - sample.B08) / (sample.B11 + sample.B08) + 0.5"; palette = PALETTE_NDWI; } // Corrected fallback
        else if (activeIndex === 'ndsi') { logic = "(sample.B11 - sample.B12) / (sample.B11 + sample.B12) + 0.1"; palette = PALETTE_BRINE; }
        else if (activeIndex === 'bsi') { logic = "((sample.B11 + sample.B04) - (sample.B08 + sample.B02)) / ((sample.B11 + sample.B04) + (sample.B08 + sample.B02))"; palette = PALETTE_BSI; }
        else if (activeIndex === 'csi') { logic = "sample.B11 / sample.B12 - 0.5"; palette = PALETTE_CSI; }
        else if (activeIndex === 'hcai') { logic = "(sample.B11 - sample.B04) / (sample.B11 + sample.B04) + 0.1"; palette = PALETTE_HCAI; }
        else if (activeIndex === 'hmri') { logic = "sample.B12 / sample.B03 - 2.0"; palette = PALETTE_HMRI; }
        else if (activeIndex === 'ndoi') { logic = "(sample.B02 - sample.B12) / (sample.B02 + sample.B12)"; palette = "[ [0.0, 43, 62, 80], [0.3, 127, 140, 141], [0.7, 241, 196, 15], [1.0, 231, 76, 60] ]"; }
        else if (activeIndex === 'crsi') { logic = "1.0 - Math.min(1, Math.max(0, Math.sqrt(Math.max(0, ((sample.B08*sample.B04)-(sample.B03*sample.B02))/((sample.B08*sample.B04)+(sample.B03*sample.B02))))))"; palette = "[ [0.0, 39, 174, 96], [0.4, 241, 196, 15], [0.7, 230, 126, 34], [1.0, 192, 57, 43] ]"; }
        else if (activeIndex === 'aoi') { logic = "Math.max(0, (((sample.B04/sample.B02)*(sample.B11/sample.B12)) - 2.0) / 2.0)"; palette = "[ [0.0, 44, 62, 80], [0.4, 142, 68, 173], [0.8, 192, 57, 43], [1.0, 255, 0, 0] ]"; }
        else if (activeIndex === 'pwi') {
            logic = `(function() {
                let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
                let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
                if (bsiBot === 0 || (bsiTop / bsiBot) <= 0) return 0;
                let sumNdsi = sample.B11 + sample.B12;
                if(sumNdsi === 0) return 0;
                let ndsi = (sample.B11 - sample.B12) / sumNdsi;
                let sumHcai = sample.B11 + sample.B04;
                if(sumHcai === 0) return 0;
                let hcai = (sample.B11 - sample.B04) / sumHcai;
                let hmri = (sample.B03 === 0) ? 0 : sample.B12 / sample.B03;
                let pScore = Math.max(0, ndsi - 0.05) * Math.max(0, (hcai - 0.20) * 2.5) * Math.max(0, (hmri - 1.5) * 2.5);
                return Math.min(1, Math.pow(pScore * 60.0, 1.5));
            })()`;
            palette = PALETTE_PWI;
        }

        let bands = ['B04', 'B03', 'B02'];
        if (activeIndex === 'ndmi') bands = ['B8A', 'B11'];
        if (activeIndex === 'ndwi') bands = ['B03', 'B11'];
        if (activeIndex === 'ndvi' || activeIndex === 'savi') bands = ['B08', 'B04'];
        if (activeIndex === 'msi' || activeIndex === 'si') bands = ['B11', 'B08'];
        if (activeIndex === 'ndsi' || activeIndex === 'csi') bands = ['B11', 'B12'];
        if (activeIndex === 'bsi') bands = ['B02', 'B04', 'B08', 'B11'];
        if (activeIndex === 'hcai') bands = ['B11', 'B04'];
        if (activeIndex === 'hmri') bands = ['B12', 'B03'];
        if (activeIndex === 'ndoi') bands = ['B02', 'B12'];
        if (activeIndex === 'crsi') bands = ['B02', 'B03', 'B04', 'B08'];
        if (activeIndex === 'aoi') bands = ['B02', 'B04', 'B11', 'B12'];
        if (activeIndex === 'pwi') bands = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'];
        if (activeIndex === 'lbi') {
            logic = `(function() {
                let ndsi = (sample.B11+sample.B12)===0?0:(sample.B11-sample.B12)/(sample.B11+sample.B12);
                let ndwi = (sample.B03+sample.B11)===0?0:(sample.B03-sample.B11)/(sample.B03+sample.B11);
                let ndvi = (sample.B08+sample.B04)===0?0:(sample.B08-sample.B04)/(sample.B08+sample.B04);
                let bsi = (sample.B11+sample.B04+sample.B08+sample.B02)===0?0:((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02));
                return Math.max(0, ndsi) * Math.max(0, ndwi + 0.5) * Math.max(0, 1.0 - ndvi) * Math.max(0, bsi) * 40.0;
            })()`;
            palette = PALETTE_LBI;
            bands = ['B03', 'B04', 'B08', 'B11', 'B12'];
        }
        if (activeIndex === 'tri') {
            logic = `(function() {
                let ndsi = (sample.B11+sample.B12)===0?0:(sample.B11-sample.B12)/(sample.B11+sample.B12);
                let hmri = sample.B03===0?0:sample.B12/sample.B03;
                let aoi = (sample.B02===0||sample.B12===0)?0:(sample.B04/sample.B02)*(sample.B11/sample.B12);
                return Math.max(0, ndsi-0.05) * Math.max(0,(hmri-1.5)/2) * Math.max(0,(aoi-1.5)/2) * 10;
            })()`;
            palette = PALETTE_TRI;
            bands = ['B02', 'B03', 'B04', 'B11', 'B12'];
        }
        if (activeIndex === 'bpi') {
            logic = `(function() {
                let bsi = (sample.B11+sample.B04+sample.B08+sample.B02===0)?0:((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02));
                let ndsi = (sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12);
                let hcai = (sample.B11+sample.B04===0)?0:(sample.B11-sample.B04)/(sample.B11+sample.B04);
                return Math.max(0, bsi) * Math.max(0, ndsi-0.03) * Math.max(0, hcai-0.15) * 30.0;
            })()`;
            palette = PALETTE_BPI;
            bands = ['B02', 'B04', 'B08', 'B11', 'B12'];
        }
        if (activeIndex === 'hpwi') {
            {
                logic = `(function() {
                    let ndsi = (sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12);
                    let hcai = (sample.B11+sample.B04===0)?0:(sample.B11-sample.B04)/(sample.B11+sample.B04);
                    let hmri = (sample.B03===0)?0:(sample.B12/sample.B03);
                    let brineScore = Math.max(0, ndsi-0.10);
                    let hydrocarbonScore = Math.max(0, (hcai-0.30)*2);
                    let metalScore = Math.max(0, (hmri-2.0)*2);
                    let chemPWI = brineScore * hydrocarbonScore * metalScore;
                    let sumSmooth = sample.B03+sample.B11;
                    let normSmooth = Math.max(0, Math.min(1, ((sample.B03-sample.B11)/sumSmooth+0.3)/0.6));
                    let combined = chemPWI * normSmooth;
                    return Math.min(1.0, Math.pow(combined * 20.0, 3.0));
                })()`;
                palette = PALETTE_PWI;
                bands = ['B02', 'B03', 'B04', 'B11', 'B12'];
            }
        }
        if (activeIndex === 'vsi') {
            logic = `(function() {
                let ndsi = (sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12);
                let redEdgeDelta = (sample.B07+sample.B05===0)?0:(sample.B07-sample.B05)/(sample.B07+sample.B05);
                let msi = sample.B8A===0?0:sample.B11/sample.B8A;
                return Math.max(0, ndsi) * Math.max(0, 0.4-redEdgeDelta) * Math.max(0, msi-1.0) * 10.0;
            })()`;
            palette = PALETTE_VSI;
            bands = ['B05', 'B07', 'B11', 'B12', 'B8A'];
        }
        if (activeIndex === 'cma') {
            logic = `(function() {
                let ndsi = (sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12);
                let clayRatio = (sample.B12===0)?0:sample.B11/sample.B12;
                let ironIndex = (sample.B02===0)?0:sample.B04/sample.B02;
                return Math.max(0, ndsi) * Math.max(0, clayRatio-1.2) * Math.max(0, ironIndex-1.5) * 15.0;
            })()`;
            palette = PALETTE_CMA;
            bands = ['B02', 'B04', 'B11', 'B12'];
        }
        if (activeIndex === 'phi') {
            logic = `(function() {
                let ndsi = (sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12);
                let shoulder = (sample.B12===0)?0:sample.B11/sample.B12;
                let hcai = (sample.B11+sample.B04===0)?0:(sample.B11-sample.B04)/(sample.B11+sample.B04);
                return Math.max(0, ndsi) * Math.max(0, shoulder-1.0) * Math.max(0, hcai-0.2) * 20.0;
            })()`;
            palette = PALETTE_PHI;
            bands = ['B04', 'B11', 'B12'];
        }
        if (activeIndex === 'hmi') {
            logic = `(function() {
                let greenShift = (sample.B02===0)?0:sample.B03/sample.B02;
                let saltPPT = (sample.B12===0)?0:sample.B11/sample.B12;
                return Math.max(0, greenShift-1.1) * Math.max(0, saltPPT-1.2) * 10.0;
            })()`;
            palette = PALETTE_HMI;
            bands = ['B02', 'B03', 'B11', 'B12'];
        }
        if (activeIndex === 'scri') {
            logic = `(function() {
                let vh=10*Math.log10(sample.VH); let vv=10*Math.log10(sample.VV); let ratio=vh-vv;
                return Math.max(0,(vh+20)/10)*Math.max(0,(ratio+5)/5)*0.5;
            })()`;
            palette = PALETTE_SCRI;
            bands = ['VV', 'VH'];
        }

        if (activeIndex === 'pwoi') {
            logic = `(function() {
                let sum = sample.B03 + sample.B11;
                let oVal = sum === 0 ? 0 : (sample.B03 - sample.B11) / sum;
                let radarProxy = Math.max(0, Math.min(1.2, (oVal + 0.3) / 0.6));
                let ndsiSum = sample.B11 + sample.B12;
                let brineBoost = ndsiSum === 0 ? 0 : Math.max(0, (sample.B11 - sample.B12) / ndsiSum) * 0.4;
                let moisture = oVal + 0.3 + brineBoost;
                let fusion = (radarProxy > 0.7 && moisture > 0.45)
                    ? (radarProxy * 0.4 + moisture * 0.6 + 0.25)
                    : (radarProxy * 0.3 + moisture * 0.7);
                return Math.min(Math.max(fusion, 0), 1);
            })()`;
            palette = PALETTE_APEX;
            bands = ['B03', 'B11', 'B12'];
        }

        if (activeIndex !== 'hpwi') {
            if (logic === '') {
                // No cumulative logic defined for this index — fall back to standard evalscript
            } else {
                if (activeIndex === 'msi') palette = PALETTE_MSI_INV;
                scriptContent = genCumulativeEvalscript(bands, logic, palette);
            }
        }
    } else {
        if (cfg.diffscript) {
            scriptContent = cfg.diffscript;
        } else if (activeIndex === 's1_sar') {
            scriptContent = `//VERSION=3
function setup() {
  return { input: ["VV", "dataMask"], output: { bands: 4 }, mosaicking: "ORBIT" };
}
function evaluatePixel(samples) {
  if (samples.length < 2) return [0, 0, 0, 0.1];
  let s1 = samples[samples.length - 1];
  let s2 = samples[0];
  if (s1.dataMask === 0 || s2.dataMask === 0) return [0, 0, 0, 0];
  let val1 = Math.log10(s1.VV);
  let val2 = Math.log10(s2.VV);
  let diff = val2 - val1;
  if (diff < -0.2) return [1.0, 0.2, 0.2, 0.8];
  if (diff > 0.2) return [0.2, 0.6, 1.0, 0.8];
  return [0.2, 0.2, 0.2, 0.3];
}`;
        } else if (isDiff) {
            let calc = '0';
            if (activeIndex === 'ndvi') calc = '(sample.B08-sample.B04)/(sample.B08+sample.B04)';
            else if (activeIndex === 'ndmi') calc = '(sample.B8A-sample.B11)/(sample.B8A+sample.B11)';
            else if (activeIndex === 'ndwi') calc = '(sample.B03-sample.B11)/(sample.B03+sample.B11)';
            else if (activeIndex === 'savi') calc = '(((sample.B08-sample.B04)/(sample.B08+sample.B04+0.5))*1.5)';
            else if (activeIndex === 'msi') calc = '-(sample.B11/sample.B08)';
            else if (activeIndex === 'si') calc = '-((sample.B11-sample.B08)/(sample.B11+sample.B08))';
            else if (activeIndex === 'ndsi') calc = '-((sample.B11-sample.B12)/(sample.B11+sample.B12))';
            else if (activeIndex === 'bsi') calc = '-(((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)))';
            else if (activeIndex === 'csi') calc = '-(sample.B11/sample.B12)';
            else if (activeIndex === 'hcai') calc = '-((sample.B11-sample.B04)/(sample.B11+sample.B04))';
            else if (activeIndex === 'hmri') calc = '-(sample.B12/sample.B03)';
            else if (activeIndex === 'ndoi') calc = '-((sample.B02-sample.B12)/(sample.B02+sample.B12))';
            else if (activeIndex === 'crsi') calc = '-(Math.sqrt(Math.max(0, ((sample.B08*sample.B04)-(sample.B03*sample.B02))/((sample.B08*sample.B04)+(sample.B03*sample.B02)))))';
            else if (activeIndex === 'aoi') calc = '-((sample.B04/sample.B02)*(sample.B11/sample.B12))';
            else if (activeIndex === 'ehc') calc = '-(((sample.B02-sample.B12)/(sample.B02+sample.B12)) + ((sample.B11-sample.B12)/(sample.B11+sample.B12)))';
            else if (activeIndex === 'pwi') calc = '-((function(){ let bsiTop=(sample.B11+sample.B04)-(sample.B08+sample.B02); let bsiBot=(sample.B11+sample.B04)+(sample.B08+sample.B02); let bsi=(bsiBot===0)?0:(bsiTop/bsiBot); if(bsi<0.01)return 0; let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let hcai=(sample.B11+sample.B04===0)?0:(sample.B11-sample.B04)/(sample.B11+sample.B04); let hmri=(sample.B03===0)?0:sample.B12/sample.B03; return Math.max(0,ndsi-0.05)*Math.max(0,(hcai-0.20)*2.5)*Math.max(0,(hmri-1.5)*2.5); })())';
            else if (activeIndex === 'lbi') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let ndwi=(sample.B03+sample.B11===0)?0:(sample.B03-sample.B11)/(sample.B03+sample.B11); let ndvi=(sample.B08+sample.B04===0)?0:(sample.B08-sample.B04)/(sample.B08+sample.B04); let bsi=(sample.B11+sample.B04+sample.B08+sample.B02===0)?0:((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)); return Math.max(0,ndsi)*Math.max(0,ndwi+0.5)*Math.max(0,1.0-ndvi)*Math.max(0,bsi); })())';
            else if (activeIndex === 'tri') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let hmri=(sample.B03===0)?0:sample.B12/sample.B03; let aoi=(sample.B02===0||sample.B12===0)?0:(sample.B04/sample.B02)*(sample.B11/sample.B12); return Math.max(0,ndsi-0.05)*Math.max(0,(hmri-1.5)/2)*Math.max(0,(aoi-1.5)/2); })())';
            else if (activeIndex === 'bpi') calc = '-((function(){ let bsi=(sample.B11+sample.B04+sample.B08+sample.B02===0)?0:((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)); let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let hcai=(sample.B11+sample.B04===0)?0:(sample.B11-sample.B04)/(sample.B11+sample.B04); return Math.max(0,bsi)*Math.max(0,ndsi-0.03)*Math.max(0,hcai-0.15); })())';
            else if (activeIndex === 'vsi') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let redEdgeDelta=(sample.B07+sample.B05===0)?0:(sample.B07-sample.B05)/(sample.B07+sample.B05); let msi=(sample.B8A===0)?0:sample.B11/sample.B8A; return Math.max(0,ndsi)*Math.max(0,0.4-redEdgeDelta)*Math.max(0,msi-1.0); })())';
            else if (activeIndex === 'cma') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let clayRatio=(sample.B12===0)?0:sample.B11/sample.B12; let ironIndex=(sample.B02===0)?0:sample.B04/sample.B02; return Math.max(0,ndsi)*Math.max(0,clayRatio-1.2)*Math.max(0,ironIndex-1.5); })())';
            else if (activeIndex === 'phi') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let shoulder=(sample.B12===0)?0:sample.B11/sample.B12; let hcai=(sample.B11+sample.B04===0)?0:(sample.B11-sample.B04)/(sample.B11+sample.B04); return Math.max(0,ndsi)*Math.max(0,shoulder-1.0)*Math.max(0,hcai-0.2); })())';
            else if (activeIndex === 'hmi') calc = '-((function(){ let greenShift=(sample.B02===0)?0:sample.B03/sample.B02; let saltPPT=(sample.B12===0)?0:sample.B11/sample.B12; return Math.max(0,greenShift-1.1)*Math.max(0,saltPPT-1.2); })())';
            else if (activeIndex === 'scri') calc = '-((function(){ let vh=10*Math.log10(sample.VH); let vv=10*Math.log10(sample.VV); let ratio=vh-vv; return Math.max(0,(vh+20)/10)*Math.max(0,(ratio+5)/5); })())';
            else if (activeIndex === 'tc') calc = '(sample.B04*2)';
            else if (activeIndex === 'fc') calc = '(sample.B08*2)';

            let bands = ['B04', 'B03', 'B02'];
            if (activeIndex === 'ndmi') bands = ['B8A', 'B11'];
            if (activeIndex === 'ndwi') bands = ['B03', 'B11'];
            if (activeIndex === 'ndvi' || activeIndex === 'savi') bands = ['B08', 'B04'];
            if (activeIndex === 'msi' || activeIndex === 'si') bands = ['B11', 'B08'];
            if (activeIndex === 'ndsi' || activeIndex === 'csi') bands = ['B11', 'B12'];
            if (activeIndex === 'bsi') bands = ['B02', 'B04', 'B08', 'B11'];
            if (activeIndex === 'hcai') bands = ['B11', 'B04'];
            if (activeIndex === 'hmri') bands = ['B12', 'B03'];
            if (activeIndex === 'ndoi') bands = ['B02', 'B12'];
            if (activeIndex === 'crsi') bands = ['B02', 'B03', 'B04', 'B08'];
            if (activeIndex === 'aoi') bands = ['B02', 'B04', 'B11', 'B12'];
            if (activeIndex === 'ehc') bands = ['B02', 'B12', 'B11'];
            if (activeIndex === 'pwi') bands = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'];
            if (activeIndex === 'lbi') bands = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'];
            if (activeIndex === 'tri') bands = ['B02', 'B03', 'B04', 'B11', 'B12'];
            if (activeIndex === 'bpi') bands = ['B02', 'B04', 'B08', 'B11', 'B12'];
            if (activeIndex === 'vsi') bands = ['B05', 'B07', 'B11', 'B12', 'B8A'];
            if (activeIndex === 'cma') bands = ['B02', 'B04', 'B11', 'B12'];
            if (activeIndex === 'phi') bands = ['B04', 'B11', 'B12'];
            if (activeIndex === 'hmi') bands = ['B02', 'B03', 'B11', 'B12'];
            if (activeIndex === 'scri') bands = ['VV', 'VH'];
            if (activeIndex === 'fc') bands = ['B08', 'B04', 'B03'];
            scriptContent = genDiffEvalscript(bands, calc);
        }
    }

    if (activeIndex === 'hpwi' && isDiff) scriptContent = cfg.evalscript;
    const filterInject = `//VERSION=3\nconst VISUAL_FILTER = ${state.visualFilter};\nconst DETECTION_SENSITIVITY = ${state.sensitivity / 100};`;
    return filterInject + "\n" + scriptContent.replace('//VERSION=3', '');
}

/**
 * Rate-limited WMS tile layer.
 * Queues tile fetches (max 4 concurrent) and retries on HTTP 429 with backoff.
 */
const RateLimitedWMS = L.TileLayer.WMS.extend({
    initialize(url, options) {
        L.TileLayer.WMS.prototype.initialize.call(this, url, options);
        this._queue = [];
        this._active = 0;
        this._maxConcurrent = 4;
    },

    createTile(coords, done) {
        const img = document.createElement('img');
        if (this.options.crossOrigin || this.options.crossOrigin === '') {
            img.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
        }
        this._enqueue(this.getTileUrl(coords), img, done, 3);
        return img;
    },

    _enqueue(url, img, done, retriesLeft) {
        this._queue.push({ url, img, done, retriesLeft });
        this._drain();
    },

    _drain() {
        while (this._active < this._maxConcurrent && this._queue.length > 0) {
            this._active++;
            this._load(this._queue.shift());
        }
    },

    _load({ url, img, done, retriesLeft }) {
        fetch(url)
            .then(r => {
                if (r.status === 429 && retriesLeft > 0) {
                    this._active--;
                    this._drain();
                    setTimeout(() => this._enqueue(url, img, done, retriesLeft - 1), 2000);
                    return null;
                }
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.blob();
            })
            .then(blob => {
                if (!blob) return;
                const objUrl = URL.createObjectURL(blob);
                img.onload = () => { URL.revokeObjectURL(objUrl); this._release(null, img, done); };
                img.onerror = () => { URL.revokeObjectURL(objUrl); this._release(new Error('img decode failed'), img, done); };
                img.src = objUrl;
            })
            .catch(e => this._release(e, img, done));
    },

    _release(err, img, done) {
        this._active--;
        this._drain();
        done(err, img);
    }
});

/**
 * Creates a WMS tile layer.
 */
export function getWMSLayer(state, config, timeStr, isDiff, overrideIndex = null) {
    const activeIdx = overrideIndex || state.activeIndex;
    const isCumulative = (state.mode === 'compare' && state.compareType === 'cumulative' && !overrideIndex);
    const scriptContent = getScriptContent(config, activeIdx, isDiff, isCumulative, state);
    const { SH_WMS_URL, INDICES } = config;

    let wmsLayerParam = 'AGRICULTURE';
    const cfg = INDICES[activeIdx];
    if (activeIdx === 's1_sar' || (cfg && cfg.sensor === 'Sentinel-1 GRD')) wmsLayerParam = 'SENTINEL1-GRD';
    if (state.hlsEnabled && activeIdx !== 's1_sar' && activeIdx !== 'hpwi') {
        wmsLayerParam = SH_WMS_URL.includes('copernicus.eu') ? 'SENTINEL-2-L2A,LANDSAT-8-L2A' : 'NASA-HLS';
    }
    // Force single main carrier layer for multi-source fusion scripts to avoid 400 error.
    // 'AGRICULTURE' is a near-universal default in Sentinel Hub configs.
    if (cfg && cfg.sensor === 'S1/S2 Fusion') {
        wmsLayerParam = 'AGRICULTURE';
    }

    let queryTime = timeStr;
    if (activeIdx === 'pwoi' && !timeStr.includes('/')) {
        let dateObj = new Date(timeStr);
        let pastObj = new Date(dateObj);
        pastObj.setDate(pastObj.getDate() - 30);
        queryTime = pastObj.toISOString().split('T')[0] + '/' + timeStr;
    }

    // ASAI (pwoi) uses a 30-day window — relax cloud cover filter so more scenes are eligible
    const maxcc = activeIdx === 'pwoi' ? 60 : 20;

    const layer = new RateLimitedWMS(SH_WMS_URL, {
        layers: wmsLayerParam,
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        time: queryTime,
        maxcc,
        showlogo: false,
        evalscript: btoa(unescape(encodeURIComponent(
            scriptContent
                .replace(/\/\*[\s\S]*?\*\/|([^\:]|^)\/\/.*$/gm, '$1')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n')
        ))),
        opacity: overrideIndex ? 0.5 : state.opacity,
        attribution: 'Copernicus Sentinel Hub',
        tileSize: 256,
        minZoom: 10,
        zIndex: overrideIndex ? 20 : 10,
        crossOrigin: 'anonymous',
        updateWhenIdle: true
    });

    layer.on('tileerror', (error) => {
        console.error('[WMS] Tile Error:', error);
        // Dispatch custom global event if map exists
        if (state.map) {
            state.map.fire('tileerror', { error, layer: activeIdx });
        }
    });

    layer.on('tileloadstart', () => {
        if (state.map) state.map.fire('tileloadstart');
    });

    layer.on('load', () => {
        if (state.map) state.map.fire('tileloadfinish');
    });

    return layer;
}

/**
 * Applies the current index to the map.
 */
export function applyIndex(state, config, isScrubbing = false) {
    const { map, activeIndex, monthIndex, mode, compareType, sarFusion } = state;
    const { ALL_DATES } = config;

    if (!map) return;
    if (!isScrubbing) {
        if (state.overlayGroup) { map.removeLayer(state.overlayGroup); state.overlayGroup = null; }
        if (state.leftGroup) { map.removeLayer(state.leftGroup); state.leftGroup = null; }
        if (state.rightGroup) { map.removeLayer(state.rightGroup); state.rightGroup = null; }
        if (state.sbsControl) { map.removeControl(state.sbsControl); state.sbsControl = null; }
    }

    if (activeIndex === 'none') {
        return;
    }

    let layersToGroup = [];
    let rightLayersGroup = [];

    if (mode === 'single') {
        if (!ALL_DATES[monthIndex]) return;
        const timeStr = ALL_DATES[monthIndex].value;
        if (isScrubbing && state.overlayGroup) {
            state.overlayGroup.eachLayer(layer => {
                if (layer.setParams) layer.setParams({ time: timeStr }, false);
            });
        } else {
            layersToGroup.push(getWMSLayer(state, config, timeStr, false));
            if (sarFusion && activeIndex !== 's1_sar') layersToGroup.push(getWMSLayer(state, config, timeStr, false, 's1_sar'));
            state.overlayGroup = L.layerGroup(layersToGroup).addTo(map);
        }
    } else {
        const t1 = document.getElementById('date-t1').value;
        const t2 = document.getElementById('date-t2').value;
        if (state.compareType === 'swipe') {
            const l_layer = getWMSLayer(state, config, t1, false);
            const r_layer = getWMSLayer(state, config, t2, false);
            layersToGroup.push(l_layer);
            rightLayersGroup.push(r_layer);
            if (sarFusion && activeIndex !== 's1_sar') {
                layersToGroup.push(getWMSLayer(state, config, t1, false, 's1_sar'));
                rightLayersGroup.push(getWMSLayer(state, config, t2, false, 's1_sar'));
            }
            state.leftGroup = L.layerGroup(layersToGroup).addTo(map);
            state.rightGroup = L.layerGroup(rightLayersGroup).addTo(map);
            state.sbsControl = L.control.sideBySide(state.leftGroup.getLayers(), state.rightGroup.getLayers()).addTo(map);
        } else if (state.compareType === 'diff') {
            const timeRange = `${t1}/${t2}`;
            layersToGroup.push(getWMSLayer(state, config, timeRange, true));
            if (sarFusion && activeIndex !== 's1_sar') layersToGroup.push(getWMSLayer(state, config, timeRange, true, 's1_sar'));
            state.overlayGroup = L.layerGroup(layersToGroup).addTo(map);
        } else if (state.compareType === 'cumulative') {
            const timeRange = `${t1}/${t2}`;
            layersToGroup.push(getWMSLayer(state, config, timeRange, false));
            if (sarFusion && activeIndex !== 's1_sar') layersToGroup.push(getWMSLayer(state, config, timeRange, false, 's1_sar'));
            state.overlayGroup = L.layerGroup(layersToGroup).addTo(map);
        }
    }

    if (!isScrubbing) {
        updateGifInset(state, config);
        if (state.anomalousDates && state.anomalousDates.length > 0) {
            let thumbBounds = map.getBounds();
            if (state.drawnItems && state.drawnItems.getLayers().length > 0) thumbBounds = state.drawnItems.getBounds();
            renderScanThumbnails(state.anomalousDates, thumbBounds);
        }
    }
}

/**
 * Updates the GIF inset.
 */
export async function updateGifInset(state, config) {
    const { map, activeIndex, monthIndex, mode } = state;
    const { ALL_DATES, SH_WMS_URL, INDICES } = config;
    const inset = document.getElementById('gif-inset');
    const img = document.getElementById('gif-img');
    if (!inset || !img) return;
    if (activeIndex === 'none' || mode !== 'single') {
        inset.style.display = 'none';
        return;
    }
    inset.style.display = 'block';
    const b = map.getBounds();
    const bboxStr = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const size = 360;
    const targetDate = new Date(ALL_DATES[monthIndex].value);
    const startDate = new Date(targetDate);
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date(targetDate);
    endDate.setMonth(endDate.getMonth() + 1);
    let validDates = ALL_DATES.filter(ad => {
        let d = new Date(ad.value);
        return d >= startDate && d <= endDate;
    }).map(ad => ad.value);
    if (validDates.length > 15) {
        const step = Math.ceil(validDates.length / 15);
        validDates = validDates.filter((_, i) => i % step === 0);
    }
    validDates.sort((a,b) => new Date(a) - new Date(b));
    if (validDates.length === 0) validDates = [targetDate.toISOString().slice(0,10)];
    const dates = validDates;
    const tcScript = getScriptContent(config, 'tc', false, false);
    const activeScript = getScriptContent(config, activeIndex, false, false);
    const b64Tc = btoa(unescape(encodeURIComponent(tcScript)));
    const b64Active = btoa(unescape(encodeURIComponent(activeScript)));
    let wmsLayerParam = 'AGRICULTURE';
    const cfg = INDICES[activeIndex];
    if (activeIndex === 's1_sar' || (cfg && cfg.sensor === 'Sentinel-1 GRD')) wmsLayerParam = 'SENTINEL1-GRD';
    if (img._insetTimer) clearInterval(img._insetTimer);
    const frames = dates.map(d => {
        const bgUrl = `${SH_WMS_URL}?service=WMS&request=GetMap&version=1.3.0&layers=${wmsLayerParam}&format=image/jpeg&width=${size}&height=${size}&crs=CRS:84&bbox=${bboxStr}&time=${d}/${d}&maxcc=50&evalscript=${b64Tc}`;
        const fgUrl = `${SH_WMS_URL}?service=WMS&request=GetMap&version=1.3.0&layers=${wmsLayerParam}&format=image/png&transparent=true&width=${size}&height=${size}&crs=CRS:84&bbox=${bboxStr}&time=${d}/${d}&maxcc=100&evalscript=${b64Active}`;
        return { bgUrl, fgUrl, date: d };
    });
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    let currentFrame = 0;
    const renderFrame = async (frameIdx) => {
        const f = frames[frameIdx]; if (!f) return;
        const loadImg = (url) => new Promise((res) => { const img = new Image(); img.crossOrigin = "Anonymous"; img.onload = () => res(img); img.onerror = () => res(null); img.src = url; });
        const [bg, fg] = await Promise.all([loadImg(f.bgUrl), loadImg(f.fgUrl)]);
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, size, size);
        if (bg) ctx.drawImage(bg, 0, 0, size, size);
        ctx.globalAlpha = 0.8; if (fg) ctx.drawImage(fg, 0, 0, size, size); ctx.globalAlpha = 1.0;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, size - 20, size, 20);
        ctx.fillStyle = '#fff'; ctx.font = '10px Space Grotesk, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.date, size/2, size - 7);
        img.src = canvas.toDataURL('image/jpeg', 0.8);
    };
    await renderFrame(0);
    img._insetTimer = setInterval(() => { currentFrame = (currentFrame + 1) % frames.length; renderFrame(currentFrame); }, 1250);
}
