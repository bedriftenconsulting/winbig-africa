import requests

# Login
r = requests.post("http://localhost:4000/api/v1/admin/auth/login",
    json={"email": "admin@winbig.com", "password": "admin123"})
token = r.json()["data"]["access_token"]

# Get tickets
r2 = requests.get("http://localhost:4000/api/v1/admin/tickets?page=1",
    headers={"Authorization": f"Bearer {token}"})
tickets = r2.json()["data"]["tickets"]

print(f"Total tickets: {len(tickets)}")
for t in tickets[:3]:
    print(f"  serial={t.get('serial_number')} payment_status={t.get('payment_status','MISSING')} status={t.get('status','MISSING')}")
