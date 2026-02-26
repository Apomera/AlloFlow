#!/usr/bin/env python3
"""Fix false API_QUOTA_EXHAUSTED detection in callGemini error handler."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# Fix the overly broad quota detection
old_quota = """      // Handle quota/rate limit errors with clear messaging
      const isQuota = err.message && (
        err.message.includes('429') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.message.includes('after 5 retries') ||
        err.message.includes('after 3 retries')
      );
      if (isQuota) {
        const quotaErr = new Error('API_QUOTA_EXHAUSTED');
        quotaErr.isQuota = true;
        throw quotaErr;
      }"""

new_quota = """      // Handle quota/rate limit errors with clear messaging
      // FIX: Only match ACTUAL quota errors (429, RESOURCE_EXHAUSTED), not generic retry exhaustion
      const isActualQuota = err.message && (
        err.message.includes('429') ||
        err.message.includes('RESOURCE_EXHAUSTED')
      );
      console.error('[callGemini] Error caught:', err.message);
      if (isActualQuota) {
        const quotaErr = new Error('API_QUOTA_EXHAUSTED');
        quotaErr.isQuota = true;
        throw quotaErr;
      }"""

if old_quota in content:
    content = content.replace(old_quota, new_quota, 1)
    changes += 1
    print("1: Fixed false quota detection (removed 'after N retries' matches)")
else:
    print("1: SKIP - quota pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
