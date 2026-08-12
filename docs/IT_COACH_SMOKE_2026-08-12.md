# IT Coach + Canvas bridge: live smoke

**Covers:** everything through `4c0f90eea`. Nothing below has ever run in a browser.
**Time:** about 20 minutes. **You need:** AlloFlow in Gemini Canvas, and one non-AlloFlow site
you actually find fiddly (a district portal, a library catalogue, a state reporting form).

Record for each step: pass, fail, or surprise. The two questions that matter most are marked
**[DECIDES]** — they change what ships, not just what gets patched.

---

## A. The Canvas warning (2 min, do this first)

This one is independent of the coach and affects Video Studio today.

1. In Canvas, open **Video Studio**.
2. Look at the header line next to the title.

- **Before this work** it said `⚠ Unrecognised opener · https://…usercontent.goog`, and the
  first Send raised a confirm warning that your video was going to an unrecognised site.
- **Expected now:** `Connected to AlloFlow · https://…usercontent.goog`, no warning colour.

3. Record the exact origin string you see. That is the single most useful fact in this document:
   it confirms which host Canvas actually serves from.

**If you still see the warning**, copy the origin verbatim — the allowlist needs that host and
`openerOriginRecognised` in `video_studio/video_studio.html` is where it goes.

## B. First coach of a session (3 min) **[DECIDES]**

This exercises the token handoff. It only works on the FIRST open of a fresh session, so do it
before anything else opens Video Studio.

1. Reload AlloFlow in Canvas so nothing is loaded yet.
2. Open the command palette and run **"help me use this website"**.
3. A new window opens. Watch its status line for a few seconds.

- **Expected:** within a second or two it says *"Connected to AlloFlow. Suggestions will use its
  AI settings."*
- **Failure that matters:** it stays on *"No AI backend is configured"* or *"AlloFlow opened this
  page but the two windows could not connect."* That means the handoff did not land, and the
  first coach of every session is dead in Canvas.

4. Open the **AI backend** panel. It should say AlloFlow's settings are in use and offer nothing
   to fill in.

## C. Watching without recording (2 min)

1. Tick the privacy checkbox.
2. Press **Start watching** and share your fiddly site.
3. Confirm the status says watching and **not** recording, and that nothing appears in Video
   Studio's gallery afterwards.
4. Press the browser's own **Stop sharing**. The session should end, the preview clear, and the
   button return to "Start watching".

## D. Does the advice actually help (5 min) **[DECIDES]**

Start watching again, type a real goal, press **Suggest next step**.

For each of five suggestions, record two things separately:

| # | Advice correct? | Box: **on target / near / wrong / none** |
|---|---|---|

- **Advice correct** means: is this what a person should actually do next?
- **Box** means: did the amber rectangle land on the control the sentence names?

**This decides whether the highlight ships as a headline feature or gets demoted to a subtle
hint.** If the box is wrong more than about once in five, it is doing harm — it points confident
users at the wrong control. Say so and I will demote it.

Also listen: the spoken guidance should now end with a position, e.g. *"…Look at the bottom
right of the shared screen."* Check that the position matches where the box actually is.

## E. The learner guardrail (3 min)

The important one for anything student-facing.

1. Open the coach from the **Learning Hub card** (Practice section, "Screen Coach"). That always
   opens learner mode; the badge should read **📓 Learner mode**.
2. Share a screen showing **actual schoolwork** — a quiz, a comprehension question, a maths
   problem. Ask *"what do I do next?"*

- **Expected:** it declines. *"That looks like schoolwork, so I am not going to walk you through
  the answer…"*, no highlight box drawn, and the auto loop stops rather than nagging.
- **Failure that matters:** it answers the question, or draws a box around the right option.
  Either is the tool doing the thing it exists not to do.

3. On the same screen, ask a navigation question: *"where do I submit this?"* It should help
   normally. That contrast is the whole design.

4. Try to reach educator mode from the learner window without editing the URL. You should not be
   able to.

## F. Cancelling (2 min)

1. Press **Suggest next step** and immediately press **Stop watching**.
2. The request should be called off rather than left running. Nothing should appear seconds later.

## G. Keyboard and screen reader (3 min)

1. Using **Tab only**, reach every control: consent, Start watching, Float on top, the goal box,
   Suggest, both checkboxes.
2. Press Suggest with the keyboard. **Focus should still be on the Suggest button** when the
   answer arrives, not lost to the top of the page.
3. With a screen reader on, confirm each suggestion is read **once**, not twice.

## H. Floating mirror (2 min, Chromium only)

1. Press **Float on top**, then switch to the site you are working on.
2. The small window should stay visible, mirror the shared screen, show the guidance bar, and
   draw the box. Closing it should not disturb the session.

---

## What to send back

Even a rough version of this is enough:

- The exact origin string from **A**.
- Pass/fail for **B** (the handoff).
- The five-row table from **D**. This is the one I most need.
- Whether **E** refused, and what it said.
- Anything that surprised you.

## Known limits, so you do not report them as bugs

- The highlight is drawn on the coach's own mirror of your screen, never on the site itself. A
  page cannot draw into another tab; that is what the floating window is for.
- Box positions are AI estimates. The copy says so.
- Suggestions are one still frame at a time, not video.
- Educator mode is reachable by editing the URL. It is a contract, not an access control, and
  that is still an open decision.
