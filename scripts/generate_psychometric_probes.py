import re
import json

# 1. Extract BENCHMARK_PROBE_BANKS from AlloFlowANTI.txt
print("Extracting BENCHMARK_PROBE_BANKS...")
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'const BENCHMARK_PROBE_BANKS = (\{.*?\});(?s:[\s\S]*?)const ', text, re.DOTALL)
if not m:
    # Try an alternative regex if the first fails
    m = re.search(r'const BENCHMARK_PROBE_BANKS = (\{.*?\});\n', text, re.DOTALL)

if not m:
    print("Failed to extract BENCHMARK_PROBE_BANKS!")
    exit(1)

benchmark_banks_str = m.group(1)

# 2. Extract and format ORF_SCREENING_PASSAGES from orf_probes.json
print("Formatting ORF_SCREENING_PASSAGES...")
with open('orf_probes.json', 'r', encoding='utf-8') as f:
    orf_data = json.load(f)

# The target format is a JS object mapping Grade -> Form/Season -> Passages
# E.g., ORF_SCREENING_PASSAGES = { "K": { "A": { ... } }, "1": { ... } }
# Since the JSON is an array of probes, let's process it.

orf_passages = {}
for probe in orf_data.get('probes', []):
    grade = probe.get('grade')
    
    # orf_probes.json has 'season' (Fall, Winter, Spring). We map these to Forms A, B, C to match the phonics banks.
    season = probe.get('season')
    form_map = {'Fall': 'A', 'Winter': 'B', 'Spring': 'C'}
    form = form_map.get(season, 'A') # Default to A if not found
    
    if grade not in orf_passages:
        orf_passages[grade] = {}
        
    if form not in orf_passages[grade]:
        orf_passages[grade][form] = []
        
    orf_passages[grade][form].append(probe)

# Convert the python dict to a formatted JSON string
orf_passages_json = json.dumps(orf_passages, indent=4)

# Convert JSON array formatting back into valid JS object keys without quotes where possible
# but for safety, leaving as valid JSON is fine since it's valid JS.

# 3. Create psychometric_probes.js
print("Creating psychometric_probes.js...")
output_js = f"""// PSYCHOMETRIC PROBE BANKS
// This unified file contains the developmentally sequenced assessment battery for the AlloFlow Screener.
// Includes Phonics/Phonemic Awareness Probes (Grades K-5) and Oral Reading Fluency Passages (Grades 1-5).
// Hosted on GitHub CDN to maintain monolith performance constraints.

window.BENCHMARK_PROBE_BANKS = {benchmark_banks_str};

window.ORF_SCREENING_PASSAGES = {orf_passages_json};

"""

with open('psychometric_probes.js', 'w', encoding='utf-8') as f:
    f.write(output_js)

print("psychometric_probes.js generated successfully!")
