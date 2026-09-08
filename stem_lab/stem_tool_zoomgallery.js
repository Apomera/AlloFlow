// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEAM Lab — Zoom Gallery (OpenSeadragon deep-zoom + Notice-Wonder coach)
//
// v2 (2026-09-07). The viewer now mounts INLINE in the STEAM Lab panel:
// OpenSeadragon (openseadragon.github.io, BSD-3-Clause) loads as a <script>
// library from jsDelivr — the same CDN the three.js tools already use from
// inside the Canvas iframe — and draws into a <div>. No iframe, so none of
// the X-Frame-Options trouble that forced the circuit/molecule shelves into
// pop-ups. The companion window (zoom_gallery/zoom_gallery.html) survives as
// "Pop out" for a second screen or a host that blocks the library load, and
// the AI bridge to it is unchanged (alloczoom-* protocol, see below).
//
// Images are openly licensed: Smithsonian Open Access IIIF tile pyramids
// (CC0, true deep zoom) and NASA photographs (public domain). NASA's host
// sends no CORS header, so those load with crossOriginPolicy:false — the
// canvas is tainted, which only disables the "snapshot for the coach"
// extra. ids.si.edu serves tiles with CORS but NOT info.json, so IIIF
// sources are described inline with pinned width/height (no info.json
// fetch). Both facts were measured 2026-09-07; before v2 nothing loaded.
//
// Pedagogy: the coach is an OBSERVING tutor (you don't "predict" a
// photograph): NOTICE → WONDER. Pins let the student mark the exact detail
// they are describing; pin positions + zoom level (and, for CORS-clean
// images, a small snapshot of the view) travel to the coach so it can build
// on what they are actually looking at. AI responds Socratically — never
// lectures the content.
//
// Bridge protocol with the pop-out (mirrors the shelves):
//   popup ── alloczoom-hello {strings} ─▶ here (replies -ready {ai, notes, strings})
//   popup ── alloczoom-ai-request ──────▶ here ── ctx.callGemini[Vision] ──▶ Gemini
//   popup ◀─ alloczoom-ai-response ───── here
//   popup ── alloczoom-notes {notes} ───▶ here (persisted in '_zoomGallery.notes')
//   popup ── alloczoom-noticed / -coached / -imgopened / -closed ─▶ quest slices
//
// House rules: zero AI traffic unless ctx.aiHintsEnabled AND the student
// pressed the coach button. Persisted: quest-slice counters + the student's
// own notes/pins (local toolData only). Nothing is graded.
//
// The IMAGES catalog is DUPLICATED in zoom_gallery/zoom_gallery.html;
// tests/zoom_gallery_catalog.test.js pins the two equal.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var OSD_VERSION = '5.0.1';
  var OSD_BASE = 'https://cdn.jsdelivr.net/npm/openseadragon@' + OSD_VERSION + '/build/openseadragon/';
  var ZOOM_GALLERY_CDN_URL = 'https://alloflow-cdn.pages.dev/zoom_gallery/zoom_gallery.html?v=2';
  function companionUrl(path, cdnUrl) {
    try {
      var loc = window.location || {};
      var host = loc.hostname || '';
      var pathname = loc.pathname || '';
      var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(host);
      var isDesktopBundled = !!window._isDesktopBundledApp || (isLocalHost && pathname.indexOf('/app/') === 0);
      var isAlloHosted = /(^|\.)alloflow/i.test(host) || /(^|\.)web\.app$/i.test(host) || /(^|\.)firebaseapp\.com$/i.test(host);
      if (isDesktopBundled) return new URL(path, loc.href).toString();
      if (isLocalHost || isAlloHosted) return new URL('/' + String(path).replace(/^\/+/, ''), loc.origin).toString();
    } catch (_) {}
    return cdnUrl;
  }
  var ZOOM_GALLERY_URL = companionUrl('zoom_gallery/zoom_gallery.html?v=2', ZOOM_GALLERY_CDN_URL);

  // ── Strings shared with the companion window (English fallbacks; the
  //    language packs carry them under stem.zoomGallery.*) ───────────────
  var WIN = {
    win_title: "🔍 Zoom Gallery",
    win_sub: "OpenSeadragon deep zoom (BSD-3) · Smithsonian Open Access (CC0) + NASA (public domain) + AlloFlow Notice-Wonder coach",
    select_label: "Choose an image",
    select_placeholder: "Choose an image…",
    coach_aria: "Notice and Wonder coach",
    coach_heading: "Observation coach",
    steps_aria: "Observation steps",
    step_notice: "1 · Notice",
    step_wonder: "2 · Wonder",
    step_coach: "3 · Coach",
    privacy: "Your notes stay on this device — they are sent back to your AlloFlow window so they survive closing this one, and nothing is graded. AI feedback flows only when your teacher has AI hints on, and only when you ask for it.",
    stage_aria: "Deep-zoom image viewer",
    back_gallery: "← Gallery",
    pin_drop: "📍 Drop a pin",
    pin_drop_active: "📍 Click the image to place pin {n}",
    pin_clear: "Clear pins",
    pin_placed_sr: "Pin {n} placed at {x}% across, {y}% down, zoom {z}×.",
    pin_summary: "Pin {n}: {x}% across, {y}% down at {z}× zoom",
    pins_heading: "Your pins",
    zoom_readout: "Zoom {z}×",
    picker_heading: "Pick an image — each one is a real, openly licensed photograph or artifact. Zoom in close and look for details you'd miss from far away.",
    badge_deep: "true deep zoom",
    badge_photo: "high-res photo",
    custom_heading: "Bring your own image",
    custom_help: "Paste a link to a picture (.jpg or .png) or a IIIF info.json link from a museum or library. It opens in this window only and is not saved. Some sites block browser access; if a link will not load, try another.",
    custom_input_aria: "Image or IIIF link",
    custom_placeholder: "https://…",
    custom_open: "Open link",
    custom_err_url: "That does not look like a web link. It should start with https://",
    custom_err_iiif: "Could not read that IIIF link from the browser. The site may block cross-origin access.",
    custom_name: "Your image",
    custom_credit: "Link provided by you — check its licence before sharing.",
    custom_notice: "Zoom right in. What is ONE detail you can only see up close?",
    custom_wonder: "What question does this image make you want to ask?",
    intro_card: "Pick an image, then zoom right in. Scroll or pinch to magnify, drag to move around. Write down what you notice up close.",
    notice_label: "What you notice",
    notice_placeholder: "I notice…",
    to_wonder: "On to Wonder →",
    wonder_label: "What you wonder",
    wonder_placeholder: "I wonder…",
    you_noticed: "You noticed:",
    you_wondered: "You wondered:",
    to_coach: "Take it to the coach →",
    ask_ai: "✨ What does the coach think?",
    ask_prompt: "🤔 Give me an observation prompt",
    thinking: "thinking…",
    ai_no_answer: "The AI coach didn’t answer{err}. Meanwhile: {prompt}",
    copy_notes: "📋 Copy notes",
    copied: "Copied!",
    copy_failed: "Copy failed — select the text and copy it by hand.",
    notes_header: "Zoom Gallery notes",
    ai_connected_on: "AlloFlow connected · AI coach <span class=\"on\">on</span>",
    ai_connected_off: "AlloFlow connected · AI hints <span class=\"off\">off</span> — using built-in observation prompts",
    ai_standalone: "Standalone — built-in observation prompts (open from AlloFlow for the AI coach)",
    loading: "Loading {name}…",
    viewer_failed: "The deep-zoom viewer could not load. Check your internet connection and try again.",
    image_failed: "Could not load \"{name}\". Check your internet connection and try again.",
    source_record: "source record",
    reflect_1: "Zoom in one more level than feels necessary. What is ONE detail you can only see up close that you would have missed from far away?",
    reflect_2: "Compare the middle of the image with an edge. How are they different — sharper, blurrier, brighter, emptier?",
    reflect_3: "If you had to give this image a title of your own, what would it be, and which detail made you choose it?",
    reflect_4: "Pick one small area and describe it as if to someone who cannot see it. What exactly is there?",
    reflect_5: "What is one question about this image that zooming in even more might actually help you answer?",
    describe_heading: "What is in this image",
    describe_show: "Describe this image",
    describe_hide: "Hide the description",
    describe_intro: "A written description of what the picture shows, for anyone who wants it. It does not say what to notice — that part is yours.",
    zoom_in: "Zoom in",
    zoom_out: "Zoom out",
    zoom_fit: "Fit the whole image",
    pin_center: "Pin the centre of the view",
    pin_hint: "Pin mode is on. Click the image, or press Enter with the viewer focused, to pin the middle of what you can see.",
    viewer_aria: "{name}. Deep-zoom viewer. Use the arrow keys to move and plus and minus to zoom.",
    zoom_announced: "Zoom {z} times.",
    fit_announced: "Showing the whole image.",
    pin_removed_sr: "Pin {n} removed.",
    pin_remove: "Remove pin {n}",
    read_aloud: "Read this aloud",
    read_aloud_busy: "Speaking…",
    read_aloud_stop: "Stop reading",
    read_aloud_failed: "Read-aloud is not available right now.",
    read_prompt: "Read the question aloud"
  };
  // Inline-only strings.
  var INL = {
    title: '🔍 Zoom Gallery — real images, up close',
    blurb: 'Zoom deep into real, openly-licensed images in OpenSeadragon — the deep-zoom viewer museums and archives use. Magnify to the pixel: the Pillars of Creation, Saturn\'s rings, an Apollo bootprint on the Moon, the real Apollo 11 capsule, a branching coral fan. A Notice → Wonder coach sits beside the viewer: you record what you see up close and what it makes you curious about, and the coach asks a question back.',
    inline_hint: 'Scroll or pinch to zoom, drag to pan. Keyboard: click the image, then use + and − to zoom and the arrow keys to move.',
    pop_out: '↗ Pop out',
    pop_out_title: 'Open the gallery in its own window (for a second screen or a bigger view)',
    fullscreen: '⛶ Fullscreen',
    viewer_blocked: 'The deep-zoom library could not load here. Use "Pop out" to open the gallery in its own window.',
    ai_inline_on: 'AI coach is ON — it builds on what you notice.',
    ai_inline_off: 'AI hints are off — built-in observation prompts stand in for the coach.',
    image_opened_sr: 'Opened {name}. Zoom in with plus or scroll.',
    pins_cleared_sr: 'Pins cleared.',
    coach_answered_sr: 'The coach replied.',
    notes_saved: 'Notes are saved on this device only.',
    note1: 'Your notes stay in the gallery window — nothing is saved or graded.',
    ai_on: 'AI coach is ON — it will build on what you notice while this window stays open.',
    ai_off: 'AI hints are off — the gallery still works, with built-in observation prompts instead of the AI coach.',
    popup_blocked: 'The Zoom Gallery window was blocked. Allow pop-ups for this page, then try again.',
    opened_sr: 'Opened the Zoom Gallery in a new window.',
    returned_catalog_sr: 'Returned to the STEAM Lab tools.',
    back_to_tools: 'Back to STEAM Lab tools',
    open_title: 'Open the Zoom Gallery in a new window (OpenSeadragon deep-zoom viewer with the Notice-Wonder coach)',
    open: '🔍 Open Zoom Gallery',
    opening_note: 'Opening Zoom Gallery. If it does not appear, check your pop-up settings.',
    blocked_note: 'Pop-up blocked — allow pop-ups for this page and try again.',
    open_note: 'Zoom Gallery is open. Keep this AlloFlow window open too — it powers the AI coach.',
    closed_note: 'Zoom Gallery was closed. You can reopen it whenever you are ready.',
    credit: 'Viewer: OpenSeadragon (openseadragon.github.io), free and open source under the BSD-3-Clause license. Images: Smithsonian Open Access (released CC0) served as IIIF deep-zoom tiles, and NASA photographs (public domain). Each image lists its source and a link to the original record. The viewer and images load from the web, so the gallery needs internet.'
  };

  // ── Curated openly-licensed images (identical to the companion window) ──
  var IMAGES = [
    { id: 'earthrise', emoji: '🌍', name: 'Earthrise (Apollo 8, 1968)', type: 'image', cors: false, width: 3000, height: 3000,
      src: 'https://images-assets.nasa.gov/image/as08-14-2383/as08-14-2383~orig.jpg',
      thumb: 'https://images-assets.nasa.gov/image/as08-14-2383/as08-14-2383~thumb.jpg',
      source: 'NASA', credit: 'NASA / Apollo 8 (public domain)', link: 'https://images.nasa.gov/details/as08-14-2383',
      meta: 'Earth photographed rising over the Moon’s horizon on 24 December 1968',
      describe: 'A colour photograph, mostly empty black space. Across the bottom third lies the Moon: a pale grey, softly rolling surface with shallow craters and no sharp shadows, ending in a slightly curved horizon. Above the horizon and to the right of centre floats the Earth, small in the frame and lit from the left, so only part of it is bright. The lit part is deep blue ocean marbled with swirls and streaks of white cloud, with a brownish landmass showing through near the lower middle. The unlit part fades into the black. There are no stars visible.',
      notice: 'Zoom right into the edge where the bright Earth meets the black space. Is that edge a hard line or a soft fade? Now find where the blue turns brown, and describe what the white swirls are doing there.',
      wonder: 'The Moon fills the bottom of this photo and the Earth is a small ball above it, even though Earth is much bigger. What does that tell you about where the camera was?' },
    { id: 'bootprint', emoji: '👣', name: 'Bootprint on the Moon (Apollo 11)', type: 'image', cors: false, width: 3930, height: 3930,
      src: 'https://images-assets.nasa.gov/image/as11-40-5877/as11-40-5877~orig.jpg',
      thumb: 'https://images-assets.nasa.gov/image/as11-40-5877/as11-40-5877~thumb.jpg',
      source: 'NASA', credit: 'NASA / Apollo 11, Buzz Aldrin (public domain)', link: 'https://images.nasa.gov/details/as11-40-5877',
      meta: 'a boot print pressed into lunar soil in 1969, photographed to study how the soil behaves',
      describe: 'A black-and-white close-up of grey lunar soil filling the whole frame. The soil is fine and powdery with scattered small stones and pebbles casting hard black shadows. Near the middle-right sits a single boot print, pressed sharply into the dust: an oval sole with about a dozen straight raised ridges running across it, and a crisp raised rim of soil pushed up around the edge. Small black cross marks, each like a plus sign, are spaced in a regular grid across the entire photograph, including over the soil and the print.',
      notice: 'Zoom into the rim of the print, where the soil was pushed up. How sharp are those edges? Then look at the small black crosses spread evenly over the whole picture, and decide whether they are on the Moon or not.',
      wonder: 'This print was made in a place with no wind, no rain and almost no air. What would have to happen for it to be rubbed out?' },
    { id: 'pillars', emoji: '🌌', name: 'Pillars of Creation in near-infrared (Hubble)', type: 'image', cors: false, width: 1920, height: 1800,
      src: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000842/GSFC_20171208_Archive_e000842~large.jpg',
      thumb: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000842/GSFC_20171208_Archive_e000842~thumb.jpg',
      source: 'NASA/ESA Hubble', credit: 'NASA, ESA / Hubble Space Telescope (public domain)', link: 'https://images.nasa.gov/details/GSFC_20171208_Archive_e000842',
      meta: 'towers of gas and dust in the Eagle Nebula, photographed in near-infrared light so stars behind and inside them show through',
      describe: 'A dense field of thousands of stars on a deep blue-black background. Most stars are small orange and white points; a few of the brightest have four-pointed cross-shaped spikes. Rising through the middle of the frame are several dark, ghostly columns of gas and dust, brown and grey and semi-transparent, like tall wisps of smoke with knobbly, uneven tips. The tallest column runs up the left of centre; two shorter ones stand to its right, one with a thin finger reaching sideways. A faint bluish haze outlines the denser edges of the columns. Stars are visible through and apparently behind the columns.',
      notice: 'Zoom into the knobbly tip of the tallest column. Count how many separate bright points you can find that sit inside or right at the edge of the dark material, rather than in the open sky.',
      wonder: 'This was taken in near-infrared light, which passes through dust that blocks visible light. Looking at how see-through these columns are, what would you expect the same view to look like in ordinary light?' },
    { id: 'carina', emoji: '✨', name: 'Cosmic Cliffs, Carina Nebula (Webb)', type: 'image', cors: false, width: 1920, height: 1100,
      src: 'https://images-assets.nasa.gov/image/carina_nebula/carina_nebula~large.jpg',
      thumb: 'https://images-assets.nasa.gov/image/carina_nebula/carina_nebula~thumb.jpg',
      source: 'NASA/ESA/CSA Webb', credit: 'NASA, ESA, CSA, STScI / James Webb Space Telescope (public domain)', link: 'https://images.nasa.gov/details/carina_nebula',
      meta: 'a "mountain range" of gas and dust in a star-forming region, imaged in infrared by the Webb telescope',
      describe: 'The lower half of the picture is a rolling, cliff-like landscape of orange and rust-brown cloud, billowing like storm clouds lit from above, with dark hollows and caves in its face and a curled wisp reaching up at the far left. The upper half is deep blue and black sky filled with stars, many of them showing Webb’s distinctive six-pointed spikes with two fainter extra points. Small orange and white specks are scattered along the top edge of the cloud, and a few thin streaks appear to shoot upward out of the ridge.',
      notice: 'Follow the top edge of the orange cliffs from left to right. Zoom in and find a place where something seems to be coming out of the ridge and into the dark sky. Describe its shape.',
      wonder: 'The bright stars here have six spikes, but the stars in the Hubble picture have four. Neither is really shaped like that. What might make a telescope add spikes to a point of light?' },
    { id: 'saturn', emoji: '🪐', name: 'Saturn’s Atmosphere: the Cassini "Noodle" Mosaic', type: 'image', cors: false, width: 5001, height: 5301,
      src: 'https://images-assets.nasa.gov/image/PIA21617/PIA21617~orig.jpg',
      thumb: 'https://images-assets.nasa.gov/image/PIA21617/PIA21617~thumb.jpg',
      source: 'NASA/JPL', credit: 'NASA / JPL-Caltech / Space Science Institute — Cassini (public domain)', link: 'https://images.nasa.gov/details/PIA21617',
      meta: '137 photographs joined into one long strip, taken as the Cassini spacecraft dived past Saturn on 26 April 2017',
      describe: 'A single long, narrow, curved strip of grey cloud detail running diagonally across a completely black background, from the wide upper-left corner down to a thin tapering tail at the lower right. At the wide top end is a dark circular eye surrounded by concentric rings of bright cloud: Saturn’s north polar vortex. Below it the strip narrows through a band of bright clumped storms, then crosses a straight edge where the texture changes, then continues through smoother bands, swirls and faint oval spots. Toward the bottom the strip becomes pale and almost featureless, and short straight steps are visible along its edge where the separate frames were joined.',
      notice: 'Start at the dark eye at the wide end and follow the strip down. Zoom in where the texture suddenly changes, and describe what is different on each side of that line.',
      wonder: 'This is 137 separate photographs stitched into one strip, taken while the spacecraft was falling past the planet. Why could a single photograph not have shown this?' },
    { id: 'curiosity', emoji: '🤖', name: 'Curiosity Rover Selfie (Mars)', type: 'image', cors: false, width: 1920, height: 1920,
      src: 'https://images-assets.nasa.gov/image/PIA20602/PIA20602~large.jpg',
      thumb: 'https://images-assets.nasa.gov/image/PIA20602/PIA20602~thumb.jpg',
      source: 'NASA/JPL', credit: 'NASA / JPL-Caltech / MSSS — Curiosity rover (public domain)', link: 'https://images.nasa.gov/details/PIA20602',
      meta: 'the Curiosity rover photographs itself on Mars, using a camera on the end of its robotic arm',
      describe: 'A colour photograph of a rusty orange-brown Martian landscape under a dusty pinkish-tan sky, with low hills on the horizon. The ground is flat, pale, layered bedrock broken into slabs and shallow steps, with loose sand and small stones in the cracks. Standing on it in the middle of the frame is the Curiosity rover: a boxy body on six wheels, with a tall mast carrying a camera head at the top, various instrument boxes, and a bright patch of disturbed ground beside it. No robotic arm is visible anywhere in the picture, and the rover casts a shadow toward the viewer.',
      notice: 'Zoom into the rock right beside the rover’s wheels. Is it loose sand or solid layered stone, and how can you tell? Look for any place the rover has disturbed it.',
      wonder: 'This picture was taken by a camera on the end of the rover’s own arm, yet no arm appears anywhere in it. How could that be?' },
    { id: 'solarflare', emoji: '☀️', name: 'X-class Solar Flare (SDO, 2014)', type: 'image', cors: false, width: 4096, height: 4096,
      src: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001209/GSFC_20171208_Archive_e001209~orig.jpg',
      thumb: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001209/GSFC_20171208_Archive_e001209~thumb.jpg',
      source: 'NASA SDO', credit: 'NASA / Solar Dynamics Observatory (public domain)', link: 'https://images.nasa.gov/details/GSFC_20171208_Archive_e001209',
      meta: 'the whole Sun in extreme-ultraviolet light with a powerful flare erupting on the left edge (large file — give it a moment)',
      describe: 'The whole disc of the Sun fills the frame against black space, coloured gold and brown in false colour. The surface is a mottled, swirling texture of darker loops and lighter patches, with several bright golden active regions where loops of material arch up. Bright golden haze extends off the edge of the disc all the way round. On the left edge is an intensely bright white flare. Running through that flare is a hard-edged straight vertical white bar, far straighter than anything else in the picture, with a fainter blue horizontal streak crossing it.',
      notice: 'Zoom into the bright flash on the left edge. Find the straight vertical bar running through it. Compare its edges with the edges of everything else on the Sun, and say how they differ.',
      wonder: 'Nothing on the Sun is straight-edged, yet that bar is perfectly straight. If it is not part of the Sun, where could it have come from?' },
    { id: 'iss-cupola', emoji: '🛰️', name: 'Astronaut in the Space Station Cupola', type: 'image', cors: false, width: 4928, height: 3280,
      src: 'https://images-assets.nasa.gov/image/iss044e011632/iss044e011632~orig.jpg',
      thumb: 'https://images-assets.nasa.gov/image/iss044e011632/iss044e011632~thumb.jpg',
      source: 'NASA', credit: 'NASA — astronaut Scott Kelly in the Cupola, 12 July 2015 (public domain)', link: 'https://images.nasa.gov/details/iss044e011632',
      meta: 'a crew member photographs themselves in the Cupola, the Station’s window module for looking down at Earth',
      describe: 'Inside a cramped spacecraft module packed with equipment, cables, switch panels and labelled fittings. Filling the left half is a large round window with a thick metal frame, looking straight down at Earth: bands of vivid turquoise shallow water threaded between darker blue deep water, with sandy pale shapes and puffy white clouds scattered over it. On the right, an astronaut floats facing the camera in a black t-shirt, bald, with a pair of glasses pushed up on top of his head, one arm stretched toward the camera because he is holding it himself. A second, darker window and more equipment fill the right edge.',
      notice: 'Zoom into the water through the round window. Trace the boundary where the bright turquoise meets the dark blue. Is it a sharp line or a gradual change, and does it follow a shape?',
      wonder: 'The turquoise areas are shallow and the dark blue is deep. What could make the sea floor rise and fall in such distinct shapes?' },
    { id: 'apollo-cm', emoji: '🚀', name: 'Apollo 11 Command Module "Columbia"', type: 'iiif', cors: true, width: 5440, height: 5783,
      src: 'https://ids.si.edu/ids/iiif/NASM-NASM2022-05013-000003',
      source: 'Smithsonian NASM', credit: 'Smithsonian National Air and Space Museum (CC0)', link: 'https://airandspace.si.edu/collection-objects/command-module-apollo-11/nasm_A19700102000',
      meta: 'the spacecraft that carried the Apollo 11 crew to the Moon and back, on display in a museum',
      describe: 'A cone-shaped spacecraft about the size of a small car, displayed on a stand in a darkened museum gallery. Its outer skin is scorched and mottled in coppery browns, greys and streaks of soot, uneven and patchy rather than smooth, with visible seams, rivets, small round ports and metal handles. A hatch opening on the right side reveals a glimpse of the crowded interior. Around and behind it the gallery is dark, with a large lit photograph of Earth on the wall at the upper left, a floor-level backlit panel of blue and white cloud swirls below, and a row of small illuminated exhibit captions along the bottom edge.',
      notice: 'Zoom close onto the outer skin. Some areas are burnt dark and some are pale. Pick one spot where the two meet and describe the pattern there.',
      wonder: 'Only one end of this capsule came back through the air, and it was travelling extremely fast. Looking at where the burning is worst, which way round was it facing?' },
    { id: 'wright-flyer', emoji: '✈️', name: '1903 Wright Flyer', type: 'iiif', cors: true, width: 8451, height: 4532,
      src: 'https://ids.si.edu/ids/iiif/NASM-NASM2022-00100A-000001',
      source: 'Smithsonian NASM', credit: 'Smithsonian National Air and Space Museum (CC0)', link: 'https://airandspace.si.edu/collection-objects/1903-wright-flyer/nasm_A19610048000',
      meta: 'the first aeroplane to make a powered, controlled flight, photographed against a black background',
      describe: 'A very wide photograph of an early aeroplane on a plain black background, seen from the front left. It has two long fabric-covered wings, one above the other, held apart by many slim upright wooden posts and criss-crossed by thin bracing wires that form repeated X shapes between the posts. The fabric is pale cream and slightly translucent, with the ribs showing through. In the middle of the lower wing is a small engine and a chain drive; behind it stand two tall narrow wooden propellers. A framework of struts reaches forward to a small horizontal surface at the front, and a wooden launching rail lies under the machine. There is no cockpit, seat or wheels: just an open frame and a flat space on the lower wing.',
      notice: 'Zoom into the gap between the two wings and follow one bracing wire from end to end. Count how many wires meet at a single post, then find a post where the count is different.',
      wonder: 'There is no seat and no steering wheel; the pilot lay flat on the lower wing. Looking at how thin and open this machine is, why might lying down have been the sensible choice?' },
    { id: 'snowflake-342', emoji: '❄️', name: 'Snowflake No. 342 (Wilson Bentley, c. 1900)', type: 'iiif', cors: true, width: 3000, height: 2629,
      src: 'https://ids.si.edu/ids/iiif/SIA-SIA2008-1394',
      source: 'Smithsonian Archives', credit: 'Wilson A. Bentley photomicrograph, Smithsonian Institution Archives (CC0)', link: 'https://siarchives.si.edu/collections/siris_arc_308074',
      meta: 'a single snow crystal photographed through a microscope by the farmer who pioneered the technique',
      describe: 'A black-and-white photograph of a single snow crystal, pale grey against a black background, on a slightly ragged square of dark material. The crystal has six arms spreading from a central hexagon. Each arm is a broad blade with a serrated, feathery edge and a pointed tip, and the arms are joined near the middle by a ring of hexagonal plates so that the centre looks like a flower with a small dark dot at its heart. The whole crystal is faintly translucent, with the internal ridges visible as fine lines. Around the edges of the picture the film is scratched and marked, and handwritten numbers appear reversed in the lower left corner.',
      notice: 'Pick one arm and zoom into its serrated edge. Count the notches along one side. Now do the same on the arm directly opposite and compare the two counts.',
      wonder: 'All six arms grew at the same moment in the same tiny patch of cloud. What would have to be true about that patch for them to come out so alike?' },
    { id: 'snowflake-1205', emoji: '🔬', name: 'Stellar Snowflake No. 1205 (Wilson Bentley)', type: 'iiif', cors: true, width: 3000, height: 2578,
      src: 'https://ids.si.edu/ids/iiif/SIA-SIA2013-09168',
      source: 'Smithsonian Archives', credit: 'Wilson A. Bentley photomicrograph, Smithsonian Institution Archives (CC0)', link: 'https://siarchives.si.edu/collections/siris_arc_308063',
      meta: 'a plate-shaped snow crystal with hexagons nested inside hexagons',
      describe: 'A black-and-white photograph of a single snow crystal, pale grey on a black circular background mounted on a white card. The crystal is a broad six-sided plate. At its centre is a small hexagon, surrounded by a larger hexagon, surrounded by a larger one again, each outlined by a fine ridge. From each of the six corners a short arm extends, ending in a smaller six-sided plate of its own, and each of those carries fainter internal markings. The outline is made of straight segments meeting at blunt corners rather than curves.',
      notice: 'Zoom right into the centre and count how many complete six-sided outlines you can find nested inside one another before the detail runs out.',
      wonder: 'Every corner here turns by the same amount, and the shape repeats at bigger and smaller sizes. What single rule about how the water joined up could produce all of that?' },
    { id: 'fan-coral', emoji: '🪸', name: 'Fan Coral Specimen (glass-plate photograph)', type: 'iiif', cors: true, width: 4932, height: 6761,
      src: 'https://ids.si.edu/ids/iiif/SIA-MNH-3917',
      source: 'Smithsonian Archives', credit: 'Smithsonian Institution Archives, natural history glass-plate negative (CC0)', link: 'https://ids.si.edu/ids/deliveryService?id=SIA-MNH-3917',
      meta: 'a museum sea-fan coral photographed on a glass plate about a century ago',
      describe: 'A tall black-and-white photograph of a dried sea-fan coral standing upright on a small wooden block against a plain grey studio background. The coral is pale, almost white, and shaped like a broad rounded fan. From a single thick stem at the bottom it divides into branches, and each branch divides again and again into finer and finer twigs, which cross and fuse with their neighbours to make a dense net of small irregular holes. The mesh is fine and even near the centre and becomes more open and feathery around the outer edge. The number 3917 is scratched into the plate at the upper left, and there are dark marks and blemishes down the right edge.',
      notice: 'Zoom into one place where a branch splits in two, then follow one of those halves until it splits again. Describe how the two splits compare in size and angle.',
      wonder: 'Trees, rivers and the airways in your lungs all branch in a similar way. What job might branching do well that a single thick stem could not?' },
    { id: 'chicago-1892', emoji: '🏙️', name: 'Bird’s-Eye View of Chicago, 1892', type: 'iiif', cors: true, width: 9904, height: 5648,
      src: 'https://tile.loc.gov/image-services/iiif/service:gmd:gmd410:g4104:g4104c:pm001510',
      source: 'Library of Congress', credit: 'Library of Congress, Geography and Map Division (no known restrictions)', link: 'https://www.loc.gov/item/75693206/',
      meta: 'a hand-drawn aerial view of a whole city, printed in 1892, with every building drawn individually',
      describe: 'A very large hand-drawn aerial view of a city, printed in brown and black ink on tan paper, looking across the city from high above. Lake Michigan fills the lower right corner, pale and open, dotted with sailing ships and steamers trailing smoke. The rest of the sheet is packed with a street grid running away to a hazy horizon at the top, and within the grid many thousands of individual buildings are drawn in tiny detail, becoming smaller and denser toward the top. A river and rail lines cut diagonally through the blocks, and a pier reaches into the lake near the middle of the shoreline. A small oval inset at the right shows a much emptier "View of Chicago in 1857". A numbered key runs along the bottom edge above the title "Bird’s Eye View of Chicago, 1892".',
      notice: 'Zoom deep into any one block away from the lake. Every building on it was drawn by hand. Pick one block and describe the buildings on it: how tall, how tightly packed, what shapes their roofs are.',
      wonder: 'Near the right edge there is a small inset picture of the same city thirty-five years earlier, and it is almost empty. Why might the mapmaker have chosen to put the old view on the new map?' }
  ];

  function fmt(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; });
  }
  function imgKey(item, field) { return 'img_' + String(item.id).replace(/-/g, '_') + '_' + field; }
  // Full key → English table (UI + catalog copy) so the companion window can be
  // resolved through ctx.t with one loop.
  function windowStringManifest() {
    var out = {};
    Object.keys(WIN).forEach(function (k) { out[k] = WIN[k]; });
    IMAGES.forEach(function (it) {
      out[imgKey(it, 'name')] = it.name; out[imgKey(it, 'meta')] = it.meta; out[imgKey(it, 'notice')] = it.notice; out[imgKey(it, 'wonder')] = it.wonder; out[imgKey(it, 'describe')] = it.describe;
    });
    return out;
  }

  // Enough halvings to bring the longest side down to one 512px tile. A fixed
  // list truncates deep zoom on big images: the 9904px Chicago sheet needs 32,
  // and stopping at 16 leaves its top level a 2x2 grid that never fits the frame.
  function scaleFactorsFor(width, height) {
    var out = [], f = 1, longest = Math.max(width || 0, height || 0);
    while (f < 4096) { out.push(f); if (longest / f <= 512) break; f *= 2; }
    return out;
  }
  function tileSourceFor(item) {
    if (item.type === 'iiif') {
      if (item.width && item.height) {
        return { '@context': 'http://iiif.io/api/image/2/context.json', '@id': item.src, protocol: 'http://iiif.io/api/image',
          width: item.width, height: item.height, tiles: [{ width: 512, scaleFactors: scaleFactorsFor(item.width, item.height) }], profile: ['http://iiif.io/api/image/2/level2.json'] };
      }
      return item.src.replace(/\/?$/, '') + (/info\.json$/.test(item.src) ? '' : '/info.json');
    }
    return { type: 'image', url: item.src, crossOriginPolicy: item.cors === false ? false : 'Anonymous' };
  }

  // ── OpenSeadragon loader (once per page) ─────────────────────────────
  var osdPromise = null;
  function loadOsd() {
    if (typeof window.OpenSeadragon === 'function') return Promise.resolve(window.OpenSeadragon);
    if (osdPromise) return osdPromise;
    osdPromise = new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; osdPromise = null; reject(new Error('timeout')); } }, 20000);
      try {
        var s = document.createElement('script');
        s.src = OSD_BASE + 'openseadragon.min.js'; s.async = true; s.crossOrigin = 'anonymous';
        s.onload = function () { if (done) return; done = true; clearTimeout(timer); if (typeof window.OpenSeadragon === 'function') resolve(window.OpenSeadragon); else { osdPromise = null; reject(new Error('no global')); } };
        s.onerror = function () { if (done) return; done = true; clearTimeout(timer); osdPromise = null; reject(new Error('script error')); };
        document.head.appendChild(s);
      } catch (e) { done = true; clearTimeout(timer); osdPromise = null; reject(e); }
    });
    return osdPromise;
  }

  function buildCoachPrompt(image, meta, notice, wonder, pins, zoom, hasSnapshot) {
    return [
      'You are a warm, Socratic OBSERVATION COACH for a K-12 student zooming into a real, openly-licensed image: "' + String(image || '').slice(0, 120) + '"' + (meta ? ' (' + String(meta).slice(0, 160) + ')' : '') + '.',
      'They wrote what they NOTICE:',
      '"' + String(notice || '(nothing yet)').slice(0, 600) + '"',
      'And what they WONDER:',
      '"' + String(wonder || '').slice(0, 600) + '"',
      pins ? 'They dropped pins on the spots they are describing (position as % across / % down the full image, and how far they had zoomed in):\n' + String(pins).slice(0, 400) : 'They have not pinned a spot yet.',
      zoom ? 'Their current zoom level is about ' + zoom + '× the fit-to-screen view.' : '',
      hasSnapshot ? 'The attached picture is exactly what is on their screen right now — refer to what is visible in it.' : '',
      'RULES:',
      '- At most 4 sentences, ending in exactly ONE question.',
      '- Build on their OWN observation — quote a few of their words back.',
      '- Never deliver the full textbook explanation. Point them to look harder at a specific detail (an edge, a texture, a repeated pattern, a bright spot) and reason about it.',
      '- If their notice is vague, ask them to zoom into ONE spot and describe exactly what is there.',
      '- Warm, grade-appropriate, jargon-free. Plain text only.'
    ].filter(Boolean).join('\n');
  }

  // `accent` is ink on the panel; `accentBtn` is the fill behind white button text.
  // They are separate because the dark accent (#0ea5e9) reads fine as a 700-weight
  // label but gives white text only 2.77:1 as a button fill — an axe-confirmed AA
  // failure in v2.0. The chip tokens are for the slabs that float over the image,
  // and are deliberately opaque: over an arbitrary photograph a translucent chip
  // has no computable contrast ratio and no guaranteed one either.
  function palette(theme) {
    if (theme === 'light') return { bg: '#f8fafc', panel: '#ffffff', panel2: '#f1f5f9', line: '#64748b', text: '#0f172a', dim: '#475569', accent: '#1d4ed8', accentBtn: '#1d4ed8', accentFg: '#ffffff', ok: '#047857', warn: '#92400e', selBg: '#dbeafe', selFg: '#1e3a8a', pin: '#b45309', stage: '#111827', chip: '#0f172a', chipFg: '#f1f5f9', chipLine: '#94a3b8', chipLink: '#bae6fd' };
    if (theme === 'contrast') return { bg: '#000000', panel: '#000000', panel2: '#0a0a0a', line: '#fbbf24', text: '#ffffff', dim: '#ffffff', accent: '#fbbf24', accentBtn: '#fbbf24', accentFg: '#000000', ok: '#00ff66', warn: '#ffff00', selBg: '#fbbf24', selFg: '#000000', pin: '#ffff00', stage: '#000000', chip: '#000000', chipFg: '#ffffff', chipLine: '#fbbf24', chipLink: '#ffff00' };
    return { bg: '#0f172a', panel: '#1e293b', panel2: '#273449', line: '#334155', text: '#e2e8f0', dim: '#94a3b8', accent: '#38bdf8', accentBtn: '#0369a1', accentFg: '#ffffff', ok: '#4ade80', warn: '#fbbf24', selBg: '#0c4a6e', selFg: '#e0f2fe', pin: '#f59e0b', stage: '#000000', chip: '#0f172a', chipFg: '#f1f5f9', chipLine: '#94a3b8', chipLink: '#bae6fd' };
  }

  window.StemLab.registerTool('zoomGallery', {
    icon: '🖼️',
    label: 'Zoom Gallery',
    desc: 'Zoom deep into real, openly-licensed images — Smithsonian Open Access artifacts (CC0) and famous NASA photographs (public domain) — in OpenSeadragon, the viewer museums use. Magnify to the pixel: the Pillars of Creation, an Apollo bootprint, the Apollo 11 capsule, a coral fan. A Notice → Wonder coach sits beside the viewer.',
    color: 'sky',
    category: 'creative',
    aliases: ['deep zoom', 'OpenSeadragon', 'NASA images', 'Smithsonian'],
    questHooks: [
      { id: 'zoom_open', label: 'Open an image and zoom in', icon: '🔍',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'zoom_notice', label: 'Record what you notice up close', icon: '🔬',
        check: function (d) { return !!(d && (d.noticedCount || 0) >= 1); } },
      { id: 'zoom_coach', label: 'Take your observation to the coach', icon: '💬',
        check: function (d) { return !!(d && (d.coachCount || 0) >= 1); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var theme = ctx.theme === 'light' || ctx.theme === 'contrast' ? ctx.theme : 'dark';
      var P = palette(theme);
      var slice = (ctx.toolData && ctx.toolData._zoomGallery) || {};
      var savedNotes = (slice.notes && typeof slice.notes === 'object') ? slice.notes : {};

      function W(key, vars) { var s = t('stem.zoomGallery.' + key, WIN[key]); return vars ? fmt(s, vars) : s; }
      function I(key, vars) { var s = t('stem.zoomGallery.' + key, INL[key]); return vars ? fmt(s, vars) : s; }
      function imgText(item, field) { return item.id === 'custom' ? item[field] : t('stem.zoomGallery.' + imgKey(item, field), item[field]); }
      function say(text) { if (announceToSR && text) announceToSR(text); }

      // ── State ──
      var _win = React.useRef(null);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];
      var _cur = React.useState(null); var currentId = _cur[0], setCurrentId = _cur[1];
      var _custom = React.useState(null); var customItem = _custom[0], setCustomItem = _custom[1];
      var _step = React.useState('notice'); var step = _step[0], setStep = _step[1];
      var _osd = React.useState('idle'); var osdState = _osd[0], setOsdState = _osd[1]; // idle|loading|ready|failed
      var _img = React.useState('idle'); var imgState = _img[0], setImgState = _img[1]; // idle|loading|open|failed
      var _pinMode = React.useState(false); var pinMode = _pinMode[0], setPinMode = _pinMode[1];
      var _zoom = React.useState(1); var zoomX = _zoom[0], setZoomX = _zoom[1];
      var _busy = React.useState(false); var busy = _busy[0], setBusy = _busy[1];
      var _copied = React.useState(''); var copied = _copied[0], setCopied = _copied[1];
      var _showDesc = React.useState(false); var showDesc = _showDesc[0], setShowDesc = _showDesc[1];
      var _navOn = React.useState(true); var navOn = _navOn[0], setNavOn = _navOn[1];
      var navOnRef = React.useRef(true);
      var _speaking = React.useState(''); var speaking = _speaking[0], setSpeaking = _speaking[1];
      var speakTokenRef = React.useRef(0);
      var speakTimerRef = React.useRef(null);
      var descId = React.useMemo(function () { return 'zg-desc-' + Math.random().toString(36).slice(2, 8); }, []);
      var descTextId = descId + '-text';
      var _customUrl = React.useState(''); var customUrl = _customUrl[0], setCustomUrl = _customUrl[1];
      var _customErr = React.useState(''); var customErr = _customErr[0], setCustomErr = _customErr[1];
      var _reflect = React.useRef(Math.floor(Math.random() * 5));
      var stageRef = React.useRef(null);
      var wrapRef = React.useRef(null);
      var viewerRef = React.useRef(null);
      var osdCanvasRef = React.useRef(null);
      var overlaysRef = React.useRef([]);
      var pinModeRef = React.useRef(false); pinModeRef.current = pinMode;
      var currentRef = React.useRef(null);

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');
      // The host does not provide ctx.lang; the app's actual signal is a global.
      // Used only to re-resolve strings when the language changes.
      var uiLang = ctx.lang || (typeof window !== 'undefined' ? window.__alloTextLanguage : null) || 'en';
      var current = currentId ? (customItem && customItem.id === currentId ? customItem : IMAGES.find(function (s) { return s.id === currentId; }) || null) : null;
      currentRef.current = current;
      var mem = current ? (savedNotes[current.id] || { notice: '', wonder: '', feedback: '', pins: [] }) : null;

      function updateSlice(fn) {
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._zoomGallery) || {});
          fn(cur);
          var next = Object.assign({}, prev); next._zoomGallery = cur; return next;
        });
      }
      function bumpSlice(key) {
        updateSlice(function (cur) { cur[key] = (cur[key] || 0) + 1; if (key === 'openedCount') cur.opened = true; });
      }
      function setNote(id, patch) {
        updateSlice(function (cur) {
          var notes = Object.assign({}, cur.notes || {});
          var m = Object.assign({ notice: '', wonder: '', feedback: '', pins: [] }, notes[id] || {}, patch);
          notes[id] = m; cur.notes = notes;
        });
      }
      function replaceNotes(all) {
        updateSlice(function (cur) {
          var notes = Object.assign({}, cur.notes || {});
          Object.keys(all || {}).forEach(function (id) {
            var n = all[id] || {};
            notes[id] = { notice: String(n.notice || ''), wonder: String(n.wonder || ''), feedback: String(n.feedback || ''), pins: Array.isArray(n.pins) ? n.pins.slice(0, 20) : [] };
          });
          cur.notes = notes;
        });
      }
      function nextReflect() { _reflect.current = (_reflect.current + 1) % 5; return W('reflect_' + (_reflect.current + 1)); }
      function pinsText(m) {
        if (!m || !m.pins || !m.pins.length) return '';
        return m.pins.map(function (p, i) { return W('pin_summary', { n: i + 1, x: Math.round(p.x * 100), y: Math.round(p.y * 100), z: p.z }); }).join('\n');
      }
      // useTarget picks OpenSeadragon's settled destination rather than the
      // mid-flight value. The readout wants the live number so it moves smoothly;
      // an announcement wants the target, or a screen reader is told "2.3 times"
      // about a zoom that is on its way to 2.6.
      function currentZoom(useTarget) {
        try {
          var v = viewerRef.current; if (!v || !v.world.getItemAt(0)) return 1;
          return Math.max(1, Math.round((v.viewport.getZoom(!useTarget) / v.viewport.getHomeZoom()) * 10) / 10);
        } catch (_) { return 1; }
      }
      // One code path for every way of dropping a pin (mouse click, keyboard Enter,
      // the explicit "pin the centre" button), so they cannot drift apart.
      function addPinAtViewportPoint(vpPoint) {
        var v = viewerRef.current; var it = currentRef.current;
        if (!v || !it || !vpPoint) return false;
        var item = v.world.getItemAt(0); if (!item) return false;
        var img = v.viewport.viewportToImageCoordinates(vpPoint);
        var size = item.getContentSize();
        var p = { x: Math.min(1, Math.max(0, img.x / size.x)), y: Math.min(1, Math.max(0, img.y / size.y)), z: currentZoom() };
        var placed = 0;
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._zoomGallery) || {});
          var notes = Object.assign({}, cur.notes || {});
          var m = Object.assign({ notice: '', wonder: '', feedback: '', pins: [] }, notes[it.id] || {});
          if (m.pins.length >= 20) return prev;
          m.pins = m.pins.concat([p]); placed = m.pins.length; notes[it.id] = m; cur.notes = notes;
          var next = Object.assign({}, prev); next._zoomGallery = cur; return next;
        });
        if (!placed) return false;
        say(W('pin_placed_sr', { n: placed, x: Math.round(p.x * 100), y: Math.round(p.y * 100), z: p.z }));
        setPinMode(false);
        return true;
      }
      function zoomBy(factor) {
        var v = viewerRef.current; if (!v || !v.world.getItemAt(0)) return;
        try { v.viewport.zoomBy(factor); v.viewport.applyConstraints(); } catch (_) { return; }
        say(W('zoom_announced', { z: currentZoom(true) }));
      }
      function zoomHome() {
        var v = viewerRef.current; if (!v || !v.world.getItemAt(0)) return;
        try { v.viewport.goHome(); } catch (_) { return; }
        say(W('fit_announced'));
      }
      function focusViewer() {
        var c = osdCanvasRef.current; if (c && typeof c.focus === 'function') { try { c.focus(); } catch (_) {} }
      }
      // Read-aloud through the house player. { force: true } is the sanctioned
      // bypass of the header mute for an action the student explicitly asked for;
      // nothing here ever speaks on its own.
      function speak(key, text) {
        if (typeof ctx.callTTS !== 'function' || !text) return;
        if (speaking) return;
        var token = ++speakTokenRef.current;
        var settle = function (failed) {
          if (speakTokenRef.current !== token) return;   // a newer request owns the UI
          clearTimeout(speakTimerRef.current);
          setSpeaking('');
          if (failed) say(W('read_aloud_failed'));
        };
        setSpeaking(key);
        // A call that never settles must not leave the control dead forever.
        clearTimeout(speakTimerRef.current);
        speakTimerRef.current = setTimeout(function () { settle(true); }, 30000);
        Promise.resolve(ctx.callTTS(String(text), null, null, { force: true }))
          .then(function (url) { settle(!url); })
          .catch(function () { settle(true); });
      }
      function speakBtn(key, text, label) {
        if (typeof ctx.callTTS !== 'function' || !text) return null;
        var busy = speaking === key;
        return h('button', { type: 'button', onClick: function () { speak(key, text); }, disabled: busy,
          'aria-label': label || W('read_aloud'), title: label || W('read_aloud'),
          style: Object.assign({}, btnBase, { padding: '4px 8px', fontSize: '0.6875rem' }, busy ? { opacity: 0.6, cursor: 'progress' } : null) },
          busy ? '🔊 ' + W('read_aloud_busy') : '🔊');
      }
      function snapshotForCoach() {
        try {
          var v = viewerRef.current; var it = currentRef.current;
          if (!v || !it || it.cors === false) return null;
          var src = v.drawer && v.drawer.canvas; if (!src || !src.width) return null;
          var scale = Math.min(1, 768 / Math.max(src.width, src.height));
          var c = document.createElement('canvas'); c.width = Math.round(src.width * scale); c.height = Math.round(src.height * scale);
          c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
          return { data: c.toDataURL('image/jpeg', 0.72).split(',')[1], mime: 'image/jpeg' };
        } catch (_) { return null; }
      }
      function runCoach(imageName, meta, notice, wonder, pins, zoom, snapshot, mime) {
        var hasShot = !!(snapshot && typeof ctx.callGeminiVision === 'function');
        var prompt = buildCoachPrompt(imageName, meta, notice, wonder, pins, zoom, hasShot);
        return Promise.resolve().then(function () {
          return hasShot ? ctx.callGeminiVision(prompt, snapshot, mime || 'image/jpeg') : ctx.callGemini(prompt, false, false, 0.7);
        }).then(function (resp) {
          var text = (typeof resp === 'string') ? resp : ((resp && (resp.text || resp.output || resp.response)) || '');
          return { text: String(text || '').slice(0, 1000) };
        }).catch(function (e) { return { error: String((e && e.message) || e).slice(0, 120) }; });
      }

      // ── Pop-out bridge ──
      React.useEffect(function () {
        var popup = _win.current;
        if (!popup || popup.closed) return;
        try { popup.postMessage({ type: 'alloflow-theme-change', theme: theme }, '*'); } catch (_) {}
      }, [theme]);
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string' || data.type.indexOf('alloczoom-') !== 0) return;
          if (data.type === 'alloczoom-hello') {
            var manifest = (data.strings && typeof data.strings === 'object') ? data.strings : windowStringManifest();
            var resolved = {};
            Object.keys(manifest).forEach(function (k) { resolved[k] = t('stem.zoomGallery.' + k, manifest[k]); });
            var notes = ((ctx.toolData && ctx.toolData._zoomGallery && ctx.toolData._zoomGallery.notes) || {});
            try { if (ev.source) ev.source.postMessage({ type: 'alloczoom-ready', ai: aiOn, tts: typeof ctx.callTTS === 'function', strings: resolved, notes: notes }, '*'); } catch (_) {}
            setPopupState('open');
            return;
          }
          if (data.type === 'alloczoom-closed') { setPopupState('closed'); return; }
          if (data.type === 'alloczoom-noticed') { bumpSlice('noticedCount'); return; }
          if (data.type === 'alloczoom-coached') { bumpSlice('coachCount'); return; }
          if (data.type === 'alloczoom-imgopened') { bumpSlice('openedCount'); return; }
          if (data.type === 'alloczoom-notes') { if (data.notes && typeof data.notes === 'object') replaceNotes(data.notes); return; }
          if (data.type === 'alloczoom-speak') {
            // The pop-out has no host of its own; it asks us to read aloud.
            var back = ev.source || _win.current;
            var reply = function (ok) { try { if (back) back.postMessage({ type: 'alloczoom-speak-result', id: data.id, ok: !!ok }, '*'); } catch (_) {} };
            if (typeof ctx.callTTS !== 'function' || !data.text) { reply(false); return; }
            Promise.resolve(ctx.callTTS(String(data.text).slice(0, 4000), null, null, { force: true }))
              .then(function (url) { reply(!!url); })
              .catch(function () { reply(false); });
            return;
          }
          if (data.type !== 'alloczoom-ai-request' || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'alloczoom-ai-response', id: data.id }, payload), '*'); } catch (_) {}
          };
          if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
          bumpSlice('coachCount');
          runCoach(data.image, data.meta, data.notice, data.wonder, data.pins, data.zoom, data.snapshot, data.mime).then(respond);
        }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, [aiOn, ctx.toolData, uiLang]);

      function openPopout(imgId) {
        var existing = _win.current;
        if (existing && !existing.closed) { try { existing.focus(); } catch (_) {} return; }
        var url = ZOOM_GALLERY_URL + '&theme=' + encodeURIComponent(ctx.theme || 'dark') + (imgId && imgId !== 'custom' ? '&img=' + encodeURIComponent(imgId) : '');
        var w = null;
        try { w = window.open(url, 'alloflow-zoom-gallery', 'width=1280,height=860'); } catch (_) { w = null; }
        if (!w) { setPopupState('blocked'); say(I('popup_blocked')); return; }
        _win.current = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        say(I('opened_sr'));
      }

      // ── Inline viewer lifecycle ──
      React.useEffect(function () {
        if (!currentId) return;
        var cancelled = false;
        setOsdState(function (s) { return s === 'ready' ? s : 'loading'; });
        setImgState('loading');
        loadOsd().then(function (OSD) {
          if (cancelled) return;
          setOsdState('ready');
          var el = stageRef.current; if (!el) return;
          var v = viewerRef.current;
          // Whether the navigator inset is shown decides how wide the credit line
          // may be: at the same corner they overlapped.
          var navOn = (el.clientWidth || 0) >= 480;
          if (navOnRef.current !== navOn) { navOnRef.current = navOn; setNavOn(navOn); }
          if (!v) {
            v = OSD({
              element: el,
              prefixUrl: OSD_BASE + 'images/',
              // The navigator inset sits where the credit chip sits, and on a phone
              // it eats a third of an already small stage.
              showNavigator: navOn,
              navigatorPosition: 'BOTTOM_RIGHT',
              // OpenSeadragon's own zoom cluster renders as focusable <div>s with no
              // accessible name, so a keyboard user tabs into four anonymous stops.
              // We draw our own labelled buttons instead.
              showNavigationControl: false,
              gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
              maxZoomPixelRatio: 2.5,
              visibilityRatio: 1,
              constrainDuringPan: true,
              // IIIF tiles are CORS-open: load anonymously so the canvas stays clean
              // for the coach snapshot. NASA items override this to false per open().
              crossOriginPolicy: 'Anonymous',
              ajaxWithCredentials: false
            });
            v.addHandler('zoom', function () { setZoomX(currentZoom()); });
            v.addHandler('canvas-click', function (ev) {
              if (!pinModeRef.current || !ev.quick) return;
              var vp = v.viewport.pointFromPixel(ev.position);
              if (addPinAtViewportPoint(vp)) ev.preventDefaultAction = true;
            });
            // Keyboard parity for pinning. OpenSeadragon already handles arrows and
            // +/- on its canvas element; without this, marking a detail needed a
            // mouse, so a keyboard-only student could pan to the spot and then had
            // no way to say "here".
            try {
              var canvasEl = v.canvas || el.querySelector('.openseadragon-canvas');
              if (canvasEl) {
                osdCanvasRef.current = canvasEl;
                canvasEl.addEventListener('keydown', function (e) {
                  if (!pinModeRef.current) return;
                  if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
                  e.preventDefault(); e.stopPropagation();
                  addPinAtViewportPoint(v.viewport.getCenter(true));
                });
              }
            } catch (_) {}
            viewerRef.current = v;
          }
          var it = currentRef.current; if (!it) return;
          var settled = false;
          var onOpen = function () { if (settled) return; settled = true; if (!cancelled) { setImgState('open'); setZoomX(1); say(I('image_opened_sr', { name: imgText(it, 'name') })); } v.removeHandler('open', onOpen); v.removeHandler('open-failed', onFail); };
          var onFail = function () { if (settled) return; settled = true; if (!cancelled) setImgState('failed'); v.removeHandler('open', onOpen); v.removeHandler('open-failed', onFail); };
          v.addHandler('open', onOpen);
          v.addHandler('open-failed', onFail);
          var ts = tileSourceFor(it);
          try { v.open(it.cors === false ? { tileSource: ts, crossOriginPolicy: false } : ts); } catch (e) { onFail(); }
        }).catch(function () { if (!cancelled) { setOsdState('failed'); setImgState('failed'); } });
        return function () { cancelled = true; };
      }, [currentId]);

      // Name the thing that actually takes focus. OpenSeadragon gives its canvas
      // div tabindex=0 but no role and no name, so it lands in the tab order as an
      // unlabelled stop; and an aria-label on our plain wrapper <div> is ignored
      // (aria-prohibited-attr) because a bare div has no role to carry it.
      React.useEffect(function () {
        var c = osdCanvasRef.current;
        if (!c || !current || imgState !== 'open') return;
        try {
          c.setAttribute('role', 'application');
          c.setAttribute('aria-label', W('viewer_aria', { name: imgText(current, 'name') }));
          // Point at the description text ONLY. Pointed at the whole panel, the
          // accessible description came back as the intro paragraph about
          // descriptions, and the actual picture was never read.
          if (imgText(current, 'describe')) c.setAttribute('aria-describedby', descTextId);
          else c.removeAttribute('aria-describedby');
        } catch (_) {}
      }, [currentId, imgState, uiLang]);

      // Leaving a picture abandons any speech request that belongs to it.
      React.useEffect(function () {
        speakTokenRef.current++;
        clearTimeout(speakTimerRef.current);
        setSpeaking('');
      }, [currentId]);

      // Destroy the viewer on unmount (releases its canvases and listeners).
      React.useEffect(function () {
        return function () {
          try { if (viewerRef.current) viewerRef.current.destroy(); } catch (_) {}
          viewerRef.current = null; overlaysRef.current = [];
          clearTimeout(speakTimerRef.current);
        };
      }, []);

      // Redraw pin overlays whenever the pins or the open image change.
      var pinSig = mem ? mem.pins.map(function (p) { return p.x.toFixed(4) + ',' + p.y.toFixed(4); }).join('|') : '';
      React.useEffect(function () {
        var v = viewerRef.current; if (!v || imgState !== 'open') return;
        overlaysRef.current.forEach(function (o) { try { v.removeOverlay(o); } catch (_) {} });
        overlaysRef.current = [];
        var item = v.world.getItemAt(0); if (!item || !mem) return;
        var size = item.getContentSize();
        mem.pins.forEach(function (p, i) {
          var d = document.createElement('div');
          d.setAttribute('aria-hidden', 'true');
          d.textContent = String(i + 1);
          d.style.cssText = 'width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:' + P.pin + ';color:#000;font:700 0.75rem/22px system-ui,sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.6);pointer-events:none;';
          v.addOverlay({ element: d, location: v.viewport.imageToViewportCoordinates(p.x * size.x, p.y * size.y), placement: 'CENTER', checkResize: false });
          overlaysRef.current.push(d);
        });
      }, [pinSig, imgState, currentId, P.pin]);

      function openImage(id) {
        setPinMode(false); setStep('notice'); setCopied('');
        setCurrentId(id);
        bumpSlice('openedCount');
      }
      function backToGallery() {
        setPinMode(false);
        try { if (viewerRef.current) viewerRef.current.close(); } catch (_) {}
        overlaysRef.current = [];
        setCurrentId(null); setImgState('idle');
      }
      function openCustom() {
        setCustomErr('');
        var url = String(customUrl || '').trim();
        if (!/^https:\/\/\S+/i.test(url)) { setCustomErr(W('custom_err_url')); return; }
        var base = { id: 'custom', emoji: '🖼️', name: W('custom_name'), source: '', credit: W('custom_credit'), link: url, meta: url, notice: W('custom_notice'), wonder: W('custom_wonder') };
        if (/info\.json(\?|$)/i.test(url)) {
          fetch(url, { mode: 'cors' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function (info) {
            if (!info || !info.width || !info.height) throw new Error('bad info');
            setCustomItem(Object.assign(base, { type: 'iiif', cors: true, width: info.width, height: info.height, src: url.replace(/\/info\.json.*$/i, '') }));
            setNote('custom', { notice: '', wonder: '', feedback: '', pins: [] });
            openImage('custom');
          }).catch(function () { setCustomErr(W('custom_err_iiif')); });
          return;
        }
        setCustomItem(Object.assign(base, { type: 'image', cors: false, src: url }));
        setNote('custom', { notice: '', wonder: '', feedback: '', pins: [] });
        openImage('custom');
      }
      function notesText() {
        var lines = [W('notes_header'), ''];
        IMAGES.concat(customItem ? [customItem] : []).forEach(function (it) {
          var m = savedNotes[it.id]; if (!m || !((m.notice || '').trim() || (m.wonder || '').trim() || (m.pins && m.pins.length))) return;
          lines.push('## ' + imgText(it, 'name'));
          if ((m.notice || '').trim()) lines.push(W('you_noticed') + ' ' + m.notice.trim());
          if ((m.wonder || '').trim()) lines.push(W('you_wondered') + ' ' + m.wonder.trim());
          var pt = pinsText(m); if (pt) lines.push(pt);
          if (m.feedback) lines.push('> ' + m.feedback);
          lines.push('');
        });
        return lines.join('\n');
      }
      function copyNotes() {
        var text = notesText();
        var done = function (ok) { setCopied(ok ? W('copied') : W('copy_failed')); setTimeout(function () { setCopied(''); }, 2200); };
        var legacy = function () { try { var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); return !!ok; } catch (_) { return false; } };
        if (typeof window.alloCopyText === 'function') { Promise.resolve(window.alloCopyText(text)).then(function (r) { done(r !== false); }, function () { done(legacy()); }); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacy()); }); return; }
        done(legacy());
      }
      function askCoach() {
        if (!current || !mem || busy) return;
        if (!aiOn) { setNote(current.id, { feedback: nextReflect() }); bumpSlice('coachCount'); return; }
        if (!(mem.notice || '').trim()) { setStep('notice'); return; }
        setBusy(true);
        bumpSlice('coachCount');
        var shot = snapshotForCoach();
        var id = current.id;
        runCoach(imgText(current, 'name'), imgText(current, 'meta'), mem.notice, mem.wonder, pinsText(mem), currentZoom(), shot && shot.data, shot && shot.mime).then(function (res) {
          var text = res && !res.error && res.text ? String(res.text).trim() : '';
          setNote(id, { feedback: text || W('ai_no_answer', { err: res && res.error ? ' (' + res.error + ')' : '', prompt: nextReflect() }) });
          setBusy(false);
          say(I('coach_answered_sr'));
        });
      }
      function toggleFullscreen() {
        var el = wrapRef.current; if (!el) return;
        if (typeof window.__alloStemFS === 'function') { try { window.__alloStemFS(el); } catch (_) {} }
      }
      function returnToCatalog() {
        if (typeof setStemLabTool !== 'function') return;
        setStemLabTool(null);
        say(I('returned_catalog_sr'));
      }

      // ── Render helpers ──
      var btnBase = { borderRadius: 8, padding: '7px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: '1px solid ' + P.line, background: P.panel2, color: P.text };
      var goBtn = { borderRadius: 8, padding: '9px 14px', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', border: 'none', background: P.accentBtn, color: P.accentFg };
      // Chips float over the photograph, so they carry their own opaque ground.
      var chipBox = { background: P.chip, color: P.chipFg, border: '1px solid ' + P.chipLine, borderRadius: 8 };
      var chipBtn = { background: P.chip, color: P.chipFg, border: '1px solid ' + P.chipLine, borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' };
      // The zoom trio carries a single glyph each, so it needs an explicit size
      // or it reads as three cramped specks next to a worded button.
      var zoomBtn = Object.assign({}, chipBtn, { minWidth: 38, minHeight: 34, padding: '4px 8px', fontSize: '0.9375rem', lineHeight: 1 });
      var card = { background: P.panel2, border: '1px solid ' + P.line, borderRadius: 10, padding: '9px 11px', fontSize: '0.8125rem', lineHeight: 1.5, color: P.text };
      var ta = { width: '100%', minHeight: 84, background: P.bg, border: '1px solid ' + P.line, color: P.text, borderRadius: 8, padding: '8px 10px', fontSize: '0.8125rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' };

      function renderPicker() {
        return h('div', null,
          h('p', { style: { fontSize: '0.8125rem', color: P.dim, margin: '0 0 10px', lineHeight: 1.5 } }, W('picker_heading')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 } },
            IMAGES.map(function (s) {
              var thumbUrl = s.thumb || (s.type === 'iiif' ? s.src + '/full/320,/0/default.jpg' : null);
              return h('button', { key: s.id, type: 'button', onClick: function () { openImage(s.id); },
                'aria-label': imgText(s, 'name'),
                // A column so the badge sits on the card's own bottom edge; with
                // captions of different lengths the badges were landing at a
                // different height in every card.
                style: { background: P.panel, border: '1px solid ' + P.line, borderRadius: 12, padding: '0 0 10px', cursor: 'pointer', textAlign: 'left', color: P.text, font: 'inherit', overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
                thumbUrl ? h('img', { src: thumbUrl, alt: '', loading: 'lazy', style: { display: 'block', width: '100%', height: 120, objectFit: 'cover', background: '#000' },
                  onError: function (e) { try { e.currentTarget.style.display = 'none'; } catch (_) {} } }) : null,
                h('div', { style: { fontWeight: 700, fontSize: '0.8125rem', margin: '8px 12px 3px' } }, s.emoji + ' ' + imgText(s, 'name')),
                h('div', { style: { fontSize: '0.6875rem', color: P.dim, lineHeight: 1.4, margin: '0 12px' } }, imgText(s, 'meta') + ' · ' + s.source),
                h('span', { style: { display: 'inline-block', alignSelf: 'flex-start', marginTop: 'auto', fontSize: '0.625rem', fontWeight: 700, color: P.accent, border: '1px solid ' + P.accent, borderRadius: 999, padding: '1px 7px', margin: 'auto 12px 0' } }, s.type === 'iiif' ? W('badge_deep') : W('badge_photo'))
              );
            })
          ),
          h('div', { style: { marginTop: 14, background: P.panel, border: '1px solid ' + P.line, borderRadius: 12, padding: 12 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: '0.8125rem', color: P.text } }, W('custom_heading')),
            h('p', { style: { margin: '0 0 8px', fontSize: '0.71875rem', color: P.dim, lineHeight: 1.45 } }, W('custom_help')),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('input', { type: 'url', value: customUrl, placeholder: W('custom_placeholder'), 'aria-label': W('custom_input_aria'),
                onChange: function (e) { setCustomUrl(e.target.value); },
                onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); openCustom(); } },
                style: { flex: '1 1 260px', background: P.bg, color: P.text, border: '1px solid ' + P.line, borderRadius: 8, padding: '7px 9px', fontSize: '0.8125rem' } }),
              h('button', { type: 'button', onClick: openCustom, style: goBtn }, W('custom_open'))
            ),
            customErr ? h('div', { role: 'alert', style: { color: P.warn, fontSize: '0.71875rem', marginTop: 6 } }, customErr) : null
          )
        );
      }

      function renderCoach() {
        if (!current || !mem) return h('div', { style: card }, W('intro_card'));
        var tabBtn = function (key, label) {
          var sel = step === key;
          var done = key === 'notice' ? !!(mem.notice || '').trim() : key === 'wonder' ? !!(mem.wonder || '').trim() : !!mem.feedback;
          return h('button', { key: key, role: 'tab', 'aria-selected': sel ? 'true' : 'false', onClick: function () { setStep(key); },
            style: Object.assign({}, btnBase, { flex: 1, padding: '6px 4px', fontSize: '0.71875rem', background: sel ? P.selBg : P.panel2, color: sel ? P.selFg : (done ? P.ok : P.dim), borderColor: sel ? P.accent : P.line }) }, label);
        };
        var body;
        if (step === 'notice') {
          body = [
            h('div', { key: 'q', style: card },
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start' } },
                h('span', { style: { flex: '1 1 auto' } }, '🔍 ' + imgText(current, 'notice')),
                speakBtn('notice', imgText(current, 'notice'), W('read_prompt')))),
            h('textarea', { key: 'ta', value: mem.notice, 'aria-label': W('notice_label'), placeholder: W('notice_placeholder'), style: ta,
              onChange: function (e) { setNote(current.id, { notice: e.target.value }); } }),
            pinsText(mem) ? h('div', { key: 'pins', style: { fontSize: '0.75rem', color: P.dim, lineHeight: 1.5, whiteSpace: 'pre-wrap' } }, h('b', null, W('pins_heading')), '\n' + pinsText(mem)) : null,
            h('button', { key: 'go', type: 'button', style: goBtn, onClick: function () { if ((mem.notice || '').trim()) bumpSlice('noticedCount'); setStep('wonder'); } }, W('to_wonder'))
          ];
        } else if (step === 'wonder') {
          body = [
            h('div', { key: 'q', style: card },
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start' } },
                h('span', { style: { flex: '1 1 auto' } }, '💭 ' + imgText(current, 'wonder')),
                speakBtn('wonder', imgText(current, 'wonder'), W('read_prompt')))),
            h('textarea', { key: 'ta', value: mem.wonder, 'aria-label': W('wonder_label'), placeholder: W('wonder_placeholder'), style: ta,
              onChange: function (e) { setNote(current.id, { wonder: e.target.value }); } }),
            (mem.notice || '').trim() ? h('div', { key: 'rem', style: Object.assign({}, card, { borderColor: P.accent, whiteSpace: 'pre-wrap', fontSize: '0.78125rem' }) }, h('b', { style: { color: P.accent } }, W('you_noticed')), '\n' + mem.notice) : null,
            h('button', { key: 'go', type: 'button', style: goBtn, onClick: function () { setStep('coach'); } }, W('to_coach'))
          ];
        } else {
          body = [
            h('button', { key: 'ask', type: 'button', style: Object.assign({}, goBtn, busy ? { opacity: 0.55, cursor: 'not-allowed' } : {}), disabled: busy, onClick: askCoach },
              busy ? W('thinking') : (aiOn ? W('ask_ai') : W('ask_prompt'))),
            (mem.notice || '').trim() ? h('div', { key: 'rem', style: Object.assign({}, card, { borderColor: P.accent, whiteSpace: 'pre-wrap', fontSize: '0.78125rem' }) },
              h('b', { style: { color: P.accent } }, W('you_noticed')), '\n' + mem.notice,
              (mem.wonder || '').trim() ? ['\n\n', h('b', { key: 'w', style: { color: P.accent } }, W('you_wondered')), '\n' + mem.wonder] : null,
              pinsText(mem) ? '\n\n' + pinsText(mem) : null) : null,
            mem.feedback ? h('div', { key: 'fb', role: 'status', style: Object.assign({}, card, { borderColor: P.accent, whiteSpace: 'pre-wrap' }) },
              mem.feedback,
              speakBtn('feedback', mem.feedback) ? h('div', { style: { marginTop: 8 } }, speakBtn('feedback', mem.feedback)) : null) : null,
            h('div', { key: 'row', style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
              h('button', { type: 'button', style: btnBase, onClick: copyNotes }, copied || W('copy_notes')),
              h('span', { style: { fontSize: '0.65625rem', color: P.dim } }, I('notes_saved')))
          ];
        }
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { role: 'tablist', 'aria-label': W('steps_aria'), style: { display: 'flex', gap: 4 } }, tabBtn('notice', W('step_notice')), tabBtn('wonder', W('step_wonder')), tabBtn('coach', W('step_coach'))),
          body
        );
      }

      var stageMsg = null;
      if (current) {
        if (osdState === 'failed') stageMsg = I('viewer_blocked');
        else if (imgState === 'failed') stageMsg = W('image_failed', { name: imgText(current, 'name') });
        else if (imgState !== 'open') stageMsg = W('loading', { name: imgText(current, 'name') });
      }

      return h('div', { ref: wrapRef, className: 'flex flex-col gap-3 animate-in fade-in duration-300',
        // Painted ground: the host card is white in both themes, and these inks assume slate.
        style: { background: P.bg, color: P.text, borderRadius: 14, padding: 14, minWidth: 0 } },
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
          typeof setStemLabTool === 'function' && h('button', { onClick: returnToCatalog, type: 'button', style: btnBase, 'aria-label': I('back_to_tools') },
            ArrowLeft ? h(ArrowLeft, { size: 14, style: { display: 'inline', verticalAlign: '-2px', marginRight: 4 } }) : null, I('back_to_tools')),
          h('h2', { style: { margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: P.text, flex: '1 1 auto' } }, I('title')),
          current ? h('button', { type: 'button', style: btnBase, onClick: backToGallery }, W('back_gallery')) : null,
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: P.dim } },
            h('span', { className: 'sr-only' }, W('select_label')),
            h('select', { value: current && current.id !== 'custom' ? current.id : '', 'aria-label': W('select_label'),
              onChange: function (e) { if (e.target.value) openImage(e.target.value); },
              style: { background: P.bg, color: P.text, border: '1px solid ' + P.line, borderRadius: 8, padding: '6px 8px', fontSize: '0.8125rem', maxWidth: '46vw' } },
              h('option', { value: '' }, W('select_placeholder')),
              IMAGES.map(function (s) { return h('option', { key: s.id, value: s.id }, s.emoji + ' ' + imgText(s, 'name')); }))),
          h('button', { type: 'button', style: btnBase, onClick: function () { openPopout(current && current.id); }, title: I('pop_out_title'), 'aria-label': I('pop_out_title') }, I('pop_out')),
          current && typeof window.__alloStemFS === 'function' ? h('button', { type: 'button', style: btnBase, onClick: toggleFullscreen }, I('fullscreen')) : null
        ),
        !current ? h('p', { style: { margin: 0, fontSize: '0.8125rem', color: P.dim, lineHeight: 1.55 } }, I('blurb')) : null,
        h('div', { style: { fontSize: '0.71875rem', color: P.dim } }, aiOn ? '✨ ' + I('ai_inline_on') : '🌱 ' + I('ai_inline_off')),
        popupState === 'blocked' ? h('p', { role: 'alert', style: { margin: 0, fontSize: '0.75rem', color: P.warn } }, I('blocked_note')) : null,
        popupState === 'open' ? h('p', { style: { margin: 0, fontSize: '0.75rem', color: P.ok } }, I('open_note')) : null,
        popupState === 'closed' ? h('p', { style: { margin: 0, fontSize: '0.75rem', color: P.dim } }, I('closed_note')) : null,

        h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' } },
          // Stage (or picker)
          h('div', { style: { flex: '1 1 520px', minWidth: 0, position: 'relative', background: current ? P.stage : 'transparent', borderRadius: 12, border: current ? '1px solid ' + P.line : 'none', overflow: 'hidden', minHeight: current ? 'min(64vh, 720px)' : 0 } },
            current ? h('div', { ref: stageRef, style: { position: 'absolute', inset: 0, cursor: pinMode ? 'crosshair' : undefined } }) : renderPicker(),
            current ? h('div', { style: { position: 'absolute', top: 8, left: 8, right: 8, zIndex: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' } },
              h('button', { type: 'button', 'aria-pressed': pinMode ? 'true' : 'false', onClick: function () { var on = !pinMode; setPinMode(on); if (on) { focusViewer(); say(W('pin_hint')); } },
                style: Object.assign({}, chipBtn, pinMode ? { color: P.pin, borderColor: P.pin } : null) },
                pinMode ? W('pin_drop_active', { n: mem.pins.length + 1 }) : W('pin_drop')),
              pinMode ? h('button', { type: 'button', onClick: function () { var v = viewerRef.current; if (v) addPinAtViewportPoint(v.viewport.getCenter(true)); }, style: chipBtn }, W('pin_center')) : null,
              mem.pins.length ? h('button', { type: 'button', onClick: function () { setNote(current.id, { pins: [] }); say(I('pins_cleared_sr')); }, style: chipBtn }, W('pin_clear')) : null,
              // Our own zoom controls: OpenSeadragon's are unlabelled focusable divs.
              h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6 } },
                h('button', { type: 'button', 'aria-label': W('zoom_in'), title: W('zoom_in'), onClick: function () { zoomBy(1.6); }, style: zoomBtn }, '＋'),
                h('button', { type: 'button', 'aria-label': W('zoom_out'), title: W('zoom_out'), onClick: function () { zoomBy(1 / 1.6); }, style: zoomBtn }, '－'),
                h('button', { type: 'button', 'aria-label': W('zoom_fit'), title: W('zoom_fit'), onClick: zoomHome, style: zoomBtn }, '⤢'))) : null,
            current && imgState === 'open' ? h('div', { 'aria-hidden': 'true', style: Object.assign({}, chipBox, { position: 'absolute', top: 48, right: 8, zIndex: 6, fontSize: '0.6875rem', padding: '3px 8px' }) }, W('zoom_readout', { z: zoomX })) : null,
            stageMsg ? h('div', { role: 'status', style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.chipFg, fontSize: '0.8125rem', zIndex: 3, textAlign: 'center', padding: 20, pointerEvents: 'none' } }, stageMsg) : null,
            current && imgState === 'open' ? h('div', { style: Object.assign({}, chipBox, { position: 'absolute', bottom: 8, left: 8, right: navOn ? 218 : 8, zIndex: 6, fontSize: '0.65625rem', padding: '4px 9px', lineHeight: 1.35, pointerEvents: 'none' }) },
              '📷 ' + current.credit + ' · ', h('a', { href: current.link, target: '_blank', rel: 'noopener noreferrer', style: { color: P.chipLink, textDecoration: 'underline', pointerEvents: 'auto', display: 'inline-block', padding: '5px 2px' } }, W('source_record'))) : null
          ),
          // Coach
          // alignSelf keeps the coach only as tall as it needs to be. Stretching
          // it to match the stage left a bordered empty column — about 1,400px of
          // it on the picker, where the coach has one sentence to say.
          h('aside', { 'aria-label': W('coach_aria'), style: { flex: '0 1 300px', minWidth: 240, alignSelf: 'flex-start', background: P.panel, border: '1px solid ' + P.line, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
            h('h3', { style: { margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: P.dim } }, W('coach_heading')),
            renderCoach(),
            // Text alternative for the picture itself. A deep-zoom viewer is a
            // canvas: without this there is nothing for a screen reader to read,
            // and no way into Notice/Wonder for a student who cannot see it.
            current && imgText(current, 'describe') ? h('div', { style: { marginTop: 4 } },
              h('button', { type: 'button', onClick: function () { setShowDesc(!showDesc); }, 'aria-expanded': showDesc ? 'true' : 'false', 'aria-controls': descId, style: btnBase },
                (showDesc ? '▾ ' : '▸ ') + (showDesc ? W('describe_hide') : W('describe_show'))),
              h('div', { id: descId, hidden: !showDesc, style: Object.assign({}, card, { marginTop: 6, fontSize: '0.78125rem' }) },
                h('p', { style: { margin: '0 0 6px', fontSize: '0.6875rem', color: P.dim, lineHeight: 1.45 } }, W('describe_intro')),
                h('p', { id: descTextId, style: { margin: 0 } }, imgText(current, 'describe')),
                speakBtn('describe', imgText(current, 'describe')) ? h('div', { style: { marginTop: 8 } }, speakBtn('describe', imgText(current, 'describe'))) : null)) : null,
            h('p', { style: { margin: '2px 0 0', fontSize: '0.65625rem', color: P.dim, lineHeight: 1.45 } }, I('inline_hint'))
          )
        ),
        h('p', { style: { margin: 0, fontSize: '0.6875rem', color: P.dim, lineHeight: 1.5 } }, I('credit'))
      );
    }
  });
  console.log('[StemLab] stem_tool_zoomgallery.js loaded — Zoom Gallery v2 (inline OpenSeadragon + Notice-Wonder coach)');
})();
