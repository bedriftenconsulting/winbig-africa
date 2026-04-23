import requests

r = requests.get("http://localhost:5001/otp/status/e84f1345-fa6d-4224-aa63-ab4bf582ca65")
print("STATUS:", r.status_code, r.text[:300])
