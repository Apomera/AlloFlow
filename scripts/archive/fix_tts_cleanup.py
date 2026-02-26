"""Clean up remaining minor issues in fetchTTSBytes"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# Fix duplicate throw err
old1 = '          throw err; // Propagate error so callTTS retry logic fires\n          throw err;'
new1 = '          throw err; // Propagate error so callTTS retry logic fires'
old1_crlf = old1.replace('\n', '\r\n')
new1_crlf = new1.replace('\n', '\r\n')

if old1_crlf in content:
    content = content.replace(old1_crlf, new1_crlf)
    changes += 1
    print('Fixed: duplicate throw err')
elif old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print('Fixed: duplicate throw err (LF)')
else:
    print('Not found: duplicate throw')

# Fix quota catch returning null instead of throwing
old2 = '            return null; // Signal: use browser fallback'
new2 = '            throw new Error("TTS quota exhausted");'
if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print('Fixed: quota catch return null -> throw')
else:
    print('Not found: quota catch null')

# Clean orphaned comment
old3 = '           // Reset failure count on success\r\n'
if old3 in content:
    content = content.replace(old3, '')
    changes += 1
    print('Fixed: orphaned comment')
else:
    old3b = '           // Reset failure count on success\n'
    if old3b in content:
        content = content.replace(old3b, '')
        changes += 1
        print('Fixed: orphaned comment (LF)')
    else:
        print('Not found: orphaned comment')

open('AlloFlowANTI.txt', 'w', encoding='utf-8').write(content)
print(f'Total: {changes}')
