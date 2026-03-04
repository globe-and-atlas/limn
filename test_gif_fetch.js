const b64Bg = btoa(`
//VERSION=3
function setup() {
  return {
    input: ["B08", "B04", "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0, 0, 0, 0];
  let sum = sample.B08 + sample.B04;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B08 - sample.B04) / sum;
  return [val, val, val, 1.0];
}
`);
const SH_WMS_URL = 'https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';
const url = `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=AGRICULTURE&FORMAT=image/png&TRANSPARENT=false&VERSION=1.3.0&TIME=2024-04-10/2024-04-30&MAXCC=15&WIDTH=400&HEIGHT=300&CRS=CRS:84&BBOX=-103.9369,31.5345,-103.9315,31.5384&EVALSCRIPT=${encodeURIComponent(b64Bg)}`;

fetch(url).then(res => {
  console.log("Status:", res.status);
  console.log("Content-Type:", res.headers.get("content-type"));
  return res.text();
}).then(text => {
  if (text.startsWith('<')) console.log("XML Response:", text.substring(0, 500));
  else console.log("Binary response length:", text.length);
}).catch(console.error);
