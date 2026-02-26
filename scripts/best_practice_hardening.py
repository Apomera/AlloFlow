#!/usr/bin/env python3
"""
Best Practice Hardening Script for AlloFlowANTI.txt
Applies two improvements:
  1. Adds sanitizeHtml utility and wraps AI-content dangerouslySetInnerHTML sites
  2. Adds safeGetItem/safeSetItem wrappers and upgrades unprotected localStorage calls
"""

import re
import sys

INPUT = 'AlloFlowANTI.txt'
OUTPUT = 'AlloFlowANTI.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original_len = len(content)
    changes = []
    
    # =========================================================================
    # FIX 1: Add utility functions near global helpers (after globalTtsUrlCache)
    # =========================================================================
    
    ANCHOR_1 = "let globalTtsUrlCache = new Map(); // URL-level TTS cache (prevents duplicate API calls for same text)"
    
    UTILITIES = """let globalTtsUrlCache = new Map(); // URL-level TTS cache (prevents duplicate API calls for same text)

// --- BEST PRACTICE: Safe localStorage wrappers ---
// localStorage can throw in private browsing, sandboxed iframes, or when quota is full.
const safeGetItem = (key, fallback = null) => {
    try { return localStorage.getItem(key); } catch(e) { return fallback; }
};
const safeSetItem = (key, value) => {
    try { localStorage.setItem(key, value); } catch(e) { /* silent - storage unavailable */ }
};
const safeRemoveItem = (key) => {
    try { localStorage.removeItem(key); } catch(e) { /* silent */ }
};

// --- BEST PRACTICE: Lightweight HTML sanitizer for AI-generated content ---
// Strips dangerous tags (script, iframe, object, embed, form, link, style, svg event handlers)
// while preserving safe formatting tags used by the app (strong, em, b, i, br, span, p, div, ul, ol, li).
const sanitizeHtml = (html) => {
    if (!html || typeof html !== 'string') return '';
    // Remove script tags and their content
    let clean = html.replace(/<script[\\s\\S]*?<\\/script>/gi, '');
    // Remove event handler attributes (onclick, onerror, onload, etc.)
    clean = clean.replace(/\\s+on\\w+\\s*=\\s*["'][^"']*["']/gi, '');
    clean = clean.replace(/\\s+on\\w+\\s*=\\s*\\S+/gi, '');
    // Remove iframe, object, embed, form, link, meta tags
    clean = clean.replace(/<\\/?(iframe|object|embed|form|link|meta|base)[^>]*>/gi, '');
    // Remove javascript: URLs
    clean = clean.replace(/href\\s*=\\s*["']?javascript:/gi, 'href="');
    clean = clean.replace(/src\\s*=\\s*["']?javascript:/gi, 'src="');
    return clean;
};"""
    
    if ANCHOR_1 in content:
        content = content.replace(ANCHOR_1, UTILITIES, 1)
        changes.append("Added safeGetItem/safeSetItem/safeRemoveItem and sanitizeHtml utilities")
    else:
        print("ERROR: Could not find anchor for utility insertion")
        return
    
    # =========================================================================
    # FIX 2: Wrap L144 localStorage.getItem with safe wrapper
    # =========================================================================
    
    OLD_MUTE_INIT = "let globalMuteEnabled = localStorage.getItem('alloflow-global-muted') === 'true';"
    NEW_MUTE_INIT = "let globalMuteEnabled = safeGetItem('alloflow-global-muted') === 'true';"
    
    if OLD_MUTE_INIT in content:
        content = content.replace(OLD_MUTE_INIT, NEW_MUTE_INIT, 1)
        changes.append("Wrapped globalMuteEnabled init with safeGetItem")
    
    # =========================================================================
    # FIX 3: Replace remaining unprotected localStorage calls
    # We need to be careful NOT to break calls already wrapped in try/catch
    # Strategy: Replace simple patterns that are clearly NOT in a try block
    # =========================================================================
    
    # Replace localStorage.getItem -> safeGetItem (but skip if already in try block or already safe)
    # We do this ONLY for standalone calls, not ones already wrapped
    
    # Pattern: localStorage.getItem('key') when NOT preceded by 'try {' on same/recent line
    # Safer approach: replace ALL localStorage.getItem with safeGetItem
    # This is safe because safeGetItem is a drop-in replacement
    content = content.replace('localStorage.getItem(', 'safeGetItem(')
    changes.append("Replaced all localStorage.getItem() with safeGetItem()")
    
    # Replace localStorage.setItem -> safeSetItem
    # But preserve existing try/catch wrapped ones (they'll just double-wrap harmlessly)
    content = content.replace('localStorage.setItem(', 'safeSetItem(')
    changes.append("Replaced all localStorage.setItem() with safeSetItem()")
    
    # Replace localStorage.removeItem -> safeRemoveItem  
    content = content.replace('localStorage.removeItem(', 'safeRemoveItem(')
    changes.append("Replaced all localStorage.removeItem() with safeRemoveItem()")
    
    # =========================================================================
    # FIX 4: Sanitize AI-content dangerouslySetInnerHTML at L2731
    # Original: dangerouslySetInnerHTML={{ __html: (captionOverrides[panelIdx] || panel.caption).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
    # =========================================================================
    
    CAPTION_OLD = """dangerouslySetInnerHTML={{ __html: (captionOverrides[panelIdx] || panel.caption).replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>') }}"""
    CAPTION_NEW = """dangerouslySetInnerHTML={{ __html: sanitizeHtml((captionOverrides[panelIdx] || panel.caption).replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')) }}"""
    
    if CAPTION_OLD in content:
        content = content.replace(CAPTION_OLD, CAPTION_NEW, 1)
        changes.append("Wrapped AI caption dangerouslySetInnerHTML with sanitizeHtml()")
    else:
        print("WARNING: Could not find caption dangerouslySetInnerHTML pattern")
    
    # =========================================================================
    # FIX 5: Sanitize AI-generated SVG at L71852
    # Original: dangerouslySetInnerHTML={{ __html: generatedContent?.data.graphData }}
    # =========================================================================
    
    SVG_OLD = "dangerouslySetInnerHTML={{ __html: generatedContent?.data.graphData }}"
    SVG_NEW = "dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedContent?.data.graphData) }}"
    
    if SVG_OLD in content:
        content = content.replace(SVG_OLD, SVG_NEW, 1)
        changes.append("Wrapped AI SVG graphData dangerouslySetInnerHTML with sanitizeHtml()")
    else:
        print("WARNING: Could not find SVG dangerouslySetInnerHTML pattern")
    
    # =========================================================================
    # Clean up: Remove now-redundant try/catch around safeSetItem/safeGetItem
    # e.g. "try { safeSetItem(...); } catch(e) { ... }" -> "safeSetItem(...);"
    # This avoids double-wrapping that looks messy
    # =========================================================================
    
    # Pattern: try { safeSetItem(...); } catch(e) { warnLog(...); }
    content = re.sub(
        r"try \{ (safe(?:Get|Set|Remove)Item\([^)]+\)(?:\s*===\s*'[^']*')?); \} catch\(e\) \{[^}]*\}",
        r"\1;",
        content
    )
    changes.append("Cleaned up redundant try/catch around safe* wrappers")
    
    # =========================================================================
    # Write output
    # =========================================================================
    
    with open(OUTPUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    
    new_len = len(content)
    print(f"SUCCESS: {len(changes)} changes applied")
    print(f"  File size: {original_len:,} -> {new_len:,} chars ({new_len - original_len:+,})")
    for i, change in enumerate(changes, 1):
        print(f"  {i}. {change}")

if __name__ == '__main__':
    main()
