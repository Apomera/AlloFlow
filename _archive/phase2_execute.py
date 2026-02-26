"""
Phase 2 Execution Script
Item 1: Lazy Proxy for LETTER_NAME_AUDIO
Item 2: Centralize Gemini model constants
"""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

INPUT = 'AlloFlowANTI.txt'
REPORT = 'phase2_report.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    report = []
    report.append("=== Phase 2 Execution Report ===")
    report.append(f"Input: {len(lines):,} lines")
    fixes = 0

    # --- Find Proxy patterns for reference ---
    report.append("\n--- Existing Proxy Patterns ---")
    for i, line in enumerate(lines):
        if 'Proxy(' in line and ('AUDIO' in line or 'PHONEME' in line or '_CACHE_' in line):
            report.append(f"  L{i+1}: {line.strip()[:150]}")
    for i, line in enumerate(lines):
        if '_LOAD_' in line and 'AUDIO' in line and ('function' in line or 'const' in line or 'RAW' in line):
            report.append(f"  L{i+1}: {line.strip()[:150]}")
    for i, line in enumerate(lines):
        if '_CACHE_' in line and 'AUDIO' in line:
            report.append(f"  L{i+1}: {line.strip()[:150]}")

    # === ITEM 1: Lazy Proxy for LETTER_NAME_AUDIO ===
    report.append("\n--- Item 1: LETTER_NAME_AUDIO Lazy Proxy ---")
    
    # Find `const LETTER_NAME_AUDIO = {`
    target1 = 'const LETTER_NAME_AUDIO = {'
    idx1 = content.find(target1)
    
    if idx1 < 0:
        report.append("SKIP: 'const LETTER_NAME_AUDIO = {' not found")
    else:
        line_num = content[:idx1].count('\n') + 1
        report.append(f"Found LETTER_NAME_AUDIO at L{line_num}")
        
        # Find the closing of this object. 
        # We need to find the matching `};` that closes this const.
        # The data is like: const LETTER_NAME_AUDIO = { "a": "...", "b": "...", ... };
        # Count braces from the opening {
        brace_count = 0
        search_start = idx1 + len('const LETTER_NAME_AUDIO = ')
        end_idx = -1
        for i in range(search_start, len(content)):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i
                    break
        
        if end_idx < 0:
            report.append("ERROR: Could not find closing brace for LETTER_NAME_AUDIO")
        else:
            # Check for semicolon after closing brace
            after_close = content[end_idx+1:end_idx+5].strip()
            if after_close.startswith(';'):
                end_idx_with_semi = content.index(';', end_idx) + 1
            else:
                end_idx_with_semi = end_idx + 1
            
            end_line = content[:end_idx_with_semi].count('\n') + 1
            report.append(f"LETTER_NAME_AUDIO spans L{line_num} to L{end_line}")
            
            # Extract the object content (everything between { and })
            obj_content = content[search_start:end_idx+1]  # includes { ... }
            
            # Build the replacement
            replacement = f'function _LOAD_LETTER_NAME_AUDIO_RAW() {{ return {obj_content}; }}\n'
            replacement += 'let _CACHE_LETTER_NAME_AUDIO = null;\n'
            replacement += "const LETTER_NAME_AUDIO = new Proxy({}, { get: function(target, prop) { if (!_CACHE_LETTER_NAME_AUDIO) _CACHE_LETTER_NAME_AUDIO = _LOAD_LETTER_NAME_AUDIO_RAW(); return _CACHE_LETTER_NAME_AUDIO[prop]; } });"
            
            # Replace in content
            original_block = content[idx1:end_idx_with_semi]
            content = content[:idx1] + replacement + content[end_idx_with_semi:]
            
            fixes += 1
            report.append(f"SUCCESS: Wrapped LETTER_NAME_AUDIO in Lazy Proxy")

    # === ITEM 2: Centralize Gemini Model Constants ===
    report.append("\n--- Item 2: Centralize Gemini Model Constants ---")
    
    # Find model references - but we need to be careful about strings in prompts vs actual model params
    # The models are used in API calls like: model: 'gemini-2.5-flash-preview-09-2025'
    # Let's find each unique model reference and where it's used
    
    model_patterns = {
        'gemini-2.5-flash-preview-09-2025': 'default',
        'gemini-2.5-flash-image-preview': 'image', 
        'gemini-2.5-flash-preview-tts': 'tts',
    }
    
    # Don't replace 'gemini-2.5-flash-preview' alone as it's a substring of the others
    # Handle it separately after the more specific ones
    
    # First, insert the GEMINI_MODELS config near the top of the file
    # Find a good insertion point - after the ORTHOGRAPHIC_ACTIVITIES line
    insert_marker = "const ORTHOGRAPHIC_ACTIVITIES = ['mapping'];"
    insert_idx = content.find(insert_marker)
    
    if insert_idx < 0:
        report.append("SKIP: Could not find insertion point for GEMINI_MODELS")
    else:
        insert_pos = insert_idx + len(insert_marker)
        # Find end of that line
        next_newline = content.index('\n', insert_pos)
        
        config_block = """

// Centralized Gemini model identifiers — single source of truth
const GEMINI_MODELS = {
  default: 'gemini-2.5-flash-preview-09-2025',
  image: 'gemini-2.5-flash-image-preview',
  flash: 'gemini-2.5-flash-preview',
  tts: 'gemini-2.5-flash-preview-tts',
};
"""
        content = content[:next_newline] + config_block + content[next_newline:]
        fixes += 1
        report.append(f"SUCCESS: Inserted GEMINI_MODELS config block after ORTHOGRAPHIC_ACTIVITIES")
        
        # Now replace model string references
        # Be careful: only replace in model: '...' or model = '...' contexts
        # Order matters: replace longer strings first to avoid partial matches
        replacements_made = 0
        
        # Replace specific model strings with their constants
        # Use a targeted approach: find 'gemini-2.5-...' in quotes and replace
        for model_str, const_name in sorted(model_patterns.items(), key=lambda x: -len(x[0])):
            # Match both single and double quoted versions in model assignments
            for quote in ["'", '"']:
                old = f"{quote}{model_str}{quote}"
                new = f"GEMINI_MODELS.{const_name}"
                
                # Count occurrences but skip the one in the config block we just inserted
                count = content.count(old)
                if count > 1:  # >1 because one is in our config block
                    # Replace all except the one in the config block
                    # Strategy: replace all, then fix the config block
                    content = content.replace(old, new)
                    # Restore the config block value
                    config_key = f"{const_name}: GEMINI_MODELS.{const_name}"
                    config_restore = f"{const_name}: {quote}{model_str}{quote}"
                    content = content.replace(config_key, config_restore, 1)
                    replacements_made += count - 1
                    report.append(f"  Replaced {count-1}x {quote}{model_str}{quote} → GEMINI_MODELS.{const_name}")
        
        # Handle 'gemini-2.5-flash-preview' separately (the shorter one)
        # This is tricky because it's a substring of others. Only replace exact matches.
        flash_str_single = "'gemini-2.5-flash-preview'"
        flash_str_double = '"gemini-2.5-flash-preview"'
        for old, const_name in [(flash_str_single, 'flash'), (flash_str_double, 'flash')]:
            count = content.count(old)
            if count > 1:  # >1 because of config block
                content = content.replace(old, f"GEMINI_MODELS.{const_name}")
                config_key = f"{const_name}: GEMINI_MODELS.{const_name}"
                config_restore = f"{const_name}: {old}"  
                content = content.replace(config_key, config_restore, 1)
                replacements_made += count - 1
                report.append(f"  Replaced {count-1}x {old} → GEMINI_MODELS.{const_name}")
        
        report.append(f"  Total model string replacements: {replacements_made}")
        if replacements_made > 0:
            fixes += 1

    # Write output
    with open(INPUT, 'w', encoding='utf-8') as f:
        f.write(content)

    new_lines = content.split('\n')
    report.append(f"\nFixes applied: {fixes}")
    report.append(f"Output: {len(content):,} bytes, {len(new_lines):,} lines")
    
    # Verify
    open_b = content.count('{')
    close_b = content.count('}')
    report.append(f"Braces: {open_b} open, {close_b} close, diff={open_b - close_b}")
    
    # Verify Proxy pattern exists for LETTER_NAME_AUDIO
    if '_LOAD_LETTER_NAME_AUDIO_RAW' in content:
        report.append("✅ LETTER_NAME_AUDIO Lazy Proxy verified")
    else:
        report.append("❌ LETTER_NAME_AUDIO Lazy Proxy NOT found")
    
    if 'GEMINI_MODELS' in content:
        report.append("✅ GEMINI_MODELS config block verified")
    else:
        report.append("❌ GEMINI_MODELS config block NOT found")
    
    # Count remaining hardcoded model strings (should ideally be just the config block)
    remaining = 0
    for model_str in model_patterns:
        count = len(re.findall(re.escape(model_str), content))
        if count > 1:  # 1 is the config block definition
            report.append(f"  ⚠️ {model_str}: {count} remaining (1 expected in config)")
            remaining += count - 1
        else:
            report.append(f"  ✅ {model_str}: {count} (config only)")
    
    report.append(f"\nRemaining hardcoded model refs: {remaining}")
    report.append("\n=== DONE ===")

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"Applied {fixes} fixes. See {REPORT}")

if __name__ == '__main__':
    main()
