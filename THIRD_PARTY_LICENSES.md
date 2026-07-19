# Third-Party Licenses & Notices

AlloFlow itself is licensed under the **GNU Affero General Public License v3.0**
(see [`LICENSE`](./LICENSE)). It is built on the open-source work listed below.
This file is the consolidated NOTICES surface that backs the in-app
**About → Open Source** tab (the live, human-facing attribution list, defined in
`view_info_modal_source.jsx` → `OSS_CREDITS`). Keep the two in sync when a runtime
dependency is added or removed.

Several licenses below (GPL / LGPL / MPL, and the CC-BY sim/content) **require**
that attribution and a pointer to the source be preserved — that is the purpose of
this file and of the About tab.

For each dependency, the **canonical copyright holders and the verbatim license
text are at the linked source URL**. The full standard texts of the short
permissive licenses actually used here (MIT, ISC, BSD-2-Clause, BSD-3-Clause) are
reproduced at the end of this file; for the longer licenses (Apache-2.0, MPL-2.0,
SIL OFL-1.1, GPL/LGPL, Creative Commons) the SPDX identifier and the official text
URL are given.

> Note: hosted AI features use the provider configured in AlloFlow — for example,
> Gemini (and optionally Imagen), OpenAI, Claude, or an OpenAI-compatible endpoint.
> These are services, not bundled software, and are governed by the selected
> provider's terms rather than an open-source license. See About → Privacy for
> configuration-dependent data-handling details.

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

