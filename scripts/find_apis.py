import re

f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
c = f.read()
f.close()

# Find all Google API endpoints
urls = re.findall(r'https://[a-zA-Z\-]+\.googleapis\.com[^\s\'\"]+', c)
domains = set()
for u in urls:
    m = re.match(r'https://([a-zA-Z\-]+\.googleapis\.com)', u)
    if m:
        domains.add(m.group(1))

print("=== API Domains Used ===")
for d in sorted(domains):
    print(f"  {d}")

# Find API paths for more detail
print("\n=== API Paths ===")
paths = re.findall(r'(https://[a-zA-Z\-]+\.googleapis\.com/[^\s\'\"?]+)', c)
seen = set()
for p in paths:
    short = '/'.join(p.split('/')[:5])
    if short not in seen:
        seen.add(short)
        print(f"  {short}")

# Check for API key usage
print("\n=== API Key References ===")
key_refs = re.findall(r'key=\$?\{?([A-Za-z_]+)\}?', c)
for kr in set(key_refs):
    print(f"  key=${kr}")

# Check for texttospeech
if 'texttospeech' in c.lower():
    print("\n  ** Text-to-Speech API detected")
if 'imagen' in c.lower() or 'imagegeneration' in c.lower():
    print("  ** Imagen/Image Generation API detected")
if 'generativelanguage' in c.lower():
    print("  ** Generative Language API (Gemini) detected")
