import urllib.request, json

url = 'https://script.google.com/macros/s/AKfycbwvin6XGotcqOwqyNowHyhW6eF66yLBuT44Q7m5g_ivSl-ObRCLO-GfYJAqsJjkQ0KB1Q/exec'

def send(payload, label):
    try:
        data_bytes = json.dumps(payload).encode('utf-8') if payload is not None else b''
        req = urllib.request.Request(url, data=data_bytes, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode('utf-8', errors='ignore')
            status = resp.status
            try:
                parsed = json.loads(body)
                print(f"[PASS] {label} -> Status: {status}, Success: {parsed.get('success', False)}, Msg: {parsed.get('message') or parsed.get('error') or 'OK'}")
            except Exception as pe:
                print(f"[WARN] {label} -> Status: {status}, Response not JSON: {body[:80]}")
    except Exception as e:
        print(f"[FAIL] {label} -> Exception: {e}")

print("=== STARTING BACKEND FUZZING & ERROR HANDLING TEST ===")

# Test 1: Empty POST body
send(None, "1. Empty Body")

# Test 2: Empty JSON object
send({}, "2. Empty JSON Object {}")

# Test 3: Invalid action
send({"action": "unknown_action_xyz"}, "3. Unknown Action")

# Test 4: Login with empty credentials
send({"action": "login", "username": "", "password": ""}, "4. Empty Login")

# Test 5: Login with SQL injection / XSS
send({"action": "login", "username": "' OR 1=1 --", "password": "\"/><script>"}, "5. SQL Injection / XSS Login")

# Test 6: Delete response with missing id
send({"action": "deleteResponse"}, "6. Delete without ID")

# Test 7: Delete response with non-existent ID
send({"action": "deleteResponse", "id": "PTV-NONEXISTENT-99999"}, "7. Delete non-existent ID")

# Test 8: Submit survey with completely null scores & XSS name
send({
    "action": "submit",
    "id": "PTV-FUZZ-001",
    "name": "<script>alert('XSS')</script>",
    "phone": "0901234567",
    "role": "Huynh trưởng",
    "unit": "Họ đạo \"Test\", Phường 1",
    "scores": None,
    "reasons": "Text reason instead of object",
    "avgScore": "invalid_number"
}, "8. Fuzz Survey (Null scores, text reasons, invalid avgScore)")

# Test 9: Clean up test survey PTV-FUZZ-001
send({"action": "deleteResponse", "id": "PTV-FUZZ-001"}, "9. Cleanup PTV-FUZZ-001")

print("=== BACKEND TESTING COMPLETE ===")

