import re
import urllib.request
import urllib.parse
import json
from pathlib import Path

def test_credentials():
    config_path = Path("/Users/danielbally/Git/limn/config-v1.js")
    if not config_path.exists():
        print(f"Error: {config_path} not found.")
        return

    content = config_path.read_text()
    
    # Extract client id and secret using regex
    client_id_match = re.search(r'CDSE_CLIENT_ID:\s*["\']([^"\']+)["\']', content)
    client_secret_match = re.search(r'CDSE_CLIENT_SECRET:\s*["\']([^"\']+)["\']', content)
    
    if not client_id_match or not client_secret_match:
        print("Error: Could not parse CDSE credentials from config-v1.js")
        print("Found client_id match:", bool(client_id_match))
        print("Found client_secret match:", bool(client_secret_match))
        return
        
    client_id = client_id_match.group(1)
    client_secret = client_secret_match.group(1)
    
    print(f"Found Client ID: {client_id}")
    print("Testing authentication with Copernicus Identity Service...")
    
    auth_url = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
    
    data = urllib.parse.urlencode({
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'client_credentials'
    }).encode('utf-8')
    
    req = urllib.request.Request(
        auth_url,
        data=data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            resp_data = response.read().decode('utf-8')
            json_data = json.loads(resp_data)
            access_token = json_data.get('access_token')
            expires_in = json_data.get('expires_in')
            
            if access_token:
                print("\nSUCCESS! Credentials are VALID.")
                print(f"Access token successfully retrieved (expires in {expires_in} seconds).")
                print(f"Token (first 30 chars): {access_token[:30]}...")
            else:
                print("\nERROR: Auth call succeeded but no access_token was returned.")
                print(json_data)
                
    except urllib.error.HTTPError as e:
        print(f"\nERROR: Authentication failed with HTTP status {e.code}")
        try:
            error_body = e.read().decode('utf-8')
            print(f"Response details: {error_body}")
        except Exception:
            pass
    except Exception as e:
        print(f"\nERROR: Network or request exception: {e}")

if __name__ == '__main__':
    test_credentials()
