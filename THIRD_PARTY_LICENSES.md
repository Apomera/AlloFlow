# Third-Party Licenses & Notices

AlloFlow itself is licensed under the **GNU Affero General Public License v3.0**
(see [`LICENSE`](./LICENSE)). It is built on the open-source work listed below.
This file is the consolidated NOTICES surface that backs the in-app
**About → Open Source** tab (the live, human-facing attribution list, defined in
`view_info_modal_source.jsx` → `OSS_CREDITS`). Keep the two in sync when a runtime
dependency is added or removed — `dev-tools/check_oss_credits.cjs` enforces this.

Each entry below carries the dependency's **own copyright notice**, reproduced so
that the notice-retention condition of the permissive licenses (MIT, BSD, ISC) and
the attribution requirements of the copyleft and Creative Commons licenses are met
directly in this file — not by pointing elsewhere.

## Full license texts ship with the source

The complete, verbatim text of every non-trivial license used here is bundled in
the [`licenses/`](./licenses) directory, so the attribution travels with the code
even offline (this matters for the **School Box** desktop app, which is designed to
run with no internet):

| License | Bundled text |
|---|---|
| Apache-2.0 | [`licenses/Apache-2.0.txt`](./licenses/Apache-2.0.txt) |
| MPL-2.0 | [`licenses/MPL-2.0.txt`](./licenses/MPL-2.0.txt) |
| SIL OFL-1.1 | [`licenses/OFL-1.1.txt`](./licenses/OFL-1.1.txt) |
| GPL-2.0 | [`licenses/GPL-2.0.txt`](./licenses/GPL-2.0.txt) |
| GPL-3.0 | [`licenses/GPL-3.0.txt`](./licenses/GPL-3.0.txt) |
| LGPL-2.1 | [`licenses/LGPL-2.1.txt`](./licenses/LGPL-2.1.txt) |
| LGPL-3.0 | [`licenses/LGPL-3.0.txt`](./licenses/LGPL-3.0.txt) |
| CC BY 4.0 | [`licenses/CC-BY-4.0.txt`](./licenses/CC-BY-4.0.txt) |
| CC BY-SA 4.0 | [`licenses/CC-BY-SA-4.0.txt`](./licenses/CC-BY-SA-4.0.txt) |
| CC0 1.0 | [`licenses/CC0-1.0.txt`](./licenses/CC0-1.0.txt) |

The short permissive licenses (MIT, ISC, BSD-2-Clause, BSD-3-Clause) are reproduced
in full at the end of this file; each dependency's specific copyright line is in its
row below.

> Note: hosted AI features use the provider configured in AlloFlow — for example,
> Gemini (and optionally Imagen), OpenAI, Claude, or an OpenAI-compatible endpoint.
> These are services, not bundled software, and are governed by the selected
> provider's terms rather than an open-source license. See About → Privacy for
> configuration-dependent data-handling details.

## How the copyleft dependencies are used (compliance posture)

- **GPL / GPL-fork engines loaded at runtime** — liblouis, Piper, Kokoro, eSpeak NG,
  and Transformers.js models are fetched at runtime from their **own upstream
  distributions** (e.g. jsDelivr), not rebuilt and redistributed by AlloFlow.
  AlloFlow links to them at arm's length; their complete corresponding source is at
  the URLs below.
- **GPLv2 simulations run in iframes** — CircuitJS1 (GPLv2) and PhET (GPLv3 code)
  are embedded as **separate programs in isolated iframes**, i.e. mere aggregation.
  They must stay iframe-isolated and never be statically linked into the AGPL app;
  GPLv2-only code linked into an AGPLv3 work would be a license conflict.
- **The one vendored copyleft binary** — `ffmpeg-core.wasm` (GPL-2.0-or-later) is
  shipped unmodified with its version and source pointer; see
  [`video_studio/vendor/ffmpeg/THIRD_PARTY_NOTICES.md`](./video_studio/vendor/ffmpeg/THIRD_PARTY_NOTICES.md)
  and the Apache/GPL NOTICES section below.
- **veraPDF** is dual-licensed **GPLv3+ / MPLv2**; AlloFlow **elects the MPL-2.0**
  option for it.
