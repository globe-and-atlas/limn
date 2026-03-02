async function test() {
  const evalscript = `//VERSION=3
function setup() { return { input: ["VV", "VH", "dataMask"], output: { bands: 4 } }; }
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  let vv = Math.max(0, Math.log10(sample.VV) * 10 + 20) / 20;
  let vh = Math.max(0, Math.log10(sample.VH) * 10 + 20) / 20;
  return [vv, vh, (vv/(vh+0.001))*0.5, 1];
}`;
  const b64 = Buffer.from(evalscript).toString('base64');
  
  const url = `https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=SENTINEL1-GRD&TIME=2026-01-01%2F2026-02-27&MAXCC=20&WIDTH=256&HEIGHT=256&CRS=EPSG%3A3857&BBOX=-11571736,3705030,-11566844,3709922&EVALSCRIPT=${encodeURIComponent(b64)}`;
  
  const resp = await fetch(url);
  const text = await resp.text();
  console.log("Direct WMS Layer Output:\n" + text.substring(0,200));
}
test();
