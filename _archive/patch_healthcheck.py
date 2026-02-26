"""Apply both fixes: TTS warmup error handling + source text meta-commentary cleanup."""
import sys

filepath = 'AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

fixes_applied = 0

# ─── FIX 1a: Add .catch() to callTTS in warmup loop ─────────────────
old1a = "if (typeof callTTS === 'function') { const url = await callTTS(term, selectedVoice, 1, 1); if (url) glossaryAudioCache.current.set(term, url); }"
new1a = "if (typeof callTTS === 'function') { const url = await callTTS(term, selectedVoice, 1, 1).catch(e => { console.warn('Pre-warm TTS skipped:', term, e.message); return null; }); if (url) glossaryAudioCache.current.set(term, url); }"

if old1a in content:
    content = content.replace(old1a, new1a, 1)
    fixes_applied += 1
    print("Fix 1a (callTTS .catch in warmup loop): APPLIED")
elif new1a in content:
    print("Fix 1a: ALREADY APPLIED")
else:
    print("Fix 1a WARNING: pattern not found")

# ─── FIX 1b: Add .catch() to fire-and-forget executeGlossaryWarmup ──
old1b = "console.log('PATCH-VER-01'); executeGlossaryWarmup();"
new1b = "console.log('PATCH-VER-02'); executeGlossaryWarmup().catch(e => console.warn('Glossary warmup error (suppressed):', e.message));"

if old1b in content:
    content = content.replace(old1b, new1b, 1)
    fixes_applied += 1
    print("Fix 1b (fire-and-forget .catch): APPLIED")
elif 'PATCH-VER-02' in content:
    print("Fix 1b: ALREADY APPLIED")
else:
    print("Fix 1b WARNING: pattern not found")

# ─── FIX 2: Add cleanSourceMetaCommentary function ───────────────────
# Insert the function near the top of handleGenerateSource
func_code = '''
    // --- Source Text Meta-Commentary Cleanup ---
    const cleanSourceMetaCommentary = (text) => {
        if (!text) return text;
        let cleaned = text;
        // Remove italicized meta-notes: *(Word Count: ...)*  or  *(Note: ...)*
        cleaned = cleaned.replace(/\\n*\\s*\\*\\((?:Word Count|Note|Target|Revised|Total)[^)]{5,}\\)\\*\\s*\\n*/gi, '\\n');
        // Remove "### Revised Content" duplicate markers and keep only the final version
        const revisedMatch = cleaned.match(/^(###?\\s*Revised\\s+(?:Content|Version)[^\\n]*\\n)/mi);
        if (revisedMatch) {
            const revisedIdx = cleaned.indexOf(revisedMatch[0]);
            if (revisedIdx > 0) {
                // Keep only the revised version (after the heading), remove the heading itself
                cleaned = cleaned.substring(revisedIdx + revisedMatch[0].length);
            }
        }
        // Remove meta-reasoning lines (Gemini thinking out loud)
        cleaned = cleaned.replace(/^(?:Note that |The research confirms |I (?:will|must|should) (?:now )?(?:write|increase|revise|ensure)|This (?:is|meets|exceeds) (?:within|significantly|the target)|Aiming for \\d+ words)[^\\n]*\\n*/gmi, '');
        // Remove horizontal rules used as section dividers for meta-notes
        cleaned = cleaned.replace(/\\n---\\n\\s*\\n/g, '\\n\\n');
        // Collapse excessive blank lines
        cleaned = cleaned.replace(/\\n{4,}/g, '\\n\\n\\n');
        return cleaned.trim();
    };
'''

if 'cleanSourceMetaCommentary' not in content:
    # Insert before handleGenerateSource
    anchor = 'const handleGenerateSource = async (overrides = {}, switchView = true) => {'
    if anchor in content:
        idx = content.index(anchor)
        content = content[:idx] + func_code + '\n  ' + content[idx:]
        fixes_applied += 1
        print("Fix 2a (cleanSourceMetaCommentary function): ADDED")
    else:
        print("Fix 2a WARNING: handleGenerateSource anchor not found")
else:
    print("Fix 2a: ALREADY PRESENT")

# ─── FIX 2b: Apply cleanup to single-section output ─────────────────
# Before setInputText(text) at the end of handleGenerateSource
old2b = "      setInputText(text);\n      setShowSourceGen(false);\n    } catch (err) {"
new2b = "      text = cleanSourceMetaCommentary(text);\n      setInputText(text);\n      setShowSourceGen(false);\n    } catch (err) {"

if old2b in content and 'cleanSourceMetaCommentary(text)' not in content.split('setShowSourceGen(false)')[0]:
    content = content.replace(old2b, new2b, 1)
    fixes_applied += 1
    print("Fix 2b (single-section cleanup call): APPLIED")
elif 'cleanSourceMetaCommentary(text)' in content:
    print("Fix 2b: ALREADY APPLIED")
else:
    # Try to find it with a broader search
    print("Fix 2b WARNING: exact pattern not found, trying alternative")
    # Search for the setInputText near end of handleGenerateSource
    marker = "setInputText(text);\n      setShowSourceGen(false);"
    if marker in content:
        idx = content.index(marker)
        # Check context - make sure this is in handleGenerateSource
        nearby = content[max(0, idx-500):idx]
        if 'sanitizeRawUrls' in nearby or 'isDialogueMode' in nearby:
            content = content.replace(marker, "text = cleanSourceMetaCommentary(text);\n      setInputText(text);\n      setShowSourceGen(false);", 1)
            fixes_applied += 1
            print("Fix 2b (single-section cleanup call): APPLIED (alt)")

# ─── FIX 2c: Apply cleanup to multi-section output ──────────────────
old2c_marker = "setInputText(fullDocument);\n            setShowSourceGen(false);"
if old2c_marker in content:
    idx = content.index(old2c_marker)
    nearby = content[max(0, idx-500):idx]
    if 'Multi-chunk citation' in nearby or 'allGroundingChunks' in nearby:
        if 'cleanSourceMetaCommentary(fullDocument)' not in content:
            content = content.replace(old2c_marker, 
                "fullDocument = cleanSourceMetaCommentary(fullDocument);\n            setInputText(fullDocument);\n            setShowSourceGen(false);", 1)
            fixes_applied += 1
            print("Fix 2c (multi-section cleanup call): APPLIED")
        else:
            print("Fix 2c: ALREADY APPLIED")
    else:
        print("Fix 2c: Found marker but wrong context")
else:
    print("Fix 2c WARNING: multi-section pattern not found")

# ─── Write ────────────────────────────────────────────────────────────
if fixes_applied > 0:
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print(f"\n✅ {fixes_applied} fix(es) written to {filepath}")
else:
    print("\nNo changes needed")

# ─── Verify ──────────────────────────────────────────────────────────
with open(filepath, 'r', encoding='utf-8') as f:
    verify = f.read()

checks = {
    "TTS warmup .catch": ".catch(e => { console.warn('Pre-warm TTS skipped:" in verify,
    "Fire-and-forget .catch": "PATCH-VER-02" in verify,
    "cleanSourceMetaCommentary func": "const cleanSourceMetaCommentary" in verify,
    "Single-section cleanup": "cleanSourceMetaCommentary(text)" in verify,
    "Multi-section cleanup": "cleanSourceMetaCommentary(fullDocument)" in verify,
}

all_ok = True
for label, ok in checks.items():
    status = "✓" if ok else "✗"
    print(f"  {status} {label}")
    if not ok: all_ok = False

if all_ok:
    print("\n✅ All fixes verified!")
else:
    print("\n⚠️ Some checks failed")
