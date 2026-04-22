import requests

# Test OTP send
r = requests.post(
    "http://localhost:5001/otp/send",
    json={
        "player_id": "e84f1345-fa6d-4224-aa63-ab4bf582ca65",
        "channel": "phone",
        "contact": "0256826832"
    }
)
print("SEND:", r.status_code, r.text)
