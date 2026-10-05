# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-trail-identity.spec.ts >> selected old drag flight owns its vacuum reference while a newer no-drag flight is paused
- Location: tests\e2e\physics-trail-identity.spec.ts:233:5

# Error details

```
Tearing down "context" exceeded the test timeout of 240000ms.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]
  - status [ref=e5]
```