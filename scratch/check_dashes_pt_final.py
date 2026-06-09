with open('stem_lab/stem_tool_platetectonics.js', 'r', encoding='utf-8') as f:
    text = f.read()

em_dash = '—'
en_dash = '–'
escaped_em = '\\u2014'
escaped_en = '\\u2013'

occurrences = []

if em_dash in text:
    occurrences.append(f"Literal em-dash found! count: {text.count(em_dash)}")
if en_dash in text:
    occurrences.append(f"Literal en-dash found! count: {text.count(en_dash)}")
if escaped_em in text:
    occurrences.append(f"Escaped em-dash found! count: {text.count(escaped_em)}")
if escaped_en in text:
    occurrences.append(f"Escaped en-dash found! count: {text.count(escaped_en)}")

if occurrences:
    for o in occurrences:
        print(o)
else:
    print("Zero dashes found! The file is clean.")
