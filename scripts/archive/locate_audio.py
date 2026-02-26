
import os

def find_lines(filepath, search_terms):
    results = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            for term in search_terms:
                if term in line:
                    if term not in results:
                        results[term] = []
                    # Store line number and truncated content
                    content = line.strip()[:100]
                    results[term].append(f"Line {i+1}: {content}")
    return results

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
terms = ['_LOAD_INSTRUCTION_AUDIO_RAW', 'fb_amazing', 'INSTRUCTION_AUDIO =']
matches = find_lines(filepath, terms)

for term in terms:
    print(f"Matches for '{term}':")
    if term in matches:
        for match in matches[term]:
            print(f"  {match}")
    else:
        print("  None")
