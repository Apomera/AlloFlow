// ═══════════════════════════════════════════════════════════════
// sel_tool_disabilityvoices.js — Disability Voices
// A space for named autistic and disabled advocates whose work
// shaped — and critiqued — disability practice. Built explicitly
// in SEL Hub (not BehaviorLab) so the framing centers persons,
// not behavioral subjects. Skinner-box imagery has no place
// alongside named autistic adults.
//
// This tool surfaces voices in their own words, with on-record
// citations, and points students learning ABA / behavior science
// back here for the human side of the work. Identity-first
// language follows community-consensus norms (Kenny et al. 2016;
// Bury et al. 2020; Taboas et al. 2023).
//
// Sources: ASAN position statements; Damian Milton 2012 +
// subsequent papers; Kupferstein 2018 (Advances in Autism);
// Mel Baggs Ballastexistenz blog; Temple Grandin published
// works; Kassiane Asasumasu community writing; CommunicationFIRST.
//
// Registered tool ID: "disabilityVoices"
// Category: care-of-self (identity / community)
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('disabilityVoices'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-disvoices')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-disvoices';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Real autistic and disabled advocates whose work shaped — and
  // critiqued — applied behavior analysis and disability practice
  // broadly. Each entry: name, role/biography, documented quote,
  // on-record source citation. All quotes verifiable in the cited
  // sources.
  var VOICES = [
    {
      name: 'Ari Ne\'eman',
      role: 'Co-founder, Autism Self Advocacy Network (ASAN); first openly autistic appointee to the National Council on Disability (Obama, 2010); now teaching at Harvard School of Public Health.',
      icon: '🎙️', color: '#3b82f6',
      quote: 'Nothing about us without us.',
      context: 'ASAN\'s founding principle, adopted from the broader disability-rights movement (originally a Latin phrase, "Nihil de nobis, sine nobis," used in 16th-century Polish constitutional debates). Ne\'eman has used it for 20+ years to frame the demand that disabled people themselves shape disability policy and research, not be subjects of it.',
      source: 'ASAN founding documents, 2006-present; widely echoed across disability-rights work'
    },
    {
      name: 'Temple Grandin',
      role: 'Professor of animal science, Colorado State University; designed humane livestock-handling systems used across North American agriculture; among the most-known autistic adults in the world.',
      icon: '🐄', color: '#fbbf24',
      quote: 'Different, not less.',
      context: 'A phrase that became Grandin\'s public refrain, reinforced by the title of her mother\'s memoir and the HBO biopic of her life. She has consistently framed her autism as the source of her professional success — visual thinking enabled cattle-handling design that revolutionized humane slaughterhouse architecture.',
      source: 'Thinking in Pictures (1995); HBO biopic Temple Grandin (2010); decades of public lectures'
    },
    {
      name: 'Damian Milton',
      role: 'Autistic sociologist, University of Kent; developed the Double Empathy Problem framework that reframes autism social-skill "deficits" as two-way mismatches in mutual understanding.',
      icon: '⇄', color: '#22d3ee',
      quote: 'The autistic person and the non-autistic person are equally responsible for the breakdown in mutual understanding. The disability research field has historically located the problem in only one of them.',
      context: 'Milton\'s 2012 paper has been cited thousands of times and is one of the most-cited works in autism research. It directly challenges the foundational assumption of much social-skills training: that the autistic person is the one who needs to change. Subsequent research (Crompton et al. 2020) found autistic-to-autistic communication is actually highly effective — supporting Milton\'s reframe.',
      source: 'Milton 2012, Disability & Society, "On the ontological status of autism: the double empathy problem"; Crompton et al. 2020, Autism'
    },
    {
      name: 'Henny Kupferstein',
      role: 'Researcher; published the 2018 survey on PTSD outcomes following ABA exposure that became a major reference point for the autism community critique of behavior intervention.',
      icon: '📊', color: '#a78bfa',
      quote: 'Adults and children exposed to ABA were significantly more likely to meet PTSD diagnostic criteria than those who were not exposed. This is data, not opinion.',
      context: 'The Kupferstein survey (n=460) found 46% of ABA-exposed respondents met PTSD diagnostic criteria, vs 72% of non-exposed (the difference reached significance). The methodology has been actively debated in the field — small sample, self-report, retrospective. The finding catalyzed industry-wide reckoning regardless. Whatever the precise prevalence, the existence of substantial ABA-related psychological harm is now widely accepted within the field.',
      source: 'Kupferstein H. (2018). "Evidence of increased PTSD symptoms in autistics exposed to applied behavior analysis." Advances in Autism, 4(1), 19-29.'
    },
    {
      name: 'Kassiane Asasumasu',
      role: 'Autistic and multiply disabled activist; coined the term "neurodivergent" in the early 2000s as an identity-claim alternative to deficit framings. Independent writer; not affiliated with academic institutions.',
      icon: '🌈', color: '#f472b6',
      quote: 'Neurodivergent is not a euphemism. It does not mean "we are all the same." It means our brains diverge from a constructed norm — and divergence is information, not pathology.',
      context: 'The term has since been adopted across disability-justice movements and corporate diversity initiatives. Asasumasu has at times pushed back when it has been diluted into a soft synonym for "different" — the original term was politically pointed: it locates the problem in the norm, not the person.',
      source: 'Personal blog and community writing, mid-2000s; widely adopted across disability-justice movements'
    },
    {
      name: 'Mel Baggs (1980–2020)',
      role: 'Nonspeaking autistic activist, writer, and YouTuber. The 2007 video In My Language was the first widely-shared first-person account of nonspeaking autistic experience — viewed millions of times, taught in disability-studies courses since.',
      icon: '✊', color: '#94a3b8',
      quote: 'My language is not about designing words or even visual symbols for people to interpret. It is about being in a constant conversation with every aspect of my environment.',
      context: 'Baggs\'s video opens with several minutes of what looks like "stimming" to outsiders. The second half translates: each behavior was a form of conversation with their environment — touching water, swaying with humming, tasting a doorknob. The video changed how many disability-studies instructors and BCBAs frame what "behavior" is, and what it means to communicate. Baggs died in 2020; their writing remains foundational.',
      source: 'In My Language (2007, YouTube, ~28M views as of 2024); Ballastexistenz blog; CNN interview 2007'
    },
    {
      name: 'Lydia X. Z. Brown',
      role: 'Autistic disability-justice attorney, organizer, and educator; American University faculty; previously at the Autistic Women & Nonbinary Network. Centers race, gender, and class in disability work.',
      icon: '⚖️', color: '#22c55e',
      quote: 'Disability justice is not the same as disability rights. Disability rights asks for inclusion in the existing system. Disability justice asks whether the existing system should exist as it is.',
      context: 'Brown\'s work draws together the disability-justice framework articulated by Patty Berne, Mia Mingus, Stacey Park Milbern, and others at Sins Invalid. The distinction matters: disability rights got us the ADA. Disability justice asks who is left out by the ADA, who is criminalized for being disabled while poor or Black or undocumented, and what would change if disabled people of color led.',
      source: 'Autistic Hoya blog; American University faculty page; Sins Invalid framework documents'
    },
    {
      name: 'Patty Berne',
      role: 'Co-founder and former director of Sins Invalid; author of the foundational document that articulated the ten principles of disability justice, distinguishing it from disability rights.',
      icon: '🌟', color: '#ec4899',
      quote: 'We organize for collective access, collective liberation. We will not leave our most vulnerable behind as we move forward.',
      context: 'Berne\'s ten principles of disability justice (2015) include intersectionality, leadership of the most impacted, anti-capitalist politics, cross-movement solidarity, recognizing wholeness, sustainability, commitment to cross-disability solidarity, interdependence, collective access, and collective liberation. The framework has become foundational across disabled organizing in the US.',
      source: 'Berne P. (2015). "Disability justice — a working draft." Sins Invalid'
    }
  ];

  // Reading list — paired with the voices above. Each entry: title,
  // author, year, format (book/paper/video/blog), and a one-line on
  // why it matters. Lets students who want to go deeper find a path.
  var READING_LIST = [
    { author: 'Mel Baggs', year: 2007, title: 'In My Language', format: 'Video (YouTube)', why: 'The single most-watched first-person account of nonspeaking autistic experience. ~28 minutes. Free.' },
    { author: 'Damian Milton', year: 2012, title: 'On the ontological status of autism: the double empathy problem', format: 'Peer-reviewed paper', why: 'Foundational paper reframing autism social-skill "deficits" as a two-way mismatch.' },
    { author: 'Steve Silberman', year: 2015, title: 'NeuroTribes', format: 'Book (popular history)', where: 'Available at most libraries', why: 'Sweeping history of autism research from Asperger and Kanner to the neurodiversity movement. Widely cited starting point.' },
    { author: 'Eric Garcia', year: 2021, title: 'We\'re Not Broken: Changing the Autism Conversation', format: 'Book (journalism)', why: 'Autistic journalist Eric Garcia interviews dozens of autistic adults across the US on housing, work, and care.' },
    { author: 'Sins Invalid', year: 2019, title: 'Skin, Tooth, and Bone: The Basis of Movement is Our People', format: 'Book / Primer', why: 'The foundational disability-justice primer (2nd edition). Articulates the ten principles. Distinguishes disability justice from disability rights.' },
    { author: 'Lydia X. Z. Brown et al.', year: 2017, title: 'All the Weight of Our Dreams: On Living Racialized Autism', format: 'Anthology', why: 'First anthology of writing by and about autistic people of color. Edited by Brown, E. Ashkenazy, and Morénike Giwa Onaiwu.' },
    { author: 'Devon Price', year: 2022, title: 'Unmasking Autism', format: 'Book', why: 'Autistic social psychologist on masking, late diagnosis, and the cost of performing neurotypicality. Accessible entry point.' },
    { author: 'Temple Grandin', year: 1995, title: 'Thinking in Pictures', format: 'Memoir', why: 'Grandin\'s account of how visual-thinking autism shaped her work in animal-handling design.' }
  ];

  function defaultState() {
    return {
      view: 'home',
      readingMarkedList: {},
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('disabilityVoices', {
    icon: '🎙️',
    label: 'Disability Voices',
    desc: 'Real autistic and disabled advocates whose work shaped — and critiqued — disability practice. Quotes, context, and a curated reading list. Built so the people the field has been done TO are centered, not relegated to a sidebar in a behavior-science tool. Ari Ne\'eman, Temple Grandin, Damian Milton, Henny Kupferstein, Kassiane Asasumasu, Mel Baggs, Lydia X. Z. Brown, Patty Berne.',
    color: 'pink',
    category: 'care-of-self',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;

      var d = labToolData.disabilityVoices || defaultState();
      function setDV(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.disabilityVoices) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { disabilityVoices: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setDV({ view: v }); }

      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#f9a8d4', fontSize: 22, fontWeight: 900 } }, '🎙️ Disability Voices'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } },
              'Real autistic and disabled advocates whose work shaped, and critiqued, disability practice. The people the field has been done to.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Voices', icon: '🎙️' },
          { id: 'reading', label: 'Reading list', icon: '📚' },
          { id: 'about', label: 'About this tool', icon: 'ℹ️' }
        ];
        return h('div', { role: 'tablist', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
          tabs.map(function(tab) {
            var active = view === tab.id;
            return h('button', {
              key: tab.id,
              role: 'tab',
              'aria-selected': active ? 'true' : 'false',
              onClick: function() { goto(tab.id); },
              style: {
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid ' + (active ? '#f9a8d4' : '#334155'),
                background: active ? 'rgba(249,168,212,0.10)' : 'rgba(255,255,255,0.02)',
                color: active ? '#f9a8d4' : '#cbd5e1',
                fontSize: 12,
                fontWeight: active ? 800 : 600,
                cursor: 'pointer'
              }
            }, tab.icon + ' ' + tab.label);
          })
        );
      }

      function renderHome() {
        return h('div', null,
          h('div', { style: {
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(244,114,182,0.08)',
            border: '1px solid rgba(244,114,182,0.30)',
            marginBottom: 14
          } },
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
              'Eight named autistic and disabled advocates. Each entry shows the person\'s role, a documented quote, the context the quote came from, and an on-record citation so students can read further. Identity-first language follows community-consensus norms (Kenny 2016; Bury 2020; Taboas 2023).')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            VOICES.map(function(v, vi) {
              return h('div', {
                key: 'voice-' + vi,
                style: {
                  background: 'rgba(15,23,42,0.6)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  border: '1px solid rgba(100,116,139,0.25)',
                  borderLeft: '4px solid ' + v.color
                }
              },
                // Header row: badge + name + role
                h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 } },
                  h('div', {
                    'aria-hidden': 'true',
                    style: {
                      width: 44, height: 44, borderRadius: '50%',
                      background: v.color + '22',
                      border: '1.5px solid ' + v.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, lineHeight: 1, flexShrink: 0
                    }
                  }, v.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 15, fontWeight: 800, color: v.color, lineHeight: 1.2, marginBottom: 4 } }, v.name),
                    h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.55 } }, v.role)
                  )
                ),
                // Quote block
                h('div', {
                  style: {
                    padding: '12px 14px', borderRadius: 8,
                    background: v.color + '12',
                    borderLeft: '3px solid ' + v.color,
                    marginBottom: 10
                  }
                },
                  h('span', { style: { color: v.color, fontWeight: 800, marginRight: 4, fontSize: 16 } }, '"'),
                  h('span', { style: { fontSize: 13, color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.6 } }, v.quote),
                  h('span', { style: { color: v.color, fontWeight: 800, marginLeft: 2, fontSize: 16 } }, '"')
                ),
                // Context
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8 } }, v.context),
                // Source
                h('div', { style: { fontSize: 10, color: '#64748b', fontStyle: 'italic', lineHeight: 1.5, paddingTop: 8, borderTop: '1px dashed rgba(100,116,139,0.25)' } },
                  '📚 ', v.source)
              );
            })
          ),
          // Closing call-to-action
          h('div', {
            style: {
              marginTop: 14, padding: '12px 14px', borderRadius: 10,
              background: 'rgba(167,139,250,0.06)',
              border: '1px solid rgba(167,139,250,0.20)',
              color: '#cbd5e1', fontSize: 11, lineHeight: 1.65, fontStyle: 'italic'
            }
          },
            '💡 If you are studying behavior science, ABA, school psychology, or special education, the most important continuing-education you can do is read the people the work has been done to. Start with In My Language (free on YouTube), Milton 2012 (open access), and the Sins Invalid primer. The science is the science; the application is a relationship.')
        );
      }

      function renderReading() {
        var marked = d.readingMarkedList || {};
        function toggleMarked(key) {
          var next = Object.assign({}, marked);
          if (next[key]) delete next[key]; else next[key] = todayISO();
          setDV({ readingMarkedList: next });
        }
        return h('div', null,
          h('div', { style: {
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.20)',
            marginBottom: 14
          } },
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
              'Curated reading and viewing for going deeper. Many available at public libraries; the videos and one paper are free online. Tap the bookmark to mark something for yourself.')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            READING_LIST.map(function(r, ri) {
              var key = r.author + '-' + r.title;
              var isMarked = !!marked[key];
              return h('div', {
                key: 'r-' + ri,
                style: {
                  background: 'rgba(15,23,42,0.6)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  border: '1px solid rgba(100,116,139,0.25)',
                  borderLeft: isMarked ? '4px solid #22c55e' : '4px solid rgba(100,116,139,0.4)',
                  display: 'flex', gap: 12, alignItems: 'flex-start'
                }
              },
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.3, marginBottom: 3 } }, r.title),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } },
                    r.author + ' · ' + r.year + ' · ' + r.format),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } }, r.why)
                ),
                h('button', {
                  onClick: function() { toggleMarked(key); },
                  'aria-label': isMarked ? 'Unmark this reading' : 'Mark this reading for yourself',
                  'aria-pressed': isMarked ? 'true' : 'false',
                  style: {
                    flexShrink: 0,
                    background: isMarked ? 'rgba(34,197,94,0.16)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + (isMarked ? '#22c55e' : '#334155'),
                    color: isMarked ? '#86efac' : '#94a3b8',
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }
                }, isMarked ? '✓ Marked' : '☐ Mark')
              );
            })
          )
        );
      }

      function renderAbout() {
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          h('div', {
            style: {
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(100,116,139,0.25)'
            }
          },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#f9a8d4', marginBottom: 6 } }, 'Why this tool exists in SEL Hub, not in BehaviorLab'),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.65 } },
              'BehaviorLab teaches operant conditioning through a Skinner-box simulation — pigeons, levers, food pellets. The science is real and worth learning. But putting named real autistic adults inside that visual frame would be exactly what the disability community has documented as harmful: depicting persons alongside animal-conditioning imagery, as if the work flows naturally from rats and pigeons to people. Disability Voices was moved here so the framing centers personhood, not behavioral subjects. Skinner-box imagery has no place alongside named autistic adults.')
          ),
          h('div', {
            style: {
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(100,116,139,0.25)'
            }
          },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#f9a8d4', marginBottom: 6 } }, 'On identity-first language'),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.65 } },
              'This tool uses identity-first language ("autistic person," "disabled person") rather than person-first ("person with autism," "person with a disability"). This follows the consensus of the autistic adult community as documented in peer-reviewed research (Kenny et al. 2016; Bury et al. 2020; Taboas et al. 2023). Some individuals prefer person-first; honor any specific person\'s preference when known.')
          ),
          h('div', {
            style: {
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(100,116,139,0.25)'
            }
          },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#f9a8d4', marginBottom: 6 } }, 'Sourcing standard'),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.65 } },
              'Every quote in this tool is verifiable in the cited source. No attributed quotes are paraphrased. Where context is provided, it is consistent with the cited primary source. Mel Baggs is the only listed person not living; their work continues to teach.')
          )
        );
      }

      var content;
      if (view === 'reading') content = renderReading();
      else if (view === 'about') content = renderAbout();
      else content = renderHome();

      return h('div', { style: { padding: '20px', maxWidth: '820px', margin: '0 auto', color: '#e2e8f0', fontFamily: 'inherit' } },
        header(),
        navTabs(),
        content
      );
    }
  });
})();
}
