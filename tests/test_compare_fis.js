async function run() {
    const SH_FIS_URL = 'https://sh.dataspace.copernicus.eu/ogc/fis/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';
    const bboxStr = '-103.965,31.535,-103.935,31.565';
    // Let's create a huge timeRange like the compare mode might generate
    const timeRange = '2021-01-01/2024-12-31';
    const layerParam = 'AGRICULTURE';
    
    const fisScript = `//VERSION=3
function setup() {
  return {
    input: ["B8A", "B11", "dataMask"],
    output: { bands: 1, sampleType: 'FLOAT32' }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [NaN];
  let sum = sample.B8A + sample.B11;
  if(sum === 0) return [0];
  return [(sample.B8A - sample.B11) / sum];
}`;

    const b64Data = Buffer.from(fisScript).toString('base64');
    const url = `${SH_FIS_URL}?LAYER=${layerParam}&TIME=${timeRange}&BBOX=${bboxStr}&CRS=CRS:84&RESOLUTION=20m&MAXCC=100&EVALSCRIPT=${encodeURIComponent(b64Data)}`;
    
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            console.log("HTTP Status:", resp.status);
            console.log("Error text:", await resp.text());
        } else {
            const data = await resp.json();
            console.log("C0 Array Length:", data.C0 ? data.C0.length : 0);
        }
    } catch(e) {
        console.error(e);
    }
}
run();