- **Share-alike content** — Mulberry Symbols and Wiktionary data are **CC BY-SA**.
  When a teacher exports an AAC board or material that incorporates them, the
  incorporated symbols/text remain under CC BY-SA and any adaptation of them must be
  shared alike, with attribution preserved. AlloFlow uses them as-is and credits the
  source per item.

## Modifications to third-party components

AlloFlow integrates the components above **as libraries, through their public
APIs, or as unmodified vendored upstream builds** — it does not maintain forks
that change their source. Some concrete cases:

- **The Whiteboard** mounts an **unmodified** Excalidraw (loaded from jsDelivr) and
  wraps it with AlloFlow's own UI and graphic-organizer templates; Excalidraw's own
  code is not altered.
- **Vendored minified copies** — lamejs (`lame.min.js`), iframe-phone
  (`data_lab/vendor/iframe-phone.js`), A-Frame (`immersive_geometry/vendor/aframe.min.js`),
  and Temml (`temml/temml.min.js`) — are upstream release builds. Each carries its
  original copyright/license banner at the top of the file (restored where an earlier
  minification step had stripped it, so the notice travels with the code).
- **FFmpeg** (`video_studio/vendor/ffmpeg/`) is the unmodified upstream `@ffmpeg/core`
  build; see its `THIRD_PARTY_NOTICES.md`.

Because none of these components is modified, no per-file "changed" notices are
triggered. **Policy if that ever changes:** a component that AlloFlow forks or
edits at the source level must carry the modification notice its license requires,
recorded here —

- **Apache-2.0 §4(b)** — modified files must carry prominent notices stating they were changed.
- **GPL / LGPL / AGPL** — modified files must carry a notice of the change and its date, and the modified source must be made available.
- **CC BY / CC BY-SA** — the attribution must indicate that changes were made (CC BY-SA adaptations stay under CC BY-SA).
- **SIL OFL-1.1** — a modified font must be renamed and must not use the original's Reserved Font Name.

**lamejs (LGPL-3.0)** is used as a library: it is loaded dynamically and can be
replaced with a compatible build. Its complete corresponding source is at
https://github.com/zhuker/lamejs and the full license text is in
[`licenses/LGPL-3.0.txt`](./licenses/LGPL-3.0.txt).

## Optional media sources and Video Studio policy

Video Studio may link to optional media-discovery sources, but those sites are
not bundled dependencies unless a specific asset is included in this repository.
Each video project can store per-asset title, creator, source URL, license,
modification status, and attribution text in `media_credits.json` /
`media_credits.txt`.

