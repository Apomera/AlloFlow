"""
Fix two issues:
1. Immersive reader text truncation: reduce POS chunk size from 3000 to 1500
   and add explicit instruction not to truncate
2. BingoGame missing t(): add useContext(LanguageContext)  
3. SpeedReaderOverlay missing t(): add useContext(LanguageContext)
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Reduce POS chunk size from 3000 to 1500 to prevent Gemini truncation
old1 = "const chunks = chunkText(textToAnalyze, 3000);"
new1 = "const chunks = chunkText(textToAnalyze, 1500);"
if old1 in content:
    content = content.replace(old1, new1, 1)
    fixes += 1
    print("1. Reduced POS chunk size to 1500 chars")
else:
    print("1. SKIP: chunk pattern not found")

# 2. Add instruction to Gemini not to truncate
old2 = """                 - Add syllable markers to ALL words with more than one syllable.
                 Text:"""
new2 = """                 - Add syllable markers to ALL words with more than one syllable.
                 - CRITICAL: You MUST return the COMPLETE text. Do NOT truncate, summarize, or omit any part. Every single word must appear in your output.
                 Text:"""
if old2 in content:
    content = content.replace(old2, new2, 1)
    fixes += 1
    print("2. Added anti-truncation instruction to POS prompt")
else:
    print("2. SKIP: prompt rule pattern not found")

# 3. Fix BingoGame missing t()
old3 = """const BingoGame = React.memo(({ data, onClose, settings, setSettings, onGenerate, bingoState, setBingoState, onGenerateAudio, selectedVoice, alloBotRef }) => {
  useEffect(() => {"""
new3 = """const BingoGame = React.memo(({ data, onClose, settings, setSettings, onGenerate, bingoState, setBingoState, onGenerateAudio, selectedVoice, alloBotRef }) => {
  const { t } = useContext(LanguageContext);
  useEffect(() => {"""
if old3 in content:
    content = content.replace(old3, new3, 1)
    fixes += 1
    print("3. Added t() to BingoGame")
else:
    print("3. SKIP: BingoGame pattern not found")

# 4. Fix SpeedReaderOverlay missing t()
old4 = "const SpeedReaderOverlay = React.memo(({ text, onClose, isOpen }) => {"
new4 = """const SpeedReaderOverlay = React.memo(({ text, onClose, isOpen }) => {
  const { t } = useContext(LanguageContext);"""
if old4 in content:
    content = content.replace(old4, new4, 1)
    fixes += 1
    print("4. Added t() to SpeedReaderOverlay")
else:
    print("4. SKIP: SpeedReaderOverlay pattern not found")

if fixes > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\nApplied {fixes} fixes")
else:
    print("\nNo fixes applied")
