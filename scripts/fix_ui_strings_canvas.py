"""
Fix UI_STRINGS not loading in Canvas.

Root cause: Canvas CSP blocks `new Function()` (eval-like).
Fix: 
1. Add cache-busting parameter to GitHub fetch URL
2. Replace `new Function("return " + text)` with JSON.parse()
   - The ui_strings.js file should be JSON-compatible or we need to handle JS object syntax
3. Add better error logging
4. Same fix for HELP_STRINGS
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

fixes = []

# FIX 1: Replace the entire UI_STRINGS fetch block with CSP-safe version + cache-busting
old_ui_fetch = '''const resp = await fetch("https://raw.githubusercontent.com/Apomera/AlloFlow/main/ui_strings.js");
    if (resp.ok) {
      const text = await resp.text();
      const fn = new Function("return " + text);
      UI_STRINGS = fn();
      try { localStorage.setItem("alloflow_ui_strings_cache", JSON.stringify(UI_STRINGS)); } catch {}
    }'''

new_ui_fetch = '''const resp = await fetch("https://raw.githubusercontent.com/Apomera/AlloFlow/main/ui_strings.js?v=" + Date.now());
    if (resp.ok) {
      const text = await resp.text();
      try {
        // Try JSON.parse first (CSP-safe, works in Canvas)
        UI_STRINGS = JSON.parse(text);
      } catch {
        try {
          // Fallback: try new Function for non-Canvas environments
          UI_STRINGS = new Function("return " + text)();
        } catch (evalErr) {
          console.warn("UI_STRINGS: new Function blocked (CSP), trying manual parse...", evalErr.message);
          // Manual parse: strip leading/trailing whitespace and try treating as JSON with relaxed parsing
          const cleaned = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '').replace(/'/g, '"').replace(/,\\s*}/g, '}').replace(/,\\s*]/g, ']');
          try { UI_STRINGS = JSON.parse(cleaned); } catch { console.error("UI_STRINGS: All parse methods failed"); }
        }
      }
      if (UI_STRINGS && Object.keys(UI_STRINGS).length > 0) {
        try { localStorage.setItem("alloflow_ui_strings_cache", JSON.stringify(UI_STRINGS)); } catch {}
        console.log("[AlloFlow] UI_STRINGS loaded:", Object.keys(UI_STRINGS).length, "top-level keys");
      }
    } else {
      console.warn("[AlloFlow] UI_STRINGS fetch failed with status:", resp.status);
    }'''

if old_ui_fetch in content:
    content = content.replace(old_ui_fetch, new_ui_fetch)
    fixes.append("Fixed UI_STRINGS: added cache-busting, CSP-safe JSON.parse with fallback chain")
else:
    fixes.append("WARNING: Could not find UI_STRINGS fetch block")

# FIX 2: Same for HELP_STRINGS
old_help_fetch = '''const hsResp = await fetch("https://raw.githubusercontent.com/Apomera/AlloFlow/main/help_strings.js");
    if (hsResp.ok) {
      const hsText = (await hsResp.text()).replace(/^\\s*\\/\\/.*$/gm, '').trim();
      HELP_STRINGS = new Function("return " + hsText)();
      try { localStorage.setItem("alloflow_help_strings_cache", JSON.stringify(HELP_STRINGS)); } catch {}
    }'''

new_help_fetch = '''const hsResp = await fetch("https://raw.githubusercontent.com/Apomera/AlloFlow/main/help_strings.js?v=" + Date.now());
    if (hsResp.ok) {
      const hsText = (await hsResp.text()).replace(/^\\s*\\/\\/.*$/gm, '').trim();
      try {
        HELP_STRINGS = JSON.parse(hsText);
      } catch {
        try {
          HELP_STRINGS = new Function("return " + hsText)();
        } catch (evalErr) {
          console.warn("HELP_STRINGS: new Function blocked (CSP), trying manual parse...", evalErr.message);
          const hsCleaned = hsText.replace(/^[^{]*/, '').replace(/[^}]*$/, '').replace(/'/g, '"').replace(/,\\s*}/g, '}').replace(/,\\s*]/g, ']');
          try { HELP_STRINGS = JSON.parse(hsCleaned); } catch { console.error("HELP_STRINGS: All parse methods failed"); }
        }
      }
      if (HELP_STRINGS && Object.keys(HELP_STRINGS).length > 0) {
        try { localStorage.setItem("alloflow_help_strings_cache", JSON.stringify(HELP_STRINGS)); } catch {}
        console.log("[AlloFlow] HELP_STRINGS loaded:", Object.keys(HELP_STRINGS).length, "keys");
      }
    }'''

if old_help_fetch in content:
    content = content.replace(old_help_fetch, new_help_fetch)
    fixes.append("Fixed HELP_STRINGS: added cache-busting, CSP-safe JSON.parse with fallback chain")
else:
    fixes.append("WARNING: Could not find HELP_STRINGS fetch block")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied " + str(len(fixes)) + " fixes:")
for fix in fixes:
    print("  " + fix)
print("File size: " + str(len(content)))