| Source | How to treat it in an AGPL-3.0 project |
|---|---|
| [Openverse](https://openverse.org) | Search/index for openly licensed media. Verify and record the actual asset license from the source page. |
| [Wikimedia Commons](https://commons.wikimedia.org) | Prefer public domain, CC0, or CC BY files. Follow the file page attribution and share-alike requirements when present. |
| [Freesound](https://freesound.org) | Prefer CC0 or CC BY sounds. CC BY-NC/noncommercial sounds should not be treated as safe for general redistribution or commercial/public sharing. |
| [Pixabay](https://pixabay.com) | Free stock under Pixabay's custom Content License, not open source/open content. Do not bundle Pixabay assets as a reusable stock library in the AGPL source. |

Future local studio-sound candidates such as [RNNoise](https://github.com/xiph/rnnoise)
(BSD-3-Clause), [DeepFilterNet](https://github.com/Rikorose/DeepFilterNet)
(MIT/Apache-2.0), and [whisper.cpp](https://github.com/ggml-org/whisper.cpp)
(MIT) should be added here and in `OSS_CREDITS` only when they are actually
bundled, with their notices and source links preserved.

---

## Dependency inventory

The **Copyright** column reproduces each project's own notice (from its LICENSE /
NOTICE, or, for projects that keep the notice in source headers, the copyright
holder those headers state). Where a range ends in "present," the upstream notice
uses an open range.

### App framework
| Library | Used for | License | Copyright |
|---|---|---|---|
| [React & React DOM](https://react.dev) | UI framework (app + Whiteboard window) | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| [Lucide](https://lucide.dev) | icon set | ISC | Copyright (c) 2020 Lucide Contributors; portions (c) 2013-present Cole Bemis (Feather, MIT) |
| [Tailwind CSS](https://tailwindcss.com) | styling | MIT | Copyright (c) Tailwind Labs, Inc. |
| [Firebase JS SDK](https://firebase.google.com) | sign-in & class sync | Apache-2.0 | Copyright (c) Google LLC |

### Documents, PDF & accessibility
| Library | Used for | License | Copyright |
|---|---|---|---|
| [pdf.js](https://mozilla.github.io/pdf.js/) | reading & rendering PDFs | Apache-2.0 | Copyright (c) Mozilla Foundation and pdf.js contributors |
| [pdf-lib](https://pdf-lib.js.org) | building accessible PDFs | MIT | Copyright (c) 2019 Andrew Dillon |
| [fontkit](https://github.com/foliojs/fontkit) | embedding fonts in PDFs | MIT | Copyright (c) 2014 Devon Govett |
| [Tesseract.js](https://tesseract.projectnaptha.com) | OCR of scanned handouts | Apache-2.0 | Copyright (c) 2015 Kevin Kwok and Jerome Wu |
| [veraPDF](https://verapdf.org) | PDF/UA-1 conformance checks | GPLv3+ / MPLv2 (AlloFlow elects MPL-2.0) | Copyright (c) veraPDF Consortium |
| [Apache PDFBox](https://pdfbox.apache.org) | PDF parsing inside veraPDF | Apache-2.0 | Copyright 2014 The Apache Software Foundation (see NOTICE below) |
| [CheerpJ](https://leaningtech.com/cheerpj/) | runs the veraPDF engine in the browser | free for this use (LeaningTech) | © Leaning Technologies Ltd |
| [axe-core](https://github.com/dequelabs/axe-core) | accessibility rule checks | MPL-2.0 | Copyright (c) Deque Systems, Inc. |
| [IBM Equal Access](https://github.com/IBMa/equal-access) | second accessibility checker | Apache-2.0 | Copyright (c) IBM Corp. |
| [DOMPurify](https://github.com/cure53/DOMPurify) | HTML sanitizing | Apache-2.0 / MPL-2.0 | Copyright (c) 2015 Dr.-Ing. Mario Heiderich, Cure53 |
| [Harper](https://writewithharper.com) | grammar & spelling checks | Apache-2.0 | Copyright 2024 Elijah Potter |
| [Free Dictionary API](https://dictionaryapi.dev) | word definitions/pronunciation | API free; data CC BY-SA (Wiktionary) | Definitions © Wiktionary contributors (CC BY-SA) |
| [liblouis](https://liblouis.io) | UEB Grade 2 braille (.brf) translation | GPLv3 (engine) / LGPL-2.1+ (tables) | Copyright (c) liblouis contributors |
| [Open Board Format (OBF/OBZ)](https://www.openboardformat.org) | AAC board interchange (Symbol Studio) | open specification | © Open AAC / CoughDrop |
| [Mulberry Symbols](https://mulberrysymbols.org) | validated AAC symbol set | CC BY-SA | Copyright (c) Steve Lee / Open AAC (share-alike; see note above) |
| [Global Symbols](https://globalsymbols.com) | open symbol-search service | platform free; symbols under own licenses | © Global Symbols CIC |
| [KaTeX](https://katex.org) | math typesetting | MIT | Copyright (c) 2013-2020 Khan Academy and other contributors |
| [Temml](https://temml.org) | LaTeX → MathML | MIT | Copyright (c) 2020 Ron Kok |
| [Speech Rule Engine](https://github.com/Speech-Rule-Engine/speech-rule-engine) | spoken math | Apache-2.0 | Copyright 2014-2018 Volker Sorge; 2019-present the MathJax Consortium |
| [MathLive](https://mathlive.io) | accessible equation editor | MIT | Copyright (c) 2017-present Arno Gourdol |
| [Prism](https://prismjs.com) | code syntax highlighting | MIT | Copyright (c) 2012 Lea Verou |
| [mammoth.js](https://github.com/mwilliamson/mammoth.js) | importing Word documents | BSD-2-Clause | Copyright (c) 2013 Michael Williamson |
| [docx](https://docx.js.org) | Word (.docx) export | MIT | Copyright (c) 2016 Dolan Miu |
| [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) | PowerPoint (.pptx) export | MIT | Copyright (c) 2015-2022 Brent Ely |
| [H5P](https://h5p.org) | export to the H5P open content format (quizzes, flashcards, glossaries); the destination H5P installation provides the official H5P libraries — AlloFlow writes the `.h5p` archive but does not bundle or redistribute H5P's runtime | open content format (H5P core & content-type libraries are MIT) | Copyright (c) Joubel AS and the H5P community |
| [JSZip](https://stuk.github.io/jszip/) | packaging multi-file exports | MIT / GPLv3 (AlloFlow uses MIT) | Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso |
| [pako](https://github.com/nodeca/pako) | zlib compression | MIT | Copyright (C) 2014-2017 by Vitaly Puzrin and Andrey Tupitsin |

### Math, science & simulations
| Library | Used for | License | Copyright |
|---|---|---|---|
| [math.js](https://mathjs.org) | math engine | Apache-2.0 | Copyright (C) 2013-present Jos de Jong |
| [jStat](https://github.com/jstat/jstat) | statistics library | MIT | Copyright (c) 2013 jStat |
| [Acorn](https://github.com/acornjs/acorn) | JavaScript parser (code sandbox) | MIT | Copyright (C) 2012-2022 by various contributors (see AUTHORS) |
| [CircuitJS1](https://github.com/pfalstad/circuitjs1) | circuit simulator (Circuit Shelf; iframe) | GPLv2 | Copyright (c) Paul Falstad and Iain Sharp |
| [Mol*](https://molstar.org) | 3D molecular-structure viewer | MIT | Copyright (c) 2017-present Mol* contributors |
| [CODAP](https://codap.concord.org) | data-science workspace (Data Lab; iframe) | MIT | Copyright (c) 2010-present Concord Consortium |
| [PhET Interactive Simulations](https://phet.colorado.edu) | science & math sims (iframe) | GPLv3 (code) / CC-BY (content) | © University of Colorado Boulder |
| [iframe-phone](https://github.com/concord-consortium/iframe-phone) | bridge to the CODAP window | MIT | Copyright (c) 2014 Concord Consortium |
| [OpenSeadragon](https://openseadragon.github.io) | deep-zoom image viewer (Zoom Gallery) | BSD-3-Clause | Copyright (C) 2009 CodePlex Foundation; (C) 2010-present OpenSeadragon contributors |
| [Smithsonian Open Access](https://www.si.edu/openaccess) | museum images (Zoom Gallery) | CC0 1.0 | Public domain (CC0) — Smithsonian Institution |
| [NASA Image and Video Library](https://images.nasa.gov) | space photographs (Zoom Gallery) | Public domain (NASA guidelines) | Courtesy NASA (public domain; some third-party content excepted) |
| [StoryWeaver](https://storyweaver.org.in) | openly licensed picture books (Reading Library) | CC BY 4.0 | © Pratham Books and per-book authors/illustrators (credited per book) |

### 3D, graphics, maps & media
| Library | Used for | License | Copyright |
|---|---|---|---|
| [three.js](https://threejs.org) | 3D graphics (Memory Palace, STEM tools) | MIT | Copyright (c) 2010-present three.js authors |
| [Excalidraw](https://excalidraw.com) | the Whiteboard | MIT | Copyright (c) 2020 Excalidraw |
| [KayKit Dungeon Remastered](https://kaylousberg.itch.io/kaykit-dungeon-remastered) | 3D decoration models (Memory Palace) | CC0 (credit appreciated) | © Kay Lousberg — see [`assets/glb/KAYKIT_LICENSE.txt`](./assets/glb/KAYKIT_LICENSE.txt) |
| [globe.gl](https://github.com/vasturiano/globe.gl) | interactive 3D globe | MIT | Copyright (c) 2019 Vasco Asturiano |
| [Leaflet](https://leafletjs.com) | interactive maps | BSD-2-Clause | Copyright (c) 2010-present Volodymyr Agafonkin |
| [world-atlas](https://github.com/topojson/world-atlas) | country-boundary map data (Natural Earth, public domain) | ISC | Copyright 2013-2019 Michael Bostock |
| [A-Frame](https://aframe.io) | WebXR / virtual reality | MIT | Copyright (c) 2015-present A-Frame authors |
| [html2canvas](https://html2canvas.hertzen.com) | exporting on-screen charts as images | MIT | Copyright (c) 2012 Niklas von Hertzen |
| [ffmpeg.wasm](https://ffmpegwasm.netlify.app) | in-browser video/audio export | MIT wrapper; FFmpeg LGPL-2.1/GPL | @ffmpeg/ffmpeg © Jerome Wu (MIT); @ffmpeg/core = FFmpeg © the FFmpeg developers (GPL-2.0-or-later) |

### On-device speech & AI
| Library | Used for | License | Copyright |
|---|---|---|---|
| [Kokoro](https://github.com/hexgrad/kokoro) | neural text-to-speech (primary) | Apache-2.0 | Copyright (c) hexgrad |
| [Piper](https://github.com/OHF-Voice/piper1-gpl) | neural text-to-speech (40+ languages) | GPLv3 (engine fork) | © Michael Hansen / OHF-Voice and contributors |
| [eSpeak NG](https://github.com/espeak-ng/espeak-ng) | offline grapheme→phoneme (phonics) | GPLv3 | Copyright (c) eSpeak NG contributors |
| [Transformers.js](https://github.com/huggingface/transformers.js) | in-browser ML (Whisper, translation, image gen) | Apache-2.0 | Copyright (c) Hugging Face |
| [Helsinki-NLP OPUS-MT](https://github.com/Helsinki-NLP/OPUS-MT) | on-device translation models (Bridge private mode) | CC BY-4.0 | © University of Helsinki / OPUS |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | on-device speech-to-text (School Box) | MIT | Copyright (c) 2023-present The ggml authors |
| [ONNX Runtime Web](https://onnxruntime.ai) | machine-learning inference | MIT | Copyright (c) Microsoft Corporation |
| [Pyodide](https://pyodide.org) | Python in the browser | MPL-2.0 | Copyright (c) Pyodide contributors and Mozilla |

### Utilities
| Library | Used for | License | Copyright |
|---|---|---|---|
| [QR Code Generator](https://github.com/kazuhikoarase/qrcode-generator) | class-join & resource-share QR codes | MIT | Copyright (c) 2009 Kazuhiko Arase |
| [lz-string](https://github.com/pieroxy/lz-string) | compressing saved work | MIT | Copyright (c) 2013 pieroxy |
| [idb-keyval](https://github.com/jakearchibald/idb-keyval) | offline browser storage | Apache-2.0 | Copyright (c) Jake Archibald |
| [jsdiff](https://github.com/kpdecker/jsdiff) | comparing text revisions | BSD-3-Clause | Copyright (c) 2009-2015 Kevin Decker |
| [jsonrepair](https://github.com/josdejong/jsonrepair) | repairing AI-generated JSON | ISC | Copyright (c) 2020-present Jos de Jong |
| [lamejs](https://github.com/zhuker/lamejs) | MP3 audio encoding | LGPL-3.0 | Copyright (c) 2013 Zhuker; based on LAME © the LAME developers |
| [DragDropTouch](https://github.com/Bernardo-Castilho/dragdroptouch) | touch drag-and-drop on tablets | MIT | Copyright (c) 2016-present Bernardo Castilho |

### Fonts
All fonts are loaded at runtime from Google Fonts or the vendor's site (not
redistributed from this repository); the OFL text is bundled for reference.
| Font | Used for | License | Copyright |
|---|---|---|---|
| [OpenDyslexic](https://opendyslexic.org) | dyslexia-friendly reading font | SIL OFL-1.1 | Copyright (c) Abelardo Gonzalez |
| [Atkinson Hyperlegible](https://brailleinstitute.org/freefont) | low-vision font | Atkinson Hyperlegible Font License | Copyright (c) Braille Institute of America, Inc. |
| [Inter & Lexend](https://fonts.google.com) | interface fonts | SIL OFL-1.1 | Inter: Copyright (c) The Inter Project Authors (Rasmus Andersson) · Lexend: Copyright (c) The Lexend Project Authors |
| [Outfit](https://fonts.google.com/specimen/Outfit) | display / heading font | SIL OFL-1.1 | Copyright (c) The Outfit Project Authors (Rodrigo Fuenzalida) |
| [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | interface font | SIL OFL-1.1 | Copyright (c) Tokotype |
| [Noto](https://fonts.google.com/noto) | Unicode & CJK text in PDFs | SIL OFL-1.1 | Copyright (c) The Noto Project Authors (Google) |
| [DejaVu](https://dejavu-fonts.github.io) | PDF fallback font | Bitstream Vera / public domain | © Bitstream, Inc.; DejaVu changes public domain |

### Desktop app (School Box)
| Library | Used for | License | Copyright |
|---|---|---|---|
| [Electron](https://electronjs.org) | offline desktop app | MIT | Copyright (c) Electron contributors; Copyright (c) 2013-2020 GitHub Inc. |
| [electron-log & electron-updater](https://github.com/electron-userland/electron-builder) | desktop logging & updates | MIT | Copyright (c) electron-userland contributors |

---

## Reproduced NOTICE files (Apache-2.0 §4 & GPL)

Apache-2.0 §4(d) requires that the attribution notices in a component's `NOTICE`
file be reproduced. Of the Apache-2.0 dependencies above, **Apache PDFBox** ships a
`NOTICE` file; it is reproduced verbatim here. (The other Apache-2.0 components in
this project — Firebase JS SDK, pdf.js, Tesseract.js, Transformers.js, Harper, IBM
Equal Access, idb-keyval, Kokoro, math.js — do not ship a separate NOTICE file; their
copyright notices are in the table above.)

### Apache PDFBox — NOTICE

```
Apache PDFBox
Copyright 2014 The Apache Software Foundation

This product includes software developed at
The Apache Software Foundation (http://www.apache.org/).

Based on source code originally developed in the PDFBox and
FontBox projects.

Copyright (c) 2002-2007, www.pdfbox.org

Based on source code originally developed in the PaDaF project.
Copyright (c) 2010 Atos Worldline SAS

Includes the Adobe Glyph List
Copyright 1997, 1998, 2002, 2007, 2010 Adobe Systems Incorporated.

Includes the Zapf Dingbats Glyph List
Copyright 2002, 2010 Adobe Systems Incorporated.

Includes OSXAdapter
Copyright (C) 2003-2007 Apple, Inc., All Rights Reserved
```

### FFmpeg (Video Studio, GPL-2.0-or-later)

The vendored `ffmpeg-core.wasm` is unmodified upstream `@ffmpeg/core` 0.12.x, GPL-2.0-or-later.
Version, source project, and notices are in
[`video_studio/vendor/ffmpeg/THIRD_PARTY_NOTICES.md`](./video_studio/vendor/ffmpeg/THIRD_PARTY_NOTICES.md).
Complete corresponding source: https://github.com/ffmpegwasm/ffmpeg.wasm and
https://ffmpeg.org.

---

## License texts (short permissive licenses)

The full standard texts of the short permissive licenses used above are reproduced
here; each library's specific copyright line is in its row in the inventory. The
longer licenses are bundled in [`licenses/`](./licenses) (see the table at the top).

### MIT License

```
Copyright (c) <as stated in each MIT row above>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ISC License

```
Copyright (c) <as stated in each ISC row above>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

### BSD 2-Clause License

```
Copyright (c) <as stated in each BSD-2-Clause row above>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### BSD 3-Clause License

Same as BSD 2-Clause, plus a third clause:

```
3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.
```

---

_Last reviewed: 2026-07-21. This NOTICES file mirrors `OSS_CREDITS` in
`view_info_modal_source.jsx`; `dev-tools/check_oss_credits.cjs` fails the build if
they drift or if a credited library is missing its entry here._
