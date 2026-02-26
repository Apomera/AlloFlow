"""Fix HELP_STRINGS loading: eager load at startup + remove shadowing local."""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = ''.join(lines)

# ── Change 1: Add HELP_STRINGS declaration + fetch to the UI_STRINGS IIFE ──
# Insert `let HELP_STRINGS = {};` after `let UI_STRINGS = {};`
# and add the help_strings fetch block before the closing `})();`

old1 = 'let UI_STRINGS = {};\n(async () => {'
new1 = 'let UI_STRINGS = {};\nlet HELP_STRINGS = {};\n(async () => {'

count1 = content.count(old1)
assert count1 == 1, f"Expected 1 occurrence of UI_STRINGS init, found {count1}"
content = content.replace(old1, new1, 1)
print("Change 1a: Added `let HELP_STRINGS = {};` declaration")

# Now insert the HELP_STRINGS fetch block before the closing })();
# The IIFE currently ends with:
#   }
# })();
# We need to insert the help fetch after the UI_STRINGS catch block

old_end = """  } catch (e) {
    console.warn("UI_STRINGS fetch failed, using cache or defaults:", e.message);
  }
})();"""

new_end = """  } catch (e) {
    console.warn("UI_STRINGS fetch failed, using cache or defaults:", e.message);
  }
  try {
    const hsCached = localStorage.getItem("alloflow_help_strings_cache");
    if (hsCached) { HELP_STRINGS = JSON.parse(hsCached); }
    const hsResp = await fetch("https://raw.githubusercontent.com/Apomera/AlloFlow/main/help_strings.js");
    if (hsResp.ok) {
      const hsText = await hsResp.text();
      HELP_STRINGS = new Function("return " + hsText)();
      try { localStorage.setItem("alloflow_help_strings_cache", JSON.stringify(HELP_STRINGS)); } catch {}
    }
  } catch (e) {
    console.warn("HELP_STRINGS fetch failed, using cache or defaults:", e.message);
  }
})();"""

count_end = content.count(old_end)
assert count_end >= 1, f"Expected >= 1 occurrence of IIFE end, found {count_end}"
# Replace only the first occurrence (the UI_STRINGS IIFE)
content = content.replace(old_end, new_end, 1)
print("Change 1b: Added HELP_STRINGS eager fetch block")

# ── Change 2: Remove shadowing local HELP_STRINGS + dead loadHelpStrings() ──

old_local = """  let HELP_STRINGS = {};
  const loadHelpStrings = async () => {
    if (Object.keys(HELP_STRINGS).length > 0) return HELP_STRINGS;
    try {
      const cached = localStorage.getItem('alloflow_help_strings_cache');
      if (cached) { HELP_STRINGS = JSON.parse(cached); return HELP_STRINGS; }
      const resp = await fetch('https://raw.githubusercontent.com/Apomera/AlloFlow/main/help_strings.js');
      if (resp.ok) {
        const text = await resp.text();
        const fn = new Function('return ' + text);
        HELP_STRINGS = fn();
        try { localStorage.setItem('alloflow_help_strings_cache', JSON.stringify(HELP_STRINGS)); } catch {}
      }
    } catch (e) {
      console.warn('HELP_STRINGS fetch failed:', e.message);
    }
    return HELP_STRINGS;
  };"""

count2 = content.count(old_local)
assert count2 == 1, f"Expected 1 occurrence of local HELP_STRINGS, found {count2}"
content = content.replace(old_local, '', 1)
print("Change 2: Removed shadowing local HELP_STRINGS + loadHelpStrings()")

with open(FILE, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("All changes applied successfully!")
