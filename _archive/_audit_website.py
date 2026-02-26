import re, sys

def extract_text_content(html):
    text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

output = []

def log(s):
    output.append(s)
    
def extract_sections(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    log(f"\n{'='*60}")
    log(f"FILE: {filepath.split(chr(92))[-1]}")
    log(f"{'='*60}")
    
    comments = re.findall(r'<!--\s*(.+?)\s*-->', content)
    log(f"\nSection Comments:")
    for c in comments:
        if len(c) < 60:
            log(f"  • {c}")
    
    headings = re.findall(r'<h([1-4])[^>]*>(.*?)</h\1>', content, re.DOTALL)
    log(f"\nHeadings:")
    for level, text in headings:
        clean = extract_text_content(text).strip()
        if clean:
            log(f"  H{level}: {clean[:120]}")
    
    section_ids = re.findall(r'<section[^>]*id="([^"]+)"', content)
    log(f"\nSection IDs: {section_ids}")
    
    card_titles = re.findall(r'font-weight:700[^>]*>\s*(?:<i[^>]*>[^<]*</i>\s*)?(.*?)</div>', content, re.DOTALL)
    log(f"\nCard Titles ({len(card_titles)}):")
    for t in card_titles:
        clean = extract_text_content(t).strip()
        if clean and len(clean) > 2:
            log(f"  📦 {clean[:100]}")
    
    keywords = [
        'youtube', 'transcript', 'url import', 'jina', 'ocr', 'image-to-text',
        'gemini bridge', 'sandbox', 'code sandbox',
        'grading', 'mastery check', 'standards alignment',
        'oral reading', 'orf', 'wcpm', 'rti', 'mtss', 'benchmark', 'progress monitoring',
        'blueprint', 'adaptation studio', 'report profile', 'adaptation',
        'dialogue mode', 'multi-chunk',
        'conflict resolution', 'wellness', 'parent wellness',
        'word sounds', 'phonics', 'phoneme', 'blend', 'rhyme', 'isolation',
        'letter tracing', 'sound sort', 'word families',
        'immersive reader', 'dyslexia', 'opendyslexic', 'reading ruler',
        'adventure', 'rpg', 'branching',
        'escape room', 'boss battle', 'bingo', 'crossword', 'jeopardy',
        'student portal', 'codename', 'gate code',
        'privacy', 'open-source', 'no account', 'no login',
        'democracy mode', 'live group', 'differentiation', 'leveled text',
        'read aloud', 'text-to-speech', 'tts',
        'csv export', 'gradebook', 'analytics',
        'venn diagram', 'graphic organizer', 'cause and effect',
        'quiz', 'assessment', 'multiple choice',
        'lesson plan', 'lesson seed',
        'socratic', 'persona chat', 'debate',
        'ai search', 'grounding',
        'qr code', 'share link',
    ]
    
    content_lower = content.lower()
    found = []
    missing = []
    for kw in keywords:
        if kw in content_lower:
            found.append(kw)
        else:
            missing.append(kw)
    
    log(f"\nKeyword Coverage:")
    log(f"  FOUND ({len(found)}):")
    for kw in sorted(found):
        log(f"    ✅ {kw}")
    log(f"  MISSING ({len(missing)}):")
    for kw in sorted(missing):
        log(f"    ❌ {kw}")

extract_sections(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\website\index.html')
extract_sections(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\website\features.html')

with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\_website_audit_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))
print(f'Wrote {len(output)} lines to _website_audit_results.txt')
