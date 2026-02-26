"""
Search for chunking-related features in the deployed version
that might have been lost in the revert.
"""
import os

deploy_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\AlloFlowANTI.txt'
if not os.path.exists(deploy_path):
    print(f"Deploy file not found at: {deploy_path}")
    exit()

with open(deploy_path, 'r', encoding='utf-8') as f:
    deploy_lines = f.readlines()

main_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(main_path, 'r', encoding='utf-8') as f:
    main_lines = f.readlines()

print(f"Deploy file: {len(deploy_lines)} lines")
print(f"Main file: {len(main_lines)} lines")
print(f"Difference: {len(deploy_lines) - len(main_lines)} lines")

# Search deploy for chunking-related features near immersive reader
deploy_content = ''.join(deploy_lines)

# Check if deploy has DIFFERENT ImmersiveToolbar
patterns = ['ChunkReader', 'chunkReader', 'SentenceReader', 'sentenceReader', 
            'autoAdvance', 'ChunkedRead', 'chunkedRead', 'readChunk',
            'sentencePlayback', 'playbackMode', 'chunkPlay', 'readMode']

print("\n=== Chunking patterns in deploy ===")
for pat in patterns:
    if pat in deploy_content:
        # Find line numbers
        for i, line in enumerate(deploy_lines):
            if pat in line:
                print(f"  {pat} at line {i+1}: {line.rstrip()[:120]}")
                break

# Compare ImmersiveToolbar in both files
print("\n=== ImmersiveToolbar differences ===")
deploy_toolbar_start = None
main_toolbar_start = None
for i, line in enumerate(deploy_lines):
    if 'const ImmersiveToolbar' in line:
        deploy_toolbar_start = i
        break
for i, line in enumerate(main_lines):
    if 'const ImmersiveToolbar' in line:
        main_toolbar_start = i
        break

if deploy_toolbar_start and main_toolbar_start:
    # Find the end of each toolbar (next });\n)
    deploy_toolbar_end = deploy_toolbar_start
    main_toolbar_end = main_toolbar_start
    for i in range(deploy_toolbar_start, min(len(deploy_lines), deploy_toolbar_start + 200)):
        if deploy_lines[i].strip() == '});':
            deploy_toolbar_end = i
            break
    for i in range(main_toolbar_start, min(len(main_lines), main_toolbar_start + 200)):
        if main_lines[i].strip() == '});':
            main_toolbar_end = i
            break
    
    deploy_toolbar = deploy_lines[deploy_toolbar_start:deploy_toolbar_end+1]
    main_toolbar = main_lines[main_toolbar_start:main_toolbar_end+1]
    
    print(f"  Deploy toolbar: lines {deploy_toolbar_start+1}-{deploy_toolbar_end+1} ({len(deploy_toolbar)} lines)")
    print(f"  Main toolbar: lines {main_toolbar_start+1}-{main_toolbar_end+1} ({len(main_toolbar)} lines)")
    
    # Find lines in deploy not in main
    main_set = set(l.strip() for l in main_toolbar)
    missing = []
    for line in deploy_toolbar:
        if line.strip() and line.strip() not in main_set:
            missing.append(line.rstrip())
    
    if missing:
        print(f"\n  Lines in DEPLOY toolbar but NOT in main ({len(missing)}):")
        for m in missing[:20]:
            print(f"    {m[:140]}")
    else:
        print("  Toolbars are identical!")
