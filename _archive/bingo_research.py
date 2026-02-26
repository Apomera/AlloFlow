"""
Research the Bingo card implementation in AlloFlowANTI.txt:
1. Find the Bingo component/rendering code
2. Identify how bingo cards are generated
3. Check if images are already available in glossary data
4. Find any student view checks
5. Understand the regeneration trigger
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = open('bingo_research.txt', 'w', encoding='utf-8')

def search(pattern, max_results=15):
    results = []
    for i, line in enumerate(lines):
        if pattern in line:
            results.append(i)
            if len(results) >= max_results:
                break
    return results

def print_context(line_indices, label, ctx=3):
    out.write(f'\n{"="*80}\n{label}\n{"="*80}\n')
    for idx in line_indices:
        out.write(f'\n--- Line {idx+1} ---\n')
        start = max(0, idx - ctx)
        end = min(len(lines), idx + ctx + 1)
        for j in range(start, end):
            marker = '>>>' if j == idx else '   '
            out.write(f'{marker} {j+1}: {lines[j].rstrip()}\n')

# 1. Find BingoCard / bingo component
bingo_comp = search('BingoCard')
print_context(bingo_comp, '1. BingoCard REFERENCES', ctx=5)

# 2. Find bingo generation
bingo_gen = search('generateBingo')
print_context(bingo_gen, '2. generateBingo REFERENCES', ctx=5)

# 3. Find bingo board / bingo grid
bingo_board = search('bingoBoard')
if not bingo_board:
    bingo_board = search('bingoGrid')
if not bingo_board:
    bingo_board = search('bingo')
print_context(bingo_board[:15], '3. bingo REFERENCES (first 15)', ctx=2)

# 4. Find BingoGame or PlayBingo
bingo_game = search('BingoGame')
if not bingo_game:
    bingo_game = search('PlayBingo')
if not bingo_game:
    bingo_game = search('playBingo')
print_context(bingo_game[:10], '4. BingoGame/PlayBingo REFERENCES', ctx=5)

# 5. Find showImages / bingoImages
bingo_img = search('bingoImage')
if not bingo_img:
    bingo_img = search('showImage')
print_context(bingo_img[:5], '5. bingoImage/showImage REFERENCES', ctx=3)

# 6. Find the actual bingo card rendering (look for grid pattern or bingo cell)
bingo_cell = search('bingo-cell')
if not bingo_cell:
    bingo_cell = search('bingoCell')
if not bingo_cell:
    bingo_cell = search('grid-cols-5')  # Bingo is typically 5x5
print_context(bingo_cell[:5], '6. Bingo cell/grid rendering', ctx=5)

out.close()
print(f'Research written to bingo_research.txt ({len(lines)} lines analyzed)')
