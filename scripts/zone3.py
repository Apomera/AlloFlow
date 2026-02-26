"""Zone 3: Content Generation & AI (L15001-45000) - Deep analysis"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8',errors='replace').readlines()
zone = lines[15000:45000]
z = ''.join(zone)

print("=== ZONE 3: CONTENT GENERATION & AI (L15001-45000) ===")

# AI generation patterns
print("\n--- AI Generation ---")
print(f"  generateContent: {z.count('generateContent')}")
print(f"  streamGenerateContent: {z.count('streamGenerateContent')}")
print(f"  JSON.parse(response): {z.count('JSON.parse')}")
print(f"  response_mime_type: {z.count('response_mime_type')}")
print(f"  application/json: {z.count('application/json')}")
print(f"  system_instruction: {z.count('system_instruction')}")
print(f"  responseMimeType: {z.count('responseMimeType')}")

# Content types generated
print("\n--- Content Generation Functions ---")
gen_fns = []
for i, l in enumerate(zone):
    s = l.strip()
    if (s.startswith('const handle') or s.startswith('const generate') or s.startswith('async function handle')) and '=' in s:
        name = s.split('=')[0].replace('const ','').strip() if '=' in s else s.split('(')[0].replace('async function ','').strip()
        if 'generat' in name.lower() or 'create' in name.lower() or 'fetch' in name.lower():
            gen_fns.append((i+15001, name))
print(f"  Generation functions found: {len(gen_fns)}")
for ln, name in gen_fns[:20]:
    print(f"    L{ln}: {name}")

# Prompts & AI schema
print("\n--- AI Prompt Engineering ---")
print(f"  System prompts (You are): {z.count('You are')}")
print(f"  JSON schema defs: {z.count('type: ')}")
print(f"  Temperature settings: {z.count('temperature')}")
print(f"  maxOutputTokens: {z.count('maxOutputTokens')}")

# Localization
print("\n--- Localization ---")
print(f"  UI_STRINGS: {z.count('UI_STRINGS')}")
t_single = z.count("t('")
t_double = z.count('t("')
print(f"  t() calls: {t_single + t_double}")
print(f"  LanguageContext: {z.count('LanguageContext')}")

# Error handling in AI calls
print("\n--- Error Handling ---")
print(f"  try blocks: {sum(1 for l in zone if 'try {' in l or 'try{' in l)}")
print(f"  catch blocks: {sum(1 for l in zone if 'catch(' in l)}")
print(f"  API Error: {z.count('API Error') + z.count('apiError')}")
print(f"  retry/Retry: {z.count('retry') + z.count('Retry')}")
print(f"  toast/notification: {z.count('toast') + z.count('Toast')}")

# Components
comps = [(i+15001, l.strip().split('=')[0].replace('const ','').strip()) 
         for i, l in enumerate(zone) if '= React.memo(' in l and l.strip().startswith('const ')]
print(f"\n--- Components: {len(comps)} ---")
for ln, name in comps:
    print(f"  L{ln}: {name}")

# State vars
states = sum(1 for l in zone if 'useState(' in l and 'const [' in l)
effects = sum(1 for l in zone if 'useEffect(' in l)
callbacks = sum(1 for l in zone if 'useCallback(' in l)
print(f"\n--- Hooks ---")
print(f"  useState: {states}, useEffect: {effects}, useCallback: {callbacks}")
