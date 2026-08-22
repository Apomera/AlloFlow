# Troubleshooting

When something breaks during class, protect student learning first and diagnose second. Move students to the prepared fallback, preserve unsaved work, and avoid turning a connection problem into a participation or behavior judgment.

If the issue involves identifying or sensitive information, stop sharing and follow the incident steps in [Privacy and responsible AI](07-privacy-and-responsible-ai.md).

## Use the first 90 seconds well

1. **Keep the current tab open.** Do not reload until you have protected work that exists only on screen.
2. **Move students to the fallback.** Use the printed source, saved PDF, screenshot sequence, independent reading, partner explanation, or non-AI task you prepared.
3. **Name the scope.** Is the problem one student, one group, the whole class, one tool, all AI features, or the entire site?
4. **Name the stage.** Did it fail while opening, importing, generating, previewing, delivering, responding, saving, or exporting?
5. **Check visible status.** Look for offline, sync, AI backend, microphone, loading, or retry indicators. Status messages appear at the top of the screen and fade. If one disappeared before you could read it, you can replay recent messages from the hints panel.
6. **Turn on Help Mode.** Press **?** to reveal contextual help. Use the help search when it is available.
7. **Try one controlled recovery.** Repeated clicking can create duplicate jobs or make the state harder to interpret.

## Preserve work before reloading

Use the safest available option:

- Select Save Project and download the AlloFlow project file to an approved location.
- Check **Open saved work** for resource packs already stored on this device. You can restore, pin, export, or erase them from there. It is a different thing from **Test device storage** in Platform Diagnostics, which only checks whether the browser can keep data at all.
- Copy teacher-authored directions or unsaved text into an approved temporary document.
- Download an available export.
- Record the current step, resource title, and error message.
- Take a redacted screenshot that does not expose student names, responses, or sensitive content.

If Save Project is unavailable, keep the tab open while you test a second approved browser tab or device. Do not copy student data into a public chatbot, personal email, or unapproved note service.

## Identify the environment

The right fix depends on where AlloFlow is running.

| Environment | First checks | Escalate when |
|---|---|---|
| District-hosted web app | approved URL, sign-in, online indicator, browser support, district service notice | several users or features fail on the approved site |
| Desktop or local-network app | desktop runtime is open, local engine status, teacher host is reachable, devices are on the intended network | the runtime will not start or school security controls block the local host |
| Canvas-style or provider-hosted authoring | school account, platform availability, correct shared artifact, provider limits | the surrounding platform fails or student live use is not part of the approved design |
| LMS launch | course and role context, pop-up or new-tab behavior, third-party cookie restrictions, assignment link | the launch has the wrong role/course or repeatedly loses context |
| Student live-session page | correct environment, active code, approved codename, connection status | multiple students cannot join, receive, or return responses |

### Deployment-specific recovery paths

Use one path at a time. Do not mix a browser-hosted URL, a Desktop LAN address, and a School Box address in the same class session.

#### District-hosted browser app

- Start from the district-approved URL and confirm the teacher and student roles.
- Test one harmless teacher preview before opening student access.
- If the shell opens but generation or a specialist tool fails, record the feature name and visible status; do not switch to a personal provider.
- If several users fail at once, check the district service notice and escalate with the approved URL and timestamp.

#### Gemini Canvas or LMS-launched use

- Return through the assigned Canvas/LMS link so course and role context are restored.
- Confirm that the activity or shared artifact is the current one, not an old tab or copied link.
- Treat provider availability, account eligibility, quota, and school administrator settings as separate from AlloFlow content problems.
- If live student participation is not part of the approved Canvas design, use the teacher-led or offline fallback.

#### AlloFlow Desktop and Desktop LAN

- Keep the teacher runtime open while students connect.
- Confirm that students are on the intended classroom network and that the displayed LAN address is current.
- Use the Desktop LAN / Local Network mode for a same-room session; do not substitute a cloud URL midway through class.
- If the runtime or local engine is unavailable, preserve the project and move to the prepared offline activity.

#### Optional School Box server

- Treat School Box as a separate school-owned server/appliance path, not as a synonym for Desktop LAN.
- In the Desktop Command Center, check the configured mode, address, server status, and service health before class.
- Start or prepare the optional server only when the stack is installed and the device is authorized to host it.
- If the server is missing, stopped, or unreachable, use Desktop LAN or the offline fallback rather than repeatedly changing ports during instruction.
- Ask IT to review server logs and network policy; do not expose server credentials or student data in a general support ticket.

After identifying the path, repeat the same controlled test: one teacher action, one fictional or low-risk resource, and one student/device. If that test fails, stop changing variables and escalate.
Do not change firewall, proxy, certificate, device-management, or account settings on your own. Give district IT the deployment and symptom details.

