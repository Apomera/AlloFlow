import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()
fixed = 0

for i, l in enumerate(lines):
    if 'FERPA-safe' in l:
        # Replace FERPA-safe in the JSX fallback  
        if "t('roster.subtitle')" in l:
            lines[i] = l.replace(
                "FERPA-safe \u00b7 Stored locally only \u00b7 Never uploaded",
                "Organize student groups with differentiated profiles for instruction"
            )
            if lines[i] != l:
                fixed += 1
                print("Fixed JSX fallback at L%d" % (i+1))
        # For help strings, keep FERPA mention but rephrase
        elif 'ferpa_warn' in l.lower() or ('session-scoped' in l.lower()):
            # This is a help string describing data privacy - keep but rephrase
            if 'FERPA-safe' in l:
                lines[i] = l.replace('FERPA-safe', 'privacy-conscious')
                fixed += 1
                print("Rephrased help string at L%d" % (i+1))
        else:
            print("Unhandled FERPA at L%d: %s" % (i+1, l.rstrip()[:100]))

open('AlloFlowANTI.txt', 'w', encoding='utf-8').write(''.join(lines))
print("\nFixed %d occurrences" % fixed)

# Verify
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
remaining = content.count('FERPA-safe')
print("Remaining 'FERPA-safe': %d" % remaining)
