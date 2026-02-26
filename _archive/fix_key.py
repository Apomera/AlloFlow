filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The span wrapper needs the key, and ImmersiveWord should not have it
old = """                                            return (
                                                <span data-sentence-idx={assignedIdx} style={isChunkDimmed ? { opacity: 0.2, transition: 'opacity 0.3s' } : isChunkHighlight ? { opacity: 1, transition: 'opacity 0.3s' } : {}}>
                                                <ImmersiveWord
                                                    key={wordData.id || i}"""

new = """                                            return (
                                                <span key={wordData.id || i} data-sentence-idx={assignedIdx} style={isChunkDimmed ? { opacity: 0.2, transition: 'opacity 0.3s' } : isChunkHighlight ? { opacity: 1, transition: 'opacity 0.3s' } : {}}>
                                                <ImmersiveWord"""

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed: moved key prop from ImmersiveWord to wrapping span")
else:
    print("Pattern not found")
