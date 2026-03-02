async function test() {
    const evalscript = `//VERSION=3
function setup() { 
  return { 
    input: [
      { bands: ["B11"] }, // primary (AGRICULTURE / L2A)
      { datasource: "S1", bands: ["VV"], type: "sentinel-1-grd" } // secondary
    ], 
    output: { bands: 1 } 
  }; 
}
function evaluatePixel(samples) { 
  return [1]; 
}`;
    const b64 = Buffer.from(evalscript).toString('base64');

    // WMS request against the default AGRICULTURE (S2) layer
    const url = `https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=AGRICULTURE&TIME=2026-01-01%2F2026-02-27&MAXCC=20&WIDTH=256&HEIGHT=256&CRS=EPSG%3A3857&BBOX=-11571736,3705030,-11566844,3709922&EVALSCRIPT=${encodeURIComponent(b64)}`;

    const resp = await fetch(url);
    const text = await resp.text();
    console.log("Output:\n" + text.substring(0, 200));
}
test();
