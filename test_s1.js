const evalscript = `//VERSION=3
function setup() {
  return {
    input: [{ datasource: "SENTINEL1_GRD", bands: ["VV", "VH", "dataMask"] }],
    output: { bands: 4 }
  };
}
function evaluatePixel(samples) {
  let s1 = samples.SENTINEL1_GRD[0];
  if (s1.dataMask === 0) return [0,0,0,0];
  let vv = Math.max(0, Math.log10(s1.VV) * 10 + 20) / 20;
  let vh = Math.max(0, Math.log10(s1.VH) * 10 + 20) / 20;
  let ratio = vv / (vh + 0.001);
  return [vv, vh, ratio * 0.5, 1];
}`;

const b64 = Buffer.from(evalscript).toString('base64');
const url = `https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=AGRICULTURE&TIME=2026-01-01%2F2026-02-27&MAXCC=20&SHOWLOGO=false&WIDTH=256&HEIGHT=256&CRS=EPSG%3A3857&BBOX=-11571736.319717012,3705030.702758414,-11566844.34114299,3709922.681332435&EVALSCRIPT=${encodeURIComponent(b64)}`;

fetch(url).then(res => res.text()).then(text => console.log(text.substring(0, 500)));
