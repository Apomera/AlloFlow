import urllib.request, json, re

# Get the latest commit SHA
url = 'https://api.github.com/repos/Apomera/AlloFlow/commits/main'
req = urllib.request.Request(url, headers={'User-Agent': 'AlloFlow'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read().decode('utf-8'))
sha = data['sha']
print(f'Commit SHA: {sha}')

# Update AlloFlowANTI.txt
f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
content = f.read()
f.close()

# Replace @main with @<sha> in the loadModule URLs
# Match any existing @main or @<sha> or @main?v=N patterns
old_pattern = r"(https://cdn\.jsdelivr\.net/gh/Apomera/AlloFlow)@[a-zA-Z0-9]+(/(?:stem_lab|word_sounds)_module\.js)(\?v=\d+)?"
new_repl = rf"\1@{sha}\2"

result = re.sub(old_pattern, new_repl, content)

count = content.count('@main/stem_lab') + content.count('@main/word_sounds')
count2 = content.count(f'@{sha}')
print(f'Found @main refs: {count}')

with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'w', encoding='utf-8') as out:
    out.write(result)

# Verify
f2 = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
verify = f2.read()
f2.close()
matches = re.findall(r'loadModule\([^)]+\)', verify)
for m in matches:
    print(f'  {m[:120]}')
print('Done!')
