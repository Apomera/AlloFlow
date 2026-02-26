"""
Fix all syntax errors in ui_strings_check.js so it can be parsed by `new Function("return " + text)`.

Errors found:
1. L1063: applied_standard inside toasts - duplicate of header.applied_standard. Remove it.
2. L1122: applied_standard inside header at wrong indentation - fix indentation.
3. L1357: Missing comma after dok_levels closing brace before step_codename.
4. L1476-1482: Duplicate exit_caller_aria at wrong indentation in bingo. Remove duplicate.
5. L1676-1678: Orphaned status_retrying_chunk at wrong indentation in language_selector. Fix indentation.
6. L1731-1734: Orphaned keys between lesson_plan closing and memory section. Remove (dupes of language_selector keys).
"""

with open('ui_strings_check.js', 'r', encoding='utf-8') as f:
    content = f.read()

fixes = []

# FIX 1: Remove duplicate applied_standard in toasts (L1063)
# This is already in header section at L1122
old1 = """    applied_standard: 'Applied standard: {code}',
},
  large_file: {"""
new1 = """},
  large_file: {"""
if old1 in content:
    content = content.replace(old1, new1)
    fixes.append("Removed duplicate applied_standard from toasts section (L1063)")

# FIX 2: Fix applied_standard indentation in header (L1122) 
old2 = """    jump_to_lesson: "Jump to Lesson Plan",
        applied_standard: 'Applied standard: {code}',
  },"""
new2 = """    jump_to_lesson: "Jump to Lesson Plan",
    applied_standard: 'Applied standard: {code}',
  },"""
if old2 in content:
    content = content.replace(old2, new2)
    fixes.append("Fixed applied_standard indentation in header (L1122)")

# FIX 3: Add missing comma after dok_levels closing brace (L1357)
old3 = """      l4: "Level 4: Extended Thinking",
    }
  
    step_codename: 'Pick Your Codename!',
},"""
new3 = """      l4: "Level 4: Extended Thinking",
    },
    step_codename: 'Pick Your Codename!',
  },"""
if old3 in content:
    content = content.replace(old3, new3)
    fixes.append("Added missing comma after dok_levels and fixed wizard closing brace indentation (L1357)")

# FIX 4: Remove duplicate exit_caller_aria at wrong indentation (L1482)
old4 = """        exit_caller_aria: "Exit Caller Mode",
      
    exit_caller_aria: 'Exit Bingo Caller',
},"""
new4 = """        exit_caller_aria: "Exit Caller Mode",
      },"""
if old4 in content:
    content = content.replace(old4, new4)
    fixes.append("Removed duplicate exit_caller_aria and fixed bingo closing brace (L1482)")

# FIX 5: Fix orphaned status_retrying_chunk in language_selector (L1678)
old5 = """      status_custom_loaded: "Custom language pack loaded!",
  
    status_retrying_chunk: 'Retrying chunk {chunk} (attempt {attempt} of {maxAttempts})...',
},"""
new5 = """      status_custom_loaded: "Custom language pack loaded!",
      status_retrying_chunk: 'Retrying chunk {chunk} (attempt {attempt} of {maxAttempts})...',
  },"""
if old5 in content:
    content = content.replace(old5, new5)
    fixes.append("Fixed status_retrying_chunk indentation in language_selector (L1678)")

# FIX 6: Remove orphaned keys between lesson_plan and memory (L1731-1734)
# These are duplicates of language_selector keys
old6 = """      objectives_header: "Objectives",
  },
        status_checking: 'Checking {lang}...',
        status_generating: 'Generating {lang}...',
        status_retrying_chunk: 'Retrying chunk {chunk}, attempt {attempt}...',
        status_translating_part: 'Translating part {current}/{total}...',
  memory: {"""
new6 = """      objectives_header: "Objectives",
  },
  memory: {"""
if old6 in content:
    content = content.replace(old6, new6)
    fixes.append("Removed 4 orphaned keys between lesson_plan and memory (L1731-1734)")

with open('ui_strings_check.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Applied {len(fixes)} fixes:")
for fix in fixes:
    print(f"  ✅ {fix}")
print(f"\nFile size: {len(content)} bytes")
