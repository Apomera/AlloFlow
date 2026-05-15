# LTI 1.3 Deploy Checklist

Step-by-step for shipping LTI 1.3 LMS integration. Skip this entire document until you have a real district pilot lined up — Gemini Canvas distribution doesn't use any of this.

## 0. Prerequisites

- A Brightspace / Canvas / Moodle / Schoology test instance you can administer
- The LMS's tool registration URL (where you paste `client_id`, `deployment_id`, redirect URLs)
- The LMS's published JWK Set URL (different per platform — see table below)

## 1. Find your platform's JWKS URL

| Platform | JWKS URL pattern |
|---|---|
| Brightspace | `https://{your-tenant}.brightspace.com/d2l/.well-known/jwks` |
| Canvas | `https://{canvas-host}/api/lti/security/jwks` |
| Moodle | `https://{moodle-host}/mod/lti/certs.php` |
| Schoology | Contact your Schoology platform admin |

If unsure, request the URL from your LMS admin and verify it returns JSON with `keys` array. Quick test:
```bash
curl https://{platform-host}/path/to/jwks
```
You should see `{"keys": [...]}` with at least one entry having `kty`, `kid`, `use`, `n`, `e`.

## 2. Set Firebase secrets

From the repo root, run each command and paste the value when prompted:

```bash
firebase functions:secrets:set LTI_PLATFORM_URL    # e.g. https://usm.brightspace.com
firebase functions:secrets:set LTI_JWKS_URL        # the URL from step 1
firebase functions:secrets:set LTI_CLIENT_ID       # the client_id assigned by the LMS
firebase functions:secrets:set LTI_DEPLOYMENT_ID   # the deployment_id assigned by the LMS
```

To verify each secret is set:
```bash
firebase functions:secrets:access LTI_JWKS_URL
```

## 3. Deploy functions

```bash
cd prismflow-deploy
firebase deploy --only functions
```

Watch the deploy output for any errors related to LTI functions. Each function should redeploy in ~10 sec.

## 4. Register tool with LMS

In your LMS admin console:

| Field | Value |
|---|---|
| Launch URL | `https://us-central1-prismflow-911fe.cloudfunctions.net/ltiLaunch` |
| Login URL  | `https://us-central1-prismflow-911fe.cloudfunctions.net/ltiLogin` |
| Redirect URLs | (same Launch URL above) |
| Public JWK | (your tool's JWK if the LMS asks — N/A for current implementation since AlloFlow doesn't sign anything outbound) |
| Client ID | (LMS-assigned; paste back into Firebase secret in step 2) |
| Deployment ID | (LMS-assigned; paste back into Firebase secret in step 2) |

## 5. Test the launch

From the LMS, navigate to a course where you've added the tool, click the launch link. You should land on `https://prismflow-911fe.web.app/?lti=1&session=...&course=...&role=teacher`.

Watch Firebase Functions logs in real time:
```bash
firebase functions:log --only ltiLaunch
```

Expected on success:
```
[LTI] Launch successful — user: ..., course: ..., instructor: true
```

If you see `[LTI] JWT verification failed: ...`, the most common causes are:
- **`LTI_JWKS_URL secret is not set`** — go back to step 2
- **`Issuer expected ... received ...`** — `LTI_PLATFORM_URL` doesn't match the actual `iss` claim in the LMS-issued JWT. Check your platform URL with the LMS admin.
- **`Audience expected ... received ...`** — `LTI_CLIENT_ID` doesn't match the `aud` claim. Verify the value matches what the LMS assigned.
- **`Deployment ID mismatch`** — same shape, but for `LTI_DEPLOYMENT_ID`.
- **`signature verification failed`** — the JWKS URL is wrong, returning a key set that doesn't include the signing key. Verify the URL with the LMS admin.

## 6. Optional — request additional permissions

For full roster sync + grade passback (LTI Advantage services), the LMS admin must enable:
- `https://purl.imsglobal.org/spec/lti-ags/scope/lineitem` — assignment grades
- `https://purl.imsglobal.org/spec/lti-ags/scope/score` — score updates
- `https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly` — roster

The current AlloFlow LTI implementation reads claims but doesn't push grades back. That's a future enhancement.

## What changed from "decode without verification"

Prior to May 2026, the LTI launch handler used `JSON.parse(Buffer.from(parts[1], "base64url"))` to extract claims without verifying the JWT signature. This was a security gap: an attacker who could craft a JWT with the right structure could impersonate any user inside the LMS.

The fix uses `jose.jwtVerify()` with the platform's published JWK Set, validating:
- Signature (the cryptographic check that prevents forgery)
- Issuer (`iss` claim must match the configured platform URL)
- Audience (`aud` claim must contain our client_id)
- Expiry (`exp` claim — jose validates automatically)
- Deployment ID (LTI 1.3 spec requirement — must match registered deployment)
- Nonce (matches the one stored at login — prevents replay)
- Message type (must be `LtiResourceLinkRequest`)

The static check `dev-tools/check_lti_surface.cjs` verifies all these are present in source.
