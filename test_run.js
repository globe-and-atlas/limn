async function run() {
    const SH_FIS_URL = 'https://sh.dataspace.copernicus.eu/ogc/fis/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';
    const bboxStr = '-103.965,31.535,-103.935,31.565';
    const timeRange = '2023-01-01/2023-12-31';
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
    const url = `${SH_FIS_URL}?LAYER=${layerParam}&TIME=${timeRange}&BBOX=${bboxStr}&CRS=CRS:84&RESOLUTION=20m&EVALSCRIPT=${encodeURIComponent(b64Data)}`;

    console.log("Fetching url length: " + url.length);
    const resp = await fetch(url);
    const data = await resp.text();
    console.log("Status:", resp.status);
    console.log("Response:", data.substring(0, 500));
}
run();
