filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = """                                    className={`max-w-4xl mx-auto transition-all duration-300`} style={{color: immersiveSettings.fontColor || '#1e293b'}}
                                    style={{
                                        lineHeight: lineHeight,
                                        letterSpacing: `${immersiveSettings.wideText ? (letterSpacing + 0.15) : letterSpacing}em`,
                                        wordSpacing: immersiveSettings.wideText ? '0.25em' : 'normal',
                                    }}"""

new = """                                    className={`max-w-4xl mx-auto transition-all duration-300`}
                                    style={{
                                        color: immersiveSettings.fontColor || '#1e293b',
                                        lineHeight: lineHeight,
                                        letterSpacing: `${immersiveSettings.wideText ? (letterSpacing + 0.15) : letterSpacing}em`,
                                        wordSpacing: immersiveSettings.wideText ? '0.25em' : 'normal',
                                    }}"""

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Merged duplicate style attributes into one")
else:
    print("Pattern not found")
