
  // A teaching scale: rounded universe age, fixed non-leap year, no runtime data requests.
  var COSMIC_CALENDAR_YEARS = 13.8e9, COSMIC_CALENDAR_SECONDS = 365 * 86400;
  var COSMIC_CALENDAR_EVENTS = [
    { id: 'jan1', name: 'Big Bang', lookbackYears: 13.8e9, kind: 'boundary',
      story: 'The calendar begins with the hot, dense early universe. Expansion and cooling led to the formation of light elements, and much later, neutral atoms. This scale does not describe the unknown earliest physics.',
      basis: 'Start boundary of the 13.8-billion-year teaching scale.',
      source: 'NASA · Big Bang and the early universe', href: 'https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-big-bang/' },
    { id: 'cmb', name: 'Neutral hydrogen', lookbackYears: 13.8e9 - 380000, kind: 'approximate',
      story: 'Around 380,000 years after the Big Bang, electrons and hydrogen nuclei could combine into neutral atoms. Light from this era reaches us as the cosmic microwave background. On this scale, that is about 14.47 minutes after January 1 begins.',
      basis: 'Approximately 380,000 years after the Big Bang; the transition took time.',
      source: 'NASA · Big Bang and the early universe', href: 'https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-big-bang/' },
    { id: 'jan10', name: 'First stars', lookbackYears: 13.6e9, kind: 'approximate',
      story: 'Gravity drew primordial gas into the earliest stars. Their exact birth dates remain uncertain. The marker uses NASA’s approximate 200-million-year cosmic dawn example; it does not identify a measured first star.',
      basis: 'Illustrative epoch: approximately 200 million years after the Big Bang.',
      source: 'NASA · Universe overview', href: 'https://science.nasa.gov/universe/overview/' },
    { id: 'mar15', name: 'Milky Way thick disk', lookbackYears: 11e9, lowYears: 8e9, highYears: 13e9, kind: 'phase',
      story: 'The Milky Way grew through several stages. Xiang and Rix’s 2022 stellar-age study found thick-disk formation beginning about 13 billion years ago, peaking near 11 billion years ago, and continuing until about 8 billion years ago.',
      basis: 'Formation phase: about 13–8 billion years ago. The marker is the approximate 11-billion-year peak. The band is a period of growth.',
      source: 'Xiang & Rix 2022 · Milky Way assembly', href: 'https://www.nature.com/articles/s41586-022-04496-5' },
    { id: 'aug28', name: 'Solar System', lookbackYears: 4.6e9, kind: 'approximate',
      story: 'The Sun and its surrounding disk formed from a collapsing cloud of gas and dust about 4.6 billion years ago. Planets developed within the disk over time. This maps to September 1 on the 365-day scale.',
      basis: 'Approximate formation age: 4.6 billion years ago.',
      source: 'NASA · How our Solar System formed', href: 'https://science.nasa.gov/astrobiology/learning-resources/alp/how-did-our-solar-system-form/' },
    { id: 'sep1', name: 'Early life evidence', lookbackYears: 3.48e9, kind: 'approximate',
      story: 'Djokic and colleagues described biosignatures in ancient hot-spring deposits of Australia’s Dresser Formation. This is one early record of life. A fossil or biosignature dates preserved evidence; it does not establish when life first began.',
      basis: 'Approximate age of the Dresser Formation evidence: 3.48 billion years.',
      source: 'Djokic et al. 2017 · Early life evidence', href: 'https://www.nature.com/articles/ncomms15263' },
    { id: 'nov15', name: 'Eukaryote fossils', lookbackYears: 1.5e9, kind: 'approximate',
      story: 'Javaux, Knoll and Walter described complex eukaryotic microfossils in the Roper Group of northern Australia. These fossils show that features associated with eukaryotic diversification were present by about 1.5 billion years ago. Earlier origins remain a separate question.',
      basis: 'Approximate age of the Roper Group fossil record: 1.5 billion years.',
      source: 'Javaux et al. 2001 · Eukaryotic ecosystems', href: 'https://www.nature.com/articles/35083562' },
    { id: 'dec5', name: 'Cambrian boundary', lookbackYears: 538.8e6, lowYears: 538.2e6, highYears: 539.4e6, kind: 'uncertainty',
      story: 'The International Commission on Stratigraphy’s June 2026 chart places the start of the Cambrian at 538.8 ± 0.6 million years ago. Animal diversification extended over time; this geological boundary does not mark the first animal.',
      basis: 'Published boundary age: 538.8 ± 0.6 million years. The band shows the quoted numerical age uncertainty.',
      source: 'ICS · June 2026 geological time scale', href: 'https://stratigraphy.org/ICSchart/ChronostratChart2026-06.pdf' },
    { id: 'dec25', name: 'Early dinosaur fossils', lookbackYears: 230e6, kind: 'approximate',
      story: 'Early dinosaur fossils from Argentina and Brazil are about 230 million years old. They are evidence of dinosaurs at that time, rather than an exact date for the group’s origin.',
      basis: 'Approximate fossil age example: 230 million years.',
      source: 'USGS · Early dinosaur fossils', href: 'https://pubs.usgs.gov/gip/dinosaurs/when.html' },
    { id: 'dec31', name: 'Human fossils', lookbackYears: 315000, lowYears: 281000, highYears: 349000, kind: 'uncertainty',
      story: 'Richter and colleagues dated heated flints associated with the Jebel Irhoud Homo sapiens fossils to 315 ± 34 thousand years. The marker represents this dated archaeological context, rather than a precise birthday for our species.',
      basis: 'Published weighted age: 315 ± 34 thousand years. The band shows the quoted dating uncertainty.',
      source: 'Richter et al. 2017 · Jebel Irhoud dating', href: 'https://www.nature.com/articles/nature22335' },
    { id: 'agriculture', name: 'Agriculture', lookbackYears: 12000, kind: 'approximate',
      story: 'Over roughly the last 12,000 years, people developed farming and herding in multiple places. Different crops and communities changed at different times. The marker is an approximate teaching example of this long transition.',
      basis: 'Approximate transition example: 12,000 years ago.',
      source: 'Smithsonian · Humans change the world', href: 'https://humanorigins.si.edu/human-characteristics/humans-change-world' },
    { id: 'now', name: 'Present boundary', lookbackYears: 0, kind: 'boundary',
      story: 'The present is exactly at the end of this cosmic year: the boundary between December 31 and the next January 1. A lifetime fits into a tiny fraction of the final second. Use the age control to compare that interval.',
      basis: 'End boundary of the teaching scale: zero seconds remaining.',
      source: 'NASA · Rounded universe age reference', href: 'https://science.nasa.gov/exoplanets/what-is-the-universe/' }
  ];
  function cosmicCalendarPosition(rawYears) {
    var value = typeof rawYears === 'number' || typeof rawYears === 'string' && rawYears.trim() !== '' ? Number(rawYears) : NaN;
    var lookbackYears = Number.isFinite(value) ? Math.max(0, Math.min(COSMIC_CALENDAR_YEARS, value)) : 0;
    // Compute the small remaining interval directly, without subtracting two near-equal large values.
    var beforeEndSeconds = lookbackYears / COSMIC_CALENDAR_YEARS * COSMIC_CALENDAR_SECONDS;
    var elapsedSeconds = COSMIC_CALENDAR_SECONDS - beforeEndSeconds;
    var elapsedYears = COSMIC_CALENDAR_YEARS - lookbackYears;
    var ticks = Math.min(COSMIC_CALENDAR_SECONDS * 100 - 1, Math.max(0, Math.floor(elapsedSeconds * 100 + 1e-6)));
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], dayIndex = Math.floor(ticks / 8640000), month = 0, day = dayIndex;
    if (lookbackYears === 0) { month = 0; day = 0; }
    else { while (day >= monthDays[month] && month < 11) { day -= monthDays[month]; month++; } }
    var timeTicks = ticks % 8640000, hour = Math.floor(timeTicks / 360000), minute = Math.floor(timeTicks / 6000) % 60;
    var second = (timeTicks % 6000) / 100;
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    var clock = (hour % 12 || 12) + ':' + pad(minute) + ':' + (second < 10 ? '0' : '') + second.toFixed(2) + (hour < 12 ? ' AM' : ' PM');
    var date = lookbackYears === 0 ? 'Year end · next January 1, 12:00 AM' : lookbackYears === COSMIC_CALENDAR_YEARS ? 'January 1, 12:00 AM' : months[month] + ' ' + (day + 1) + ', ' + clock;
    return { lookbackYears: lookbackYears, elapsedYears: elapsedYears, elapsedSeconds: elapsedSeconds, beforeEndSeconds: beforeEndSeconds,
      yearFraction: elapsedSeconds / COSMIC_CALENDAR_SECONDS, month: month, day: day + 1, date: date, atEnd: lookbackYears === 0 };
  }
  function cosmicCalendarModel(saved) {
    var state = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    var zoom = ['hour', 'minute', 'second'].indexOf(state.ccZoom) >= 0 ? state.ccZoom : 'minute';
    var windowSeconds = zoom === 'hour' ? 3600 : zoom === 'second' ? 1 : 60;
    var raw = state.ccLifetimeYears, value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
    var lifetimeYears = Number.isFinite(value) ? Math.round(Math.max(0, Math.min(100, value))) : 12;
    var events = COSMIC_CALENDAR_EVENTS.map(function(e, index) {
      var copy = Object.assign({}, e), position = cosmicCalendarPosition(e.lookbackYears);
      copy.index = index; copy.position = position;
      copy.visible = position.beforeEndSeconds <= windowSeconds;
      copy.zoomFraction = copy.visible ? 1 - position.beforeEndSeconds / windowSeconds : null;
      copy.range = Number.isFinite(e.lowYears) && Number.isFinite(e.highYears) ? {
        early: cosmicCalendarPosition(e.highYears), late: cosmicCalendarPosition(e.lowYears)
      } : null;
      return copy;
    });
    var index = events.findIndex(function(e) { return e.id === state.selectedCC; }); if (index < 0) index = 0;
    var lifetime = cosmicCalendarPosition(lifetimeYears);
    return { selectedId: events[index].id, index: index, selected: events[index], events: events, zoom: zoom, windowSeconds: windowSeconds,
      lifetimeYears: lifetimeYears, lifetime: lifetime, lifetimeZoomFraction: 1 - lifetime.beforeEndSeconds / windowSeconds,
      totalYears: COSMIC_CALENDAR_YEARS, yearSeconds: COSMIC_CALENDAR_SECONDS, realYearsPerSecond: COSMIC_CALENDAR_YEARS / COSMIC_CALENDAR_SECONDS };
  }

