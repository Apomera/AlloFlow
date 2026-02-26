
FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

def fix_syntax():
    print("🚀 Fixing Missing Return Closure...")
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"❌ Error: {e}")
        return

    # Problem: Line 9496 has />  and line 9497 has just }, missing ); to close return()
    # Current:
    #                     />
    #             }
    #
    # Should be:
    #                     />
    #                 );
    #             }

    # Find the pattern and insert );
    target = "                    />\r\n            }\r\n"
    replacement = "                    />\r\n                );\r\n            }\r\n"
    
    target_unix = "                    />\n            }\n"
    replacement_unix = "                    />\n                );\n            }\n"

    content = ''.join(lines)
    
    if target in content:
        print("   Found target (Windows newlines)...")
        content = content.replace(target, replacement, 1)  # Replace only first occurrence
        print("   ✅ Inserted missing );")
    elif target_unix in content:
        print("   Found target (Unix newlines)...")
        content = content.replace(target_unix, replacement_unix, 1)
        print("   ✅ Inserted missing );")
    else:
        print("⚠️ Target pattern not found.")
        # Debug: Print around line 9496
        print("Checking lines 9495-9498:")
        for i in range(9494, min(9498, len(lines))):
            print(f"  L{i+1}: {repr(lines[i])}")
        return

    try:
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        print("🎉 Syntax fixed.")
    except Exception as e:
        print(f"❌ Write Error: {e}")

if __name__ == "__main__":
    fix_syntax()
