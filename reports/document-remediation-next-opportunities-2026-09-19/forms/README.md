# Remaining native form-preservation opportunities

This read-only audit confirmed two concrete gaps in the strict preservation gate. Eight synthetic Chromium cases exercise the current source gate and actual `aiFixChunked` implementation with mocked model transport: four harmful candidates were accepted, and four valid controls were accepted. No application code or permanent tests changed.

## 1. Preserve the effective submission destination

`formState` records form ownership, action, method, encoding, and validation bypass, but omits `target` and submitter `formtarget` from the state compared at `doc_pipeline_source.jsx:11023`. The attribute list is at `doc_pipeline_source.jsx:10938`.

Two accepted candidates change a real native submission from the named `feedback` iframe to the main document:

- Remove `target="feedback"` from the form.
- Add `formtarget="_self"` to its submit button.

Both the source gate and mocked-transport pipeline accept each changed document. Chromium requests the same URL and payload, but assigns the navigation request to a different frame. This can replace the entire educational document on submission instead of updating its designated feedback pane.

Controls show that adding `target="_self"` when the default is already the main document, and adding a submitter override equal to the existing form target, preserve the actual destination and should remain accepted. A fix should compare effective destinations, including form/submitter precedence and any applicable document base target, rather than rejecting all textual attribute changes.

## 2. Account for rendered geometry in hard-wrapped textarea payloads

The current `submissionWrapping` state at `doc_pipeline_source.jsx:10986` preserves hard-wrap mode and effective `cols`. Native Chromium also uses the rendered width and font when constructing the submitted value. Changing CSS while retaining identical textarea text, `wrap="hard"`, and `cols="10"` therefore changes the payload and still passes both acceptance paths.

With value `abcdefghijklmnopqrstuvwxyz`, the measured payloads were:

| Layout | FormData value (`\n` denotes a newline) |
| --- | --- |
| Width 100px, font 16px monospace | `abcdefghijk\nlmnopqrstuv\nwxyz` |
| Width 200px, font 16px monospace | `abcdefghijklmnopqrstuv\nwxyz` |
| Width 100px, font 12px monospace | `abcdefghijklmno\npqrstuvwxyz` |

The DOM `.value`, wrap mode, and columns are unchanged. Controls verify that a width change with `wrap="soft"`, and a color-only change with `wrap="hard"`, preserve the submitted value and remain accepted. A rendered verification step can compare actual form payloads for hard-wrapped controls and require explicit review if a necessary accessibility repair changes that contract. Blanket CSS equality would incorrectly reject benign repairs and useful font or responsive-width improvements. The source gate alone cannot infer arbitrary external CSS layout.

## Evidence and scope

- [Reproducible probe](./probe.cjs)
- [Full cases, gate decisions, pipeline evidence, and native measurements](./results.json)
- Source policy: `20260920-1`.
- Source SHA-256 before, after, and independent result verification: `dfab62eb35dc56e82e18b60df006ec642dd139f6ca38a748738160fce69e8421`.
- Chromium: `148.0.7778.96`; viewport: 900 by 600.
- Independent verification confirmed all eight pipeline/gate outcomes and each harmful/control native distinction.
- Every browser request was aborted by a context route before reaching the network. The navigation tests inspect the request's destination frame; they do not submit data to an external server. Payload cases use local `FormData` only.
- These findings concern the source strict gate and mocked-transport `aiFixChunked`. They do not establish downstream export-verifier behavior, live model incidence, cross-browser behavior, or assistive-technology output.