## The app or a tool will not open

### What to check

1. Confirm that the main AlloFlow shell loaded.
2. Try Help Mode or Find a Tool to make sure you are using the current route.
3. Wait for the visible loading state to finish. Some specialist and studio surfaces load on demand.
4. Use the tool card’s Retry action if one appears.
5. Check whether other tools in the same hub open.
6. Save the project, then perform one normal browser reload.
7. Reopen the project and return to the tool.

### What the pattern means

- **One tool fails:** likely a tool-specific loading or compatibility issue.
- **A whole hub fails:** likely a blocked or unavailable asset family.
- **Everything except the shell fails:** likely network, content-filter, CDN, or deployment configuration.
- **Only one device fails:** likely browser cache, extension, device policy, or local resource pressure.

If a content filter or network rule is suspected, report the approved site URL, the visible tool name, the time, and the error. IT can inspect the request without receiving student content.

## AI generation is unavailable, slow, or wrong

### If you see "AI extras: off" in the STEAM Lab header

That small sparkle pill means no AI backend is set up on this device: no API key, no reachable local model, and the app is not using the Gemini Canvas bridge. The catalog and many core simulations still work, while AI-dependent generation, hints, coaching, or individual drills remain unavailable. Click the pill to review the connection choices offered by the current deployment. If Gemini Canvas is one of them, its availability, account requirements, quotas, and school approval come from Google and the account being used; verify those terms rather than treating the route as automatically free or approved.

### If a message disappeared before you finished reading it

Notices appear at the top center of the screen and fade after a few seconds. Click the lightbulb in the header and open the **Messages** list to reread the notices still retained for the current workspace, newest first. Treat that list as a convenience, not as a permanent log.

### If generation does not start

1. Check AI Backend Settings on the Launch Pad or the backend/status area in your deployment.
2. Confirm that the selected backend is approved and reports available.
3. Try a short, de-identified test prompt such as “Create three questions about the water cycle.”
4. If the test works, reduce the original source to one relevant section and retry once.
5. If the test fails, switch only to another district-approved backend or use the non-AI fallback.

Possible causes include provider availability, account or quota restrictions, local-engine status, a network interruption, an oversized or unsupported source, or a deployment configuration problem.

### If generation finishes but is low quality

Do not solve the problem by repeatedly requesting “make it better.” Tighten the task:

- state the learning target and grade band;
- identify the exact source section;
- specify the desired output and length;
- name required vocabulary or evidence;
- provide a model or success criteria; and
- ask the system not to add facts beyond the source.

Then perform the human review in [Privacy and responsible AI](07-privacy-and-responsible-ai.md). A fluent answer can still be inaccurate.

## A source file will not import

1. Confirm that the file type is supported by the source input shown in your deployment.
2. Give the file a simple filename and verify that it opens normally outside AlloFlow.
3. Remove passwords or encryption only if you are authorized to create a working copy.
4. If the PDF is scanned, run an approved OCR workflow and check the recognized text.
5. Split a very long file into the section needed for the lesson.
6. Copy clean, permitted text into the paste-text option in Source Material as a fallback.
7. Review tables, formulas, columns, footnotes, and image-only content after import.

Do not upload secure tests or copyrighted material that the school is not permitted to process or redistribute.

## Students cannot join a Live Session

Check in this order:

1. The teacher session is still active.
2. Teacher and students are using the intended deployment, not two look-alike URLs or a mix of web and local environments.
3. Students entered the current code without extra spaces and used the approved codename or roster flow.
4. The teacher can see the connection or roster entry.
5. The student browser is online and not stuck on an old session.
6. A second student can join from another device.

### Deployment-specific checks

- **Desktop or local network:** verify that the teacher runtime remains open, student devices are on the intended network, and district network isolation is not preventing device-to-host traffic.
- **District-hosted live service:** check the district service status, configured authentication, backend rules, and approved URL.
- **Peer-connected live path:** school firewalls, VPNs, filtering, or network address translation can affect peer connections. Ask IT to test the approved configuration.
- **LMS launch:** have the student return through the assigned LMS link so the correct course context is restored.

If several students cannot join, stop cycling codes during instruction. Use the fallback and test a new session after class.

## Students joined but did not receive the resource

1. Confirm the teacher actually sent or activated the resource.
2. Check the target: individual, group, or whole class.
3. Check Teacher-Paced versus Student-Paced mode.
4. Look at delivery state in the live controls or Activity Pulse.
5. Ask one affected student to return to the live-session home or current activity.
6. Resend once to the correct target.
7. If one student still cannot receive it, provide the approved independent share or offline copy and document the access issue.

Do not publicly identify a support group while troubleshooting. Verify group membership privately.

## Responses or evidence are missing

