import ast
with open("/home/suraj/ussd-app/app.py") as f:
    src = f.read()
try:
    ast.parse(src)
    print("syntax ok")
except SyntaxError as e:
    print(f"SYNTAX ERROR: {e}")

# Also check routes
import re
routes = re.findall(r'@app\.route\("([^"]+)"', src)
print(f"Routes found: {routes}")
