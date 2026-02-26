"""Fix corrupted aria-label at L2968 — truncated ternary"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8-sig').readlines()
indent = '                                                                            '
lines[2967] = indent + "aria-label={typeof PHONEME_GUIDE !== 'undefined' && PHONEME_GUIDE[p] ? PHONEME_GUIDE[p].label : `Phoneme ${p}`}\r\n"
print('L2968 fixed:', lines[2967].strip()[:80])
print('L2969:', lines[2968].strip()[:60])
open('AlloFlowANTI.txt','w',encoding='utf-8').writelines(lines)
print('DONE')
