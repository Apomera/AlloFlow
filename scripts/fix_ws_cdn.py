import re
f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
c = f.read()
f.close()
old = 'AlloFlow@master/word_sounds_module.js'
new_url = 'AlloFlow@4613cce/word_sounds_module.js'
if old in c:
    c = c.replace(old, new_url)
    print('WordSounds CDN updated to @4613cce')
else:
    print('NOT FOUND - checking for existing pinned URL')
    import re as re2
    m = re2.search(r'AlloFlow@[^/]+/word_sounds_module\.js', c)
    if m:
        print('Found:', m.group())
        c = re2.sub(r'AlloFlow@[^/]+/word_sounds_module\.js', new_url, c)
        print('Updated to @4613cce')
f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'w', encoding='utf-8')
f.write(c)
f.close()
