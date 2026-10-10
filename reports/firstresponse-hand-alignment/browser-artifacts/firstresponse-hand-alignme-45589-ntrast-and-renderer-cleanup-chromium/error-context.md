# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-hand-alignment.spec.ts >> 320px hand inspection keeps graph learning state, keyboard access, contrast and renderer cleanup
- Location: tests\e2e\firstresponse-hand-alignment.spec.ts:281:5

# Error details

```
Error: page.waitForFunction: TypeError: Cannot read properties of undefined (reading 'attributes')
    at summary (http://127.0.0.1:57133/__harness:392:31)
    at http://127.0.0.1:57133/__harness:442:145
    at Array.forEach (<anonymous>)
    at http://127.0.0.1:57133/__harness:441:23
    at Array.forEach (<anonymous>)
    at window.__handAlignment (http://127.0.0.1:57133/__harness:421:25)
    at eval (eval at predicate (eval at evaluate (:302:30)), <anonymous>:1:14)
    at predicate (eval at evaluate (:302:30), <anonymous>:7:27)
    at next (eval at evaluate (:302:30), <anonymous>:29:33)
    at eval (eval at evaluate (:302:30), <anonymous>:42:13)
```