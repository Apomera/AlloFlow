"""Extract probe/benchmark word lists from the monolith - output to file."""
import re, json

with open("AlloFlowANTI.txt", "r", encoding="utf-8") as f:
    text = f.read()

results = []

# 1. Find CBM-related code
results.append("=== CBM / DIBELS References ===")
for m in re.finditer(r"CBM|DIBELS|showCBM|ShowCBM", text):
    start = max(0, m.start() - 100)
    end = min(len(text), m.end() + 250)
    chunk = text[start:end].replace("\n", " ")[:350]
    results.append(f"  @{m.start()}: {chunk}")

# 2. Find all word arrays
results.append("\n=== Word Arrays ===")
word_arrays_data = []
for m in re.finditer(r"""\[(?:\s*['"][a-z]{2,6}['"]\s*,\s*){3,}""", text):
    end_pos = m.end()
    bracket_depth = 1
    while end_pos < len(text) and bracket_depth > 0:
        if text[end_pos] == "[": bracket_depth += 1
        elif text[end_pos] == "]": bracket_depth -= 1
        end_pos += 1
    array_text = text[m.start():min(end_pos, m.start() + 2000)]
    words = re.findall(r"""['"]([a-z]{2,8})['"]""", array_text)
    ctx_before = text[max(0, m.start() - 120):m.start()].replace("\n", " ").strip()
    if len(words) >= 3:
        word_arrays_data.append({
            "pos": m.start(),
            "context": ctx_before[-100:],
            "words": words,
            "count": len(words)
        })
        results.append(f"\n  Array @{m.start()} ({len(words)} words)")
        results.append(f"  Context: ...{ctx_before[-100:]}")
        results.append(f"  Words: {words[:40]}")

# 3. Word Sounds specific patterns
results.append("\n=== Word Sounds Activity Patterns ===")
for pat in ["wordSoundsCategory", "currentCategory", "selectedCategory", "setWordSoundsWords", "wordSoundsWords"]:
    hits = [(m.start(), text[max(0,m.start()-40):min(len(text),m.end()+120)].replace("\n"," ")[:200]) for m in re.finditer(pat, text)]
    if hits:
        results.append(f"  {pat}: {len(hits)} hits")
        for pos, ctx in hits[:3]:
            results.append(f"    @{pos}: {ctx}")

# 4. Phonics category/family labels
results.append("\n=== Phonics Categories ===")
for m in re.finditer(r"""['"](?:short|long|blend|digraph|r-controlled|diphthong|silent)[_ ][a-z]+['"]""", text, re.IGNORECASE):
    start = max(0, m.start() - 30)
    end = min(len(text), m.end() + 60)
    ctx = text[start:end].replace("\n", " ")[:120]
    results.append(f"  @{m.start()}: {ctx}")

# 5. Summary
all_words = set()
for wa in word_arrays_data:
    all_words.update(wa["words"])
results.append(f"\n=== SUMMARY ===")
results.append(f"Total word arrays found: {len(word_arrays_data)}")
results.append(f"Total unique words: {len(all_words)}")
results.append(f"All unique words: {sorted(all_words)}")

output = "\n".join(results)
with open("scripts/probe_analysis_output.txt", "w", encoding="utf-8") as f:
    f.write(output)
print(f"Written {len(results)} lines to scripts/probe_analysis_output.txt")
