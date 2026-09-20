# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_continuity.spec.ts >> results next action follows incomplete checks, manual review, repair findings and preservation concerns
- Location: tests\e2e\remediation_continuity.spec.ts:748:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('.pdf-workspace-primary')
Expected: "Review verification"
Received: "Review verification →"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('.pdf-workspace-primary')
    27 × locator resolved to <button type="button" class="pdf-workspace-primary">…</button>
       - unexpected value "Review verification →"

```

```yaml
- button "Review verification"
```

```
Tearing down "context" exceeded the test timeout of 120000ms.
```