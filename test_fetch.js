const fetch = require('node-fetch');
async function test() {
    const url = "https://sh.dataspace.copernicus.eu/ogc/fis/959ea2c5-5892-4b36-82b3-76e6bdb93c8a?LAYER=AGRICULTURE&TIME=2025-07-30/2026-03-03&BBOX=-101.86574935913087,31.89170091624336,-101.8610018491745,31.894356238663683&CRS=CRS:84&RESOLUTION=60m&MAXCC=100&EVALSCRIPT=Ly9WRVJTSU9OPTMKZnVuY3Rpb24gc2V0dXAoKSB7CiAgcmV0dXJuIHsKICAgIGlucHV0OiBbJ0IxMScsICdCMTInLCAiZGF0YU1hc2siXSwKICAgIG91dHB1dDogeyBiYW5kczogMSwgc2FtcGxlVHlwZTogJ0ZMT0FUMzInIH0KICB9Owp9CmZ1bmN0aW9uIGV2YWx1YXRlUGl4ZWwoc2FtcGxlKSB7CiAgaWYgKHNhbXBsZS5kYXRhTWFzayA9PT0gMCkgcmV0dXJuIFtOYU5dOwogIAogIGxldCBzdW0gPSBzYW1wbGUuQjExICsgc2FtcGxlLkIxMjsKICBpZihzdW0gPT09IDApIHJldHVybiBbMF07CiAgcmV0dXJuIFsoc2FtcGxlLkIxMSAtIHNhbXBsZS5CMTIpIC8gc3VtXTsKCn0%3D";
    try {
        const resp = await fetch(url);
        const text = await resp.text();
        console.log("Status:", resp.status);
        console.log("Payload:", text);
    } catch(e) {
        console.error(e);
    }
}
test();
