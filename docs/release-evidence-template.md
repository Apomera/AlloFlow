# Release Evidence Template

Copy this file for each externally shared release and name the copy with the release date or version. Replace every placeholder; do not publish an incomplete template as release evidence.

## Release identity

| Field | Value |
|---|---|
| Version | _Required_ |
| Git commit | _Required_ |
| Release date | _Required_ |
| Build/deployment tested | _Required_ |
| Evidence owner | _Required_ |

## Product scope

- Deployment modes included: _Required_
- AI providers included: _Required_
- Teacher workflows included: _Required_
- Student workflows included: _Required_
- Export formats included: _Required_
- Explicit exclusions: _Required_

## Automated evidence

| Check | Command / workflow | Result | Artifact or run link |
|---|---|---|---|
| Documentation accuracy and links | `npm run audit:docs` | Not run | |
| Promotional-site integrity | `npm run audit:promo` | Not run | |
| Registry and build checks | `npm run verify:gate` | Not run | |
| Unit tests | `npm test` | Not run | |
| Accessibility source audit | `npm run audit:a11y` | Not run | |
| Accessibility runtime audit | `npm run audit:a11y:runtime -- <tested URL>` | Not run | |
| PDF structure and independent validation | Relevant CI jobs and veraPDF evidence | Not run | |

## Manual accessibility evidence

Complete [the manual accessibility test plan](accessibility-manual-test-plan.md) and link the dated results here. Identify assistive-technology versions and record Fail, Blocked, and Not tested outcomes explicitly.

## Privacy, security, and deployment review

- Data flows verified for each tested deployment: _Required_
- Provider terms and quotas checked on: _Required_
- District-controlled storage, retention, and access assumptions: _Required_
- Security checks and known findings: _Required_
- FERPA/COPPA statement reviewed as deployment-dependent: _Required_

## Known limitations and unresolved issues

List each limitation with severity, affected users, workaround, issue link, and planned disposition. A missing test result is a limitation, not evidence of a pass.

## Approval

| Role | Name | Date | Decision |
|---|---|---|---|
| Engineering | | | Pending |
| Accessibility reviewer | | | Pending |
| Product / clinical reviewer | | | Pending |

This record describes only the named release, build, environments, and workflows. It is not a blanket certification of every configuration or generated output.
