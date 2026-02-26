filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add data-sentence-idx, chunk reader highlight, and dimming on ImmersiveWord
old_word = """                                            return (
                                                <ImmersiveWord
                                                    key={wordData.id || i}
                                                    wordData={wordData}
                                                    settings={immersiveSettings}
                                                    isActive={isPlaying && playbackState.currentIdx === assignedIdx}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSpeak(generatedContent?.data, 'simplified-main', assignedIdx);
                                                    }}
                                                />"""

new_word = """                                            const isChunkHighlight = isChunkReaderActive && assignedIdx === chunkReaderIdx;
                                            const isChunkDimmed = isChunkReaderActive && assignedIdx !== chunkReaderIdx;
                                            return (
                                                <span data-sentence-idx={assignedIdx} style={isChunkDimmed ? { opacity: 0.2, transition: 'opacity 0.3s' } : isChunkHighlight ? { opacity: 1, transition: 'opacity 0.3s' } : {}}>
                                                <ImmersiveWord
                                                    key={wordData.id || i}
                                                    wordData={wordData}
                                                    settings={immersiveSettings}
                                                    isActive={(isPlaying && playbackState.currentIdx === assignedIdx) || isChunkHighlight}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isChunkReaderActive) { setChunkReaderIdx(assignedIdx); }
                                                        else { handleSpeak(generatedContent?.data, 'simplified-main', assignedIdx); }
                                                    }}
                                                />
                                                </span>"""

if old_word in content:
    content = content.replace(old_word, new_word, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added chunk reader dimming and data-sentence-idx to ImmersiveWord rendering")
else:
    print("SKIP: ImmersiveWord pattern not found")
    # Debug
    idx = content.find("isActive={isPlaying && playbackState.currentIdx === assignedIdx}")
    if idx > 0:
        print(f"  Found isActive at char {idx}")
        print(f"  Context: {repr(content[idx-100:idx+100])}")
