import re

f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
data = f.read()
f.close()

# Find the loadModule function
idx = data.find('const loadModule = (name, url) => {')
if idx == -1:
    print('loadModule not found!')
    exit(1)

# Find the end of the loadModule function (next };)
end_search = data[idx:]
# Find the loadModule block and its closing
block_start = idx
# Find where the function body starts
brace_pos = data.index('{', idx)
depth = 0
i = brace_pos
while i < len(data):
    if data[i] == '{':
        depth += 1
    elif data[i] == '}':
        depth -= 1
        if depth == 0:
            block_end = i + 1
            # Include the trailing semicolon if present
            if block_end < len(data) and data[block_end] == ';':
                block_end += 1
            break
    i += 1

old_func = data[block_start:block_end]
print("Found loadModule function:")
print(repr(old_func[:200]))
print("...")
print(repr(old_func[-100:]))

new_func = '''const loadModule = (name, url) => {
      console.log('[CDN] Attempting to load ' + name + ' from: ' + url);
      const prevOnError = window.onerror;
      window.onerror = function(msg, src, line, col, err) {
        console.error('[CDN-ERROR] ' + name + ': ' + msg);
        console.error('[CDN-ERROR] Source: ' + src + ' Line: ' + line + ' Col: ' + col);
        if (err && err.stack) console.error('[CDN-STACK] ' + err.stack);
        window.onerror = prevOnError;
        return false;
      };
      const s = document.createElement('script');
      s.src = url;
      s.crossOrigin = "anonymous";
      s.onload = () => {
        const found = window.AlloModules && window.AlloModules[name];
        console.log('[CDN] ' + name + ' script executed. Registration: ' + (found ? 'SUCCESS' : 'FAILED'));
        if (!found) {
          console.error('[CDN] ' + name + ' loaded but NOT registered on window.AlloModules!');
          console.error('[CDN] window.AlloModules keys:', Object.keys(window.AlloModules || {}));
        }
        window.onerror = prevOnError;
      };
      s.onerror = (e) => {
        console.error('[CDN-FAIL] ' + name + ' network/CORS error:', e);
        window.onerror = prevOnError;
      };
      document.head.appendChild(s);
    };'''

data = data[:block_start] + new_func + data[block_end:]

with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'w', encoding='utf-8') as out:
    out.write(data)
print('\nUpdated loadModule with detailed error logging')
