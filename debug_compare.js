const fs = require('fs');

// Mock DOM
const dom = {
    'btn-generate-report': { disabled: false, innerText: '' },
    'report-date-run': { innerText: '' },
    'report-aoi-bounds': { innerText: '' },
    'report-index-name': { innerText: '' },
    'report-math': { innerText: '' },
    'report-time': { innerText: '' },
    'reportChart': { getContext: () => ({}) },
    'date-t1': { value: '2023-01-01' },
    'date-t2': { value: '2023-12-31' },
};

global.document = {
    getElementById: (id) => {
        if (!dom[id]) dom[id] = {};
        return dom[id];
    },
    querySelector: () => ({ style: { display: '' } })
};

global.btoa = (str) => Buffer.from(str).toString('base64');
global.encodeURIComponent = (str) => str;

global.state = {
    activeIndex: 'ndmi',
    mode: 'compare',
    compareType: 'swipe'
};

global.ALL_DATES = [{value: '2023-01-01', displayStr: 'Jan 1 2023'}, {value: '2023-12-31', displayStr: 'Dec 31 2023'}];
global.today = new Date();

global.aoiDrawnItem = {
    getBounds: () => ({
        getNorth: () => 31.56,
        getSouth: () => 31.53,
        getEast: () => -103.93,
        getWest: () => -103.96
    })
};

const INDICES = {
    ndmi: {
        name: 'Moisture Index', sensor: 'Sentinel-2 L2A', formula: 'demo', fisBands: ['B8A', 'B11'], fisLogic: 'return [0];'
    }
};

const SH_FIS_URL = 'https://fake-url';

// Run logic
try {
    const idx = INDICES[state.activeIndex];
    let bounds = aoiDrawnItem.getBounds();
    let bboxStr = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    let bStr = `bounds`;
    
    let isOptical = false;
    let btn = document.getElementById('btn-generate-report');
    
    btn.innerText = "Querying Database...";
    
    const fisScript = `script`;
    const b64Data = btoa(fisScript);

    let timeRange;
    let chartTitleLabel = "";

    if (state.mode === 'compare') {
        let d1 = document.getElementById('date-t1').value;
        let d2 = document.getElementById('date-t2').value;

        if (d1 > d2) {
            const temp = d1;
            d1 = d2;
            d2 = temp;
        }

        let d1D = new Date(d1);
        let d2D = new Date(d2);
        let startD = new Date(Date.UTC(d1D.getUTCFullYear(), d1D.getUTCMonth() - 6, d1D.getUTCDate()));
        let endD = new Date(Date.UTC(d2D.getUTCFullYear(), d2D.getUTCMonth() + 6, d2D.getUTCDate()));

        if (endD > today) endD = today;

        timeRange = `${startD.toISOString().split('T')[0]}/${endD.toISOString().split('T')[0]}`;
        chartTitleLabel = `Date Range +/- 6 Months`;
    }

    const activeKey = state.activeIndex;
    const cfg = INDICES[activeKey];
    let layerParam = 'AGRICULTURE';
    let maxccParam = '&MAXCC=100'; 
    if (activeKey === 's1_sar') {
        layerParam = 'SENTINEL1-GRD';
        maxccParam = '';
    }

    const url = `${SH_FIS_URL}?LAYER=${layerParam}&TIME=${timeRange}&BBOX=${bboxStr}&CRS=CRS:84&RESOLUTION=20m${maxccParam}&EVALSCRIPT=${encodeURIComponent(b64Data)}`;

    btn.innerText = "Processing Data Layers...";
    console.log("SUCCESS! Variables set.");
} catch(e) {
    console.error("CRASH:", e);
}