Missing data is not proof that a student did not work.

1. Confirm the student received and opened the activity.
2. Ask where the student responded: live tool, paper, oral response, AAC, exported file, or another approved space.
3. Check whether the student reconnected, changed devices, or used a different codename.
4. Keep the session open long enough for a permitted retry or follow-up.
5. Capture an alternate evidence sample when the transport remains unreliable.
6. Mark the record as an access or collection issue rather than assigning a zero.

Use [Review evidence and plan next steps](05-review-and-next-steps.md) before interpreting an incomplete Activity Pulse or end-session summary.

## Audio, speech, or microphone features do not work

1. Check the **Mute All Audio** control in the header.
2. Check the browser’s site permission for microphone or audio.
3. Check the Windows or device-level input and output selection.
4. Disconnect unused Bluetooth audio devices.
5. Test with headphones to prevent feedback.
6. Reload only after saving the project.
7. Provide a typed, selected, or non-recording route.

Microphone permission does not guarantee that a recording or speech service is available. Local browser speech support, the selected voice provider, and district network policy can differ by device.

Never require a student to record a face or voice when the workflow, consent, or storage path is not approved.

## Save Project or Load Project fails

### Save problems

- Choose a local or district-approved folder where downloads are allowed.
- Check available device storage and browser download permissions.
- Use a neutral filename.
- Keep the tab open until the download completes.
- Verify the file exists and has the expected AlloFlow project extension.

### Load problems

1. Make a copy of the project file before troubleshooting.
2. Use Load Project rather than opening the file as a normal document.
3. Confirm that it is an AlloFlow project and was not renamed, manually edited, partially synced, or converted by another app.
4. Try the project in the same approved deployment that created it.
5. If it still fails, create a new project and re-import the original source. Do not repeatedly overwrite the only copy.

A project may contain sensitive instructional state. Do not attach it to a general support ticket. Provide a de-identified reproduction when possible.

## An export, QR code, or shared package fails

1. Preview the output outside teacher mode.
2. Test every link and media item.
3. Check whether the output depends on an active Live Session.
4. Confirm that the recipient has permission to open the destination.
5. For print or PDF, inspect page breaks, headings, reading order, contrast, answer-key visibility, and background graphics.
6. For offline use, confirm that required scripts, fonts, audio, video, or external links are actually included or have an alternative.
7. Re-export after fixing the source rather than editing several inconsistent copies.

If a public or overly broad share was created, revoke it and follow the privacy incident procedure.

## Accessibility controls are difficult to use

1. Press **Tab** to locate focus and **Shift+Tab** to move backward.
2. Press **Escape** to close the current modal or overlay when supported.
3. Press **?** for Help Mode and check the control’s accessible name.
4. Test browser zoom before using a page-specific text-size control.
5. Turn on reduced motion or the app’s motion controls when animation is a barrier.
6. Use the **Mute All Audio** control if sound is interfering.
7. Try Immersive Reader or the relevant reading support after content is loaded.
8. If keyboard focus disappears, stop and provide an alternate route rather than requiring mouse use.

Run Accessibility Lab when available, but also test the real student path. Report the exact control label and the keyboard step where the barrier occurs.

## A specialist tool shows a loading or compatibility message

Educator Tools such as BehaviorLens, Report Writer, Symbol Studio, Accessibility Lab, document pipelines, and media studios may load additional components.

1. Wait for the tool’s own loading state.
2. Use its Retry action if shown.
3. Confirm that the main app and another Educator Tool work.
4. Check whether the feature requires a configured AI, media, OCR, audio, or local service.
5. Do not begin an identifiable clinical or record-writing workflow until the approved service and storage path are confirmed.
6. Save a de-identified project or reproduce the issue with fictional content before contacting support.

## Report a useful, privacy-safe issue

Include:

- date, time, and time zone;
- deployment type and approved URL or desktop version;
- teacher or student role;
- browser and device type;
- visible feature and control labels;
- exact steps to reproduce with fictional content;
- expected result and actual result;
- the full error text;
- whether the problem affects one device, a group, or everyone; and
- a redacted screenshot if needed.

Do not include names, session rosters, live codes, student responses, project files, assessment records, disability information, API keys, or unredacted screenshots.

## Know when to stop troubleshooting

Move fully to the fallback and contact the appropriate school support when:

- multiple students are blocked from the learning target;
- a privacy, security, or safety concern is possible;
- the workaround would bypass district controls;
- a student needs an access method you cannot provide safely;
- the local runtime, backend, LMS, or district-hosted service repeatedly fails; or
- continued retries risk losing work.

After class, reproduce the issue with fictional content and one controlled variable at a time. For routes and terminology that can help you describe the problem, see [Specialist and product reference](09-specialist-reference.md).
