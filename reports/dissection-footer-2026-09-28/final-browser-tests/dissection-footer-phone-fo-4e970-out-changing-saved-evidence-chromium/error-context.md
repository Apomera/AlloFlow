# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-footer.spec.ts >> phone footer >> numbered guidance opens the matching list without changing saved evidence
- Location: tests\e2e\dissection-footer.spec.ts:52:7

# Error details

```
Test timeout of 120000ms exceeded.
```

```
TimeoutError: locator.scrollIntoViewIfNeeded: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-diss-canvas]')

```

```
Tearing down "context" exceeded the test timeout of 120000ms.
```

# Page snapshot

```yaml
- status [ref=e3]
```