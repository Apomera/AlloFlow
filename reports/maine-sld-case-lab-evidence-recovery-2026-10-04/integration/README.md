# Maine SLD evidence-recovery integration

The three immediate current shared hosts were archived before atomic Maine loader pin changes from `018f7f78` to `6ab45e2c`. Archive readback, full destination guards and reverse replacements verified that every other byte was preserved. The prior guide-revision preview and its evidence remain unchanged. See [setup](setup.json), [pin verification](pin-verification.json) and [static verification](static-verification.json).

One unmodified newly pinned `App.jsx` snapshot was compiled into [source-preview](source-preview/preview.json), with no source transforms or production build writes. Exact source SHA256 is `86eecff52f711fa3e3398fbfd24e8def69a84ba4ed69466f1c5eb013e1d388e6`; bundle is `f6bb88089f30814dc0eddbb875a67128cee05469993d476200f6fbe1d2b3f458`; module is `6ab45e2cbf3793f58d0510e5049028855169aa1150fa33209ad2d48179f0b424`. This immutable target remains separate from later shared-host observations.

The previously recorded PID19880 was already absent following the environment refresh, and the launch-time guard confirmed port65063 empty. No process was stopped. The [raw switch record](preview-switch.json) is preserved; [clarification](preview-switch-clarification.json) explains the inherited port-result field. New pure-HTTP PID36180/managed session90794 serves the same [activity URL](http://127.0.0.1:65063/app/?tool=maine-sld-practice), with immutable primary assets preloaded and hash-verified before listening. [Runtime](source-preview/runtime.json), [managed ownership](managed-session.json), [owned helper](owned-helper.cjs), [executed guard](executed-switch.ps1) and [HTTP byte verification](served-verification.json) record the exact target. Three checks returned HTTP200 with exact page/bundle/module hashes after the launch tool returned.

At this integration record's creation, the 6ab45e2c candidate was provisional while root reviewed the focused module failure. No actual host-body pass is claimed here. Final browser outcomes and any corrected candidate belong to their separately preserved report records.

No full application build, installer build, staging, commit, push or deployment was performed.
