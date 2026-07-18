# AlloFlow Documentation Map

This directory contains both maintained guidance and dated review artifacts. Use this map to distinguish current sources of truth from historical snapshots.

## Maintained documentation

- [Project overview](../README.md)
- [Complete user manual](../AlloFlow%20Complete%20User%20Manual.md)
- [Architecture](../architecture.md)
- [Feature inventory](../FEATURE_INVENTORY.md)
- [Contributing guide](../CONTRIBUTING.md)
- [Deployment guide](../DEPLOY_YOUR_OWN.md)
- [Desktop guide](../desktop/README.md)
- [Security policy](../SECURITY.md)
- [Historical VPAT evaluation](../VPAT-2.5-WCAG-AlloFlow.md)
- [Current limited-scope WCAG 2.2 audit](../a11y-audit/WCAG-2.2-current-audit.md)
- [Manual accessibility test plan](accessibility-manual-test-plan.md)
- [Release evidence template](release-evidence-template.md)

## Dated reviews and handoffs

Files with a date in their filename, including the July 3, 2026 codebase and competitive reviews, are point-in-time evidence. Their counts, market observations, test totals, and deployment details should not be treated as current unless a maintained document independently confirms them.

## Accuracy rules

- Derive STEM and SEL totals from the live plugin files and registries; do not copy old review totals forward.
- Treat vendor pricing, quotas, feature lists, and adoption numbers as time-sensitive. Link to the provider and state the date checked when they are necessary.
- Describe accessibility results with their evaluated version and date. New tools are not covered automatically by an older audit or VPAT.
- Describe FERPA, COPPA, privacy, and security as deployment-dependent. Product design can support compliance, but does not establish it by itself.
- Keep deployment claims conditional: available hosts, AI providers, quotas, and district agreements vary by configuration.

Run `npm run audit:docs` after changing maintained documentation.
