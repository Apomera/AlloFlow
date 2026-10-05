          sectionCard('📅 The Cosmic Calendar — 13.8 billion years in one year',
            (function() {
              var CC_DATES = [
                { id: 'jan1', when: 'January 1, 12:00 AM', emoji: '💥',
                  what: 'The Big Bang. The observable universe begins as something incredibly hot, dense, and small. In the first second, the four fundamental forces separate. In the first three minutes, hydrogen + helium + traces of lithium form (Big Bang nucleosynthesis). 380,000 years later (~ 5 minutes on the cosmic calendar), the first atoms form + the cosmic microwave background is released. The next ~100 million years are the "cosmic dark ages" — no stars yet, just neutral hydrogen.',
                  context: 'On Sagan\'s calendar, 1 cosmic year = 13.8 billion real years. So: 1 cosmic month ~ 1.15 billion real years. 1 cosmic day ~ 38 million real years. 1 cosmic hour ~ 1.6 million real years. 1 cosmic minute ~ 26,000 real years. 1 cosmic second ~ 437 real years. We humans, all of recorded history, all our wars + cathedrals + science + everything, fit inside the last few cosmic seconds.'
                },
                { id: 'jan10', when: 'January 10-22', emoji: '⭐',
                  what: 'First stars + galaxies form (~ 100-400 million real years after Big Bang). The first stars (Population III) were massive, short-lived, made entirely of H + He. They produced the first heavier elements + their supernovae enriched the interstellar medium. Galaxies began merging into the first protogalaxies — JWST has now imaged some of these directly. Cosmic dawn ends; the universe lights up.',
                  context: 'The 4 weeks between the Big Bang + the first galaxies represents the time before any luminous objects existed in our universe. JWST has pushed direct observation back to ~ January 12-15 on the cosmic calendar. We are looking deeper into the cosmic year every decade.'
                },
                { id: 'mar15', when: 'March 15', emoji: '🌌',
                  what: 'The Milky Way galaxy forms (~ 11.5 billion real years ago). A massive halo of dark matter pulls in primordial gas; star formation begins; the central supermassive black hole grows. The Milky Way has been continuously forming stars + capturing satellite galaxies ever since. We are still expanding + still cannibalizing smaller galaxies today — the Sagittarius Dwarf Galaxy is currently being torn apart + absorbed by our halo.',
                  context: 'Our galaxy has been around for about 80% of the universe\'s history. Most of the stars in our galaxy are older than the Sun.'
                },
                { id: 'aug28', when: 'August 28', emoji: '🪐',
                  what: 'Solar System formation begins (~ 4.6 billion real years ago). A giant molecular cloud (with material enriched by ~ 9 billion years of previous stellar nucleosynthesis) collapses, possibly triggered by a nearby supernova. The Sun forms; the protoplanetary disk forms; the planets accrete; the Late Heavy Bombardment delivers water + organics; the Moon forms after a Mars-sized body (Theia) collides with proto-Earth.',
                  context: 'In real years: 4.6 billion years ago — which is to say, about 9.2 billion years AFTER the Big Bang. The Earth + Sun are roughly halfway through the universe\'s history.'
                },
                { id: 'sep1', when: 'September 1-15', emoji: '🦠',
                  what: 'First life on Earth (~ 4.0-3.8 billion real years ago). The oldest convincing evidence is fossilized microbial mats (stromatolites) ~ 3.5 billion years old. By ~ 3 billion years ago, oxygenic photosynthesis evolved in cyanobacteria; this slowly transformed Earth\'s atmosphere over the next 500 million years (the Great Oxidation Event, ~ 2.4 billion years ago).',
                  context: 'Life appears extraordinarily quickly after Earth becomes habitable (within ~ 500-700 million years), suggesting that under the right conditions, simple life may form readily. The transition from simple to complex life took FAR longer + may be the bigger filter.'
                },
                { id: 'nov15', when: 'November 9', emoji: '🧬',
                  what: 'First eukaryotes (cells with nuclei + organelles) appear (~ 2.1-1.7 billion real years ago). Endosymbiosis — when one prokaryote engulfed another + the captured cell became a mitochondrion or chloroplast — was the singular event that made all complex life possible. This may be the hardest single step in the evolution of intelligence + may be the bulk of the Great Filter behind us (if there is one).',
                  context: 'Eukaryotes appear MORE than 1 billion real years after life first arose. The "easy" step (prokaryotes) was fast; the "hard" step (eukaryotes) took much longer.'
                },
                { id: 'dec5', when: 'December 17', emoji: '🐚',
                  what: 'Cambrian explosion (~ 540 million real years ago). The fossil record suddenly shows nearly all the major animal body plans (phyla) appearing within a few tens of millions of years. Trilobites, mollusks, arthropods, vertebrate ancestors. The ozone layer is now established, allowing UV-sensitive organisms to thrive in shallow water. Multicellular life with hard parts had begun ~ 100 million years earlier (the Ediacaran).',
                  context: 'Most of complex life history has happened in the LAST month of the cosmic year. December 17 marks the start of recognizable animals.'
                },
                { id: 'dec25', when: 'December 25', emoji: '🦖',
                  what: 'Age of dinosaurs begins (~ 230 million real years ago). The Triassic-Jurassic-Cretaceous reign of dinosaurs lasts ~ 165 million real years — about 4-5 days on the cosmic calendar. Mammals exist throughout this time but stay small + nocturnal. Christmas morning to mid-afternoon: dinosaurs dominate. Then a 10-km asteroid hits the Yucatan (December 30 on cosmic calendar, ~ 66 million real years ago) + ends them.',
                  context: 'Even the dinosaurs, who ruled Earth for an unimaginable span, occupy only ~ 4 days of the cosmic year. Their entire existence is shorter than the time between the start of complex animals + now.'
                },
                { id: 'dec31', when: 'December 31, 11:49 PM', emoji: '🚶',
                  what: 'Homo sapiens emerges (~ 300,000 real years ago). Our species evolves in Africa, spreads gradually across the globe, develops language, art, agriculture. The 300,000-year tenure of anatomically modern humans occupies about 11 minutes on the cosmic calendar. We share Earth with Neanderthals + Denisovans for much of this time; they go extinct ~ 40,000 years ago (December 31, 11:58 PM).',
                  context: 'Everything humans have ever done — every story, every cave painting, every migration, every culture — fits inside the last 11 minutes of the cosmic year.'
                },
                { id: 'agriculture', when: 'December 31, 11:59:30 PM', emoji: '🌾',
                  what: 'Agriculture begins (~ 12,000 real years ago, Mesopotamia + independently elsewhere). Wheat, barley, lentils, einkorn are domesticated. Within a few thousand real years, the same revolution happens independently with rice in China, maize in Mesoamerica, sorghum in Africa, potatoes in the Andes. Settled life, cities, writing, organized states all follow.',
                  context: 'All of human civilization — every empire, every religion, every cathedral, every nation — occupies the last 30 seconds of the cosmic year.'
                },
                { id: 'now', when: 'December 31, 11:59:59 PM', emoji: '🌍',
                  what: 'The present moment. Roman empire (~ 4 seconds ago). Renaissance (~ 1.3 seconds ago). Industrial Revolution (~ 0.6 seconds ago). Modern era (~ 0.3 seconds ago). Computers, atomic energy, spaceflight, internet, social media, AI: all in the final < 0.1 cosmic seconds. Everything that defines modern life happened in less than the time it takes to blink.',
                  context: 'This is the perspective the cosmic calendar is meant to give. NOT to make our lives feel meaningless (we are still here, doing this) but to make our species feel young + our recent achievements + threats feel as RECENT as they actually are. Climate change, nuclear weapons, AI — every one of our existential challenges is the work of the LAST FEW SECONDS of cosmic time. We are all newborns trying to figure out how to live.'
                }
              ];
              var requestedCC = typeof d.selectedCC === 'string' ? d.selectedCC : 'jan1';
              var topicIndex = CC_DATES.findIndex(function(t) { return t.id === requestedCC; });
              if (topicIndex < 0) topicIndex = 0;
              var topic = CC_DATES[topicIndex];
              var sel = topic.id;
              function selectCCTopic(index, moveFocus) {
                var normalizedIndex = (index + CC_DATES.length) % CC_DATES.length;
                var nextTopic = CC_DATES[normalizedIndex];
                upd({ selectedCC: nextTopic.id });
                if (moveFocus && typeof document !== 'undefined') {
                  setTimeout(function() {
                    var target = document.getElementById('astronomy-cc-tab-' + nextTopic.id);
                    if (target) target.focus();
                  }, 0);
                }
              }
              function onCCTopicKeyDown(e, index) {
                var nextIndex = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = index + 1;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = index - 1;
                else if (e.key === 'Home') nextIndex = 0;
                else if (e.key === 'End') nextIndex = CC_DATES.length - 1;
                if (nextIndex == null) return;
                e.preventDefault();
                selectCCTopic(nextIndex, true);
              }
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.astronomy.in_the_1970s_carl_sagan_compressed_the', 'In the 1970s, Carl Sagan compressed the entire 13.8-billion-year history of the universe into a single year. The Big Bang is January 1 at midnight; "now" is December 31 at 11:59:59 PM. This framing remains one of the most powerful ways to grasp cosmic time. A cosmic SECOND is ~437 years of real time. Recorded human history occupies the last ~14 cosmic seconds.')
                ),
                h('figure', { style: { margin: '0 0 14px', padding: 10, borderRadius: 10, background: '#020617', border: '1px solid #7c2d12' } },
                  h('svg', { id: 'astronomy-cosmic-calendar-diagram', viewBox: '0 0 600 250', role: 'img', 'aria-labelledby': 'astronomy-cc-title astronomy-cc-desc', style: { width: '100%', height: 'auto', display: 'block' } },
                    h('title', { id: 'astronomy-cc-title' }, 'Cosmic Calendar timeline'),
                    h('desc', { id: 'astronomy-cc-desc' }, 'The full 13.8-billion-year history of the universe is compressed into one calendar year. The lower timeline zooms into the final cosmic minute, where agriculture and recorded civilization appear.'),
                    h('text', { x: 50, y: 28, fill: '#fdba74', fontSize: 12, fontWeight: 700 }, '13.8 billion years → one cosmic year'),
                    h('line', { x1: 50, y1: 72, x2: 550, y2: 72, stroke: '#fb923c', strokeWidth: 8, strokeLinecap: 'round' }),
                    [
                      { x: 50, label: 'Jan 1', detail: 'Big Bang', anchor: 'start' },
                      { x: 151, label: 'Mar 15', detail: 'Milky Way', anchor: 'middle' },
                      { x: 377, label: 'Aug 28', detail: 'Solar System', anchor: 'middle' },
                      { x: 384, label: 'Sep', detail: 'first life', anchor: 'middle' },
                      { x: 531, label: 'Dec 17', detail: 'animals', anchor: 'middle' },
                      { x: 550, label: 'Dec 31', detail: 'humans / now', anchor: 'end' }
                    ].map(function(mark, i) {
                      var labelY = i % 2 === 0 ? 105 : 125;
                      return h('g', { key: 'year-' + i },
                        h('line', { x1: mark.x, y1: 59, x2: mark.x, y2: 86, stroke: '#fed7aa', strokeWidth: 2 }),
                        h('text', { x: mark.x, y: labelY, textAnchor: mark.anchor, fill: '#ffedd5', fontSize: 10.5, fontWeight: 700 }, mark.label),
                        h('text', { x: mark.x, y: labelY + 14, textAnchor: mark.anchor, fill: '#94a3b8', fontSize: 9.5 }, mark.detail)
                      );
                    }),
                    h('text', { x: 50, y: 165, fill: '#c4b5fd', fontSize: 12, fontWeight: 700 }, 'Zoom: final cosmic minute'),
                    h('line', { x1: 50, y1: 198, x2: 550, y2: 198, stroke: '#8b5cf6', strokeWidth: 6, strokeLinecap: 'round' }),
                    h('line', { x1: 300, y1: 184, x2: 300, y2: 212, stroke: '#fbbf24', strokeWidth: 2 }),
                    h('text', { x: 300, y: 228, textAnchor: 'middle', fill: '#fde68a', fontSize: 10.5 }, 'agriculture (~30 s before midnight)'),
                    h('line', { x1: 550, y1: 182, x2: 550, y2: 214, stroke: '#34d399', strokeWidth: 3 }),
                    h('text', { x: 550, y: 174, textAnchor: 'end', fill: '#a7f3d0', fontSize: 10.5, fontWeight: 700 }, 'present'),
                    h('text', { x: 50, y: 228, textAnchor: 'start', fill: '#94a3b8', fontSize: 10 }, '11:59:00 PM')
                  ),
                  h('figcaption', { style: { marginTop: 5, color: '#94a3b8', fontSize: 11, textAlign: 'center' } }, 'Two scales are shown because events in the final seconds overlap on a full-year timeline.')
                ),
                h('div', { role: 'tablist', 'aria-label': __alloT('stem.astronomy.a11y_cosmic_calendar_events', 'Cosmic Calendar events'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  CC_DATES.map(function(t, index) {
                    var on = t.id === sel;
                    return h('button', {
                      id: 'astronomy-cc-tab-' + t.id,
                      key: t.id,
                      type: 'button',
                      role: 'tab',
                      'aria-selected': on ? 'true' : 'false',
                      'aria-controls': 'astronomy-cc-panel',
                      tabIndex: on ? 0 : -1,
                      onClick: function() { selectCCTopic(index, false); },
                      onKeyDown: function(e) { onCCTopicKeyDown(e, index); },
                      className: 'astr-focus',
                      style: { padding: '7px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fb923c' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fdba74' : '1px solid #475569' }
                    }, t.emoji + ' ' + t.when.split(',')[0]);
                  })
                ),
                h('div', { id: 'astronomy-cc-panel', role: 'tabpanel', 'aria-labelledby': 'astronomy-cc-tab-' + sel, tabIndex: 0, style: { padding: 14, borderRadius: 10, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.35)' } },
                  h('h3', { style: { margin: '0 0 2px', fontSize: 13.5, fontWeight: 700, color: '#fdba74' } }, topic.emoji + ' ' + topic.when),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10, marginTop: 8 } }, topic.what),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.astronomy.on_the_calendar', 'On the calendar: ')), topic.context
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.astronomy.a_classroom_exercise', 'A classroom exercise: ')),
                  __alloT('stem.astronomy.print_a_paper_calendar_of_any_single_y', 'Print a paper calendar of any single year + write events on it at proportional dates: January 1 = Big Bang, mid-March = Milky Way forms, late August = Earth forms, etc. Have students mark their own birthday on the calendar — for a 12-year-old, their entire life is ~ 0.027 cosmic seconds, faster than the eye can blink. Then ask: "What deserves attention given how short our individual lifetimes are at cosmic scale?" The answer is not "nothing." It is the opposite: what we choose to do MATTERS more, not less, in such a brief window.')
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.astronomy.sagan_s_original_framing', 'Sagan\'s original framing: ')),
                  __alloT('stem.astronomy.the_cosmos_is_also_within_us_we_are_ma', '"The cosmos is also within us. We are made of star-stuff. We are a way for the universe to know itself." From "Cosmos" (1980), Episode 1. The cosmic calendar was first laid out in "The Dragons of Eden" (1977, Pulitzer Prize for nonfiction) + has been adapted in many forms since. The version above closely follows Sagan\'s scaling. Astrophysicists use slightly different dates as new dating evidence refines, but the orders-of-magnitude pattern is robust.')
                )
              );
            })(),
            '#fb923c'
          ),
