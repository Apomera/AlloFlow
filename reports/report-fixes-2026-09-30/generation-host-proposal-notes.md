# Proposed generation host integration

Application notes for the coordinating owner:
- This is a proposed patch only. Shared AlloFlowANTI source ownership was unresolved; no host edit was made by generation_recovery.
- Apply the final Object.assign hunk ONLY in _alloRunGenerate; its short shared suffix is also used by other shims.
- Run ownership is independent of view ownership. Background generation can complete without taking over the reading view.
- Preserve a completed run's identity until a newer run or explicit cancellation. Clearing the ref in finally would discard valid queued React publish updaters.
- Existing Full Pack/blueprint callers with supplied AbortSignal retain their signal, caller ownership and custom loading callbacks; ordinary generations receive guarded host loading callbacks.
- The actual processing overlay is in the canonical host at current line41988 and renders only while no saved artifact is selected. The proposed independent status/Cancel row remains visible with saved content and on mobile; validate reflow and focus after applying. Dedicated source-generation and existing batch controllers retain their own cancellation UI.
- Cancellation restores focus to the connected initiating control. If that control was replaced while loading, use the processing overlay's documented fallback focus target.
- Keep existing History setters independent of view ownership: captured source data must stay valid during navigation, and Memory Aid pending-image cleanup must still settle on cancellation.
- Non-destructively filter existing/imported blank drafts and _fullPackPlannedArtifact placeholders from student deliveries in the relevant resource resolver. These scoped source fixes prevent new ordinary adaptation placeholders; they do not delete prior artifacts.
- Follow the documented source/generated workflow after ownership clears: update canonical host and reviewed source mirrors, run build.js, run generated source-pair/mirror/pin checks. Do not hand-edit generated App.jsx.
- This proposal still needs executable host lifecycle, Cancel-control keyboard/focus, background-batch and navigation tests before describing ordinary app cancellation as fixed.
