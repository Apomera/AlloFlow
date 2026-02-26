import os

FILE = r"AlloFlowANTI.txt"

def main():
    with open(FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    target_line_idx = 10123  # 0-indexed for line 10124
    
    line_content = lines[target_line_idx].strip()
    print("Line 10124:", repr(line_content))
    
    if "))" in line_content:
        eleven_plus_block = (
            '                              {/* 11+ option for longer words */}\r\n'
            '                              <div\r\n'
            '                                  draggable\r\n'
            "                                  onDragStart={(e) => handleDragStart(e, 11, 'number')}\r\n"
            '                                  onKeyDown={(e) => handleCountKeyDown(e, 11)}\r\n'
            '                                  tabIndex={0}\r\n'
            '                                  onClick={() => checkAnswer(11, count)}\r\n'
            '                                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 border-b-4 border-purple-300 text-purple-700 font-black text-lg flex items-center justify-center shadow-sm hover:shadow-md hover:scale-110 hover:bg-purple-50 hover:border-purple-400 transition-all cursor-grab active:cursor-grabbing"\r\n'
            '                                  aria-label="11 or more sounds"\r\n'
            '                              >\r\n'
            '                                  11+\r\n'
            '                              </div>\r\n'
        )
        
        block_lines = eleven_plus_block.split('\r\n')
        # Remove trailing empty string from split
        block_lines = [line + '\r\n' for line in block_lines if line]
        
        for i, line in enumerate(block_lines):
            lines.insert(target_line_idx + 1 + i, line)
        
        with open(FILE, "w", encoding="utf-8") as f:
            f.writelines(lines)
        
        print("SUCCESS: Inserted 11+ button after line 10124 (" + str(len(block_lines)) + " lines)")
    else:
        print("ERROR: Line 10124 doesn't match expected content: " + repr(line_content))

if __name__ == "__main__":
    main()