### App framework
| Library | Used for | License |
|---|---|---|
| [React & React DOM](https://react.dev) | UI framework (app + Whiteboard window) | MIT |
| [Lucide](https://lucide.dev) | icon set | ISC |
| [Tailwind CSS](https://tailwindcss.com) | styling | MIT |
| [Firebase JS SDK](https://firebase.google.com) | sign-in & class sync | Apache-2.0 |

### Documents, PDF & accessibility
| Library | Used for | License |
|---|---|---|
| [pdf.js](https://mozilla.github.io/pdf.js/) | reading & rendering PDFs | Apache-2.0 |
| [pdf-lib](https://pdf-lib.js.org) | building accessible PDFs | MIT |
| [fontkit](https://github.com/foliojs/fontkit) | embedding fonts in PDFs | MIT |
| [Tesseract.js](https://tesseract.projectnaptha.com) | OCR of scanned handouts | Apache-2.0 |
| [veraPDF](https://verapdf.org) | PDF/UA-1 conformance checks | GPLv3+ / MPLv2 |
| [Apache PDFBox](https://pdfbox.apache.org) | PDF parsing inside veraPDF | Apache-2.0 |
| [CheerpJ](https://leaningtech.com/cheerpj/) | runs the veraPDF engine in the browser | free for this use (LeaningTech) |
| [axe-core](https://github.com/dequelabs/axe-core) | accessibility rule checks | MPL-2.0 |
| [IBM Equal Access](https://github.com/IBMa/equal-access) | second accessibility checker | Apache-2.0 |
| [DOMPurify](https://github.com/cure53/DOMPurify) | HTML sanitizing | Apache-2.0 / MPL-2.0 |
| [Harper](https://writewithharper.com) | grammar & spelling checks | Apache-2.0 |
| [Free Dictionary API](https://dictionaryapi.dev) | word definitions/pronunciation (data from Wiktionary) | API free / data CC BY-SA |
| [liblouis](https://liblouis.io) | UEB Grade 2 braille (.brf) translation | GPLv3 (engine) / LGPL-2.1+ (tables) |
| [Open Board Format (OBF/OBZ)](https://www.openboardformat.org) | AAC board interchange (Symbol Studio) | open specification |
| [Mulberry Symbols](https://mulberrysymbols.org) | validated AAC symbol set | CC BY-SA |
| [Global Symbols](https://globalsymbols.com) | open symbol-search service | platform free; symbols under own licenses |
| [KaTeX](https://katex.org) | math typesetting | MIT |
| [Temml](https://temml.org) | LaTeX → MathML | MIT |
| [Speech Rule Engine](https://github.com/Speech-Rule-Engine/speech-rule-engine) | spoken math | Apache-2.0 |
| [MathLive](https://mathlive.io) | accessible equation editor | MIT |
| [Prism](https://prismjs.com) | code syntax highlighting | MIT |
| [mammoth.js](https://github.com/mwilliamson/mammoth.js) | importing Word documents | BSD-2-Clause |
| [docx](https://docx.js.org) | Word (.docx) export | MIT |
| [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) | PowerPoint (.pptx) export | MIT |
| [JSZip](https://stuk.github.io/jszip/) | packaging multi-file exports | MIT / GPLv3 |
| [pako](https://github.com/nodeca/pako) | zlib compression | MIT |

### Math, science & simulations
| Library | Used for | License |
|---|---|---|
| [math.js](https://mathjs.org) | math engine | Apache-2.0 |
| [jStat](https://github.com/jstat/jstat) | statistics library | MIT |
| [Acorn](https://github.com/acornjs/acorn) | JavaScript parser (code sandbox) | MIT |
| [CircuitJS1](https://github.com/pfalstad/circuitjs1) | circuit simulator (Circuit Shelf) | GPLv2 |
| [Mol*](https://molstar.org) | 3D molecular-structure viewer | MIT |
| [CODAP](https://codap.concord.org) | data-science workspace (Data Lab) | MIT |
| [PhET Interactive Simulations](https://phet.colorado.edu) | science & math sims | GPLv3 (code) / CC-BY (content) |
| [iframe-phone](https://github.com/concord-consortium/iframe-phone) | bridge to the CODAP window | MIT |
| [OpenSeadragon](https://openseadragon.github.io) | deep-zoom image viewer (Zoom Gallery) | BSD-3-Clause |
| [Smithsonian Open Access](https://www.si.edu/openaccess) | museum images (Zoom Gallery) | CC0 1.0 |
| [NASA Image and Video Library](https://images.nasa.gov) | space photographs (Zoom Gallery) | Public domain (NASA guidelines) |
| [StoryWeaver](https://storyweaver.org.in) | openly licensed picture books (Reading Library) | CC BY 4.0 |

### 3D, graphics, maps & media
| Library | Used for | License |
|---|---|---|
| [three.js](https://threejs.org) | 3D graphics (Memory Palace, STEM tools) | MIT |
| [Excalidraw](https://excalidraw.com) | the Whiteboard (freehand sketch/diagram canvas + graphic-organizer templates) | MIT |
| [KayKit Dungeon Remastered](https://kaylousberg.itch.io/kaykit-dungeon-remastered) | 3D decoration models (Memory Palace) | CC0 (credit appreciated) — see `assets/glb/KAYKIT_LICENSE.txt` |
| [globe.gl](https://github.com/vasturiano/globe.gl) | interactive 3D globe | MIT |
| [Leaflet](https://leafletjs.com) | interactive maps | BSD-2-Clause |
| [world-atlas](https://github.com/topojson/world-atlas) | country-boundary map data (Natural Earth, public domain) | ISC |
| [A-Frame](https://aframe.io) | WebXR / virtual reality | MIT |
| [html2canvas](https://html2canvas.hertzen.com) | exporting on-screen charts as images | MIT |
| [ffmpeg.wasm](https://ffmpegwasm.netlify.app) | in-browser video/audio export | MIT wrapper; FFmpeg LGPL-2.1/GPL |

### On-device speech & AI
| Library | Used for | License |
|---|---|---|
| [Kokoro](https://github.com/hexgrad/kokoro) | neural text-to-speech (primary) | Apache-2.0 |
| [Piper](https://github.com/OHF-Voice/piper1-gpl) | neural text-to-speech (40+ languages) | MIT (engine now GPLv3 fork) |
| [eSpeak NG](https://github.com/espeak-ng/espeak-ng) | offline grapheme→phoneme (phonics) | GPLv3 |
| [Transformers.js](https://github.com/huggingface/transformers.js) | in-browser ML (Whisper, translation, image gen) | Apache-2.0 |
| [Helsinki-NLP OPUS-MT](https://github.com/Helsinki-NLP/OPUS-MT) | on-device translation models (Bridge private mode) | CC BY-4.0 |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | on-device speech-to-text (School Box) | MIT |
| [ONNX Runtime Web](https://onnxruntime.ai) | machine-learning inference | MIT |
| [Pyodide](https://pyodide.org) | Python in the browser | MPL-2.0 |

### Utilities
| Library | Used for | License |
|---|---|---|
| [lz-string](https://github.com/pieroxy/lz-string) | compressing saved work | MIT |
| [idb-keyval](https://github.com/jakearchibald/idb-keyval) | offline browser storage | Apache-2.0 |
| [jsdiff](https://github.com/kpdecker/jsdiff) | comparing text revisions | BSD-3-Clause |
| [jsonrepair](https://github.com/josdejong/jsonrepair) | repairing AI-generated JSON | ISC |
| [lamejs](https://github.com/zhuker/lamejs) | MP3 audio encoding | LGPL-3.0 |
| [DragDropTouch](https://github.com/Bernardo-Castilho/dragdroptouch) | touch drag-and-drop on tablets | MIT |

### Fonts
| Font | Used for | License |
|---|---|---|
| [OpenDyslexic](https://opendyslexic.org) | dyslexia-friendly reading font | SIL OFL-1.1 |
| [Atkinson Hyperlegible](https://brailleinstitute.org/freefont) | low-vision font (Braille Institute) | free (Atkinson Hyperlegible Font License) |
| [Inter & Lexend](https://fonts.google.com) | interface fonts | SIL OFL-1.1 |
| [Outfit](https://fonts.google.com/specimen/Outfit) | display / heading font (Rodrigo Fuenzalida) | SIL OFL-1.1 |
| [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | interface font (Tokotype) | SIL OFL-1.1 |
| [Noto](https://fonts.google.com/noto) | Unicode & CJK text in PDFs (Google) | SIL OFL-1.1 |
| [DejaVu](https://dejavu-fonts.github.io) | PDF fallback font | Bitstream Vera / public domain |

### Desktop app (School Box)
| Library | Used for | License |
|---|---|---|
| [Electron](https://electronjs.org) | offline desktop app | MIT |
| [electron-log & electron-updater](https://github.com/electron-userland/electron-builder) | desktop logging & updates | MIT |

---

## License texts

The full standard texts of the short permissive licenses used above are reproduced
here. Each library's specific **copyright line** (`Copyright (c) <year> <holders>`)
is stated in that library's own repository at the URL listed above; substitute it
where the templates below say `<copyright holders>`.

For the longer licenses, the official canonical text is at:

- **Apache-2.0** — https://www.apache.org/licenses/LICENSE-2.0
- **MPL-2.0** — https://www.mozilla.org/en-US/MPL/2.0/
- **SIL OFL-1.1** — https://openfontlicense.org/open-font-license-official-text/
- **GPL-2.0** — https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt
- **GPL-3.0** — https://www.gnu.org/licenses/gpl-3.0.txt
- **LGPL-2.1** — https://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt
- **LGPL-3.0** — https://www.gnu.org/licenses/lgpl-3.0.txt
- **CC BY 4.0** — https://creativecommons.org/licenses/by/4.0/legalcode
- **CC BY-SA 4.0** — https://creativecommons.org/licenses/by-sa/4.0/legalcode
- **CC0 1.0** — https://creativecommons.org/publicdomain/zero/1.0/legalcode
- **Atkinson Hyperlegible Font License** — https://brailleinstitute.org/freefont
- **CheerpJ (LeaningTech)** — free for this use per https://leaningtech.com/cheerpj/

### MIT License

```
Copyright (c) <year> <copyright holders>

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
Copyright (c) <year> <copyright holders>

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
Copyright (c) <year> <copyright holders>
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

_Last reviewed: 2026-07-06. This NOTICES file mirrors `OSS_CREDITS` in
`view_info_modal_source.jsx`; update both together._
