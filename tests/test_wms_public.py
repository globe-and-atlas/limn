import urllib.request
import urllib.error
import urllib.parse
import base64

def test_wms():
    wms_url = 'https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a'
    
    # Simple evalscript to get true color
    evalscript = """//VERSION=3
function setup() {
  return { input: ["B04","B03","B02","dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  return [sample.B04*2.5, sample.B03*2.5, sample.B02*2.5, 1];
}"""
    
    b64_evalscript = base64.b64encode(evalscript.encode('utf-8')).decode('utf-8')
    
    # Standard WMS GetMap parameters
    params = {
        'service': 'WMS',
        'request': 'GetMap',
        'version': '1.3.0',
        'layers': 'AGRICULTURE',
        'format': 'image/png',
        'transparent': 'true',
        'width': '256',
        'height': '256',
        'crs': 'CRS:84',
        'bbox': '-102.735,31.219,-102.723,31.229', # Boehmer Lake area
        'time': '2021-08-01/2021-08-01',
        'maxcc': '30',
        'evalscript': b64_evalscript
    }
    
    query_string = urllib.parse.urlencode(params)
    full_url = f"{wms_url}?{query_string}"
    
    print(f"Testing public WMS request to: {wms_url}")
    print(f"BBox: {params['bbox']}")
    print(f"Time: {params['time']}")
    
    try:
        req = urllib.request.Request(
            full_url,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            content_type = response.info().get_content_type()
            data = response.read()
            print(f"\nSUCCESS! HTTP Status: {status}")
            print(f"Content-Type: {content_type}")
            print(f"Received data size: {len(data)} bytes")
            if 'xml' in content_type.lower() or 'text' in content_type.lower():
                print("Response content (error details):")
                print(data.decode('utf-8')[:500])
                
    except urllib.error.HTTPError as e:
        print(f"\nFAILED: HTTP Status {e.code}")
        try:
            error_body = e.read().decode('utf-8')
            print("Response content (error details):")
            print(error_body[:500])
        except Exception:
            pass
    except Exception as e:
        print(f"\nERROR: Network or request exception: {e}")

if __name__ == '__main__':
    test_wms()
