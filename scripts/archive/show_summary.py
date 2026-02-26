"""Extract just the summary from write_only_audit.txt"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('write_only_audit.txt','r',encoding='utf-8').readlines()
# Find SUMMARY section  
for i, l in enumerate(lines):
    if '======' in l and i > 0 and 'SUMMARY' in lines[i+1]:
        for j in range(i, len(lines)):
            sys.stdout.write(lines[j])
        break
