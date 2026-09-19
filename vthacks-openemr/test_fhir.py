import requests

# OpenEMR local FHIR patient endpoint
fhir_url = "http://localhost:8080/openemr/apis/default/fhir/Patient"

try:
    response = requests.get(fhir_url)
    if response.status_code == 200:
        data = response.json()
        print("Success! Connected to OpenEMR FHIR API.")
        print(f"Total patients found: {len(data.get('entry', []))}")
        
        # Print out the names of the patients you just added
        for entry in data.get('entry', []):
            resource = entry.get('resource', {})
            name_info = resource.get('name', [{}])[0]
            family = name_info.get('family', '')
            given = " ".join(name_info.get('given', []))
            print(f" - Patient: {given} {family}")
    else:
        print(f"Failed with status code: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Connection error: {e}")