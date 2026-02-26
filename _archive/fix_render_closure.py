#!/usr/bin/env python3
"""
Fix renderPrompt function closure - it was converted to block function but missing };
"""

from pathlib import Path

def fix_render_prompt_closure(file_path: Path) -> bool:
    """Add missing }; to close renderPrompt function."""
    
    content = file_path.read_text(encoding='utf-8')
    
    # The function ends with ); but should end with );}; because it's now a block function
    # Find the pattern after the renderPrompt closing </div>
    old_pattern = """        </div>
    );
    
    
    // Play Blending Sequence (Segments -> Wait -> Done)"""
    
    new_pattern = """        </div>
    );
    };
    
    
    // Play Blending Sequence (Segments -> Wait -> Done)"""
    
    if old_pattern in content and "    );\n    };\n    \n    \n    // Play Blending" not in content:
        content = content.replace(old_pattern, new_pattern)
        file_path.write_text(content, encoding='utf-8')
        print("✓ Added missing }; to close renderPrompt function")
        return True
    elif "    );\n    };\n    \n    \n    // Play Blending" in content:
        print("ℹ renderPrompt closure already fixed")
        return True
    else:
        print("✗ Could not find pattern to fix")
        # Try alternate pattern
        if "        </div>\n    );\n    \n    \n    // Play Blending" in content:
            content = content.replace(
                "        </div>\n    );\n    \n    \n    // Play Blending",
                "        </div>\n    );\n    };\n    \n    \n    // Play Blending"
            )
            file_path.write_text(content, encoding='utf-8')
            print("✓ Added missing }; (alt pattern)")
            return True
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    fix_render_prompt_closure(file_path)
