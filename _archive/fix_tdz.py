filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the handler and useEffect lines that use chunk reader vars BEFORE declaration
# Declaration is around line 31646-31702
# Find handleCloseChunkReader
for i, line in enumerate(lines):
    if 'handleCloseChunkReader' in line and 'const' in line:
        print(f"handleCloseChunkReader defined at line {i+1}: {line.rstrip()[:120]}")
        # Show surrounding lines
        for j in range(i, min(len(lines), i+15)):
            print(f"  {j+1}: {lines[j].rstrip()[:120]}")
        break

# Find the chunk reader useEffect hooks
print("\n=== useEffect hooks referencing chunk reader ===")
for i, line in enumerate(lines):
    if 'useEffect' in line and i < 32000:
        # Check next 5 lines for chunk reader refs
        for j in range(i, min(len(lines), i+5)):
            if 'chunkReader' in lines[j] or 'isChunkReaderActive' in lines[j]:
                print(f"  useEffect at line {i+1}, refs chunk reader at line {j+1}")
                for k in range(i, min(len(lines), i+15)):
                    print(f"    {k+1}: {lines[k].rstrip()[:120]}")
                print()
                break
