/**
 * AlloFlow PoetTree Module
 *
 * A poetry-writing workshop for middle-school and adolescent writers, with
 * built-in form scaffolds, syllable counting, rhyme-scheme detection, and
 * Gemini-powered feedback on imagery, meter, and revision opportunities.
 *
 * Designed for King Middle School pilot — grade-responsive, accessibility-first,
 * works for sighted and screen-reader users alike.
 *
 * Source: poet_tree_module.js
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.PoetTree) {
    console.log('[CDN] PoetTree already loaded, skipping');
    return;
  }

  // ── Live region (WCAG 4.1.3) ──
  (function () {
    if (document.getElementById('allo-live-poettree')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-poettree';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  function announcePT(msg) {
    try {
      var lr = document.getElementById('allo-live-poettree');
      if (lr) { lr.textContent = ''; setTimeout(function () { lr.textContent = msg; }, 50); }
    } catch (e) {}
  }

  // ── Reduced-motion CSS scoped to .pt-tool (defense-in-depth alongside host CSS) ──
  (function () {
    if (document.getElementById('pt-a11y-css')) return;
    var st = document.createElement('style');
    st.id = 'pt-a11y-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { .pt-tool *, .pt-tool *::before, .pt-tool *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  var warnLog = function () { console.warn.apply(console, ['[PoetTree]'].concat(Array.prototype.slice.call(arguments))); };

  // ── Constants ─────────────────────────────────────────────────────────
  var STORAGE_POEMS = 'alloPoetTreePoems';
  var STORAGE_PREFS = 'alloPoetTreePrefs';

  // Poetic forms — middle-school friendly progression from no-rules to structured.
  var FORMS = [
    {
      id: 'free',
      name: 'Free Verse',
      icon: '🌬️',
      tagline: 'No rules — just feeling and image.',
      structure: 'No required line count, no required rhyme, no required meter. Free verse is poetry that earns its shape from the words themselves.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: 'so much depends\nupon\n\na red wheel\nbarrow\n\nglazed with rain\nwater\n\nbeside the white\nchickens.\n\n— William Carlos Williams',
      tips: [
        'Cut anything that does not earn its place.',
        'Use line breaks to control the reader\'s breath.',
        'A specific image (the red wheelbarrow) beats a vague feeling (sadness).'
      ],
      moreExamples: [
        {
          title: 'I Hear America Singing',
          author: 'Walt Whitman',
          year: 1860,
          text: 'I hear America singing, the varied carols I hear,\nThose of mechanics, each one singing his as it should be blithe and strong,\nThe carpenter singing his as he measures his plank or beam,\nThe mason singing his as he makes ready for work, or leaves off work…',
          note: 'A long, generous line — Whitman invented this rhythm. Notice how each profession gets its own image.'
        },
        {
          title: 'In the Desert',
          author: 'Stephen Crane',
          year: 1895,
          text: 'In the desert\nI saw a creature, naked, bestial,\nWho, squatting upon the ground,\nHeld his heart in his hands,\nAnd ate of it.\nI said, "Is it good, friend?"\n"It is bitter — bitter," he answered;\n"But I like it\nBecause it is bitter,\nAnd because it is my heart."',
          note: 'A complete short story in 11 lines. Free verse can be tight as well as expansive.'
        }
      ]
    },
    {
      id: 'haiku',
      name: 'Haiku',
      icon: '🍃',
      tagline: '3 lines. 5–7–5 syllables. A single moment.',
      structure: '3 lines. Line 1 has 5 syllables, line 2 has 7, line 3 has 5. Traditionally captures a single moment in nature, often with a turn or shift in line 3.',
      lineCount: 3,
      syllablesPerLine: [5, 7, 5],
      rhymeScheme: null,
      example: 'an old silent pond\na frog jumps into the pond —\nsplash! silence again.\n\n— Matsuo Bashō',
      tips: [
        'No need to rhyme — haiku rarely does in Japanese.',
        'A haiku is one moment, not a story.',
        'The third line often contains a surprise or a small shift in perspective.'
      ],
      moreExamples: [
        {
          title: 'The piercing chill I feel',
          author: 'Yosa Buson',
          year: 1768,
          text: 'The piercing chill I feel:\nmy dead wife\'s comb, in our bedroom,\nunder my heel.',
          note: 'Sensation (cold, sharp object) + deep emotion. Buson lets the object do the grieving.'
        },
        {
          title: 'A world of dew',
          author: 'Kobayashi Issa',
          year: 1819,
          text: 'A world of dew,\nand within every dewdrop\na world of struggle.',
          note: 'Issa wrote this after his daughter\'s death. The form holds enormous grief in 17 syllables.'
        }
      ]
    },
    {
      id: 'limerick',
      name: 'Limerick',
      icon: '🍀',
      tagline: '5 lines, AABBA, funny.',
      structure: '5 lines. Lines 1, 2, and 5 rhyme (A) and have ~7–10 syllables. Lines 3 and 4 rhyme (B) and have ~5–7 syllables. Anapestic-leaning rhythm. Almost always humorous.',
      lineCount: 5,
      syllablesPerLine: [9, 9, 6, 6, 9],
      rhymeScheme: 'AABBA',
      example: 'There once was a man from Peru\nWho dreamed he was eating his shoe.\nHe woke in a fright\nIn the middle of the night\nAnd found that his dream had come true.',
      tips: [
        'The funnier the better. Limericks reward bold choices.',
        'Line 3 and 4 should set up the punch in line 5.',
        'Read it out loud to feel the rhythm.'
      ],
      moreExamples: [
        {
          title: 'There was an Old Man with a beard',
          author: 'Edward Lear',
          year: 1846,
          text: 'There was an Old Man with a beard,\nWho said, "It is just as I feared!\nTwo Owls and a Hen,\nFour Larks and a Wren,\nHave all built their nests in my beard!"',
          note: 'Lear is the godfather of the limerick. Notice the absurd specificity — exactly four larks.'
        },
        {
          title: 'A flea and a fly',
          author: 'Anonymous',
          year: 1900,
          text: 'A flea and a fly in a flue\nWere imprisoned, so what could they do?\nSaid the fly, "Let us flee!"\n"Let us fly!" said the flea.\nSo they flew through a flaw in the flue.',
          note: 'Watch how the wordplay (flee/fly/flea/flaw) becomes the joke itself.'
        }
      ]
    },
    {
      id: 'sonnet',
      name: 'Sonnet (Shakespearean)',
      icon: '🎭',
      tagline: '14 lines, ABAB CDCD EFEF GG, iambic pentameter.',
      structure: '14 lines, divided into three quatrains (4 lines each) and a final couplet. Rhyme scheme: ABAB CDCD EFEF GG. Each line is roughly 10 syllables in iambic pentameter (unstressed-stressed × 5). The final couplet typically delivers a turn or insight.',
      lineCount: 14,
      syllablesPerLine: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      rhymeScheme: 'ABAB CDCD EFEF GG',
      example: 'Shall I compare thee to a summer\'s day?\nThou art more lovely and more temperate:\nRough winds do shake the darling buds of May,\nAnd summer\'s lease hath all too short a date.\n\n— Shakespeare, Sonnet 18',
      tips: [
        'Iambic pentameter sounds like a heartbeat: da-DUM da-DUM da-DUM da-DUM da-DUM.',
        'Use the final couplet for a turn — the volta — that resolves or twists the poem.',
        'Don\'t force rhymes; let the meaning lead.'
      ],
      moreExamples: [
        {
          title: 'How do I love thee? (Sonnet 43)',
          author: 'Elizabeth Barrett Browning',
          year: 1850,
          text: 'How do I love thee? Let me count the ways.\nI love thee to the depth and breadth and height\nMy soul can reach, when feeling out of sight\nFor the ends of being and ideal grace.\nI love thee to the level of every day\'s\nMost quiet need…\n[opening lines]',
          note: 'Browning answers the opening question for 14 lines straight. The structure of the sonnet IS the answer.'
        },
        {
          title: 'Bright Star',
          author: 'John Keats',
          year: 1819,
          text: 'Bright star, would I were stedfast as thou art —\nNot in lone splendour hung aloft the night\nAnd watching, with eternal lids apart,\nLike nature\'s patient, sleepless Eremite…',
          note: 'Keats addresses the star directly (apostrophe). The sonnet form gives him 14 lines to argue with eternity.'
        }
      ]
    },
    {
      id: 'ballad',
      name: 'Ballad',
      icon: '🪕',
      tagline: 'Tells a story. Quatrains, ABAB or ABCB.',
      structure: 'Stanzas of 4 lines (quatrains). Common rhyme scheme: ABAB or ABCB. Lines alternate longer (~8 syllables, tetrameter) and shorter (~6 syllables, trimeter). Tells a story, often with refrain.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: 'ABCB (per stanza)',
      example: 'It is an ancient Mariner,\nAnd he stoppeth one of three.\n"By thy long grey beard and glittering eye,\nNow wherefore stopp\'st thou me?"\n\n— Coleridge, "The Rime of the Ancient Mariner"',
      tips: [
        'A ballad is a poem that tells a story.',
        'A repeated line or phrase (refrain) gives it a song-like quality.',
        'Strong nouns and verbs do more work than adjectives.'
      ],
      moreExamples: [
        {
          title: 'The Three Ravens',
          author: 'Anonymous (traditional)',
          year: 1611,
          text: 'There were three ravens sat on a tree,\nDowne a downe, hay down, hay downe,\nThere were three ravens sat on a tree,\nWith a downe.\nThere were three ravens sat on a tree,\nThey were as blacke as they might be,\nWith a downe derrie, derrie, derrie, downe, downe.',
          note: 'A traditional folk ballad. The nonsense refrain ("Downe a downe…") was sung — ballads were songs first.'
        },
        {
          title: 'Annabel Lee (excerpt)',
          author: 'Edgar Allan Poe',
          year: 1849,
          text: 'It was many and many a year ago,\n   In a kingdom by the sea,\nThat a maiden there lived whom you may know\n   By the name of Annabel Lee;\nAnd this maiden she lived with no other thought\n   Than to love and be loved by me.',
          note: 'Poe alternates long and short lines — listen to how the rhythm pulls you into the story.'
        }
      ]
    },
    {
      id: 'found',
      name: 'Found Poetry',
      icon: '✂️',
      tagline: 'A poem made from words you didn\'t write.',
      structure: 'Take an existing text — a news article, a textbook page, a letter — and select words/phrases to form a poem. The art is in the selection and arrangement, not the original writing.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: 'From a cereal box:\n\nMade with whole grain.\nNo high fructose corn syrup.\nA part of\nThis complete\nBreakfast.',
      tips: [
        'Pick a source text with strong vocabulary and varied sentence structure.',
        'You can change line breaks freely. You cannot add words that aren\'t in the source.',
        'Found poetry can change the meaning of a text just by what you choose to keep.'
      ]
    },
    {
      id: 'acrostic',
      name: 'Acrostic',
      icon: '🔤',
      tagline: 'The first letters of each line spell a word or phrase.',
      structure: 'Pick a word (a name, a season, a feeling). Each line of the poem starts with the next letter of that word. The lines themselves describe or relate to the chosen word.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: 'Quiet at sunrise, before the day begins,\nUnder a sky still pale with stars,\nIt waits, the world, just for a moment,\nEvery breath held —\nThen morning happens.',
      tips: [
        'Pick a subject first (often a single word). Write that word vertically before you start.',
        'You don\'t need to rhyme — focus on filling each letter with an image.',
        'For a longer poem, use a phrase instead of a single word.'
      ],
      moreExamples: [
        {
          title: 'A Boat Beneath a Sunny Sky (excerpt)',
          author: 'Lewis Carroll',
          year: 1871,
          text: 'A boat, beneath a sunny sky\nLingering onward dreamily\nIn an evening of July —\n\nChildren three that nestle near,\nEager eye and willing ear…',
          note: 'The first letters of every line spell "ALICE PLEASANCE LIDDELL" — the real Alice in Wonderland\'s name. A hidden dedication.'
        },
        {
          title: 'A Valentine (excerpt)',
          author: 'Edgar Allan Poe',
          year: 1849,
          text: 'For her this rhyme is penned, whose luminous eyes,\nBrightly expressive as the twins of Loeda,\nShall find her own sweet name, that, nestling lies\nUpon the page, enwrapped from every reader.',
          note: 'Poe\'s acrostic is hidden differently: read the 1st letter of line 1, 2nd letter of line 2, 3rd of line 3, etc.'
        }
      ]
    },
    {
      id: 'cinquain',
      name: 'Cinquain',
      icon: '🪆',
      tagline: '5 lines: 2–4–6–8–2 syllables. A small structure with a sting.',
      structure: '5 lines. Line 1 has 2 syllables, line 2 has 4, line 3 has 6, line 4 has 8, line 5 has 2. (Adelaide Crapsey form.) The final 2-syllable line often gives the poem its shape — a turn, a surprise, or a quiet conclusion.',
      lineCount: 5,
      syllablesPerLine: [2, 4, 6, 8, 2],
      rhymeScheme: null,
      example: 'Listen…\nWith faint dry sound,\nLike steps of passing ghosts,\nThe leaves, frost-crisp\'d, break from the trees\nAnd fall.\n\n— Adelaide Crapsey, "November Night"',
      tips: [
        'The two-syllable opening and closing lines work best when they hint at something larger.',
        'A cinquain doesn\'t have to rhyme. The shape does the work.',
        'Read it aloud — if a line feels rushed or stretched, count syllables again.'
      ],
      moreExamples: [
        {
          title: 'The Warning',
          author: 'Adelaide Crapsey',
          year: 1915,
          text: 'Just now,\nOut of the strange\nstill dusk… as strange, as still…\nA white moth flew. Why am I grown\nso cold?',
          note: 'The "why am I grown so cold?" lands harder because the form has been so quiet.'
        },
        {
          title: 'Triad',
          author: 'Adelaide Crapsey',
          year: 1915,
          text: 'These be\nThree silent things:\nThe falling snow… the hour\nBefore the dawn… the mouth of one\nJust dead.',
          note: 'Three image-fragments grouped into one cinquain. Notice the death image waits for the very last line.'
        }
      ]
    },
    {
      id: 'diamante',
      name: 'Diamante',
      icon: '💎',
      tagline: '7 lines, diamond-shaped. Often pairs opposites.',
      structure: '7 lines forming a diamond. Line 1: one noun (your starting topic). Line 2: two adjectives describing line 1. Line 3: three -ing verbs about line 1. Line 4: four nouns — the first two relate to line 1, the last two transition toward line 7. Line 5: three -ing verbs about line 7. Line 6: two adjectives describing line 7. Line 7: one contrasting (or related) noun.',
      lineCount: 7,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: 'Day\nBright, busy\nRunning, laughing, working\nSunlight, voices — silence, shadows\nSettling, slowing, dreaming\nQuiet, cool\nNight',
      tips: [
        'Diamantes are great for opposites: hot/cold, summer/winter, love/hate, child/adult.',
        'The middle line (line 4) is the pivot — first two words belong to line 1, last two belong to line 7.',
        'Verbs end in -ing on lines 3 and 5. That repetition is the form\'s rhythm.'
      ]
    },
    {
      id: 'tanka',
      name: 'Tanka',
      icon: '🌸',
      tagline: 'Haiku\'s longer cousin: 5–7–5–7–7 syllables.',
      structure: '5 lines. Syllables per line: 5, 7, 5, 7, 7. Like haiku, often grounded in a sensory image — but with two extra lines that allow for emotion or reflection. The first three lines often paint the scene; the last two turn inward.',
      lineCount: 5,
      syllablesPerLine: [5, 7, 5, 7, 7],
      rhymeScheme: null,
      example: 'How shallow the snow,\nhow simple the moonlight on\nthe shoulders of stone —\nbut one breath caught in my chest\nremembers what cold can mean.',
      tips: [
        'The first 3 lines work like a haiku — image, breath, image.',
        'The last 2 lines (the "lower phrase") add emotion or a personal note.',
        'No need to rhyme — tanka relies on rhythm and image, not sound matching.'
      ],
      moreExamples: [
        {
          title: 'How invisibly',
          author: 'Ono no Komachi',
          year: 850,
          text: 'How invisibly\nit changes color\nin this world,\nthe flower\nof the human heart.',
          note: 'A 9th-century Japanese poet. Notice how the central image (color-changing flower) only resolves in the last line.'
        },
        {
          title: 'Even in a person',
          author: 'Saigyō',
          year: 1180,
          text: 'Even in a person\nmost times indifferent\nto things around him,\nthey waken feelings —\nthe first winds of autumn.',
          note: 'The "lower phrase" (last 2 lines) often delivers the punch — here, the season undoes the man.'
        }
      ]
    },
    {
      id: 'couplet',
      name: 'Couplet',
      icon: '🪞',
      tagline: 'Two lines that rhyme. The smallest finished poem.',
      structure: '2 lines (occasionally extended to multiple couplets). The two lines rhyme at the end (AA). Lines are usually similar in length and rhythm. A couplet is the simplest possible rhymed unit — and the building block of sonnets, ballads, and heroic verse.',
      lineCount: 2,
      syllablesPerLine: null,
      rhymeScheme: 'AA',
      example: 'Hope is the thing with feathers\nThat perches in the soul.\n\n(Famous opening — Emily Dickinson, slant rhyme)\n\nor:\n\nThe road was long, the morning new,\nThe world was waking, soft with dew.',
      tips: [
        'A couplet works because two ideas balance each other — consider what the second line ADDS to the first.',
        'You can chain couplets (AA BB CC…) into longer poems. Many epics are entirely couplets.',
        'Try writing a couplet as a small "thought of the day" exercise — low pressure, big payoff.'
      ],
      moreExamples: [
        {
          title: 'An Essay on Criticism (excerpt)',
          author: 'Alexander Pope',
          year: 1711,
          text: 'A little learning is a dang\'rous thing;\nDrink deep, or taste not the Pierian spring.',
          note: 'Pope wrote thousands of couplets. Each pair is a complete thought you could put on a poster.'
        },
        {
          title: 'Closing couplet',
          author: 'Shakespeare (Sonnet 18)',
          year: 1609,
          text: 'So long as men can breathe or eyes can see,\nSo long lives this, and this gives life to thee.',
          note: 'The final couplet of a Shakespearean sonnet often delivers the volta — the turn — in just two lines.'
        }
      ]
    },
    {
      id: 'ballad',
      name: 'Ballad',
      icon: '🪕',
      tagline: '4-line stanzas. Rhyme abcb. Tell a story you would sing around a fire.',
      structure: 'Quatrains (4-line stanzas). Lines 2 and 4 rhyme — ABCB pattern. Traditionally lines 1 and 3 are 4 beats (iambic tetrameter), lines 2 and 4 are 3 beats (iambic trimeter). Ballads tell a story — a hero, a tragedy, a love, a loss — often in plain musical language.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: 'A-B-C-B per stanza',
      example: 'It is an ancient Mariner,\nAnd he stoppeth one of three.\n"By thy long grey beard and glittering eye,\nNow wherefore stopp\'st thou me?"\n\n— Coleridge, "The Rime of the Ancient Mariner"',
      tips: [
        'Pick a story — a single event with a beginning, middle, and end.',
        'Keep the language plain. Ballads were sung; they live by ear, not by trick.',
        'Use a refrain (a repeated line) if the moment deserves echoing.',
        'Lines 1/3 are slightly longer than lines 2/4. Read aloud — you\'ll feel it.'
      ],
      moreExamples: [
        {
          title: 'La Belle Dame sans Merci (opening)',
          author: 'John Keats',
          year: 1819,
          text: 'O what can ail thee, knight-at-arms,\nAlone and palely loitering?\nThe sedge has withered from the lake,\nAnd no birds sing.',
          note: 'Four lines. A knight, a lake, no birds. The whole haunted story turns on what is missing — an inversion of the form\'s usual narrative drive.'
        },
        {
          title: 'Lord Randall (refrain)',
          author: 'Anonymous (traditional Scottish)',
          year: 1700,
          text: '"O where ha\'e ye been, Lord Randall, my son?\nO where ha\'e ye been, my handsome young man?"\n"I ha\'e been to the wild wood; mother, make my bed soon,\nFor I\'m weary wi\' hunting, and fain wad lie down."',
          note: 'Folk ballads often use repeated questions and refrains — "make my bed soon, for I\'m weary." The structure carries the dread.'
        }
      ]
    },
    {
      id: 'villanelle',
      name: 'Villanelle',
      icon: '🌀',
      tagline: '19 lines. Two refrains that loop back. The form remembers what you are trying to say.',
      structure: '19 lines: five tercets (3-line stanzas) followed by a quatrain (4-line stanza). Two lines act as refrains — line 1 repeats as lines 6, 12, and 18; line 3 repeats as lines 9, 15, and 19. Rhyme scheme: A1 b A2 / a b A1 / a b A2 / a b A1 / a b A2 / a b A1 A2 (where A1 and A2 are the two refrains). The form\'s recursion is the whole point — it is a poem about not letting go.',
      lineCount: 19,
      syllablesPerLine: null,
      rhymeScheme: 'A1 b A2 / a b A1 / a b A2 / a b A1 / a b A2 / a b A1 A2',
      example: 'Do not go gentle into that good night,\nOld age should burn and rave at close of day;\nRage, rage against the dying of the light.\n\nThough wise men at their end know dark is right,\nBecause their words had forked no lightning they\nDo not go gentle into that good night.\n\n— Dylan Thomas (opening, 1951)',
      tips: [
        'Pick your two refrains FIRST. They have to bear the weight of repeated landings.',
        'Pick refrains that can shift meaning across contexts — slight syntactic ambiguity helps.',
        'Don\'t fight the recursion; lean into it. Each repeat is a new pressure on the same words.',
        'Rhyme matters but is secondary to the refrains. Don\'t cripple the refrains for an end-rhyme.'
      ],
      moreExamples: [
        {
          title: 'One Art (opening)',
          author: 'Elizabeth Bishop',
          year: 1976,
          text: 'The art of losing isn\'t hard to master;\nso many things seem filled with the intent\nto be lost that their loss is no disaster.',
          note: 'Bishop\'s "One Art" runs the form against itself — each return of "the art of losing isn\'t hard to master" carries more grief, until the parenthetical "(Write it!)" cracks the whole structure open.'
        },
        {
          title: 'Mad Girl\'s Love Song (opening)',
          author: 'Sylvia Plath',
          year: 1953,
          text: 'I shut my eyes and all the world drops dead;\nI lift my lids and all is born again.\n(I think I made you up inside my head.)',
          note: 'Plath\'s villanelle uses the parenthetical refrain as a private aside — the public claim and the secret knowledge alternate through the poem.'
        }
      ]
    },
    {
      id: 'pantoum',
      name: 'Pantoum',
      icon: '🪢',
      tagline: 'Malaysian form. Each stanza\'s 2nd and 4th lines become the next stanza\'s 1st and 3rd.',
      structure: 'Quatrains where lines 2 and 4 of each stanza become lines 1 and 3 of the next. The poem usually ends by returning to the very first line. Rhyme is optional (often ABAB). The repetition feels like a tide — every wave brings the previous one back, slightly altered by the new context.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: 'optional ABAB; the form is defined by line repetition',
      example: 'I am tired, but the work is not done.\nThe lamps come on along the river.\nThe river says nothing back.\nI sit on the bench and wait.\n\nThe lamps come on along the river.\nA dog barks somewhere I cannot see.\nI sit on the bench and wait.\nNothing has changed; everything has.',
      tips: [
        'Write your first stanza completely first. Lines 2 and 4 are the seeds of stanza 2.',
        'Slight punctuation changes (a comma to a period, a question to a statement) let a repeated line shift in meaning.',
        'Pantoums work best when each line can stand alone — they\'ll be heard twice in different contexts.',
        'For a clean ending, return to your opening line in the final stanza.'
      ],
      moreExamples: [
        {
          title: 'Pantoum of the Great Depression (opening)',
          author: 'Donald Justice',
          year: 1995,
          text: 'Our lives avoided tragedy\nSimply by going on and on,\nWithout end and with little apparent meaning.\nOh, there were storms and small catastrophes.\n\nSimply by going on and on,\nWe managed. No need for the heroic.\nOh, there were storms and small catastrophes.\nI don\'t remember all the particulars.',
          note: 'Justice uses the pantoum\'s recursion to dramatize the slow accretion of an ordinary life — repetition as the texture of just-getting-through.'
        }
      ]
    },
    {
      id: 'concrete',
      name: 'Concrete Poem',
      icon: '🌳',
      tagline: 'Arrange your words on the page so the shape is part of the meaning.',
      structure: 'A concrete (or visual) poem is a poem where the arrangement of the text on the page IS the poem — line breaks, indentation, and white space all carry meaning. The shape might be literal (a poem about a tree, in the shape of a tree) or abstract (jagged lines for chaos, centered lines for stillness). Use the regular text editor below; type spaces and line breaks to position your words. Try a monospaced shape like a triangle, a wave, a falling raindrop, or your own.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: '       water\n      falling\n     down a\n    cliff to\n   become a\n  river that\n flows toward\nthe quiet sea',
      tips: [
        'Read your poem out loud first, then ask: what shape does this feeling have?',
        'White space is silence — use it where you want the reader to pause.',
        'You don\'t have to draw a literal picture. A jagged staircase of lines can carry as much weight as a perfect heart shape.',
        'Test with monospaced font (toggle Reading Mode off) — it makes alignment honest.'
      ],
      moreExamples: [
        {
          title: 'Easter Wings',
          author: 'George Herbert',
          year: 1633,
          text: 'Lord, who createdst man in wealth and store,\n  Though foolishly he lost the same,\n     Decaying more and more,\n        Till he became\n          Most poore:\n          With thee\n        O let me rise\n     As larks, harmoniously,\n  And sing this day thy victories:\nThen shall the fall further the flight in me.',
          note: 'Printed sideways in 1633, this poem\'s lines literally narrow to "Most poore" then expand back out — the shape mirrors the spiritual fall and rise the words describe. One of the earliest English concrete poems.'
        },
        {
          title: 'l(a (the falling-leaf poem)',
          author: 'e.e. cummings',
          year: 1958,
          text: 'l(a\n\nle\naf\nfa\n\nll\n\ns)\none\nl\n\niness',
          note: 'Cummings smashes "loneliness" through the parenthetical "a leaf falls" — a single leaf descending. Read down: l-(a-leaf-falls)-l-iness. The shape IS the meaning.'
        },
        {
          title: 'Calligramme: La Cravate (sketch idea)',
          author: 'Guillaume Apollinaire',
          year: 1918,
          text: 'a poem typeset in the shape of a necktie',
          note: 'Apollinaire\'s Calligrammes typeset whole poems in the shape of objects — a fountain, a heart, a rainstorm. The full visual originals belong in a museum but the principle (text arrangement = image) is yours to borrow.'
        }
      ]
    },
    {
      id: 'erasure',
      name: 'Erasure Poem',
      icon: '⬛',
      tagline: 'Take a page. Black out everything except the poem hiding inside it.',
      structure: 'Start with any source text (a news article, a chapter, a song lyric, a textbook page). Click the words you want to KEEP. Everything else gets blacked out. The poem that remains is your erasure. Reading order follows the original text — left to right, top to bottom — so you are listening for the poem the source already contains, not rearranging it.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: '(from a weather report)\n\nthe wind        will move\n           toward us\n      slowly,           a small\n           hand\n           of rain.',
      tips: [
        'Read the source ALL the way through first. Listen for surprising phrases.',
        'Pick fewer words than you think. Erasure poems are mostly silence.',
        'Stay in the source\'s reading order — that\'s what makes it erasure (not collage).',
        'Look for accidental images — "a small hand of rain" might already be in there.'
      ],
      moreExamples: [
        {
          title: 'A Humument (excerpt context)',
          author: 'Tom Phillips',
          year: 1966,
          text: 'a / human / document / hidden / inside / another / book',
          note: 'Phillips spent decades blacking out a Victorian novel. Each page is an erasure of the prose underneath. The whole project is one of the most influential erasure poems ever made.'
        },
        {
          title: 'A Little White Shadow (idea)',
          author: 'Mary Ruefle',
          year: 2006,
          text: 'erasure makes / what was / white / now / yours',
          note: 'Ruefle erases an old book until only a few words per page remain. The white space carries as much weight as the words.'
        }
      ]
    },
    {
      id: 'image-poem',
      name: 'Image Poem',
      icon: '🖼️',
      tagline: 'Your poem is the picture. Write what you want to see.',
      structure: 'No rules on form, length, or rhyme. The whole poem is your image prompt — when you click Imagine It, an AI artist reads your poem and paints exactly what you wrote. Vivid, concrete, sensory language wins. Vague abstractions ("sadness", "hope") become muddy images; specific images ("a copper kettle in lamplight", "frost on a bicycle chain") become clear ones.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: 'a paper boat\nfolded from a grocery list\nfloating on a puddle\nwhere the last leaf fell\n\n— student sample',
      tips: [
        'Picture the image in your head FIRST. Then describe what you see.',
        'Name colors, materials, time of day, light. The AI loves specifics.',
        'Cut abstract words ("beautiful", "sad", "amazing") — replace with what made you feel that.',
        'One scene per poem. The AI cannot draw multiple separate scenes well.'
      ],
      moreExamples: [
        {
          title: 'Fog',
          author: 'Carl Sandburg',
          year: 1916,
          text: 'The fog comes\non little cat feet.\n\nIt sits looking\nover harbor and city\non silent haunches\nand then moves on.',
          note: 'Six lines. Every word is something you can see. This poem could be drawn with no abstractions to fill in.'
        },
        {
          title: 'In a Station of the Metro',
          author: 'Ezra Pound',
          year: 1913,
          text: 'The apparition of these faces in the crowd;\nPetals on a wet, black bough.',
          note: 'Two lines. Two images. The whole imagist movement is here — write what is seen, let the reader (or the AI) draw it.'
        }
      ]
    }
  ];

  // ── Syllable counter (heuristic, no dictionary) ──
  // Reasonably accurate for English. Counts vowel groups, adjusts for silent-e and common suffixes.
  function countSyllables(word) {
    if (!word) return 0;
    var w = String(word).toLowerCase().trim().replace(/[^a-z']/g, '');
    if (w.length === 0) return 0;
    if (w.length <= 3) return 1;
    // Strip silent e
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    // Strip trailing y as separate syllable trigger (cherry → 2)
    w = w.replace(/^y/, '');
    var matches = w.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  function countLineSyllables(line) {
    if (!line) return 0;
    var words = String(line).split(/\s+/).filter(Boolean);
    var total = 0;
    for (var i = 0; i < words.length; i++) total += countSyllables(words[i]);
    return total;
  }

  // ── Rhyme grouping (heuristic, last 2-3 phonemes) ──
  // Returns array of group letters (A, B, C…) per line based on last-word ending.
  function detectRhymeScheme(lines) {
    var endings = lines.map(function (line) {
      var trimmed = String(line || '').trim().replace(/[^\w\s']/g, '').toLowerCase();
      var words = trimmed.split(/\s+/).filter(Boolean);
      if (!words.length) return '';
      var last = words[words.length - 1];
      // Take last 3 chars as a rough rhyme key
      return last.length >= 3 ? last.slice(-3) : last;
    });
    var groups = [];
    var keys = [];
    var letters = 'ABCDEFGHIJKLMNOP';
    for (var i = 0; i < endings.length; i++) {
      if (!endings[i]) { groups.push(''); continue; }
      var found = -1;
      for (var k = 0; k < keys.length; k++) {
        // Match if endings share last 2-3 letters
        if (keys[k].slice(-2) === endings[i].slice(-2)) { found = k; break; }
      }
      if (found === -1) {
        keys.push(endings[i]);
        groups.push(letters[keys.length - 1] || '?');
      } else {
        groups.push(letters[found] || '?');
      }
    }
    return groups;
  }

  // ── Main Component ────────────────────────────────────────────────────
  var PoetTree = React.memo(function PoetTree(props) {
    var onClose = props.onClose;
    var onCallGemini = props.onCallGemini;
    var onCallTTS = props.onCallTTS;
    var onCallImagen = props.onCallImagen;
    var onCallGeminiImageEdit = props.onCallGeminiImageEdit;
    // Cross-tool: lets the student send their poem to LitLab as performance source text.
    // Optional — if the parent doesn't wire it, the button just isn't rendered.
    var onSendToLitLab = props.onSendToLitLab || null;
    var selectedVoice = props.selectedVoice;
    var gradeLevel = props.gradeLevel || '7th Grade';
    var addToast = props.addToast;
    var studentNickname = props.studentNickname || '';
    var handleScoreUpdate = props.handleScoreUpdate;
    // Resource-history integration (teacher-scaffold path; mirrors StoryForge)
    var initialConfig = props.initialConfig || null;
    var onSaveConfig = props.onSaveConfig || null;        // non-null => teacher mode
    var onSaveSubmission = props.onSaveSubmission || null; // non-null => save to portfolio enabled

    var e = React.createElement;
    var useState = React.useState;
    var useCallback = React.useCallback;
    var useRef = React.useRef;
    var useEffect = React.useEffect;

    var TEAL = '#0d9488';
    var TEAL_LIGHT = '#f0fdfa';
    var TEAL_DARK = '#115e59';
    var AMBER = '#d97706';

    // ── State ──
    var _activeTab = useState('form'); var activeTab = _activeTab[0]; var setActiveTab = _activeTab[1];
    var _form = useState(null); var form = _form[0]; var setForm = _form[1];
    var _poemTitle = useState(''); var poemTitle = _poemTitle[0]; var setPoemTitle = _poemTitle[1];
    var _poemText = useState(''); var poemText = _poemText[0]; var setPoemText = _poemText[1];
    var _foundSource = useState(''); var foundSource = _foundSource[0]; var setFoundSource = _foundSource[1];
    // Erasure Workshop state — source text + which token indices the student is keeping.
    // Tokens are split by whitespace; punctuation stays attached to the word it follows.
    // We track an object map `{ [tokenIdx]: true }` instead of a Set so React shallow
    // comparisons work correctly through useState.
    var _erasureSource = useState(''); var erasureSource = _erasureSource[0]; var setErasureSource = _erasureSource[1];
    var _erasureKept = useState({});  var erasureKept = _erasureKept[0];   var setErasureKept = _erasureKept[1];

    // AI feedback state
    var _aiFeedback = useState(null); var aiFeedback = _aiFeedback[0]; var setAiFeedback = _aiFeedback[1];
    var _aiLoading = useState(false); var aiLoading = _aiLoading[0]; var setAiLoading = _aiLoading[1];
    var _meterAnalysis = useState(null); var meterAnalysis = _meterAnalysis[0]; var setMeterAnalysis = _meterAnalysis[1];
    var _meterLoading = useState(false); var meterLoading = _meterLoading[0]; var setMeterLoading = _meterLoading[1];

    // Performance state
    var _ttsPlaying = useState(false); var ttsPlaying = _ttsPlaying[0]; var setTtsPlaying = _ttsPlaying[1];
    // Read-aloud (silent recital) mode — large text, line-by-line, student paces themselves.
    var _readAloud = useState(false); var readAloudActive = _readAloud[0]; var setReadAloudActive = _readAloud[1];
    var _readIdx = useState(0); var readIdx = _readIdx[0]; var setReadIdx = _readIdx[1];
    var _readCount = useState(0); var readCountdown = _readCount[0]; var setReadCountdown = _readCount[1];
    var _emotion = useState('neutral'); var emotion = _emotion[0]; var setEmotion = _emotion[1];
    var _illustration = useState(null); var illustration = _illustration[0]; var setIllustration = _illustration[1];
    var _illusLoading = useState(false); var illusLoading = _illusLoading[0]; var setIllusLoading = _illusLoading[1];
    // Image Poem — when the 'image-poem' form is active, the poem text itself is the Imagen prompt.
    // Distinct from `illustration` because Image Poem uses the poem AS the prompt (no extra style wrapper),
    // and the result is a first-class output the student is iterating on, not a decorative illustration.
    var _imagePoemUrl = useState(null); var imagePoemUrl = _imagePoemUrl[0]; var setImagePoemUrl = _imagePoemUrl[1];
    var _imagePoemLoading = useState(false); var imagePoemLoading = _imagePoemLoading[0]; var setImagePoemLoading = _imagePoemLoading[1];

    // Saved poems
    var _saved = useState(function () { try { return JSON.parse(localStorage.getItem(STORAGE_POEMS) || '[]'); } catch (e) { return []; } });
    var saved = _saved[0]; var setSaved = _saved[1];

    // Reading-friendly text mode (carry-over pattern from LitLab)
    var _largeText = useState(function () { try { var p = JSON.parse(localStorage.getItem(STORAGE_PREFS) || '{}'); return !!p.largeText; } catch (e) { return false; } });
    var largeText = _largeText[0]; var setLargeText = _largeText[1];

    var ttsCancelRef = useRef(false);
    // Captures the element that was focused when read-aloud opens, so focus can return there on close (WCAG 2.4.3)
    var readAloudReturnFocusRef = useRef(null);

    // Writing helpers (Daily Prompt / Rhymes / Stronger Verbs)
    var _helpersOpen = useState(false); var helpersOpen = _helpersOpen[0]; var setHelpersOpen = _helpersOpen[1];
    var _dailyPrompt = useState(''); var dailyPrompt = _dailyPrompt[0]; var setDailyPrompt = _dailyPrompt[1];
    var _dailyPromptLoading = useState(false); var dailyPromptLoading = _dailyPromptLoading[0]; var setDailyPromptLoading = _dailyPromptLoading[1];
    var _rhymeQuery = useState(''); var rhymeQuery = _rhymeQuery[0]; var setRhymeQuery = _rhymeQuery[1];
    var _rhymeResults = useState(null); var rhymeResults = _rhymeResults[0]; var setRhymeResults = _rhymeResults[1];
    var _rhymeLoading = useState(false); var rhymeLoading = _rhymeLoading[0]; var setRhymeLoading = _rhymeLoading[1];
    var _verbSuggestions = useState(null); var verbSuggestions = _verbSuggestions[0]; var setVerbSuggestions = _verbSuggestions[1];
    var _verbLoading = useState(false); var verbLoading = _verbLoading[0]; var setVerbLoading = _verbLoading[1];
    // Senses Check: per-sense counts + one targeted "missing sense" suggestion
    var _sensesResult = useState(null); var sensesResult = _sensesResult[0]; var setSensesResult = _sensesResult[1];
    var _sensesLoading = useState(false); var sensesLoading = _sensesLoading[0]; var setSensesLoading = _sensesLoading[1];
    // Spark Words: 5 random concrete nouns/images to break a creative block
    var _sparkWords = useState(null); var sparkWords = _sparkWords[0]; var setSparkWords = _sparkWords[1];
    var _sparkLoading = useState(false); var sparkLoading = _sparkLoading[0]; var setSparkLoading = _sparkLoading[1];
    // Title generator
    var _titleSuggestions = useState(null); var titleSuggestions = _titleSuggestions[0]; var setTitleSuggestions = _titleSuggestions[1];
    var _titleLoading = useState(false); var titleLoading = _titleLoading[0]; var setTitleLoading = _titleLoading[1];
    // Cross-form rewrite (poem → target form)
    var _rewriteResult = useState(null); var rewriteResult = _rewriteResult[0]; var setRewriteResult = _rewriteResult[1];
    var _rewriteLoading = useState(false); var rewriteLoading = _rewriteLoading[0]; var setRewriteLoading = _rewriteLoading[1];
    var _rewriteTargetId = useState(''); var rewriteTargetId = _rewriteTargetId[0]; var setRewriteTargetId = _rewriteTargetId[1];
    // Chapbook filter (which form to include; blank = all)
    var _chapbookFilter = useState(''); var chapbookFilter = _chapbookFilter[0]; var setChapbookFilter = _chapbookFilter[1];
    // Theme tracker — patterns across the student's saved poems
    var _themeReport = useState(null); var themeReport = _themeReport[0]; var setThemeReport = _themeReport[1];
    var _themeLoading = useState(false); var themeLoading = _themeLoading[0]; var setThemeLoading = _themeLoading[1];
    // Mentor Match — pairs the student's poem with a public-domain master poem for study
    var _mentorMatch = useState(null); var mentorMatch = _mentorMatch[0]; var setMentorMatch = _mentorMatch[1];
    var _mentorLoading = useState(false); var mentorLoading = _mentorLoading[0]; var setMentorLoading = _mentorLoading[1];
    // Sound Device Coach — alliteration, assonance, consonance, internal rhyme detection
    var _soundDeviceResult = useState(null); var soundDeviceResult = _soundDeviceResult[0]; var setSoundDeviceResult = _soundDeviceResult[1];
    var _soundDeviceLoading = useState(false); var soundDeviceLoading = _soundDeviceLoading[0]; var setSoundDeviceLoading = _soundDeviceLoading[1];
    // Metaphor Visualizer — detected metaphors + per-metaphor image renders + image-edit refinements
    var _metaphors = useState(null);   var metaphors = _metaphors[0];   var setMetaphors = _metaphors[1];        // [{ id, type:'metaphor'|'simile', excerpt, tenor, vehicle }] | { error } | null
    var _metaphorLoading = useState(false); var metaphorLoading = _metaphorLoading[0]; var setMetaphorLoading = _metaphorLoading[1];
    var _metaphorImages = useState({});      var metaphorImages = _metaphorImages[0];      var setMetaphorImages = _metaphorImages[1];      // { [metaphorId]: imageUrl }
    var _metaphorImgLoading = useState({}); var metaphorImgLoading = _metaphorImgLoading[0]; var setMetaphorImgLoading = _metaphorImgLoading[1]; // { [metaphorId]: bool }
    var _metaphorEditText = useState({});    var metaphorEditText = _metaphorEditText[0];    var setMetaphorEditText = _metaphorEditText[1];   // { [metaphorId]: 'make it brighter' }
    // Mood Board — one image per stanza (split by blank lines), narrative-arc style
    var _stanzaImages = useState([]);      var stanzaImages = _stanzaImages[0];      var setStanzaImages = _stanzaImages[1];      // [{ idx, text, url, loading }]
    var _stanzaBoardLoading = useState(false); var stanzaBoardLoading = _stanzaBoardLoading[0]; var setStanzaBoardLoading = _stanzaBoardLoading[1];
    // Pre-feedback Self-Assessment — student rates self before AI feedback, builds metacognition
    var _selfAssessment = useState({}); var selfAssessment = _selfAssessment[0]; var setSelfAssessment = _selfAssessment[1];
    var _selfAssessmentSubmitted = useState(false); var selfAssessmentSubmitted = _selfAssessmentSubmitted[0]; var setSelfAssessmentSubmitted = _selfAssessmentSubmitted[1];
    // Revision Plan — synthesizes whichever helpers ran into one prioritized 3-task plan
    var _revisionPlan = useState(null); var revisionPlan = _revisionPlan[0]; var setRevisionPlan = _revisionPlan[1];
    var _revisionPlanLoading = useState(false); var revisionPlanLoading = _revisionPlanLoading[0]; var setRevisionPlanLoading = _revisionPlanLoading[1];

    // Built-in poetry rubric for Self-Assessment (5 criteria, age-responsive language)
    var POETRY_RUBRIC_CRITERIA = [
      { id: 'imagery',   label: 'Imagery & Sensory Detail',  desc: 'Concrete, specific images that engage the senses' },
      { id: 'sound',     label: 'Sound & Music',             desc: 'Rhythm, alliteration, assonance, line breaks that earn their place' },
      { id: 'structure', label: 'Structure & Form',          desc: 'Form rules met (or broken on purpose); shape supports meaning' },
      { id: 'voice',     label: 'Voice & Emotion',           desc: 'A real feeling lives in the poem; it sounds like you' },
      { id: 'wordChoice',label: 'Word Choice',               desc: 'Strong verbs, specific nouns, no filler words' }
    ];

    // Teacher-scaffold fields (saved into the resource-history config payload).
    // teacherPrompt: a writing prompt the teacher authors for the assignment.
    // suggestedTitle: an optional title hint that pre-fills poemTitle on load.
    var _teacherPrompt = useState(''); var teacherPrompt = _teacherPrompt[0]; var setTeacherPrompt = _teacherPrompt[1];
    var _suggestedTitle = useState(''); var suggestedTitle = _suggestedTitle[0]; var setSuggestedTitle = _suggestedTitle[1];

    // Hydrate from a saved teacher assignment (initialConfig) the first time it shows up.
    // Pre-selects form, fills the prompt banner the student sees, and seeds the title.
    var _hydratedFromConfig = useRef(false);
    useEffect(function () {
      if (_hydratedFromConfig.current) return;
      if (!initialConfig) return;
      _hydratedFromConfig.current = true;
      try {
        if (initialConfig.formId) {
          var f = FORMS.filter(function (x) { return x.id === initialConfig.formId; })[0];
          if (f) setForm(f);
        }
        if (initialConfig.teacherPrompt) setTeacherPrompt(initialConfig.teacherPrompt);
        if (initialConfig.suggestedTitle) {
          setSuggestedTitle(initialConfig.suggestedTitle);
          // Seed the editable title once so the student starts with the teacher's hint.
          if (!poemTitle) setPoemTitle(initialConfig.suggestedTitle);
        }
        announcePT('Assignment loaded from teacher.');
        if (addToast) addToast('Assignment loaded!', 'success');
      } catch (err) { warnLog('initialConfig hydration failed:', err && err.message); }
    }, [initialConfig]);

    // ── Persistence helpers ──
    var savePrefs = useCallback(function (next) {
      try { localStorage.setItem(STORAGE_PREFS, JSON.stringify(next)); } catch (e) {}
    }, []);

    var savePoem = useCallback(function () {
      if (!poemText.trim()) { addToast && addToast('Write something first!', 'info'); return; }
      var entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: poemTitle.trim() || 'Untitled',
        text: poemText,
        formId: form ? form.id : 'free',
        savedAt: new Date().toISOString()
      };
      var updated = [entry].concat(saved).slice(0, 50);
      setSaved(updated);
      try { localStorage.setItem(STORAGE_POEMS, JSON.stringify(updated)); } catch (e) {}
      addToast && addToast('Poem saved.', 'success');
      announcePT('Poem saved as "' + entry.title + '."');
    }, [poemText, poemTitle, form, saved, addToast]);

    var loadPoem = useCallback(function (entry) {
      setPoemTitle(entry.title || '');
      setPoemText(entry.text || '');
      var f = FORMS.find(function (ff) { return ff.id === entry.formId; });
      if (f) setForm(f);
      setActiveTab('write');
      announcePT('Loaded poem: ' + (entry.title || 'Untitled') + '.');
    }, []);

    // ── Resource-history hooks (mirror StoryForge's saveAsConfig / saveAsSubmission) ──
    // saveAsAssignment: teacher captures the form choice + prompt + title hint into a
    // 'poettree-config' resource that students can later load to start their work
    // with the scaffold pre-populated.
    var saveAsAssignment = useCallback(function () {
      if (!onSaveConfig) return;
      var config = {
        formId: form ? form.id : '',
        formName: form ? form.name : 'Free Verse',
        teacherPrompt: teacherPrompt,
        suggestedTitle: suggestedTitle,
        gradeLevel: gradeLevel,
        savedAt: new Date().toISOString()
      };
      onSaveConfig(config);
      announcePT('Assignment saved to lesson resources.');
      addToast && addToast('PoetTree assignment saved!', 'success');
    }, [onSaveConfig, form, teacherPrompt, suggestedTitle, gradeLevel, addToast]);

    // sendToLitLab: cross-tool handoff — the parent receives the poem as a
    // LitLab assignment payload (storyTitle, sourceText, gradeLevel) so the
    // student can perform their poem with character voices in LitLab.
    var sendToLitLab = useCallback(function () {
      if (!onSendToLitLab) return;
      if (!poemText.trim()) { addToast && addToast('Write something first!', 'info'); return; }
      onSendToLitLab({
        storyTitle: poemTitle.trim() || 'My Poem',
        sourceText: poemText,
        gradeLevel: gradeLevel,
        teacherPrompt: 'Perform this poem aloud — pay attention to where the rhythm changes, where the voice softens, where it lifts.',
        // Provenance metadata so LitLab can credit / link back if it ever wants to.
        sourceModule: 'PoetTree',
        sourceFormId: form ? form.id : 'free',
        sourceFormName: form ? form.name : 'Free Verse'
      });
      announcePT('Poem sent to LitLab as a performance.');
      addToast && addToast('Sent to LitLab!', 'success');
    }, [onSendToLitLab, poemText, poemTitle, gradeLevel, form, addToast]);

    // saveSubmissionToPortfolio: student saves their finished poem as a
    // 'poettree-submission' resource for portfolio review.
    var saveSubmissionToPortfolio = useCallback(function () {
      if (!onSaveSubmission) return;
      if (!poemText.trim()) { addToast && addToast('Write something first!', 'info'); return; }
      var lines = poemText.split('\n');
      var submission = {
        poemTitle: poemTitle.trim() || 'Untitled',
        poemText: poemText,
        formId: form ? form.id : 'free',
        form: form ? form.name : 'Free Verse',
        lineCount: lines.filter(function (l) { return l.trim().length > 0; }).length,
        wordCount: poemText.split(/\s+/).filter(Boolean).length,
        gradingResult: aiFeedback || null,
        meterAnalysis: meterAnalysis || null,
        author: studentNickname || 'Student',
        gradeLevel: gradeLevel,
        savedAt: new Date().toISOString()
      };
      onSaveSubmission(submission);
      announcePT('Poem saved to portfolio.');
      addToast && addToast('Poem saved to your portfolio!', 'success');
    }, [onSaveSubmission, poemText, poemTitle, form, aiFeedback, meterAnalysis, studentNickname, gradeLevel, addToast]);

    var deletePoem = useCallback(function (id) {
      var updated = saved.filter(function (p) { return p.id !== id; });
      setSaved(updated);
      try { localStorage.setItem(STORAGE_POEMS, JSON.stringify(updated)); } catch (e) {}
    }, [saved]);

    // ── AI feedback ──
    var getAiFeedback = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setAiLoading(true);
      setAiFeedback(null);
      try {
        var formContext = form
          ? 'The student is writing in the form: ' + form.name + '. Structure: ' + form.structure
          : 'The form is open / free verse.';
        var isElem = /K|1st|2nd|3rd|4th|5th/i.test(gradeLevel);
        var isMid = /6th|7th|8th/i.test(gradeLevel);
        var gradeGuide = isElem
          ? 'Elementary student. Use simple, encouraging language. Praise specific images. Suggest one small revision.'
          : isMid
          ? 'Middle-school student. Be warm and specific. Identify the strongest line. Suggest one image-strengthening revision and one structural observation.'
          : 'High-school or older student. Engage seriously with craft. Identify strongest line, weakest line, and offer one targeted suggestion for each. Note any form adherence issues.';
        var prompt = 'You are a warm, encouraging poetry mentor giving feedback to a ' + gradeLevel + ' student.\n\n'
          + formContext + '\n\n'
          + 'The student\'s poem:\n"""\n' + poemText + '\n"""\n\n'
          + 'Title: ' + (poemTitle || '(untitled)') + '\n\n'
          + gradeGuide + '\n\n'
          + 'Return JSON: {"strongestLine":"<one line from the poem the student wrote>","strongestWhy":"<one sentence on why it works>","imagery":"<one sentence on the imagery: praise or strengthen>","formNotes":"<one sentence on adherence to ' + (form ? form.name : 'their chosen form') + '>","suggestion":"<one specific, kind, concrete revision idea — a word swap, a line cut, an image to add>","encouragement":"<one short closing sentence>"}\n\n'
          + 'Be specific and kind. Never invent lines that are not in the poem. Match vocabulary to ' + gradeLevel + '.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setAiFeedback(parsed);
        if (handleScoreUpdate) handleScoreUpdate(15, 'PoetTree feedback', 'poettree-feedback-' + entry_safe(poemTitle));
        announcePT('Feedback received.');
      } catch (err) {
        warnLog('AI feedback failed:', err && err.message);
        setAiFeedback({ error: 'Could not generate feedback. Try again in a moment.' });
        addToast && addToast('Feedback unavailable.', 'error');
      } finally {
        setAiLoading(false);
      }
    }, [onCallGemini, poemText, poemTitle, form, gradeLevel, handleScoreUpdate, addToast]);

    function entry_safe(s) { return String(s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30); }

    // ── Writing helpers ──

    var generateDailyPrompt = useCallback(async function () {
      if (!onCallGemini) return;
      setDailyPromptLoading(true);
      try {
        var formHint = form ? ' They are writing in the form: ' + form.name + '.' : '';
        var prompt = 'You are a creative-writing teacher for a ' + gradeLevel + ' student.' + formHint + ' Generate ONE inspiring poem prompt — concrete, image-rich, emotionally accessible, age-appropriate. Avoid abstractions. Avoid trauma topics unless gently. 1-2 sentences. Return only the prompt itself, no quotes, no preamble.';
        var result = await onCallGemini(prompt, false);
        var clean = String(result || '').trim().replace(/^["“]|["”]$/g, '').replace(/^prompt:\s*/i, '');
        setDailyPrompt(clean);
        announcePT('New writing prompt: ' + clean);
      } catch (err) {
        warnLog('Daily prompt failed:', err && err.message);
        addToast && addToast('Couldn\'t fetch a prompt right now.', 'error');
      } finally {
        setDailyPromptLoading(false);
      }
    }, [onCallGemini, form, gradeLevel, addToast]);

    var fetchRhymes = useCallback(async function () {
      if (!onCallGemini || !rhymeQuery.trim()) return;
      setRhymeLoading(true);
      setRhymeResults(null);
      try {
        var word = rhymeQuery.trim().toLowerCase().replace(/[^a-z'-]/g, '');
        var prompt = 'Return JSON: {"perfect":["..."],"slant":["..."]} — 6-8 perfect rhymes (same vowel and ending consonants) and 4-6 slant rhymes (similar but not exact) for the word "' + word + '". Skip vulgarity, slurs, and offensive words. Order each list from most useful to less useful for poetry. If no rhymes are possible (rare words), return both arrays empty.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setRhymeResults({ word: word, perfect: parsed.perfect || [], slant: parsed.slant || [] });
        announcePT((parsed.perfect || []).length + ' perfect rhymes and ' + (parsed.slant || []).length + ' slant rhymes for ' + word + '.');
      } catch (err) {
        warnLog('Rhymes failed:', err && err.message);
        setRhymeResults({ error: 'Couldn\'t fetch rhymes. Try a more common word.' });
      } finally {
        setRhymeLoading(false);
      }
    }, [onCallGemini, rhymeQuery]);

    var copyRhyme = useCallback(function (word) {
      try {
        navigator.clipboard.writeText(word);
        addToast && addToast('"' + word + '" copied to clipboard.', 'success');
        announcePT('Copied ' + word + ' to clipboard.');
      } catch (e) {
        addToast && addToast('Copy failed — long-press the word instead.', 'info');
      }
    }, [addToast]);

    var findStrongerVerbs = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setVerbLoading(true);
      setVerbSuggestions(null);
      try {
        var prompt = 'Read this poem. Identify up to 5 lines that rely on weak verbs (forms of "to be" — is, was, were, am, are; or "have", "has", "do", "get", "got", "make"). For each, return the original line, the weak verb, and 2-3 stronger more specific alternatives that would fit the poem\'s tone and image.\n\n'
          + 'Poem:\n"""\n' + poemText + '\n"""\n\n'
          + 'Return JSON: {"suggestions":[{"line":"<exact original line from the poem>","weakVerb":"<verb>","alternatives":["<verb1>","<verb2>","<verb3>"]}]}\n\n'
          + 'Only suggest where the line genuinely benefits — sometimes "is" is the right word. If no weak verbs are found, return {"suggestions":[]}.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setVerbSuggestions(parsed.suggestions || []);
        var n = (parsed.suggestions || []).length;
        announcePT(n === 0 ? 'No weak verbs detected — your verbs are working hard.' : n + ' verb suggestion' + (n === 1 ? '' : 's') + '.');
      } catch (err) {
        warnLog('Verb booster failed:', err && err.message);
        setVerbSuggestions({ error: 'Couldn\'t analyze verbs right now.' });
      } finally {
        setVerbLoading(false);
      }
    }, [onCallGemini, poemText]);

    var checkSenses = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setSensesLoading(true);
      setSensesResult(null);
      try {
        var prompt = 'Audit this poem for sensory imagery. Count how many distinct moments engage each sense.\n\n'
          + 'Poem:\n"""\n' + poemText + '\n"""\n\n'
          + 'Return JSON: {"counts":{"sight":N,"sound":N,"smell":N,"taste":N,"touch":N,"motion":N,"emotion":N},"strongest":"<which sense is most vivid in this poem, one word>","missing":"<which one missing or weak sense would most strengthen the poem>","suggestion":"<one specific concrete suggestion to add a missing sense — name a body part, a texture, a smell, etc., that fits the poem\'s subject>"}\n\n'
          + 'Be honest — abstractions don\'t count. "Sad" is emotion, not sight. "Cold hands" is touch. "The smell of rain" is smell. Don\'t invent senses the poem doesn\'t actually use.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setSensesResult(parsed);
        announcePT('Senses check complete. ' + (parsed.suggestion || ''));
      } catch (err) {
        warnLog('Senses check failed:', err && err.message);
        setSensesResult({ error: 'Couldn\'t analyze senses right now.' });
      } finally {
        setSensesLoading(false);
      }
    }, [onCallGemini, poemText]);

    // ── Sound Device Coach: detects alliteration, assonance, consonance, internal rhyme ──
    // Poetry-specific complement to Senses Check. Surfaces concrete excerpts from the
    // student's own poem rather than abstract definitions, so the craft move sticks.
    var analyzeSoundDevices = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setSoundDeviceLoading(true);
      setSoundDeviceResult(null);
      try {
        var prompt = 'You are a poetry-craft coach for a ' + gradeLevel + ' student. Analyze their poem for sound devices and surface SHORT concrete excerpts (3-8 words each) from the poem itself.\n\n'
          + 'Poem:\n"""\n' + poemText + '\n"""\n\n'
          + 'Definitions to use:\n'
          + '- Alliteration: same starting consonant sound across nearby words ("silver salt-spray sails")\n'
          + '- Assonance: same internal vowel sound across nearby words ("the deep green sea")\n'
          + '- Consonance: same internal/ending consonant sound ("pitter-patter," "blank and dank")\n'
          + '- Internal rhyme: rhyming words within a single line, not at the ends\n\n'
          + 'For each device: list up to 3 example excerpts FROM THIS POEM with a brief one-phrase note on why it works. Empty array if the device is genuinely absent. Then offer ONE specific, kind suggestion for ONE device the student could lean into more — name a line and a sound to play with.\n\n'
          + 'Return ONLY JSON:\n'
          + '{\n'
          + '  "alliteration": [{"excerpt":"<exact phrase>","note":"<short reason>"}],\n'
          + '  "assonance":    [{"excerpt":"<exact phrase>","note":"<short reason>"}],\n'
          + '  "consonance":   [{"excerpt":"<exact phrase>","note":"<short reason>"}],\n'
          + '  "internalRhyme":[{"excerpt":"<exact phrase>","note":"<short reason>"}],\n'
          + '  "weakest":"<which device is least present, lowercase one word>",\n'
          + '  "suggestion":"<concrete suggestion naming a line + sound to try>"\n'
          + '}\n\n'
          + 'Be honest — invented examples crash the lesson. Only quote excerpts that are actually in the poem.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        // Cap each list at 3 to stay tidy
        ['alliteration', 'assonance', 'consonance', 'internalRhyme'].forEach(function (k) {
          if (Array.isArray(parsed[k])) parsed[k] = parsed[k].slice(0, 3);
        });
        setSoundDeviceResult(parsed);
        announcePT('Sound device coach ready. Try strengthening: ' + (parsed.weakest || 'a sound') + '.');
      } catch (err) {
        warnLog('Sound device coach failed:', err && err.message);
        setSoundDeviceResult({ error: 'Couldn\'t analyze sound devices right now.' });
      } finally {
        setSoundDeviceLoading(false);
      }
    }, [onCallGemini, poemText, gradeLevel]);

    // ── Metaphor Visualizer: detect figurative language → render → iteratively edit ──
    // Three callbacks: detectMetaphors (Gemini parses the poem), visualizeMetaphor
    // (Imagen renders the literal vehicle), refineMetaphorImage (Gemini image-edit
    // applies the student's text tweak). Pedagogical: makes figurative language
    // concrete by literalizing the vehicle ("the moon is a silver coin" → silver
    // coin in the sky), so students see the IMAGE their words actually paint.
    var detectMetaphors = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setMetaphorLoading(true);
      setMetaphors(null);
      try {
        var prompt = 'Find every metaphor and simile in the poem below. A metaphor says A IS B ("the moon is a silver coin"); a simile uses LIKE or AS ("brave as a lion"). Skip dead/cliched ones ("strong as steel") unless the poem builds on them. Skip personification unless it functions as a metaphor.\n\n'
          + 'Poem:\n"""\n' + poemText + '\n"""\n\n'
          + 'For each one, give an exact quote from the poem (3-12 words), name the TENOR (the literal subject) and the VEHICLE (the imaginative comparison). Cap at 5 results — pick the most vivid if there are more.\n\n'
          + 'Return ONLY JSON:\n'
          + '{ "items": [\n'
          + '  { "type": "metaphor"|"simile", "excerpt": "<exact poem text>", "tenor": "<the real subject, 1-3 words>", "vehicle": "<the comparison image, 1-5 words>" }\n'
          + '] }\n\n'
          + 'If no metaphors or similes exist, return {"items":[]}. Don\'t invent comparisons that aren\'t actually in the poem.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        var items = Array.isArray(parsed.items) ? parsed.items.slice(0, 5) : [];
        // Stamp a stable client-side id on each so images keyed by it don't collide across re-detects.
        var stamped = items.map(function (m, i) { return Object.assign({}, m, { id: 'mph_' + Date.now() + '_' + i }); });
        setMetaphors(stamped);
        announcePT(stamped.length === 0 ? 'No metaphors or similes found in this draft.' : (stamped.length + ' figurative phrase' + (stamped.length === 1 ? '' : 's') + ' found.'));
      } catch (err) {
        warnLog('Metaphor detection failed:', err && err.message);
        setMetaphors({ error: 'Couldn\'t scan for metaphors right now. Try again in a moment.' });
      } finally {
        setMetaphorLoading(false);
      }
    }, [onCallGemini, poemText]);

    var visualizeMetaphor = useCallback(async function (m) {
      if (!onCallImagen || !m || !m.id) return;
      setMetaphorImgLoading(function (prev) { var n = Object.assign({}, prev); n[m.id] = true; return n; });
      try {
        // Render the VEHICLE literally — that's the whole point. The tenor is too
        // abstract to draw ("courage", "loneliness"); the vehicle is the picture.
        var prompt = (m.vehicle || m.excerpt || 'an evocative image') + '. ' +
          (m.type === 'simile' ? 'A literal scene of: ' : 'A literal rendering of: ') +
          (m.vehicle || m.excerpt) +
          '. Style: dreamy watercolor and ink, single subject, soft natural light. STRICTLY NO TEXT in the image, no captions, no signatures.';
        var url = await onCallImagen(prompt, 512, 0.85);
        if (url) {
          setMetaphorImages(function (prev) { var n = Object.assign({}, prev); n[m.id] = url; return n; });
          announcePT('Visualized: ' + (m.vehicle || m.excerpt) + '.');
        }
      } catch (err) {
        warnLog('Metaphor image gen failed:', err && err.message);
        addToast && addToast('Image gen failed — try again.', 'error');
      } finally {
        setMetaphorImgLoading(function (prev) { var n = Object.assign({}, prev); n[m.id] = false; return n; });
      }
    }, [onCallImagen, addToast]);

    var refineMetaphorImage = useCallback(async function (m) {
      if (!onCallGeminiImageEdit || !m || !m.id) return;
      var existing = metaphorImages[m.id];
      var instruction = (metaphorEditText[m.id] || '').trim();
      if (!existing) { addToast && addToast('Generate an image first, then edit it.', 'info'); return; }
      if (!instruction) { addToast && addToast('Type a tweak (e.g. "make it sunset", "add stars").', 'info'); return; }
      setMetaphorImgLoading(function (prev) { var n = Object.assign({}, prev); n[m.id] = true; return n; });
      try {
        var rawBase64 = String(existing).split(',')[1] || existing; // tolerate either data-URL or raw base64
        var refined = await onCallGeminiImageEdit(
          instruction + '. Keep the subject of the original (' + (m.vehicle || m.excerpt) + '). STRICTLY NO TEXT.',
          rawBase64,
          512,
          0.8
        );
        if (refined) {
          setMetaphorImages(function (prev) { var n = Object.assign({}, prev); n[m.id] = refined; return n; });
          setMetaphorEditText(function (prev) { var n = Object.assign({}, prev); n[m.id] = ''; return n; });
          announcePT('Image refined.');
        }
      } catch (err) {
        warnLog('Metaphor image edit failed:', err && err.message);
        addToast && addToast('Image edit failed — try again.', 'error');
      } finally {
        setMetaphorImgLoading(function (prev) { var n = Object.assign({}, prev); n[m.id] = false; return n; });
      }
    }, [onCallGeminiImageEdit, metaphorImages, metaphorEditText, addToast]);

    // ── Mood Board: one image per stanza, narrative-arc style ──
    // Splits the poem on blank-line separators (standard stanza convention) and
    // generates an Imagen render for each stanza using the stanza text as the
    // prompt — same "your words go straight to the model" philosophy as Image Poem,
    // but applied per-stanza so the student can see how the poem's mood shifts
    // across its arc.
    function _splitIntoStanzas(text) {
      if (!text) return [];
      // Split on runs of two or more newlines (blank-line separators); also accept
      // CRLF. Trim each stanza but keep internal line breaks.
      var parts = String(text).replace(/\r\n/g, '\n').split(/\n{2,}/);
      return parts.map(function (p) { return p.trim(); }).filter(function (p) { return p.length > 0; });
    }

    var generateMoodBoard = useCallback(async function () {
      if (!onCallImagen || !poemText.trim()) return;
      var stanzas = _splitIntoStanzas(poemText);
      if (stanzas.length === 0) return;
      // If only one stanza, encourage the student to add stanza breaks first
      // (otherwise mood-board === image-poem and there's no narrative arc).
      if (stanzas.length === 1) {
        addToast && addToast('Mood Board needs at least 2 stanzas (separate them with a blank line).', 'info');
        return;
      }
      setStanzaBoardLoading(true);
      // Seed loading state for each stanza upfront so the UI shows skeleton cards
      var seeded = stanzas.map(function (text, idx) {
        return { idx: idx, text: text, url: null, loading: true };
      });
      setStanzaImages(seeded);
      // Generate images sequentially (parallel would saturate the API/quota and
      // also lets earlier stanzas render while later ones are still cooking).
      try {
        for (var i = 0; i < stanzas.length; i++) {
          (function (i, stanzaText) {
            // Wrapped in IIFE for closure correctness if we ever switch to parallel.
          })(i, stanzas[i]);
          try {
            var prompt = stanzas[i] + '\n\nRender a single illustrative image of the scene/mood described in the stanza above. STRICTLY NO TEXT, no captions, no signatures, no watermark in the image.';
            var url = await onCallImagen(prompt, 512, 0.85);
            // Patch this stanza's slot in state without disturbing the others.
            // Use functional updater to avoid stale-closure issues if state changes
            // between iterations.
            setStanzaImages(function (prev) {
              var n = prev.slice();
              if (n[i]) n[i] = Object.assign({}, n[i], { url: url || null, loading: false });
              return n;
            });
          } catch (e) {
            warnLog('Stanza ' + (i + 1) + ' image failed:', e && e.message);
            setStanzaImages(function (prev) {
              var n = prev.slice();
              if (n[i]) n[i] = Object.assign({}, n[i], { url: null, loading: false, error: true });
              return n;
            });
          }
        }
        announcePT('Mood board ready: ' + stanzas.length + ' stanza images.');
      } finally {
        setStanzaBoardLoading(false);
      }
    }, [onCallImagen, poemText, addToast]);

    var rerollStanzaImage = useCallback(async function (idx) {
      if (!onCallImagen) return;
      var entry = stanzaImages[idx];
      if (!entry) return;
      setStanzaImages(function (prev) {
        var n = prev.slice();
        if (n[idx]) n[idx] = Object.assign({}, n[idx], { loading: true });
        return n;
      });
      try {
        var prompt = entry.text + '\n\nRender a single illustrative image of the scene/mood described in the stanza above. STRICTLY NO TEXT.';
        var url = await onCallImagen(prompt, 512, 0.85);
        setStanzaImages(function (prev) {
          var n = prev.slice();
          if (n[idx]) n[idx] = Object.assign({}, n[idx], { url: url || null, loading: false });
          return n;
        });
        announcePT('Stanza ' + (idx + 1) + ' re-rolled.');
      } catch (err) {
        warnLog('Stanza re-roll failed:', err && err.message);
        setStanzaImages(function (prev) {
          var n = prev.slice();
          if (n[idx]) n[idx] = Object.assign({}, n[idx], { loading: false });
          return n;
        });
        addToast && addToast('Re-roll failed.', 'error');
      }
    }, [onCallImagen, stanzaImages, addToast]);

    // ── helpersAvailableForPlan: ≥2 helper outputs unlocks the Revision Plan button ──
    function helpersAvailableForPlan() {
      var n = 0;
      if (sensesResult && !sensesResult.error) n++;
      if (soundDeviceResult && !soundDeviceResult.error) n++;
      if (mentorMatch && !mentorMatch.error) n++;
      if (verbSuggestions && Array.isArray(verbSuggestions)) n++;
      if (themeReport && !themeReport.error) n++;
      if (aiFeedback) n++;
      if (selfAssessmentSubmitted && Object.keys(selfAssessment).length > 0) n++;
      return n >= 2;
    }

    // ── Revision Plan synthesizer ──
    // Pulls together whichever helpers have produced output (Senses, Sound Devices,
    // Mentor Match, Stronger Verbs, Theme Tracker, AI Feedback, Self-Assessment)
    // into a single prioritized 3-task plan ranked by impact. Pedagogical aim:
    // teach synthesis as its own meta-skill — students see how to weave multiple
    // feedback streams into a coherent next step rather than chasing each suggestion
    // in isolation.
    var synthesizeRevisionPlan = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setRevisionPlanLoading(true);
      try {
        var helperContext = [];
        if (sensesResult && !sensesResult.error) {
          helperContext.push('SENSES CHECK:\n  strongest: ' + (sensesResult.strongest || 'unknown')
            + '\n  missing: ' + (sensesResult.missing || 'unknown')
            + '\n  suggestion: ' + (sensesResult.suggestion || ''));
        }
        if (soundDeviceResult && !soundDeviceResult.error) {
          helperContext.push('SOUND DEVICES:\n  weakest: ' + (soundDeviceResult.weakest || 'unknown')
            + '\n  suggestion: ' + (soundDeviceResult.suggestion || ''));
        }
        if (mentorMatch && !mentorMatch.error && mentorMatch.craftToBorrow) {
          helperContext.push('MENTOR MATCH:\n  reading: ' + ((mentorMatch.mentor && mentorMatch.mentor.title) || 'unknown')
            + ' by ' + ((mentorMatch.mentor && mentorMatch.mentor.author) || 'unknown')
            + '\n  craft to borrow: ' + mentorMatch.craftToBorrow);
        }
        if (verbSuggestions && Array.isArray(verbSuggestions) && verbSuggestions.length > 0) {
          var topVerbs = verbSuggestions.slice(0, 3).map(function (v) {
            return '  - "' + (v.weak || '') + '" → ' + ((v.alternatives || []).slice(0, 3).join(', '));
          }).join('\n');
          helperContext.push('STRONGER VERBS:\n' + topVerbs);
        }
        if (themeReport && !themeReport.error && themeReport.voiceStrength) {
          helperContext.push('THEME / VOICE TRACKER:\n  voiceStrength: ' + (themeReport.voiceStrength || ''));
        }
        if (aiFeedback) {
          var fb = '';
          if (aiFeedback.glow) fb += '  glow: ' + aiFeedback.glow + '\n';
          if (aiFeedback.grow) fb += '  grow: ' + aiFeedback.grow;
          if (fb) helperContext.push('AI FEEDBACK:\n' + fb);
        }
        if (selfAssessmentSubmitted && Object.keys(selfAssessment).length > 0) {
          var lowest = Object.keys(selfAssessment).map(function (k) {
            return [k, selfAssessment[k]];
          }).sort(function (a, b) { return a[1] - b[1]; }).slice(0, 2);
          helperContext.push('STUDENT SELF-ASSESSMENT (lowest ratings):\n' + lowest.map(function (pair) {
            var crit = POETRY_RUBRIC_CRITERIA.find(function (c) { return c.id === pair[0]; });
            return '  - ' + (crit ? crit.label : pair[0]) + ': ' + pair[1] + '/5';
          }).join('\n'));
        }
        var helpersBlock = helperContext.length > 0
          ? '\n\nHelpers the student has already run:\n' + helperContext.join('\n\n')
          : '';

        var prompt = 'You are a kind, specific poetry coach helping a ' + gradeLevel + ' student plan their next revision pass on the poem below.\n\n'
          + 'Poem:\n"""\n' + poemText + '\n"""' + helpersBlock + '\n\n'
          + 'Build a prioritized revision plan with EXACTLY 3 tasks. Each task should:\n'
          + '- Be small enough to do in a single revision session.\n'
          + '- Be specific (name a line, image, sound, or word when possible).\n'
          + '- Pull from the helper outputs above when relevant — don\'t repeat what the helpers said, *synthesize* across them.\n'
          + '- Be ranked by impact (most-impactful first).\n'
          + '- Include a one-sentence "why" so the student understands the craft reason.\n\n'
          + 'Tone: warm, concrete, never scolding. Treat the student as a capable poet who\'s iterating, not a beginner being corrected.\n\n'
          + 'Return ONLY JSON:\n'
          + '{\n'
          + '  "tasks": [\n'
          + '    { "title": "<short imperative title>", "detail": "<one or two specific sentences on what to do>", "why": "<one short sentence on the craft reason>", "source": "<which helper this builds on, or \\"overall\\">" }\n'
          + '  ],\n'
          + '  "encouragement": "<one short specific compliment on something the poem is already doing well>"\n'
          + '}';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        // Defensive cap at 3 tasks even if Gemini returns more
        if (Array.isArray(parsed.tasks)) parsed.tasks = parsed.tasks.slice(0, 3);
        setRevisionPlan(parsed);
        announcePT('Revision plan ready with ' + ((parsed.tasks || []).length) + ' prioritized tasks.');
      } catch (err) {
        warnLog('Revision plan synthesis failed:', err && err.message);
        setRevisionPlan({ error: 'Couldn\'t build a revision plan right now. Try again in a moment.' });
      } finally {
        setRevisionPlanLoading(false);
      }
    }, [onCallGemini, poemText, gradeLevel, sensesResult, soundDeviceResult, mentorMatch, verbSuggestions, themeReport, aiFeedback, selfAssessment, selfAssessmentSubmitted]);

    var generateSparks = useCallback(async function () {
      if (!onCallGemini) return;
      setSparkLoading(true);
      try {
        var prompt = 'Generate 5 vivid, concrete nouns or short noun-phrases (1-3 words each) for a ' + gradeLevel + ' student to use as poetic seeds. Mix the senses (sound / smell / texture / sight / motion). Avoid abstractions like "love" or "joy." Examples of good ones: "copper bowl", "pine smoke", "static crackle", "lemon rind", "crow shadow."\n\n'
          + 'Return JSON: {"words":["...","...","...","...","..."]}';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setSparkWords(parsed.words || []);
        announcePT('5 spark words ready: ' + (parsed.words || []).join(', '));
      } catch (err) {
        warnLog('Spark words failed:', err && err.message);
        addToast && addToast('Couldn\'t fetch spark words.', 'error');
      } finally {
        setSparkLoading(false);
      }
    }, [onCallGemini, gradeLevel, addToast]);

    // ── Title Generator: suggest 5 titles for the current poem ──
    var generateTitles = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setTitleLoading(true);
      setTitleSuggestions(null);
      try {
        var formHint = form ? ' The poem is in the form: ' + form.name + '.' : '';
        var prompt = 'Suggest 5 distinct titles for this poem.' + formHint + ' Mix styles: one literal/descriptive, one image-driven, one one-word, one two-to-three word, one a phrase from the poem itself. Avoid clichés. Match a ' + gradeLevel + ' student\'s register.\n\n'
          + 'Poem:\n"""\n' + poemText + '\n"""\n\n'
          + 'Return JSON: {"titles":["...","...","...","...","..."]}';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setTitleSuggestions(parsed.titles || []);
        announcePT((parsed.titles || []).length + ' title suggestions ready.');
      } catch (err) {
        warnLog('Title gen failed:', err && err.message);
        addToast && addToast('Couldn\'t generate titles.', 'error');
      } finally {
        setTitleLoading(false);
      }
    }, [onCallGemini, poemText, form, gradeLevel, addToast]);

    // ── Cross-form Rewrite: transform the existing poem into a different form ──
    // Pedagogical idea: students see how form constraints reshape the same source idea.
    var rewriteAsForm = useCallback(async function (targetFormId) {
      if (!onCallGemini || !poemText.trim() || !targetFormId) return;
      var targetForm = FORMS.find(function (f) { return f.id === targetFormId; });
      if (!targetForm) return;
      setRewriteLoading(true);
      setRewriteResult(null);
      try {
        var prompt = 'You are a poetry teacher demonstrating form. Rewrite this student\'s poem in the form of ' + targetForm.name + '. Preserve the core image and feeling; reshape the language to fit the new form\'s rules.\n\n'
          + 'Target form rules: ' + targetForm.structure + '\n'
          + (targetForm.syllablesPerLine ? 'Required syllables per line: ' + targetForm.syllablesPerLine.join(', ') + '\n' : '')
          + (targetForm.rhymeScheme ? 'Rhyme scheme: ' + targetForm.rhymeScheme + '\n' : '')
          + '\nOriginal poem' + (form ? ' (currently in ' + form.name + ' form)' : '') + ':\n"""\n' + poemText + '\n"""\n\n'
          + 'Return JSON: {"poem":"<the rewritten poem text, line breaks preserved>","note":"<one sentence on what shifted: which images survived, what the form forced you to add or cut>"}\n\n'
          + 'Be honest if the form simply doesn\'t fit the source — if you have to mangle the original, say so in the note.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setRewriteResult({ targetForm: targetForm, poem: parsed.poem || '', note: parsed.note || '' });
        announcePT('Rewritten as ' + targetForm.name + '. ' + (parsed.note || ''));
      } catch (err) {
        warnLog('Rewrite failed:', err && err.message);
        setRewriteResult({ error: 'Couldn\'t rewrite right now.' });
      } finally {
        setRewriteLoading(false);
      }
    }, [onCallGemini, poemText, form]);

    var applyRewrite = useCallback(function () {
      if (!rewriteResult || !rewriteResult.poem) return;
      setPoemText(rewriteResult.poem);
      if (rewriteResult.targetForm) setForm(rewriteResult.targetForm);
      setRewriteResult(null);
      setRewriteTargetId('');
      addToast && addToast('Replaced with the rewrite. Your old version is gone — Library save first if you want both.', 'info');
      announcePT('Replaced with ' + (rewriteResult.targetForm ? rewriteResult.targetForm.name : 'rewrite') + '.');
    }, [rewriteResult, addToast]);

    // ── Meter analysis (Gemini-on-demand) ──
    var analyzeMeter = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setMeterLoading(true);
      setMeterAnalysis(null);
      try {
        var lines = poemText.split('\n').filter(function (l) { return l.trim().length > 0; });
        var prompt = 'Analyze the meter and stress pattern of these poem lines. For each line, return:\n'
          + '- syllableCount (your count, may differ from a heuristic)\n'
          + '- stressPattern: a string using \'/\' for stressed and \'u\' for unstressed syllables (e.g., "u/u/u/u/u/" for iambic pentameter)\n'
          + '- meterName: one of "iambic", "trochaic", "anapestic", "dactylic", "spondaic", "mixed", or "unclear"\n'
          + '- footCount: number of metrical feet\n\n'
          + 'Lines:\n' + lines.map(function (l, i) { return (i + 1) + '. ' + l; }).join('\n') + '\n\n'
          + 'Return JSON: {"lines":[{"text":"<line text>","syllableCount":N,"stressPattern":"u/u/...","meterName":"iambic","footCount":N}]}\n\n'
          + 'Be honest — if a line\'s meter is unclear or mixed, say so. Use stress patterns the student can verify by reading aloud.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setMeterAnalysis(parsed);
        announcePT('Meter analysis complete for ' + (parsed.lines ? parsed.lines.length : 0) + ' lines.');
      } catch (err) {
        warnLog('Meter analysis failed:', err && err.message);
        setMeterAnalysis({ error: 'Could not analyze meter.' });
      } finally {
        setMeterLoading(false);
      }
    }, [onCallGemini, poemText]);

    // ── TTS performance ──
    var playPoem = useCallback(async function () {
      if (!onCallTTS || !poemText.trim()) return;
      ttsCancelRef.current = false;
      setTtsPlaying(true);
      announcePT('Playing poem.');
      try {
        var emotionPreface = emotion === 'somber' ? '(read this poem somberly, slowly)\n'
          : emotion === 'joyful' ? '(read this poem joyfully)\n'
          : emotion === 'urgent' ? '(read this poem with urgency)\n'
          : emotion === 'contemplative' ? '(read this poem contemplatively, with pauses)\n'
          : '';
        var lines = poemText.split('\n');
        for (var i = 0; i < lines.length; i++) {
          if (ttsCancelRef.current) break;
          var line = lines[i].trim();
          if (!line) {
            await new Promise(function (r) { setTimeout(r, 600); }); // Stanza break
            continue;
          }
          await new Promise(function (resolve) {
            try {
              var p = onCallTTS(emotionPreface + line, selectedVoice || 'Aoede');
              if (p && typeof p.then === 'function') p.then(resolve).catch(resolve);
              else resolve();
            } catch (err) { resolve(); }
          });
          if (ttsCancelRef.current) break;
          await new Promise(function (r) { setTimeout(r, 350); }); // Line break pause
        }
      } finally {
        setTtsPlaying(false);
        ttsCancelRef.current = false;
      }
    }, [onCallTTS, poemText, emotion, selectedVoice]);

    var stopPoem = useCallback(function () {
      ttsCancelRef.current = true;
      setTtsPlaying(false);
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
      announcePT('Stopped.');
    }, []);

    // ── Illustration ──
    var generateIllustration = useCallback(async function () {
      if (!onCallImagen || !poemText.trim()) return;
      setIllusLoading(true);
      try {
        var prompt = 'Illustration for a poem titled "' + (poemTitle || 'Untitled') + '". Poem text: ' + poemText.slice(0, 400) + '. Style: dreamy, evocative, watercolor and ink. Single image. STRICTLY NO TEXT in the image.';
        var url = await onCallImagen(prompt, 600, 0.85);
        if (url) { setIllustration(url); announcePT('Illustration generated.'); }
      } catch (err) {
        warnLog('Illustration failed:', err && err.message);
        addToast && addToast('Illustration failed.', 'error');
      } finally {
        setIllusLoading(false);
      }
    }, [onCallImagen, poemText, poemTitle, addToast]);

    // ── Image Poem: the poem itself is the Imagen prompt ──
    // Different from generateIllustration because no style wrapping is added — the
    // student's words go straight to the model. Pedagogical aim: students learn that
    // concrete sensory language renders cleanly while vague abstractions become mud.
    var generateImagePoem = useCallback(async function () {
      if (!onCallImagen || !poemText.trim()) return;
      setImagePoemLoading(true);
      try {
        // Send the poem AS the prompt with the lightest possible framing — only enough to
        // discourage on-image text. No style override; the poem's own register is the brief.
        var prompt = poemText.trim() + '\n\nRender a single illustrative image of the scene described in the poem above. STRICTLY NO TEXT, no captions, no signatures, no watermark in the image.';
        var url = await onCallImagen(prompt, 600, 0.85);
        if (url) {
          setImagePoemUrl(url);
          announcePT('Image poem rendered.');
          if (typeof addToast === 'function') addToast('Image poem rendered!', 'success');
        }
      } catch (err) {
        warnLog('Image poem failed:', err && err.message);
        addToast && addToast('Image poem failed — try again.', 'error');
      } finally {
        setImagePoemLoading(false);
      }
    }, [onCallImagen, poemText, addToast]);

    // ── Read-aloud mode (silent recital — student performs live, no TTS) ──
    var startReadAloud = useCallback(function () {
      if (!poemText.trim()) return;
      // Capture the trigger element so we can restore focus when the dialog closes (WCAG 2.4.3)
      try { readAloudReturnFocusRef.current = document.activeElement; } catch (e) {}
      setReadIdx(0);
      setReadCountdown(3);
      announcePT('Read-aloud starting in 3…');
      var c = 3;
      var tick = function () {
        c -= 1;
        if (c > 0) {
          setReadCountdown(c);
          announcePT(c + '…');
          setTimeout(tick, 900);
        } else {
          setReadCountdown(0);
          setReadAloudActive(true);
          announcePT('Begin reading.');
        }
      };
      setTimeout(tick, 900);
    }, [poemText]);

    // Restore focus to the trigger element when the read-aloud overlay unmounts.
    // Covers all close paths: explicit Stop, Escape key, "Done" button, natural completion via advanceReadAloud.
    useEffect(function () {
      if (!readAloudActive && readCountdown === 0 && readAloudReturnFocusRef.current) {
        var el = readAloudReturnFocusRef.current;
        readAloudReturnFocusRef.current = null;
        // Defer focus restore by one tick so React can finish unmounting the overlay first.
        setTimeout(function () { try { if (el && typeof el.focus === 'function') el.focus(); } catch (e) {} }, 50);
      }
    }, [readAloudActive, readCountdown]);

    var stopReadAloud = useCallback(function () {
      setReadAloudActive(false);
      setReadCountdown(0);
      setReadIdx(0);
      announcePT('Read-aloud ended.');
    }, []);

    var advanceReadAloud = useCallback(function () {
      var allLines = poemText.split('\n');
      // Skip blank lines automatically (treat as stanza pauses)
      var next = readIdx + 1;
      while (next < allLines.length && !allLines[next].trim()) next++;
      if (next >= allLines.length) {
        // Done
        setReadAloudActive(false);
        announcePT('You finished. Well read.');
        if (handleScoreUpdate) handleScoreUpdate(15, 'PoetTree read-aloud', 'poettree-recital');
      } else {
        setReadIdx(next);
      }
    }, [poemText, readIdx, handleScoreUpdate]);

    var rewindReadAloud = useCallback(function () {
      var allLines = poemText.split('\n');
      var prev = readIdx - 1;
      while (prev >= 0 && !allLines[prev].trim()) prev--;
      if (prev >= 0) setReadIdx(prev);
    }, [poemText, readIdx]);

    // ── Print as broadside (single-page printable poster style; uses browser Print → Save as PDF) ──
    // Semantically structured HTML5 — lang on root, <main>/<article>/<header>/<footer> landmarks,
    // proper heading hierarchy, <figure>+<figcaption> for illustration. Modern browsers (Chrome, Edge)
    // produce reasonably tagged PDFs from semantic HTML when the user uses Print → Save as PDF.
    // For strict PDF/UA-1 compliance, route through doc_pipeline_module's createTaggedPdf instead.
    var printBroadside = useCallback(function () {
      if (!poemText.trim()) return;
      var w = window.open('', '_blank', 'width=720,height=900');
      if (!w) { addToast && addToast('Pop-up blocked. Allow pop-ups to print.', 'error'); return; }
      // Escape user content for HTML.
      var escHtml = function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
      var safeTitle = escHtml(poemTitle || 'Untitled');
      var safeAuthor = escHtml(studentNickname || '');
      var safeFormName = form ? escHtml(form.name) : '';
      var safeFormIcon = form ? form.icon : '';
      // Wrap poem in <article>; lines as <p>; stanza breaks as visible spacer with role="separator".
      var poemHtml = poemText
        .split('\n').map(function (l) {
          var t = l.trim();
          if (t) return '<p class="line">' + escHtml(l) + '</p>';
          return '<div class="stanza-break" role="separator" aria-label="stanza break"></div>';
        }).join('\n');
      // Illustration: <figure> + <figcaption> for proper PDF tag-tree mapping; descriptive alt.
      var illusHtml = illustration
        ? '<figure class="art-fig"><img src="' + escHtml(illustration) + '" alt="' + escHtml('AI illustration inspired by the poem ' + (poemTitle || 'Untitled')) + '" /><figcaption>Illustration generated for this poem.</figcaption></figure>'
        : '';
      var html = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>' + safeTitle + (safeAuthor ? ' by ' + safeAuthor : '') + '</title>'
        + '<meta name="author" content="' + safeAuthor + '">'
        + '<meta name="description" content="A poem' + (safeFormName ? ' in the ' + safeFormName.toLowerCase() + ' form' : '') + (safeAuthor ? ' by ' + safeAuthor : '') + '. Generated with PoetTree.">'
        + '<style>'
        // Skip-link styles (visible on focus only)
        + '.skip-link{position:absolute;left:-9999px;top:0;padding:8px 14px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700}'
        + '.skip-link:focus{left:0;top:0;z-index:1000}'
        + 'html,body{margin:0;padding:0;background:#fff;color:#1e293b;font-family:Georgia,serif}'
        + 'main{display:block}'
        + 'figure{margin:0}'
        + '.page{max-width:680px;margin:0 auto;padding:48px 56px}'
        + '.toolbar{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:10px 20px;display:flex;gap:10px;align-items:center;font-family:system-ui,sans-serif;font-size:12px}'
        + '.toolbar button{padding:6px 14px;border-radius:6px;border:none;background:#0d9488;color:#fff;font-weight:700;cursor:pointer;font-size:12px}'
        + '.toolbar button:focus{outline:2px solid #0f172a;outline-offset:2px}'
        + '.toolbar button.secondary{background:#fff;color:#115e59;border:1px solid #0d9488}'
        + '.toolbar .help{margin-left:auto;color:#334155}'
        + '.poem-header{margin-bottom:28px}'
        + '.title{font-size:32px;font-weight:800;text-align:center;margin:0 0 6px;letter-spacing:-0.5px;line-height:1.2}'
        + '.byline{text-align:center;font-size:13px;color:#334155;font-style:italic;margin:0 0 4px}'
        // Form tag: ~8.6:1 contrast (was 4.47:1 — bumped from teal-600 to teal-800 for AA on small text)
        + '.formtag{display:block;text-align:center;font-size:11px;color:#115e59;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 16px}'
        + '.line{font-size:18px;line-height:1.85;margin:0;text-align:left}'
        + '.stanza-break{height:18px}'
        + '.art-fig{margin:32px 0 0}'
        + '.art-fig img{display:block;max-width:100%;margin:0 auto;border-radius:8px}'
        + '.art-fig figcaption{text-align:center;font-size:11px;color:#475569;font-style:italic;margin-top:6px}'
        // Footer: ~7.4:1 contrast (was 3.46:1 — bumped from slate-400 to slate-600 for AA at 11px)
        + '.site-footer{margin-top:36px;padding-top:14px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#475569;font-family:system-ui,sans-serif}'
        + '@media print{.toolbar,.skip-link{display:none}.page{padding:24px}html,body{background:#fff !important}}'
        + '@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important}}'
        + '</style></head><body>'
        // Skip link for keyboard users (lands on focus)
        + '<a class="skip-link" href="#poem-content">Skip to poem</a>'
        // Toolbar — role="banner" places it as an explicit landmark before main
        + '<div class="toolbar" role="banner">'
        +   '<button type="button" onclick="window.print()" aria-label="Print this broadside or save as PDF">🖨️ Print / Save as PDF</button>'
        +   '<button type="button" class="secondary" onclick="window.close()" aria-label="Close window">✕ Close</button>'
        +   '<span class="help" aria-hidden="true">Use Ctrl+P (⌘+P) → Save as PDF</span>'
        + '</div>'
        // Main content
        + '<main class="page" id="poem-content" role="main" aria-labelledby="poem-title">'
        +   '<article aria-labelledby="poem-title">'
        +     '<header class="poem-header">'
        +       (safeFormName ? '<p class="formtag" aria-label="Poem form: ' + safeFormName + '">' + (safeFormIcon ? '<span aria-hidden="true">' + safeFormIcon + '</span> ' : '') + safeFormName + '</p>' : '')
        +       '<h1 class="title" id="poem-title">' + safeTitle + '</h1>'
        +       (safeAuthor ? '<p class="byline">by ' + safeAuthor + '</p>' : '')
        +     '</header>'
        +     '<div class="poem-body" role="document">' + poemHtml + '</div>'
        +     illusHtml
        +   '</article>'
        + '</main>'
        + '<footer class="site-footer" role="contentinfo">PoetTree · AlloFlow</footer>'
        + '</body></html>';
      try { w.document.open(); w.document.write(html); w.document.close(); announcePT('Broadside ready in a new window.'); }
      catch (er) { addToast && addToast('Broadside failed.', 'error'); }
    }, [poemText, poemTitle, studentNickname, form, illustration, addToast]);

    // ── Print Chapbook (all saved poems as one document) ──
    // Same accessible-HTML5 pattern as the broadside but multi-page with cover + table of contents.
    var printChapbook = useCallback(function (filterFormId) {
      var pool = filterFormId ? saved.filter(function (p) { return p.formId === filterFormId; }) : saved;
      if (!pool.length) { addToast && addToast('No poems to print yet.', 'info'); return; }
      var w = window.open('', '_blank', 'width=720,height=900');
      if (!w) { addToast && addToast('Pop-up blocked. Allow pop-ups to print.', 'error'); return; }
      var esc = function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
      var safeAuthor = esc(studentNickname || 'A poet');
      var dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      var filterLabel = filterFormId ? (FORMS.find(function (f) { return f.id === filterFormId; }) || { name: filterFormId }).name : '';
      var coverTitle = filterFormId ? esc(filterLabel + ' Collection') : 'Selected Poems';

      // Cover (header landmark) — large title, author, date, count.
      var coverHtml = '<header class="page cover" role="banner">'
        + '<div class="cover-inner">'
        + '<p class="kicker">A PoetTree Chapbook</p>'
        + '<h1 class="cover-title" id="chapbook-title">' + coverTitle + '</h1>'
        + '<p class="cover-author">by ' + safeAuthor + '</p>'
        + '<p class="cover-meta">' + pool.length + ' poem' + (pool.length === 1 ? '' : 's') + ' · ' + esc(dateStr) + '</p>'
        + '</div></header>';

      // Table of contents (nav landmark) — listed by title with form label.
      var tocHtml = '<nav class="page toc" role="navigation" aria-labelledby="toc-heading">'
        + '<h2 id="toc-heading">Contents</h2>'
        + '<ol class="toc-list">'
        + pool.map(function (p, pi) {
            var f = FORMS.find(function (ff) { return ff.id === p.formId; });
            return '<li><a href="#poem-' + (pi + 1) + '"><span class="toc-num">' + (pi + 1) + '</span><span class="toc-name">' + esc(p.title || 'Untitled') + '</span><span class="toc-form">' + (f ? f.icon + ' ' + esc(f.name) : 'Free verse') + '</span></a></li>';
          }).join('')
        + '</ol></nav>';

      // Each poem on its own page (article landmarks, h2 per poem, role=document for body).
      var poemsHtml = pool.map(function (p, pi) {
        var f = FORMS.find(function (ff) { return ff.id === p.formId; });
        var safeTitle = esc(p.title || 'Untitled');
        var lines = String(p.text || '').split('\n').map(function (l) {
          var t = l.trim();
          return t ? '<p class="line">' + esc(l) + '</p>' : '<div class="stanza-break" role="separator" aria-label="stanza break"></div>';
        }).join('');
        return '<article class="page poem-page" id="poem-' + (pi + 1) + '" aria-labelledby="poem-' + (pi + 1) + '-title">'
          + '<header class="poem-header">'
          +   (f ? '<p class="formtag" aria-label="Poem form: ' + esc(f.name) + '"><span aria-hidden="true">' + f.icon + '</span> ' + esc(f.name) + '</p>' : '')
          +   '<h2 class="poem-title" id="poem-' + (pi + 1) + '-title">' + safeTitle + '</h2>'
          + '</header>'
          + '<div class="poem-body" role="document">' + lines + '</div>'
          + '<p class="page-num" aria-hidden="true">— ' + (pi + 1) + ' —</p>'
          + '</article>';
      }).join('');

      var html = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>' + coverTitle + ' — by ' + safeAuthor + '</title>'
        + '<meta name="author" content="' + safeAuthor + '">'
        + '<meta name="description" content="A chapbook of ' + pool.length + ' poem' + (pool.length === 1 ? '' : 's') + ' by ' + safeAuthor + ', generated with PoetTree.">'
        + '<style>'
        + '.skip-link{position:absolute;left:-9999px;top:0;padding:8px 14px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700}'
        + '.skip-link:focus{left:0;top:0;z-index:1000}'
        + 'html,body{margin:0;padding:0;background:#fff;color:#1e293b;font-family:Georgia,serif}'
        + 'main{display:block} figure{margin:0}'
        + '.toolbar{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:10px 20px;display:flex;gap:10px;align-items:center;font-family:system-ui,sans-serif;font-size:12px;z-index:10}'
        + '.toolbar button{padding:6px 14px;border-radius:6px;border:none;background:#0d9488;color:#fff;font-weight:700;cursor:pointer;font-size:12px}'
        + '.toolbar button:focus{outline:2px solid #0f172a;outline-offset:2px}'
        + '.toolbar button.secondary{background:#fff;color:#115e59;border:1px solid #0d9488}'
        + '.toolbar .help{margin-left:auto;color:#334155}'
        + '.page{page-break-after:always;min-height:100vh;padding:64px 64px;box-sizing:border-box;display:flex;flex-direction:column;max-width:780px;margin:0 auto}'
        + '.page:last-child{page-break-after:auto}'
        // Cover styling — gradient and large display.
        + '.cover{background:linear-gradient(135deg,#0d9488,#0891b2);color:#fff;align-items:center;justify-content:center;text-align:center}'
        + '.cover-inner{max-width:520px}'
        + '.cover .kicker{font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85;margin:0 0 12px}'
        + '.cover-title{font-size:48px;font-weight:900;margin:0 0 16px;line-height:1.1;letter-spacing:-0.5px}'
        + '.cover-author{font-size:20px;font-style:italic;margin:0 0 24px;opacity:0.95}'
        + '.cover-meta{font-size:13px;opacity:0.8;margin:0;font-family:system-ui,sans-serif;letter-spacing:0.05em}'
        // TOC styling.
        + '.toc h2{font-size:28px;font-weight:800;margin:0 0 28px;text-align:center}'
        + '.toc-list{list-style:none;padding:0;margin:0}'
        + '.toc-list li{margin:0 0 8px;padding:0}'
        + '.toc-list a{display:flex;gap:14px;align-items:baseline;text-decoration:none;color:#1e293b;padding:10px 12px;border-radius:8px;font-size:15px}'
        + '.toc-list a:hover{background:#f1f5f9}'
        + '.toc-num{font-family:system-ui,sans-serif;color:#475569;font-weight:700;min-width:28px}'
        + '.toc-name{flex:1;font-style:italic}'
        + '.toc-form{font-size:11px;color:#475569;font-family:system-ui,sans-serif}'
        // Poem-page styling.
        + '.poem-page{justify-content:flex-start}'
        + '.poem-header{margin-bottom:24px}'
        + '.formtag{font-size:11px;color:#115e59;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px}'
        + '.poem-title{font-size:28px;font-weight:800;margin:0;line-height:1.2;letter-spacing:-0.3px}'
        + '.line{font-size:17px;line-height:1.85;margin:0;text-align:left}'
        + '.stanza-break{height:18px}'
        + '.page-num{margin-top:auto;text-align:center;font-size:11px;color:#475569;font-family:system-ui,sans-serif;padding-top:24px}'
        // Print
        + '@media print{.toolbar,.skip-link{display:none}.page{padding:32px;page-break-after:always}.cover{background:#0d9488 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{background:#fff !important}}'
        + '@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important}}'
        + '</style></head><body>'
        + '<a class="skip-link" href="#chapbook-title">Skip to chapbook</a>'
        + '<div class="toolbar" role="banner">'
        +   '<button type="button" onclick="window.print()" aria-label="Print this chapbook or save as PDF">🖨️ Print / Save as PDF</button>'
        +   '<button type="button" class="secondary" onclick="window.close()" aria-label="Close window">✕ Close</button>'
        +   '<span class="help" aria-hidden="true">Use Ctrl+P (⌘+P) → Save as PDF</span>'
        + '</div>'
        + '<main role="main" aria-labelledby="chapbook-title">'
        +   coverHtml
        +   tocHtml
        +   poemsHtml
        + '</main>'
        + '<footer class="page" role="contentinfo" style="justify-content:center;align-items:center;text-align:center"><div>'
        +   '<p style="font-size:13px;color:#475569;font-style:italic;margin:0 0 8px">Thank you for reading.</p>'
        +   '<p style="font-size:11px;color:#475569;font-family:system-ui,sans-serif;margin:0">Made with PoetTree · AlloFlow</p>'
        + '</div></footer>'
        + '</body></html>';
      try { w.document.open(); w.document.write(html); w.document.close(); announcePT('Chapbook ready: ' + pool.length + ' poems, in a new window.'); }
      catch (er) { addToast && addToast('Chapbook failed.', 'error'); }
    }, [saved, studentNickname, addToast]);

    // ── Theme Tracker: analyze recurring patterns across the student's saved poems ──
    // Pedagogical aim is craft observation, not psychological interpretation. The prompt
    // explicitly forbids diagnosis or pathologizing language.
    var runThemeTracker = useCallback(async function () {
      if (!onCallGemini || saved.length < 3) return;
      setThemeLoading(true);
      setThemeReport(null);
      try {
        var poemsBlock = saved.slice().reverse().map(function (p, pi) {
          var f = FORMS.find(function (ff) { return ff.id === p.formId; });
          return '[' + (pi + 1) + ']  Title: ' + (p.title || 'Untitled') + '   Form: ' + (f ? f.name : 'Free verse') + '\n' + p.text;
        }).join('\n\n---\n\n');
        var prompt = 'You are a poetry mentor reflecting on a ' + gradeLevel + ' student\'s body of work. Analyze these ' + saved.length + ' poems for CRAFT patterns. Critical guardrails: do NOT diagnose, pathologize, or interpret psychological states. Do NOT speculate about the writer\'s home life, mental health, or feelings beyond the page. Focus on what they\'re DOING as a writer.\n\n'
          + 'Poems (most recent first):\n\n' + poemsBlock + '\n\n'
          + 'Return JSON: {"recurringImages":["specific concrete images or objects appearing in 2+ poems"],"recurringSounds":["sound or word-music patterns: alliteration tendency, line lengths, rhyme habits"],"favoredForms":"which forms they\'re drawn to, in one sentence","voiceStrength":"one sentence on what\'s distinctive about their voice","growthEdge":"ONE specific craft move to try next, framed as an invitation not an assignment","celebration":"ONE specific thing they\'re already doing well, with a quoted phrase from one of the poems if possible"}\n\n'
          + 'Be warm, observant, and concrete. Match vocabulary to a ' + gradeLevel + ' student.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setThemeReport(parsed);
        announcePT('Pattern report ready. Distinctive voice: ' + (parsed.voiceStrength || ''));
      } catch (err) {
        warnLog('Theme tracker failed:', err && err.message);
        setThemeReport({ error: 'Couldn\'t analyze patterns right now. Try again in a moment.' });
      } finally {
        setThemeLoading(false);
      }
    }, [onCallGemini, saved, gradeLevel]);

    // ── Mentor Match: pair the student's poem with a public-domain master poem for study ──
    // Two-stage flow:
    //   1. Gemini extracts 3-5 search keywords from the student's poem (concrete images / themes).
    //   2. WebSearchProvider (Serper.dev → SearXNG → DuckDuckGo) fetches real public-domain poetry
    //      results from the open web (Poetry Foundation, PoetryArchive, Project Gutenberg, etc.).
    //   3. Gemini receives the search snippets as grounding context and picks the best mentor —
    //      now with a real sourceUrl the student can click to read the full poem.
    // Anti-fabrication: hard-restricts to authors-died-pre-1929 + canonical translations + traditional;
    // the uncertain flag asks Gemini to skip the text rather than invent it.
    var findMentorPoem = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setMentorLoading(true);
      setMentorMatch(null);
      try {
        // Stage 1 — extract search keywords from the student's poem
        var keywords = '';
        try {
          var queryPrompt = 'Extract 3-5 keywords from this poem that would help find a similar PUBLIC-DOMAIN master poem online. Focus on concrete images, themes, and emotional tone, not function words. Return JSON: {"keywords":["...","..."]}\n\nPoem:\n"""\n' + poemText + '\n"""';
          var queryResult = await onCallGemini(queryPrompt, true);
          var queryClean = String(queryResult).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
          var queryParsed = JSON.parse(queryClean);
          keywords = (queryParsed.keywords || []).slice(0, 5).join(' ');
        } catch (e) { warnLog('Keyword extract failed:', e && e.message); }

        // Stage 2 — actual web search for real PD poetry (Serper → SearXNG → DDG)
        var searchContext = '';
        var searchResults = [];
        if (window.WebSearchProvider && keywords) {
          try {
            var formHint = form && form.name !== 'Free Verse' ? form.name + ' ' : '';
            var searchQuery = keywords + ' ' + formHint + 'famous public domain poem poetryfoundation';
            announcePT('Searching for similar master poems…');
            var searchResult = await window.WebSearchProvider.search(searchQuery, 8);
            if (searchResult && searchResult.results && searchResult.results.length > 0) {
              searchResults = searchResult.results.slice(0, 8);
              searchContext = '\n\nWeb search results for similar public-domain poetry. Treat these as your candidate set — strongly prefer suggesting a poem from this list because the URL anchors the recommendation in something the student can actually go read. Do not pick a result that\'s clearly behind a paywall, modern (post-1929), or not actually a poem.\n\n'
                + searchResults.map(function (r, i) {
                  return (i + 1) + '. ' + (r.title || 'Untitled') + '\n   URL: ' + (r.url || r.link || '') + '\n   ' + String(r.snippet || '').slice(0, 220);
                }).join('\n\n');
            }
          } catch (e) {
            warnLog('Web search failed, falling back to Gemini-only:', e && e.message);
          }
        }

        // Stage 3 — Gemini picks the best mentor, ideally from the real results
        var formContext = form
          ? 'The student is writing a ' + form.name + '. Prefer a mentor in the same form, or a closely related form.'
          : 'The student is writing in free verse / open form. Pick a master poem on a similar theme.';
        var prompt = 'You are a poetry mentor. A ' + gradeLevel + ' student wrote the poem below. Surface ONE public-domain master poem to set alongside theirs for study.\n\n'
          + 'Student poem:\n"""\n' + poemText + '\n"""\n\n'
          + formContext + searchContext + '\n\n'
          + 'CRITICAL anti-fabrication rules:\n'
          + '- ONLY suggest poems whose author died before 1929 (US PD-safe), older translations of pre-modern works (Bashō, Sappho, Rumi, Ono no Komachi, etc.), or anonymous traditional works.\n'
          + (searchContext ? '- Strongly prefer one of the search results above. Include its URL in "sourceUrl".\n' : '- (No web search results available — pick from canonical PD poets only: Whitman, Dickinson, Shakespeare, Poe, Frost (early work), Yeats (early), Wordsworth, Keats, Browning, Bashō, Issa, etc.)\n')
          + '- If you are NOT confident in the exact text or attribution, set "uncertain":true and LEAVE THE TEXT FIELD BLANK — describe the poem in prose. Never fabricate a quote.\n\n'
          + 'Return JSON: {"mentor":{"title":"<title>","author":"<author>","year":<number or null>,"text":"<poem text or short excerpt, line breaks as \\\\n; BLANK if uncertain>","sourceUrl":"<URL from search results, or null>","uncertain":false},"sharedTheme":"<one sentence on what the two poems share — image, feeling, form>","craftToBorrow":"<one specific craft move from the master worth trying>","studentEcho":"<where the student is already doing something similar, with a quoted phrase from their own poem>"}\n\n'
          + 'Match register to a ' + gradeLevel + ' student. Be specific, be honest, never invent.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        // Stamp grounding info onto the result so the UI can disclose how the recommendation was built.
        parsed._grounding = { searchUsed: searchResults.length > 0, resultCount: searchResults.length, keywords: keywords };
        setMentorMatch(parsed);
        announcePT('Mentor poem found: ' + (parsed.mentor && parsed.mentor.title) + ' by ' + (parsed.mentor && parsed.mentor.author) + (searchResults.length > 0 ? ' (verified via web search)' : '') + '.');
      } catch (err) {
        warnLog('Mentor match failed:', err && err.message);
        setMentorMatch({ error: 'Couldn\'t find a mentor poem right now. Try again in a moment.' });
      } finally {
        setMentorLoading(false);
      }
    }, [onCallGemini, poemText, form, gradeLevel]);

    // ── Found poetry helper: pick word ──
    var addFoundWord = useCallback(function (word) {
      var clean = String(word || '').replace(/[^\w'-]/g, '');
      if (!clean) return;
      setPoemText(function (prev) { return prev + (prev && !prev.endsWith('\n') ? ' ' : '') + clean; });
    }, []);

    // ── Render ──
    var lines = poemText.split('\n');
    var nonEmptyLines = lines.filter(function (l) { return l.trim().length > 0; });
    var rhymeGroups = detectRhymeScheme(lines);

    var TABS = [
      { id: 'form',     icon: '📐', label: 'Form' },
      { id: 'write',    icon: '✍️', label: 'Write' },
      { id: 'feedback', icon: '✨', label: 'Feedback' },
      { id: 'perform',  icon: '🎙️', label: 'Perform' },
      { id: 'share',    icon: '📚', label: 'Library' }
    ];

    var modalStyle = {
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
    };
    var panelStyle = {
      width: '100%', maxWidth: '900px', height: '92vh', background: '#fff',
      borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    };

    return e('div', { className: 'fixed inset-0 pt-tool', style: modalStyle, onClick: function (ev) { if (ev.target === ev.currentTarget && onClose) onClose(); } },
      e('div', { style: panelStyle, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'PoetTree poetry workshop' },
        // Header
        e('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg, #f0fdfa, #ecfeff)' } },
          e('span', { style: { fontSize: '32px' }, 'aria-hidden': 'true' }, '🌳'),
          e('div', { style: { flex: 1 } },
            e('h2', { style: { fontSize: '18px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, 'PoetTree'),
            e('p', { style: { fontSize: '11px', color: '#475569', margin: 0 } }, 'Form, write, hear, share — your poems with structure and AI feedback.')
          ),
          onClose && e('button', { onClick: onClose, 'aria-label': 'Close PoetTree',
            style: { padding: '6px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }
          }, '✕ Close')
        ),

        // Tabs
        e('div', { role: 'tablist', 'aria-label': 'PoetTree sections',
          style: { display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', overflowX: 'auto' }
        },
          TABS.map(function (t) {
            var active = activeTab === t.id;
            return e('button', { key: t.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
              onClick: function () { setActiveTab(t.id); },
              style: { padding: '8px 14px', borderRadius: '10px', border: 'none', background: active ? TEAL : 'transparent', color: active ? '#fff' : '#374151', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }
            }, t.icon + ' ' + t.label);
          })
        ),

        // Tab content
        e('div', { style: { flex: 1, overflowY: 'auto', padding: '20px' } },
          // ── FORM TAB ──
          activeTab === 'form' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' } },

            // ── Assignment prompt banner (visible to students when teacher set a prompt) ──
            teacherPrompt && !onSaveConfig && e('div', { role: 'note', 'aria-label': 'Assignment prompt from teacher', style: { background: '#fffbeb', border: '2px solid #fde68a', borderRadius: '12px', padding: '12px 14px' } },
              e('div', { style: { fontSize: '11px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' } }, '📋 Assignment'),
              e('p', { style: { fontSize: '13px', color: '#78350f', margin: 0, lineHeight: 1.6 } }, teacherPrompt),
              suggestedTitle && e('p', { style: { fontSize: '11px', color: '#92400e', margin: '6px 0 0', fontStyle: 'italic' } }, 'Suggested title: ' + suggestedTitle)
            ),

            // ── Teacher Assignment Builder (visible only when onSaveConfig is provided) ──
            onSaveConfig && e('div', { role: 'region', 'aria-label': 'Teacher Assignment Builder', style: { background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '12px', padding: '14px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' } },
                e('h4', { style: { fontSize: '13px', fontWeight: 800, color: '#1e40af', margin: 0 } }, '🧑‍🏫 Teacher Assignment Builder'),
                e('span', { style: { fontSize: '10px', color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Teacher mode')
              ),
              e('p', { style: { fontSize: '11px', color: '#1e3a8a', margin: '0 0 10px', lineHeight: 1.5 } },
                'Pick a form below, then add a prompt and optional title hint. Save it as an assignment so students can load it from My Resources.'
              ),
              e('label', { htmlFor: 'pt-teacher-prompt', style: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' } }, 'Writing prompt for students'),
              e('textarea', {
                id: 'pt-teacher-prompt',
                value: teacherPrompt,
                onChange: function (ev) { setTeacherPrompt(ev.target.value); },
                placeholder: 'e.g. "Write about a place that feels like home — use at least three concrete sensory details."',
                rows: 3,
                style: { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', background: '#fff', boxSizing: 'border-box' }
              }),
              e('label', { htmlFor: 'pt-suggested-title', style: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#1e40af', margin: '8px 0 4px' } }, 'Suggested title (optional)'),
              e('input', {
                id: 'pt-suggested-title',
                type: 'text',
                value: suggestedTitle,
                onChange: function (ev) { setSuggestedTitle(ev.target.value); },
                placeholder: 'e.g. "Where I\'m From"',
                style: { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }
              }),
              e('button', {
                onClick: saveAsAssignment,
                disabled: !teacherPrompt.trim() && !form,
                'aria-label': 'Save this PoetTree setup as an assignment in My Resources',
                style: { marginTop: '10px', padding: '8px 16px', background: !teacherPrompt.trim() && !form ? '#cbd5e1' : '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: !teacherPrompt.trim() && !form ? 'not-allowed' : 'pointer' }
              }, '💾 Save as Assignment')
            ),

            e('h3', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 4px' } }, 'Pick a form to start'),
            e('p', { style: { fontSize: '12px', color: '#475569', margin: 0 } }, 'Each form has its own rules. Free verse has none. Pick what fits your idea, or try one you\'ve never written before.'),
            e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '6px' } },
              FORMS.map(function (f) {
                var selected = form && form.id === f.id;
                return e('button', { key: f.id,
                  onClick: function () { setForm(f); announcePT('Selected form: ' + f.name); },
                  'aria-pressed': selected ? 'true' : 'false',
                  'aria-label': 'Choose form ' + f.name + ' — ' + f.tagline,
                  style: { textAlign: 'left', padding: '14px', borderRadius: '12px', border: selected ? '2px solid ' + TEAL : '1px solid #e5e7eb', background: selected ? TEAL_LIGHT : '#fff', cursor: 'pointer' }
                },
                  e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
                    e('span', { style: { fontSize: '24px' }, 'aria-hidden': 'true' }, f.icon),
                    e('h4', { style: { fontSize: '14px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, f.name)
                  ),
                  e('p', { style: { fontSize: '11px', color: '#475569', margin: '0 0 6px', fontStyle: 'italic' } }, f.tagline),
                  e('p', { style: { fontSize: '11px', color: '#374151', margin: 0, lineHeight: 1.5 } }, f.structure)
                );
              })
            ),
            // Selected form details
            form && e('div', { style: { background: TEAL_LIGHT, borderRadius: '12px', padding: '14px', border: '1px solid #99f6e4', marginTop: '10px' } },
              e('h4', { style: { fontSize: '13px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 6px' } }, '📖 Example: ' + form.name),
              e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '13px', color: '#1e293b', margin: '0 0 10px', lineHeight: 1.6 } }, form.example),
              e('h4', { style: { fontSize: '13px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 4px' } }, '💡 Tips'),
              e('ul', { style: { margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#374151', lineHeight: 1.6 } },
                form.tips.map(function (tip, i) { return e('li', { key: i }, tip); })
              ),
              // Inspiration Gallery: additional public-domain examples per form
              form.moreExamples && form.moreExamples.length > 0 && e('details', { style: { marginTop: '14px', borderTop: '1px dashed #99f6e4', paddingTop: '12px' } },
                e('summary', { style: { cursor: 'pointer', fontSize: '13px', fontWeight: 800, color: TEAL_DARK, listStyle: 'none', display: 'flex', alignItems: 'center', gap: '6px' }, 'aria-label': 'Show more example poems in this form' },
                  e('span', { 'aria-hidden': 'true' }, '📚'),
                  e('span', null, 'Inspiration gallery (' + form.moreExamples.length + ' more example' + (form.moreExamples.length === 1 ? '' : 's') + ')'),
                  e('span', { 'aria-hidden': 'true', style: { marginLeft: 'auto', color: '#475569', fontSize: '11px', fontWeight: 500 } }, 'click to expand')
                ),
                e('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' } },
                  form.moreExamples.map(function (ex, ei) {
                    return e('article', { key: ei, style: { background: '#fff', border: '1px solid #cffafe', borderRadius: '10px', padding: '12px' } },
                      e('header', { style: { marginBottom: '6px' } },
                        e('h5', { style: { fontSize: '13px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, ex.title),
                        e('p', { style: { fontSize: '11px', color: '#475569', margin: '2px 0 0', fontStyle: 'italic' } }, '— ' + ex.author + (ex.year ? ', ' + ex.year : '') + ' (public domain)')
                      ),
                      e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '13px', color: '#1e293b', margin: '0 0 8px', lineHeight: 1.6 } }, ex.text),
                      ex.note && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, padding: '6px 8px', background: '#f0fdfa', borderRadius: '6px', borderLeft: '3px solid #99f6e4', fontStyle: 'italic' } }, '✏️ ' + ex.note)
                    );
                  })
                )
              ),
              e('button', { onClick: function () { setActiveTab('write'); announcePT('Ready to write a ' + form.name + '.'); },
                style: { marginTop: '10px', padding: '8px 18px', background: TEAL, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
              }, 'Start writing →')
            )
          ),

          // ── WRITE TAB ──
          activeTab === 'write' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' } },
            // Form badge + reading-mode toggle
            e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' } },
              form
                ? e('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: TEAL_LIGHT, borderRadius: '14px', border: '1px solid #99f6e4', fontSize: '12px', fontWeight: 700, color: TEAL_DARK } },
                    e('span', { 'aria-hidden': 'true' }, form.icon), form.name,
                    e('button', { onClick: function () { setForm(null); }, 'aria-label': 'Switch form', style: { background: 'transparent', border: 'none', color: TEAL_DARK, cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', marginLeft: '4px' } }, 'switch'))
                : e('span', { style: { fontSize: '12px', color: '#6b7280', fontStyle: 'italic' } }, 'No form chosen — free verse'),
              e('button', { onClick: function () { var next = !largeText; setLargeText(next); savePrefs({ largeText: next }); announcePT(next ? 'Reading-friendly text on.' : 'Reading-friendly text off.'); },
                'aria-pressed': largeText ? 'true' : 'false',
                'aria-label': largeText ? 'Turn off reading-friendly text' : 'Turn on reading-friendly text',
                style: { padding: '4px 10px', borderRadius: '6px', border: '1px solid ' + (largeText ? TEAL : '#d1d5db'), background: largeText ? TEAL_LIGHT : '#fff', color: largeText ? TEAL_DARK : '#475569', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }
              }, '🔠 ' + (largeText ? 'Reading mode on' : 'Reading mode'))
            ),

            // Title with inline AI title generator
            e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' } },
              e('label', { htmlFor: 'pt-title', style: { fontSize: '11px', fontWeight: 700, color: '#374151' } }, 'Title (optional)'),
              onCallGemini && e('button', {
                onClick: generateTitles,
                disabled: !poemText.trim() || titleLoading,
                'aria-busy': titleLoading ? 'true' : 'false',
                'aria-label': titleLoading ? 'Generating title suggestions' : 'Suggest 5 titles based on the poem',
                style: { padding: '3px 10px', borderRadius: '6px', border: 'none', background: poemText.trim() && !titleLoading ? '#7c3aed' : '#e5e7eb', color: poemText.trim() && !titleLoading ? '#fff' : '#94a3b8', fontSize: '10px', fontWeight: 700, cursor: poemText.trim() && !titleLoading ? 'pointer' : 'not-allowed' }
              }, titleLoading ? '⏳…' : '✨ Suggest titles')
            ),
            e('input', { id: 'pt-title', type: 'text', value: poemTitle, onChange: function (ev) { setPoemTitle(ev.target.value); },
              placeholder: 'Untitled',
              style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: largeText ? '15px' : '13px', fontFamily: largeText ? 'system-ui, -apple-system, sans-serif' : 'inherit' }
            }),
            // Title suggestions chips
            titleSuggestions && Array.isArray(titleSuggestions) && titleSuggestions.length > 0 && e('div', { role: 'region', 'aria-label': 'Title suggestions', 'aria-live': 'polite', style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '-4px' } },
              titleSuggestions.map(function (t, ti) {
                return e('button', { key: ti,
                  onClick: function () { setPoemTitle(t); setTitleSuggestions(null); announcePT('Title set to "' + t + '."'); },
                  'aria-label': 'Use title: ' + t,
                  style: { padding: '4px 12px', background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: '14px', fontSize: '12px', cursor: 'pointer', color: '#6b21a8', fontFamily: 'Georgia, serif', fontStyle: 'italic' }
                }, '"' + t + '"');
              })
            ),

            // Found-poetry source (only when form is found)
            form && form.id === 'found' && e('div', null,
              e('label', { htmlFor: 'pt-found-source', style: { fontSize: '11px', fontWeight: 700, color: '#374151' } }, 'Source text (paste any text here, then click words to add)'),
              // Starter sources — public-domain seeds students can mine when they don't have their own text yet
              e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' } },
                e('span', { style: { fontSize: '10px', color: '#475569', fontStyle: 'italic' } }, '📰 Or pick a starter source:'),
                [
                  {
                    label: '🌤️ Weather forecast',
                    text: 'A coastal storm will bring widespread rain, gusty winds, and the threat of minor flooding to the region tonight into Tuesday morning. Expect rainfall amounts of one to two inches, with locally higher amounts possible in heavier downpours. Wind gusts may exceed forty miles per hour, especially near the coast. Power outages are possible. By Tuesday afternoon, the storm will move offshore and conditions will gradually improve. Sunshine returns Wednesday with cooler temperatures and a brisk northwesterly breeze.'
                  },
                  {
                    label: '🎤 Gettysburg Address',
                    text: 'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.\n\n— Abraham Lincoln, 1863'
                  },
                  {
                    label: '🥣 Recipe',
                    text: 'Combine flour, sugar, baking powder, and salt in a large bowl. Whisk together milk, melted butter, and eggs in a separate bowl. Pour the wet ingredients into the dry and stir gently until just combined. Do not overmix. The batter should be slightly lumpy. Heat a griddle or non-stick pan over medium heat. Pour a quarter cup of batter for each pancake. Cook until bubbles form on the surface and the edges look set, about two to three minutes. Flip and cook the other side until golden brown.'
                  }
                ].map(function (src, si) {
                  return e('button', { key: si,
                    onClick: function () { setFoundSource(src.text); announcePT('Loaded ' + src.label + ' as source.'); },
                    'aria-label': 'Use ' + src.label + ' as source text',
                    style: { padding: '3px 10px', borderRadius: '12px', border: '1px solid #fde68a', background: '#fffbeb', color: '#78350f', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
                  }, src.label);
                })
              ),
              e('textarea', { id: 'pt-found-source', value: foundSource, onChange: function (ev) { setFoundSource(ev.target.value); },
                rows: 6, placeholder: 'Paste a news article, a textbook page, a letter…',
                style: { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: largeText ? '14px' : '12px', fontFamily: 'Georgia, serif', resize: 'vertical', boxSizing: 'border-box' }
              }),
              foundSource && e('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px', marginTop: '6px', maxHeight: '160px', overflowY: 'auto' } },
                e('p', { style: { fontSize: '10px', color: '#78350f', margin: '0 0 6px', fontWeight: 700 } }, 'Click words to add them to your poem:'),
                e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                  foundSource.split(/\s+/).filter(Boolean).slice(0, 200).map(function (w, wi) {
                    return e('button', { key: wi, onClick: function () { addFoundWord(w); },
                      'aria-label': 'Add word ' + w + ' to poem',
                      style: { padding: '2px 6px', background: '#fff', border: '1px solid #fde68a', borderRadius: '4px', fontSize: largeText ? '13px' : '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', color: '#1e293b' }
                    }, w);
                  })
                )
              )
            ),

            // ── Erasure Workshop (only when form is 'erasure') ──
            // Two stages: paste/seed source text → click words to keep. Kept words form
            // the extracted poem in original reading order, preserving line breaks.
            form && form.id === 'erasure' && e('div', { role: 'region', 'aria-label': 'Erasure Workshop', style: { background: '#fafafa', border: '2px solid #1e293b', borderRadius: '10px', padding: '12px' } },
              e('div', { style: { fontSize: '11px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } }, '⬛ Erasure Workshop'),
              !erasureSource && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                e('p', { style: { fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.5 } }, 'Paste a source text below, then click the words you want to KEEP. Everything else gets blacked out.'),
                e('textarea', {
                  id: 'pt-erasure-source',
                  value: erasureSource,
                  onChange: function (ev) { setErasureSource(ev.target.value); setErasureKept({}); },
                  rows: 4, placeholder: 'Paste a paragraph, an article, a song lyric — anything…',
                  'aria-label': 'Source text for erasure',
                  style: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'Georgia, serif', resize: 'vertical', boxSizing: 'border-box' }
                }),
                e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '10px', color: '#475569' } },
                  e('span', { style: { fontStyle: 'italic' } }, 'Or seed from:'),
                  [
                    { label: '🌤️ Weather', text: 'A coastal storm will bring widespread rain, gusty winds, and the threat of minor flooding to the region tonight into Tuesday morning. Wind gusts may exceed forty miles per hour, especially near the coast. By Tuesday afternoon, the storm will move offshore and conditions will gradually improve. Sunshine returns Wednesday with cooler temperatures and a brisk northwesterly breeze.' },
                    { label: '📜 Old Letter', text: 'My dearest friend, the leaves are falling now, and the wind has a sound I had forgotten. Yesterday I walked the old path and found a single white feather caught in the brambles. I tell myself I am content here, though some nights I still listen for the bell.' },
                    { label: '📰 News brief', text: 'The town council voted unanimously last night to preserve the abandoned lot at the corner of Maple and Third as a community garden. Residents had petitioned for the change for over a year. Volunteers will begin planting in the spring; until then, the lot will be cleared of debris and the soil tested for contamination.' }
                  ].map(function (seed) {
                    return e('button', { key: seed.label,
                      onClick: function () { setErasureSource(seed.text); setErasureKept({}); announcePT('Seed source loaded.'); },
                      'aria-label': 'Use ' + seed.label + ' as source text',
                      style: { padding: '3px 8px', borderRadius: '999px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '10px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }
                    }, seed.label);
                  })
                )
              ),
              erasureSource && (function () {
                // Tokenize on whitespace, preserving line structure as separate arrays.
                // Each token entry is { idx, text, isKept }; lines are arrays of tokens.
                var lineTokens = [];
                var globalIdx = 0;
                var rawLines = erasureSource.split('\n');
                rawLines.forEach(function (lineStr, li) {
                  var tokens = [];
                  var pieces = lineStr.split(/\s+/).filter(function (p) { return p.length > 0; });
                  pieces.forEach(function (p) {
                    tokens.push({ idx: globalIdx, text: p });
                    globalIdx += 1;
                  });
                  lineTokens.push({ rawLine: lineStr, tokens: tokens });
                });
                // Build the extracted poem — preserve line breaks; only kept tokens print.
                var extractedLines = lineTokens.map(function (l) {
                  return l.tokens.filter(function (t) { return erasureKept[t.idx]; }).map(function (t) { return t.text; }).join(' ');
                });
                // Collapse runs of empty lines to single empties (poetic white space)
                var compacted = [];
                extractedLines.forEach(function (line) {
                  if (line || (compacted.length > 0 && compacted[compacted.length - 1])) compacted.push(line);
                });
                while (compacted.length > 0 && !compacted[compacted.length - 1]) compacted.pop();
                var extractedPoem = compacted.join('\n');
                var keptCount = Object.keys(erasureKept).filter(function (k) { return erasureKept[k]; }).length;
                return e('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' } },
                    e('span', { style: { fontSize: '11px', color: '#475569' } }, 'Click words to keep · ' + keptCount + ' kept of ' + globalIdx + ' total'),
                    e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                      e('button', { onClick: function () { setErasureKept({}); announcePT('Erasure cleared. All words restored.'); },
                        'aria-label': 'Clear all kept words',
                        style: { padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }
                      }, '↻ Reset'),
                      e('button', { onClick: function () {
                          var allKept = {};
                          for (var i = 0; i < globalIdx; i++) allKept[i] = true;
                          setErasureKept(allKept);
                        },
                        'aria-label': 'Keep all words',
                        style: { padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }
                      }, '◻ All'),
                      e('button', { onClick: function () { setErasureSource(''); setErasureKept({}); },
                        'aria-label': 'Replace source text',
                        style: { padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }
                      }, '✎ Replace')
                    )
                  ),
                  // Source canvas — clickable word tokens with blackout effect on non-kept
                  e('div', { role: 'group', 'aria-label': 'Source text — click words to keep them in your erasure poem', style: { background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontFamily: 'Georgia, serif', fontSize: largeText ? '16px' : '14px', lineHeight: 1.9 } },
                    lineTokens.map(function (l, li) {
                      if (l.tokens.length === 0) return e('div', { key: li, style: { height: '1em' } });
                      return e('div', { key: li, style: { marginBottom: '4px' } },
                        l.tokens.map(function (t) {
                          var kept = !!erasureKept[t.idx];
                          return e('span', { key: t.idx,
                            onClick: function () {
                              setErasureKept(function (prev) {
                                var n = Object.assign({}, prev);
                                if (n[t.idx]) delete n[t.idx]; else n[t.idx] = true;
                                return n;
                              });
                            },
                            onKeyDown: function (ev) {
                              if (ev.key === 'Enter' || ev.key === ' ') {
                                ev.preventDefault();
                                setErasureKept(function (prev) {
                                  var n = Object.assign({}, prev);
                                  if (n[t.idx]) delete n[t.idx]; else n[t.idx] = true;
                                  return n;
                                });
                              }
                            },
                            tabIndex: 0,
                            role: 'button',
                            'aria-pressed': kept ? 'true' : 'false',
                            'aria-label': (kept ? 'Keep word: ' : 'Erase word: ') + t.text,
                            style: kept
                              ? { display: 'inline-block', padding: '0 4px', margin: '0 1px', background: '#fef3c7', borderRadius: '3px', cursor: 'pointer', color: '#1e293b', fontWeight: 700 }
                              : { display: 'inline-block', padding: '0 4px', margin: '0 1px', background: '#1e293b', borderRadius: '3px', cursor: 'pointer', color: '#1e293b', userSelect: 'none' }
                          }, t.text);
                        })
                      );
                    })
                  ),
                  // Extracted poem preview
                  extractedPoem.trim() && e('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' } },
                    e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } }, '✨ Your erasure poem'),
                    e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: largeText ? '15px' : '13px', color: '#1e293b', margin: 0, lineHeight: 1.7 } }, extractedPoem),
                    e('button', { onClick: function () { setPoemText(extractedPoem); announcePT('Erasure poem copied into editor.'); addToast && addToast('Copied to editor!', 'success'); },
                      'aria-label': 'Copy this erasure into the main poem editor below',
                      style: { marginTop: '8px', padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#0d9488', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
                    }, '↓ Use as poem')
                  )
                );
              })()
            ),

            // Editor
            e('label', { htmlFor: 'pt-editor', style: { fontSize: '11px', fontWeight: 700, color: '#374151' } }, 'Your poem'),
            e('textarea', { id: 'pt-editor', value: poemText, onChange: function (ev) { setPoemText(ev.target.value); },
              autoFocus: true,
              rows: 12, placeholder: form && form.id === 'haiku' ? 'Line 1 (5 syllables)\nLine 2 (7 syllables)\nLine 3 (5 syllables)' : 'Start writing…',
              style: { width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid ' + TEAL, fontSize: largeText ? '17px' : '15px', fontFamily: largeText ? 'system-ui, -apple-system, sans-serif' : 'Georgia, serif', lineHeight: largeText ? 1.85 : 1.7, letterSpacing: largeText ? '0.02em' : 'normal', resize: 'vertical', minHeight: '180px', boxSizing: 'border-box' }
            }),

            // Live structure check
            e('div', { style: { background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', border: '1px solid #e2e8f0' } },
              e('h4', { style: { fontSize: '11px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Live structure check'),
              // Per-line table
              lines.length > 0 && e('div', { style: { fontFamily: 'monospace', fontSize: '11px', color: '#374151', maxHeight: '200px', overflowY: 'auto' } },
                lines.map(function (line, li) {
                  if (!line.trim()) return e('div', { key: li, style: { color: '#475569', padding: '2px 0' } }, '— stanza break —');
                  var sylCount = countLineSyllables(line);
                  var expected = form && form.syllablesPerLine && form.syllablesPerLine[li];
                  var sylStatus = expected ? (sylCount === expected ? '✓' : '✗ ' + sylCount + '/' + expected) : sylCount + ' syl';
                  var rg = rhymeGroups[li];
                  return e('div', { key: li, style: { padding: '3px 0', display: 'flex', gap: '8px', alignItems: 'center' } },
                    e('span', { style: { color: '#475569', minWidth: '20px' } }, (li + 1) + '.'),
                    e('span', { style: { flex: 1, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, line),
                    rg && e('span', { style: { color: TEAL, fontWeight: 700, minWidth: '14px' }, 'aria-label': 'rhymes as group ' + rg }, rg),
                    e('span', { style: { color: expected && sylCount !== expected ? AMBER : '#475569', fontWeight: 700, minWidth: '60px', textAlign: 'right' } }, sylStatus)
                  );
                })
              ),
              // Form-level summary
              form && e('div', { style: { marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '11px', color: '#475569' } },
                form.lineCount && e('span', null, 'Lines: ' + nonEmptyLines.length + (form.lineCount ? ' / ' + form.lineCount : '') + ' · '),
                form.rhymeScheme && e('span', null, 'Expected rhyme: ' + form.rhymeScheme + ' · Detected: ' + rhymeGroups.filter(Boolean).join(' '))
              )
            ),

            // Actions
            e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              e('button', { onClick: savePoem, disabled: !poemText.trim(),
                style: { padding: '8px 14px', background: poemText.trim() ? TEAL : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: poemText.trim() ? 'pointer' : 'not-allowed' }
              }, '💾 Save'),
              onSaveSubmission && e('button', { onClick: saveSubmissionToPortfolio, disabled: !poemText.trim(),
                'aria-label': 'Save this poem to your portfolio (My Resources)',
                style: { padding: '8px 14px', background: poemText.trim() ? '#7c3aed' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: poemText.trim() ? 'pointer' : 'not-allowed' }
              }, '📚 Save to Portfolio'),
              onCallGemini && e('button', { onClick: function () { setActiveTab('feedback'); getAiFeedback(); }, disabled: !poemText.trim(),
                style: { padding: '8px 14px', background: poemText.trim() ? '#7c3aed' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: poemText.trim() ? 'pointer' : 'not-allowed' }
              }, '✨ Get feedback'),
              // Cross-tool: open this poem in LitLab as a performance script (parent wires the prop).
              onSendToLitLab && e('button', { onClick: sendToLitLab, disabled: !poemText.trim(),
                'aria-label': 'Send this poem to LitLab to perform with character voices',
                style: { padding: '8px 14px', background: poemText.trim() ? '#a855f7' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: poemText.trim() ? 'pointer' : 'not-allowed' }
              }, '🎭 Perform in LitLab'),
              onCallGemini && e('button', { onClick: analyzeMeter, disabled: !poemText.trim() || meterLoading,
                'aria-busy': meterLoading ? 'true' : 'false',
                style: { padding: '8px 14px', background: poemText.trim() && !meterLoading ? '#0891b2' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: poemText.trim() && !meterLoading ? 'pointer' : 'not-allowed' }
              }, meterLoading ? '⏳ Analyzing meter…' : '📏 Analyze meter'),
              onCallTTS && e('button', { onClick: function () { setActiveTab('perform'); },
                style: { padding: '8px 14px', background: '#fff', color: TEAL_DARK, border: '1px solid ' + TEAL, borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
              }, '🎙️ Perform')
            ),

            // ── Cross-form Rewrite (transform existing poem into a different form) ──
            // Pedagogical: makes form constraints visible. The student sees how their image shifts.
            onCallGemini && poemText.trim() && e('div', { style: { background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '10px 12px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                e('label', { htmlFor: 'pt-rewrite-target', style: { fontSize: '11px', fontWeight: 800, color: '#581c87', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🔁 Rewrite as'),
                e('select', { id: 'pt-rewrite-target', value: rewriteTargetId,
                  onChange: function (ev) { setRewriteTargetId(ev.target.value); },
                  'aria-label': 'Choose target form for rewrite',
                  style: { padding: '5px 8px', borderRadius: '6px', border: '1px solid #c4b5fd', fontSize: '12px', background: '#fff' }
                },
                  e('option', { value: '' }, '— pick a form —'),
                  FORMS.filter(function (f) { return !form || f.id !== form.id; }).map(function (f) {
                    return e('option', { key: f.id, value: f.id }, f.icon + ' ' + f.name);
                  })
                ),
                e('button', { onClick: function () { rewriteAsForm(rewriteTargetId); },
                  disabled: !rewriteTargetId || rewriteLoading,
                  'aria-busy': rewriteLoading ? 'true' : 'false',
                  'aria-label': rewriteLoading ? 'Rewriting, please wait' : 'Rewrite the poem in the chosen form',
                  style: { padding: '5px 12px', borderRadius: '6px', border: 'none', background: rewriteTargetId && !rewriteLoading ? '#7c3aed' : '#e5e7eb', color: rewriteTargetId && !rewriteLoading ? '#fff' : '#94a3b8', fontSize: '11px', fontWeight: 700, cursor: rewriteTargetId && !rewriteLoading ? 'pointer' : 'not-allowed' }
                }, rewriteLoading ? '⏳ Rewriting…' : '🔁 Rewrite'),
                rewriteResult && e('button', { onClick: function () { setRewriteResult(null); setRewriteTargetId(''); },
                  'aria-label': 'Dismiss rewrite preview',
                  style: { marginLeft: 'auto', padding: '4px 10px', background: 'transparent', border: '1px solid #d1d5db', color: '#475569', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }
                }, '✕ Dismiss')
              ),
              !rewriteResult && !rewriteLoading && e('p', { style: { fontSize: '10px', color: '#581c87', margin: '6px 0 0', fontStyle: 'italic' } }, 'See how your image holds up in a different form. Original stays intact unless you replace it.'),
              rewriteResult && rewriteResult.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: '6px 0 0' } }, rewriteResult.error),
              rewriteResult && !rewriteResult.error && e('div', { role: 'region', 'aria-label': 'Rewrite preview', 'aria-live': 'polite', style: { marginTop: '10px' } },
                e('div', { style: { background: '#fff', border: '2px solid #c4b5fd', borderRadius: '10px', padding: '14px 16px' } },
                  e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#581c87', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, 'Rewrite preview' + (rewriteResult.targetForm ? ' (' + rewriteResult.targetForm.icon + ' ' + rewriteResult.targetForm.name + ')' : '')),
                  e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: largeText ? '15px' : '14px', color: '#1e293b', margin: 0, lineHeight: largeText ? 1.85 : 1.7 } }, rewriteResult.poem),
                  rewriteResult.note && e('p', { style: { fontSize: '11px', color: '#475569', margin: '10px 0 0', fontStyle: 'italic', borderTop: '1px dashed #e5e7eb', paddingTop: '8px' } }, '✏️ ' + rewriteResult.note)
                ),
                e('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
                  e('button', { onClick: applyRewrite,
                    'aria-label': 'Replace your poem with this rewrite',
                    style: { padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
                  }, '✓ Replace mine'),
                  e('button', { onClick: function () { try { navigator.clipboard.writeText(rewriteResult.poem); addToast && addToast('Rewrite copied to clipboard.', 'success'); } catch (er) {} },
                    'aria-label': 'Copy rewrite to clipboard',
                    style: { padding: '6px 14px', background: '#fff', color: '#581c87', border: '1px solid #c4b5fd', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
                  }, '📋 Copy'),
                  e('button', { onClick: function () { setRewriteResult(null); setRewriteTargetId(''); announcePT('Kept original.'); },
                    'aria-label': 'Keep original poem, discard rewrite',
                    style: { padding: '6px 14px', background: 'transparent', color: '#475569', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
                  }, 'Keep mine')
                )
              )
            ),

            // Inline meter analysis (rendered here so writers see it next to their text)
            meterAnalysis && !meterAnalysis.error && meterAnalysis.lines && e('div', { style: { background: '#ecfeff', borderRadius: '10px', padding: '12px', border: '1px solid #67e8f9' } },
              e('h4', { style: { fontSize: '12px', fontWeight: 800, color: '#155e75', margin: '0 0 8px' } }, '📏 Meter analysis'),
              e('table', { style: { width: '100%', fontSize: '11px', borderCollapse: 'collapse' } },
                e('thead', null, e('tr', null,
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Line'),
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Stress'),
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Syl'),
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Meter'),
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Feet')
                )),
                e('tbody', null,
                  meterAnalysis.lines.map(function (ln, li) {
                    return e('tr', { key: li, style: { borderTop: '1px solid #cffafe' } },
                      e('td', { style: { padding: '4px', color: '#1e293b', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, ln.text),
                      e('td', { style: { padding: '4px', fontFamily: 'monospace', color: '#155e75' }, 'aria-label': 'Stress pattern: ' + ln.stressPattern }, ln.stressPattern),
                      e('td', { style: { padding: '4px', color: '#475569' } }, ln.syllableCount),
                      e('td', { style: { padding: '4px', color: '#475569' } }, ln.meterName),
                      e('td', { style: { padding: '4px', color: '#475569' } }, ln.footCount)
                    );
                  })
                )
              ),
              e('p', { style: { fontSize: '10px', color: '#475569', fontStyle: 'italic', margin: '6px 0 0' } }, '/ = stressed syllable, u = unstressed. Read the line aloud to verify.')
            ),

            // ── Writing helpers (collapsible panel: Daily Prompt, Rhymes, Stronger Verbs) ──
            onCallGemini && e('div', { style: { background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' } },
              e('button', {
                onClick: function () { setHelpersOpen(!helpersOpen); },
                'aria-expanded': helpersOpen ? 'true' : 'false',
                'aria-controls': 'pt-helpers-panel',
                'aria-label': helpersOpen ? 'Collapse writing helpers' : 'Expand writing helpers',
                style: { width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '13px', fontWeight: 800, color: TEAL_DARK }
              },
                e('span', null, '✨ Writing helpers'),
                e('span', { 'aria-hidden': 'true', style: { fontSize: '11px', color: '#475569' } }, helpersOpen ? '▼' : '▶')
              ),
              helpersOpen && e('div', { id: 'pt-helpers-panel', style: { padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #e2e8f0' } },
                // ── Daily Prompt ──
                e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', marginTop: '10px' } },
                    e('h4', { style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '💡 Daily Prompt'),
                    e('button', { onClick: generateDailyPrompt, disabled: dailyPromptLoading,
                      'aria-busy': dailyPromptLoading ? 'true' : 'false',
                      'aria-label': dailyPromptLoading ? 'Fetching prompt, please wait' : (dailyPrompt ? 'Get another prompt' : 'Get a prompt'),
                      style: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: dailyPromptLoading ? '#cbd5e1' : TEAL, color: '#fff', fontSize: '11px', fontWeight: 700, cursor: dailyPromptLoading ? 'wait' : 'pointer' }
                    }, dailyPromptLoading ? '⏳…' : (dailyPrompt ? '🔄 New prompt' : '💡 Inspire me'))
                  ),
                  dailyPrompt && e('div', { role: 'region', 'aria-live': 'polite', style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#78350f', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.5 } },
                    '"' + dailyPrompt + '"',
                    e('button', { onClick: function () { try { navigator.clipboard.writeText(dailyPrompt); addToast && addToast('Prompt copied.', 'success'); } catch (er) {} },
                      'aria-label': 'Copy prompt to clipboard',
                      style: { marginLeft: '8px', padding: '2px 8px', background: 'transparent', border: '1px solid #fcd34d', color: '#78350f', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', verticalAlign: 'middle' }
                    }, '📋 copy')
                  ),
                  !dailyPrompt && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, fontStyle: 'italic' } }, 'Stuck? Get a fresh idea to start from.')
                ),

                // ── Rhymes ──
                e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
                    e('label', { htmlFor: 'pt-rhyme-input', style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🔁 Rhymes for…')
                  ),
                  e('div', { style: { display: 'flex', gap: '6px' } },
                    e('input', { id: 'pt-rhyme-input', type: 'text', value: rhymeQuery,
                      onChange: function (ev) { setRhymeQuery(ev.target.value); },
                      onKeyDown: function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); fetchRhymes(); } },
                      placeholder: 'word to rhyme (e.g. orange, light, hope)',
                      style: { flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px' }
                    }),
                    e('button', { onClick: fetchRhymes, disabled: !rhymeQuery.trim() || rhymeLoading,
                      'aria-busy': rhymeLoading ? 'true' : 'false',
                      'aria-label': rhymeLoading ? 'Fetching rhymes' : 'Find rhymes',
                      style: { padding: '6px 12px', borderRadius: '6px', border: 'none', background: rhymeQuery.trim() && !rhymeLoading ? TEAL : '#cbd5e1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: rhymeQuery.trim() && !rhymeLoading ? 'pointer' : 'not-allowed' }
                    }, rhymeLoading ? '⏳' : '🔍')
                  ),
                  rhymeResults && rhymeResults.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: '6px 0 0' } }, rhymeResults.error),
                  rhymeResults && !rhymeResults.error && e('div', { role: 'region', 'aria-label': 'Rhyme results', 'aria-live': 'polite', style: { marginTop: '8px' } },
                    rhymeResults.perfect && rhymeResults.perfect.length > 0 && e('div', { style: { marginBottom: '6px' } },
                      e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '4px' } }, 'Perfect rhymes for "' + rhymeResults.word + '"'),
                      e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                        rhymeResults.perfect.map(function (w, wi) {
                          return e('button', { key: 'p' + wi, onClick: function () { copyRhyme(w); },
                            'aria-label': 'Rhyme ' + w + ' — copy to clipboard',
                            style: { padding: '3px 10px', background: TEAL_LIGHT, border: '1px solid #99f6e4', borderRadius: '12px', fontSize: '12px', cursor: 'pointer', color: TEAL_DARK, fontFamily: 'Georgia, serif' }
                          }, w);
                        })
                      )
                    ),
                    rhymeResults.slant && rhymeResults.slant.length > 0 && e('div', null,
                      e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '4px' } }, 'Slant rhymes (close, not exact)'),
                      e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                        rhymeResults.slant.map(function (w, wi) {
                          return e('button', { key: 's' + wi, onClick: function () { copyRhyme(w); },
                            'aria-label': 'Slant rhyme ' + w + ' — copy to clipboard',
                            style: { padding: '3px 10px', background: '#fff', border: '1px dashed #99f6e4', borderRadius: '12px', fontSize: '12px', cursor: 'pointer', color: TEAL_DARK, fontFamily: 'Georgia, serif' }
                          }, w);
                        })
                      )
                    ),
                    (!rhymeResults.perfect || rhymeResults.perfect.length === 0) && (!rhymeResults.slant || rhymeResults.slant.length === 0) && e('p', { style: { fontSize: '11px', color: '#475569', fontStyle: 'italic', margin: 0 } }, 'No rhymes found — try a more common word.')
                  )
                ),

                // ── Stronger Verbs ──
                e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' } },
                    e('h4', { style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '💪 Stronger Verbs'),
                    e('button', { onClick: findStrongerVerbs, disabled: !poemText.trim() || verbLoading,
                      'aria-busy': verbLoading ? 'true' : 'false',
                      'aria-label': verbLoading ? 'Analyzing verbs' : 'Find stronger verbs',
                      style: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: poemText.trim() && !verbLoading ? TEAL : '#cbd5e1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: poemText.trim() && !verbLoading ? 'pointer' : 'not-allowed' }
                    }, verbLoading ? '⏳…' : '🔍 Scan')
                  ),
                  verbSuggestions && verbSuggestions.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: 0 } }, verbSuggestions.error),
                  verbSuggestions && Array.isArray(verbSuggestions) && verbSuggestions.length === 0 && e('p', { style: { fontSize: '12px', color: '#166534', fontStyle: 'italic', margin: 0, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '8px 10px' } }, '✓ No weak verbs detected — your verbs are working hard.'),
                  verbSuggestions && Array.isArray(verbSuggestions) && verbSuggestions.length > 0 && e('div', { role: 'region', 'aria-label': 'Verb suggestions', 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                    verbSuggestions.map(function (s, si) {
                      return e('div', { key: si, style: { background: '#fff', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 10px' } },
                        e('p', { style: { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#1e293b', margin: '0 0 4px', fontStyle: 'italic' } }, '"' + s.line + '"'),
                        e('div', { style: { fontSize: '10px', color: '#475569' } },
                          e('span', null, 'Weak verb: '),
                          e('span', { style: { fontWeight: 700, color: '#b45309' } }, s.weakVerb),
                          e('span', null, ' → try: '),
                          (s.alternatives || []).map(function (alt, ai) {
                            return e('button', { key: ai, onClick: function () { copyRhyme(alt); },
                              'aria-label': 'Stronger verb ' + alt + ' — copy to clipboard',
                              style: { display: 'inline-block', margin: '0 3px 2px 0', padding: '2px 8px', background: TEAL_LIGHT, border: '1px solid #99f6e4', borderRadius: '10px', fontSize: '11px', cursor: 'pointer', color: TEAL_DARK }
                            }, alt);
                          })
                        )
                      );
                    })
                  ),
                  !verbSuggestions && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, fontStyle: 'italic' } }, 'Find weak verbs (is, was, have…) and get stronger alternatives.')
                ),

                // ── Senses Check ──
                e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' } },
                    e('h4', { style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🌈 Senses Check'),
                    e('button', { onClick: checkSenses, disabled: !poemText.trim() || sensesLoading,
                      'aria-busy': sensesLoading ? 'true' : 'false',
                      'aria-label': sensesLoading ? 'Auditing sensory imagery' : 'Audit which senses your poem uses',
                      style: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: poemText.trim() && !sensesLoading ? TEAL : '#cbd5e1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: poemText.trim() && !sensesLoading ? 'pointer' : 'not-allowed' }
                    }, sensesLoading ? '⏳…' : '🌈 Audit')
                  ),
                  sensesResult && sensesResult.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: 0 } }, sensesResult.error),
                  sensesResult && !sensesResult.error && e('div', { role: 'region', 'aria-label': 'Senses audit results', 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    // Per-sense bars
                    e('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' } },
                      ['sight','sound','smell','taste','touch','motion','emotion'].map(function (sense) {
                        var count = (sensesResult.counts && sensesResult.counts[sense]) || 0;
                        var max = 8;
                        var pct = Math.min(100, (count / max) * 100);
                        var isStrong = sensesResult.strongest && sensesResult.strongest.toLowerCase() === sense;
                        var isMissing = sensesResult.missing && sensesResult.missing.toLowerCase() === sense;
                        var iconMap = { sight: '👁️', sound: '🔊', smell: '👃', taste: '👅', touch: '✋', motion: '💨', emotion: '💗' };
                        return e('div', { key: sense, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }, 'aria-label': sense + ': ' + count + (isStrong ? ' (strongest)' : isMissing ? ' (missing — try adding)' : '') },
                          e('span', { style: { width: '70px', color: isMissing ? '#b45309' : isStrong ? TEAL_DARK : '#475569', fontWeight: isStrong || isMissing ? 800 : 500 } }, (iconMap[sense] || '') + ' ' + sense),
                          e('div', { style: { flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }, 'aria-hidden': 'true' },
                            e('div', { style: { height: '100%', width: pct + '%', background: isMissing && count === 0 ? '#fde68a' : isStrong ? TEAL : '#cbd5e1' } })
                          ),
                          e('span', { style: { width: '20px', textAlign: 'right', color: count === 0 ? '#94a3b8' : '#1e293b', fontWeight: 700 } }, count)
                        );
                      })
                    ),
                    // Targeted suggestion
                    sensesResult.suggestion && e('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 10px' } },
                      e('p', { style: { fontSize: '10px', color: '#78350f', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '💡 Try adding'),
                      e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.5 } }, sensesResult.suggestion)
                    )
                  ),
                  !sensesResult && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, fontStyle: 'italic' } }, 'See which senses your poem already uses, and which one would add the most.')
                ),

                // ── Sound Device Coach (alliteration / assonance / consonance / internal rhyme) ──
                e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' } },
                    e('h4', { style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🎶 Sound Devices'),
                    e('button', { onClick: analyzeSoundDevices, disabled: !poemText.trim() || soundDeviceLoading,
                      'aria-busy': soundDeviceLoading ? 'true' : 'false',
                      'aria-label': soundDeviceLoading ? 'Analyzing sound devices' : 'Analyze alliteration, assonance, consonance, and internal rhyme',
                      style: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: poemText.trim() && !soundDeviceLoading ? TEAL : '#cbd5e1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: poemText.trim() && !soundDeviceLoading ? 'pointer' : 'not-allowed' }
                    }, soundDeviceLoading ? '⏳…' : '🎶 Listen')
                  ),
                  soundDeviceResult && soundDeviceResult.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: 0 } }, soundDeviceResult.error),
                  soundDeviceResult && !soundDeviceResult.error && e('div', { role: 'region', 'aria-label': 'Sound device coach results', 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    // Per-device sections
                    [
                      { key: 'alliteration', label: 'Alliteration', icon: '🔤', desc: 'same starting consonant' },
                      { key: 'assonance', label: 'Assonance', icon: '🎵', desc: 'same internal vowel' },
                      { key: 'consonance', label: 'Consonance', icon: '🔁', desc: 'same internal/ending consonant' },
                      { key: 'internalRhyme', label: 'Internal Rhyme', icon: '🪶', desc: 'rhyme inside a line' }
                    ].map(function (d) {
                      var items = Array.isArray(soundDeviceResult[d.key]) ? soundDeviceResult[d.key] : [];
                      var isWeakest = soundDeviceResult.weakest && soundDeviceResult.weakest.toLowerCase().indexOf(d.key.toLowerCase()) >= 0;
                      var bg = items.length === 0 ? '#fff' : '#f0fdfa';
                      var borderColor = isWeakest ? '#fde68a' : (items.length === 0 ? '#e2e8f0' : '#99f6e4');
                      return e('div', { key: d.key, style: { background: bg, border: '1px solid ' + borderColor, borderRadius: '8px', padding: '8px 10px' } },
                        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: items.length > 0 ? '6px' : '0' } },
                          e('div', { style: { fontSize: '11px', fontWeight: 700, color: items.length === 0 ? '#94a3b8' : TEAL_DARK, display: 'flex', alignItems: 'center', gap: '6px' } },
                            e('span', { 'aria-hidden': 'true' }, d.icon),
                            e('span', null, d.label),
                            e('span', { style: { fontSize: '10px', fontWeight: 500, color: '#94a3b8', fontStyle: 'italic' } }, '— ' + d.desc)
                          ),
                          isWeakest && e('span', { style: { fontSize: '9px', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'lean in here')
                        ),
                        items.length === 0
                          ? e('p', { style: { fontSize: '11px', color: '#94a3b8', margin: 0, fontStyle: 'italic' } }, 'Not found in this draft.')
                          : e('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' } },
                              items.map(function (it, ii) {
                                return e('li', { key: ii, style: { fontSize: '11px', color: '#1e293b', lineHeight: 1.5 } },
                                  e('span', { style: { fontFamily: 'Georgia, serif', fontWeight: 700 } }, '"' + (it.excerpt || '') + '"'),
                                  it.note && e('span', { style: { color: '#475569', fontStyle: 'italic' } }, ' — ' + it.note)
                                );
                              })
                            )
                      );
                    }),
                    // Targeted suggestion
                    soundDeviceResult.suggestion && e('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 10px' } },
                      e('p', { style: { fontSize: '10px', color: '#78350f', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '💡 Try this'),
                      e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.5 } }, soundDeviceResult.suggestion)
                    )
                  ),
                  !soundDeviceResult && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, fontStyle: 'italic' } }, 'Hear what your poem is doing with sound — alliteration, assonance, consonance, internal rhyme.')
                ),

                // ── Metaphor Visualizer (figurative-language detector + per-metaphor image gen + edit) ──
                onCallImagen && e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' } },
                    e('h4', { style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🎨 Metaphor Visualizer'),
                    e('button', { onClick: detectMetaphors, disabled: !poemText.trim() || metaphorLoading,
                      'aria-busy': metaphorLoading ? 'true' : 'false',
                      'aria-label': metaphorLoading ? 'Scanning for metaphors and similes' : (metaphors && Array.isArray(metaphors) ? 'Re-scan for metaphors' : 'Find metaphors and similes in this poem'),
                      style: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: poemText.trim() && !metaphorLoading ? TEAL : '#cbd5e1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: poemText.trim() && !metaphorLoading ? 'pointer' : 'not-allowed' }
                    }, metaphorLoading ? '⏳…' : (metaphors && Array.isArray(metaphors) ? '🔄 Re-scan' : '🔍 Find them'))
                  ),
                  metaphors && metaphors.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: 0 } }, metaphors.error),
                  metaphors && Array.isArray(metaphors) && metaphors.length === 0 && e('p', { style: { fontSize: '11px', color: '#475569', fontStyle: 'italic', margin: 0 } }, 'No metaphors or similes found in this draft. Try adding one — "X is a Y" or "X like Y".'),
                  metaphors && Array.isArray(metaphors) && metaphors.length > 0 && e('div', { role: 'region', 'aria-label': 'Detected metaphors and similes', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    metaphors.map(function (m) {
                      var url = metaphorImages[m.id];
                      var loading = metaphorImgLoading[m.id];
                      var edit = metaphorEditText[m.id] || '';
                      return e('article', { key: m.id, style: { background: '#fff', border: '1px solid #99f6e4', borderRadius: '10px', padding: '10px 12px' } },
                        // Header — type badge + excerpt + tenor/vehicle
                        e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' } },
                          e('span', { style: { fontSize: '9px', fontWeight: 800, color: m.type === 'simile' ? '#0891b2' : '#7c3aed', background: m.type === 'simile' ? '#cffafe' : '#ede9fe', padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em' } }, m.type || 'metaphor'),
                          e('span', { style: { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#1e293b', fontStyle: 'italic' } }, '"' + (m.excerpt || '') + '"')
                        ),
                        e('div', { style: { fontSize: '10px', color: '#475569', marginBottom: url ? '8px' : '6px' } },
                          e('strong', null, 'Tenor: '), (m.tenor || '—'), '  ',
                          e('strong', null, 'Vehicle: '), (m.vehicle || '—')
                        ),
                        // Generate / View / Re-roll button
                        !url && e('button', { onClick: function () { visualizeMetaphor(m); }, disabled: loading,
                          'aria-busy': loading ? 'true' : 'false',
                          'aria-label': loading ? 'Visualizing ' + (m.vehicle || m.excerpt) : 'Visualize "' + (m.excerpt || '') + '"',
                          style: { padding: '5px 12px', borderRadius: '6px', border: 'none', background: loading ? '#cbd5e1' : '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }
                        }, loading ? '⏳ Painting…' : '🎨 Visualize'),
                        // Image + edit row
                        url && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                          e('img', { src: url, alt: 'AI rendering of: ' + (m.vehicle || m.excerpt), style: { width: '100%', maxWidth: '400px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'block', opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' } }),
                          // Edit row (only if image-edit is wired)
                          onCallGeminiImageEdit && e('div', { style: { display: 'flex', gap: '6px', alignItems: 'stretch', flexWrap: 'wrap' } },
                            e('input', {
                              type: 'text', value: edit,
                              onChange: function (ev) {
                                var v = ev.target.value;
                                setMetaphorEditText(function (prev) { var n = Object.assign({}, prev); n[m.id] = v; return n; });
                              },
                              onKeyDown: function (ev) { if (ev.key === 'Enter' && edit.trim() && !loading) { ev.preventDefault(); refineMetaphorImage(m); } },
                              placeholder: 'Tweak this image (e.g. "make it sunset", "add stars")',
                              'aria-label': 'Image edit instruction for ' + (m.vehicle || m.excerpt),
                              disabled: loading,
                              style: { flex: 1, minWidth: '140px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '11px', outline: 'none', background: '#fff' }
                            }),
                            e('button', { onClick: function () { refineMetaphorImage(m); }, disabled: loading || !edit.trim(),
                              'aria-busy': loading ? 'true' : 'false',
                              'aria-label': 'Apply edit to image',
                              style: { padding: '5px 12px', borderRadius: '6px', border: 'none', background: loading || !edit.trim() ? '#cbd5e1' : '#0891b2', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: loading || !edit.trim() ? 'not-allowed' : 'pointer' }
                            }, loading ? '⏳' : '✨ Edit')
                          ),
                          e('button', { onClick: function () { visualizeMetaphor(m); }, disabled: loading,
                            'aria-label': 'Re-roll the image with same prompt',
                            style: { padding: '4px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#475569', fontSize: '10px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', alignSelf: 'flex-start' }
                          }, loading ? '⏳' : '🔄 Re-roll')
                        )
                      );
                    })
                  ),
                  !metaphors && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, fontStyle: 'italic' } }, 'Find metaphors and similes in your poem, then see them rendered as images. Edit the images to refine your figurative language.')
                ),

                // ── Mood Board: one image per stanza ──
                onCallImagen && e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' } },
                    e('h4', { style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🎬 Mood Board'),
                    e('button', { onClick: generateMoodBoard, disabled: !poemText.trim() || stanzaBoardLoading,
                      'aria-busy': stanzaBoardLoading ? 'true' : 'false',
                      'aria-label': stanzaBoardLoading ? 'Building mood board, please wait' : (stanzaImages.length > 0 ? 'Rebuild mood board' : 'Build mood board for this poem'),
                      style: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: poemText.trim() && !stanzaBoardLoading ? TEAL : '#cbd5e1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: poemText.trim() && !stanzaBoardLoading ? 'pointer' : 'not-allowed' }
                    }, stanzaBoardLoading ? '⏳…' : (stanzaImages.length > 0 ? '🔄 Rebuild' : '🎬 Build'))
                  ),
                  // Active board — horizontal scroll grid of stanza cards
                  stanzaImages.length > 0 && e('div', { role: 'list', 'aria-label': 'Mood board: one image per stanza', style: { display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 2px 8px', scrollSnapType: 'x mandatory' } },
                    stanzaImages.map(function (s, si) {
                      return e('div', { key: si, role: 'listitem', style: { flex: '0 0 220px', scrollSnapAlign: 'start', background: '#fff', border: '1px solid #99f6e4', borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' } },
                        // Stanza number + text preview
                        e('div', { style: { fontSize: '10px', fontWeight: 800, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Stanza ' + (si + 1)),
                        e('p', { style: { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#1e293b', margin: 0, lineHeight: 1.5, maxHeight: '4.5em', overflow: 'hidden', textOverflow: 'ellipsis' } }, s.text.split('\n').slice(0, 3).join(' / ')),
                        // Image slot — skeleton when loading, error state, or rendered image
                        s.loading
                          ? e('div', { 'aria-busy': 'true', 'aria-label': 'Rendering stanza ' + (si + 1), style: { width: '100%', aspectRatio: '1', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' } }, '⏳')
                          : s.url
                            ? e('img', { src: s.url, alt: 'AI rendering of stanza ' + (si + 1) + ': ' + s.text.split('\n')[0], style: { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', display: 'block' } })
                            : e('div', { style: { width: '100%', aspectRatio: '1', background: '#fef2f2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', padding: '8px' } }, s.error ? 'Failed to render' : 'No image yet'),
                        // Per-stanza re-roll
                        e('button', { onClick: function () { rerollStanzaImage(si); }, disabled: s.loading,
                          'aria-label': 'Re-roll stanza ' + (si + 1) + ' image',
                          style: { padding: '3px 8px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#475569', fontSize: '10px', fontWeight: 700, cursor: s.loading ? 'wait' : 'pointer', alignSelf: 'flex-start' }
                        }, s.loading ? '⏳' : '🔄 Re-roll')
                      );
                    })
                  ),
                  stanzaImages.length === 0 && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, fontStyle: 'italic' } }, 'See your poem\'s mood arc — one AI image per stanza, scrollable as a series. Separate stanzas with a blank line.')
                ),

                // ── Spark Words ──
                e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' } },
                    e('h4', { style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🎲 Spark Words'),
                    e('button', { onClick: generateSparks, disabled: sparkLoading,
                      'aria-busy': sparkLoading ? 'true' : 'false',
                      'aria-label': sparkLoading ? 'Generating spark words' : (sparkWords ? 'Generate 5 fresh spark words' : 'Generate 5 spark words'),
                      style: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: sparkLoading ? '#cbd5e1' : TEAL, color: '#fff', fontSize: '11px', fontWeight: 700, cursor: sparkLoading ? 'wait' : 'pointer' }
                    }, sparkLoading ? '⏳…' : (sparkWords ? '🔄 Re-roll' : '🎲 Roll'))
                  ),
                  sparkWords && Array.isArray(sparkWords) && sparkWords.length > 0 && e('div', { role: 'region', 'aria-live': 'polite', style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                    sparkWords.map(function (w, wi) {
                      return e('button', { key: wi, onClick: function () { copyRhyme(w); },
                        'aria-label': 'Spark word ' + w + ' — copy to clipboard',
                        style: { padding: '4px 12px', background: TEAL_LIGHT, border: '1px solid #99f6e4', borderRadius: '14px', fontSize: '13px', cursor: 'pointer', color: TEAL_DARK, fontFamily: 'Georgia, serif' }
                      }, w);
                    })
                  ),
                  !sparkWords && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, fontStyle: 'italic' } }, 'Stuck? Get 5 vivid concrete words to seed an image.')
                )
              )
            )
          ),

          // ── FEEDBACK TAB ──
          activeTab === 'feedback' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' } },
            e('h3', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, '✨ AI Feedback'),
            !poemText.trim() && e('p', { style: { color: '#475569', fontSize: '13px', margin: 0 } }, 'Write a poem in the Write tab first, then come back for feedback.'),

            // ── Pre-Feedback Self-Assessment ──
            // Optional but encouraged: rate your own poem on 5 craft criteria first,
            // so you have a metacognitive baseline before the AI weighs in.
            poemText.trim() && !selfAssessmentSubmitted && e('div', { role: 'region', 'aria-label': 'Self-Assessment', style: { background: 'linear-gradient(135deg, #faf5ff, #eef2ff)', border: '2px solid #d8b4fe', borderRadius: '12px', padding: '14px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' } },
                e('div', null,
                  e('h4', { style: { fontSize: '13px', fontWeight: 800, color: '#7c3aed', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' } },
                    e('span', { 'aria-hidden': 'true' }, '⭐'), 'Rate yourself first'
                  ),
                  e('p', { style: { fontSize: '11px', color: '#6b21a8', margin: '2px 0 0' } }, 'Score your own poem on these 5 craft moves before the AI does. Builds reflection.')
                ),
                e('button', {
                  onClick: function () { setSelfAssessmentSubmitted(true); announcePT('Self-assessment skipped. AI feedback unlocked.'); },
                  'aria-label': 'Skip self-assessment',
                  style: { fontSize: '10px', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }
                }, 'Skip')
              ),
              e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' } },
                POETRY_RUBRIC_CRITERIA.map(function (c) {
                  var val = selfAssessment[c.id] || 3;
                  return e('div', { key: c.id, style: { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '6px 10px', flexWrap: 'wrap' } },
                    e('div', { style: { flex: 1, minWidth: 0 } },
                      e('label', { htmlFor: 'pt-self-' + c.id, style: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#581c87' } }, c.label),
                      e('p', { style: { fontSize: '10px', color: '#6b21a8', margin: '1px 0 0', fontStyle: 'italic' } }, c.desc)
                    ),
                    e('input', {
                      id: 'pt-self-' + c.id, type: 'range', min: '1', max: '5', step: '1', value: val,
                      onChange: function (ev) {
                        var v = parseInt(ev.target.value, 10);
                        setSelfAssessment(function (prev) { var n = Object.assign({}, prev); n[c.id] = v; return n; });
                      },
                      'aria-label': 'Self-rating for ' + c.label + ': ' + val + ' out of 5',
                      style: { width: '110px', accentColor: '#7c3aed' }
                    }),
                    e('div', { style: { background: '#ede9fe', color: '#6b21a8', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', minWidth: '36px', textAlign: 'center' } }, val + '/5')
                  );
                })
              ),
              e('button', {
                onClick: function () {
                  // Fill in any unset criteria with the default 3 so synthesis can read consistent shape.
                  var filled = {};
                  POETRY_RUBRIC_CRITERIA.forEach(function (c) { filled[c.id] = selfAssessment[c.id] || 3; });
                  setSelfAssessment(filled);
                  setSelfAssessmentSubmitted(true);
                  announcePT('Self-assessment submitted. You can now get AI feedback.');
                  if (typeof addToast === 'function') addToast('Self-assessment saved!', 'success');
                },
                'aria-label': 'Submit self-assessment',
                style: { marginTop: '8px', padding: '7px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }
              }, '✓ Submit Self-Assessment')
            ),
            // Self-assessment summary card after submit
            poemText.trim() && selfAssessmentSubmitted && Object.keys(selfAssessment).length > 0 && e('div', { style: { background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
              e('div', { style: { fontSize: '11px', color: '#6b21a8' } },
                e('strong', null, '⭐ Your self-rating: '),
                POETRY_RUBRIC_CRITERIA.map(function (c, i) {
                  return c.label.split(' ')[0] + ' ' + (selfAssessment[c.id] || 3) + (i < POETRY_RUBRIC_CRITERIA.length - 1 ? ' · ' : '');
                }).join('')
              ),
              e('button', {
                onClick: function () { setSelfAssessmentSubmitted(false); },
                'aria-label': 'Edit self-assessment',
                style: { fontSize: '10px', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }
              }, 'Edit')
            ),

            poemText.trim() && e('button', { onClick: getAiFeedback, disabled: aiLoading, 'aria-busy': aiLoading,
              'aria-busy': aiLoading ? 'true' : 'false',
              'aria-label': aiLoading ? 'Getting feedback, please wait' : 'Get AI feedback on this poem',
              style: { padding: '10px 18px', background: aiLoading ? '#cbd5e1' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: aiLoading ? 'wait' : 'pointer', alignSelf: 'flex-start' }
            }, aiLoading ? '⏳ Reading your poem…' : '✨ Get feedback'),
            aiFeedback && aiFeedback.error && e('p', { style: { color: '#b91c1c', fontSize: '12px', fontStyle: 'italic' } }, aiFeedback.error),
            aiFeedback && !aiFeedback.error && e('div', { role: 'region', 'aria-label': 'AI feedback', 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              aiFeedback.strongestLine && e('div', { style: { background: '#f0fdf4', borderRadius: '10px', padding: '12px', border: '1px solid #86efac' } },
                e('h4', { style: { fontSize: '11px', fontWeight: 800, color: '#166534', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Strongest line'),
                e('p', { style: { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1e293b', margin: '0 0 6px', fontStyle: 'italic' } }, '"' + aiFeedback.strongestLine + '"'),
                aiFeedback.strongestWhy && e('p', { style: { fontSize: '12px', color: '#166534', margin: 0 } }, aiFeedback.strongestWhy)
              ),
              aiFeedback.imagery && e('div', { style: { background: TEAL_LIGHT, borderRadius: '10px', padding: '12px', border: '1px solid #99f6e4' } },
                e('h4', { style: { fontSize: '11px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Imagery'),
                e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, aiFeedback.imagery)
              ),
              aiFeedback.formNotes && e('div', { style: { background: '#fffbeb', borderRadius: '10px', padding: '12px', border: '1px solid #fde68a' } },
                e('h4', { style: { fontSize: '11px', fontWeight: 800, color: '#78350f', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Form'),
                e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, aiFeedback.formNotes)
              ),
              aiFeedback.suggestion && e('div', { style: { background: '#faf5ff', borderRadius: '10px', padding: '12px', border: '1px solid #d8b4fe' } },
                e('h4', { style: { fontSize: '11px', fontWeight: 800, color: '#581c87', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'One revision idea'),
                e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, aiFeedback.suggestion)
              ),
              aiFeedback.encouragement && e('p', { style: { fontSize: '13px', color: '#475569', fontStyle: 'italic', margin: '4px 0 0', textAlign: 'center' } }, aiFeedback.encouragement)
            ),
            // ── Mentor Match: pair student's poem with a public-domain master poem ──
            poemText.trim() && onCallGemini && e('div', { style: { background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: '12px', padding: '14px', marginTop: '4px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' } },
                e('div', { style: { flex: 1, minWidth: '180px' } },
                  e('h4', { style: { fontSize: '13px', fontWeight: 800, color: '#86198f', margin: 0 } }, '🎓 Mentor Match'),
                  e('p', { style: { fontSize: '11px', color: '#475569', margin: '2px 0 0' } }, 'Sit with a master poet on a similar theme. Read theirs, then come back to yours.')
                ),
                e('button', { onClick: findMentorPoem,
                  disabled: mentorLoading,
                  'aria-busy': mentorLoading ? 'true' : 'false',
                  'aria-label': mentorLoading ? 'Finding a mentor poem, please wait' : (mentorMatch ? 'Find a different mentor poem' : 'Find a mentor poem'),
                  style: { padding: '7px 14px', background: mentorLoading ? '#cbd5e1' : '#a21caf', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: mentorLoading ? 'wait' : 'pointer' }
                }, mentorLoading ? '⏳ Searching…' : (mentorMatch ? '🔄 Find another' : '🎓 Find a mentor'))
              ),
              mentorMatch && mentorMatch.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: '6px 0 0' } }, mentorMatch.error),
              mentorMatch && !mentorMatch.error && e('div', { role: 'region', 'aria-label': 'Mentor poem and analysis', 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' } },
                // Mentor poem card
                mentorMatch.mentor && e('article', { style: { background: '#fff', border: '1px solid #f5d0fe', borderRadius: '10px', padding: '14px' } },
                  e('header', { style: { marginBottom: '8px' } },
                    e('h5', { style: { fontSize: '14px', fontWeight: 800, color: '#86198f', margin: 0 } }, mentorMatch.mentor.title || 'Untitled'),
                    e('p', { style: { fontSize: '11px', color: '#475569', margin: '2px 0 0', fontStyle: 'italic' } }, '— ' + (mentorMatch.mentor.author || 'Unknown') + (mentorMatch.mentor.year ? ', ' + mentorMatch.mentor.year : '') + ' (public domain)')
                  ),
                  mentorMatch.mentor.uncertain
                    ? e('p', { style: { fontSize: '12px', color: '#475569', fontStyle: 'italic', margin: 0, padding: '8px 10px', background: '#fefce8', borderRadius: '6px', borderLeft: '3px solid #facc15' } }, 'The mentor recommends this poem but couldn\'t verify the exact text — use the link below to read the original.')
                    : e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: largeText ? '15px' : '14px', color: '#1e293b', margin: 0, lineHeight: largeText ? 1.85 : 1.7 } }, mentorMatch.mentor.text || ''),
                  // Source URL (when search grounded the recommendation) — student can click to verify / read full poem
                  mentorMatch.mentor.sourceUrl && e('p', { style: { fontSize: '11px', margin: '10px 0 0' } },
                    e('a', { href: mentorMatch.mentor.sourceUrl, target: '_blank', rel: 'noopener noreferrer',
                      'aria-label': 'Open the source for ' + (mentorMatch.mentor.title || 'this poem') + ' in a new tab',
                      style: { color: '#86198f', textDecoration: 'underline', fontWeight: 700 }
                    }, '🔗 Read full poem at source ↗')
                  ),
                  // Grounding disclosure — tells the user whether the recommendation came from real search results or canonical-only fallback
                  mentorMatch._grounding && e('p', { style: { fontSize: '10px', color: '#64748b', margin: '8px 0 0', fontStyle: 'italic' } },
                    mentorMatch._grounding.searchUsed
                      ? '✓ Verified via web search (' + mentorMatch._grounding.resultCount + ' candidates considered, keyword search: "' + mentorMatch._grounding.keywords + '")'
                      : 'ℹ Web search unavailable; recommendation drawn from canonical public-domain poets only.'
                  )
                ),
                // Analysis cards
                mentorMatch.sharedTheme && e('div', { style: { background: '#fff', border: '1px solid #f5d0fe', borderRadius: '10px', padding: '10px 12px' } },
                  e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#86198f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' } }, '🔗 What you share'),
                  e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, mentorMatch.sharedTheme)
                ),
                mentorMatch.craftToBorrow && e('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 12px' } },
                  e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' } }, '🛠️ Craft move to borrow'),
                  e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, mentorMatch.craftToBorrow)
                ),
                mentorMatch.studentEcho && e('div', { style: { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 12px' } },
                  e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' } }, '✨ You\'re already doing this'),
                  e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, mentorMatch.studentEcho)
                )
              )
            ),

            // ── Revision Plan Capstone (gated on ≥2 helpers) ──
            // Only appears after the student has run at least 2 helpers — otherwise
            // there's nothing meaningful to synthesize. Pulls from Senses, Sound
            // Devices, Mentor Match, Stronger Verbs, Theme Tracker, AI Feedback,
            // and Self-Assessment.
            poemText.trim() && helpersAvailableForPlan() && e('div', { role: 'region', 'aria-label': 'Revision Plan synthesis', style: { background: 'linear-gradient(135deg, #faf5ff, #fff7ed)', border: '2px solid #c4b5fd', borderRadius: '12px', padding: '14px', marginTop: '4px' } },
              e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' } },
                e('div', null,
                  e('h4', { style: { fontSize: '13px', fontWeight: 800, color: '#6d28d9', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' } },
                    e('span', { 'aria-hidden': 'true' }, '🗺️'), 'Revision Plan'
                  ),
                  e('p', { style: { fontSize: '11px', color: '#5b21b6', margin: '2px 0 0' } }, 'Pulls from your helpers above into ONE prioritized 3-task plan.')
                ),
                e('button', {
                  onClick: synthesizeRevisionPlan, disabled: revisionPlanLoading,
                  'aria-busy': revisionPlanLoading ? 'true' : 'false',
                  'aria-label': revisionPlanLoading ? 'Synthesizing revision plan' : (revisionPlan && !revisionPlan.error ? 'Re-synthesize revision plan' : 'Build a revision plan'),
                  style: { padding: '7px 14px', background: revisionPlanLoading ? '#cbd5e1' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: revisionPlanLoading ? 'wait' : 'pointer' }
                }, revisionPlanLoading ? '⏳ Synthesizing…' : (revisionPlan && !revisionPlan.error ? '🔄 Rebuild' : '🗺️ Build plan'))
              ),
              revisionPlan && revisionPlan.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: '6px 0 0' } }, revisionPlan.error),
              revisionPlan && !revisionPlan.error && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' } },
                revisionPlan.encouragement && e('div', { style: { background: '#fff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 10px' } },
                  e('p', { style: { fontSize: '11px', color: '#166534', margin: 0, lineHeight: 1.6 } }, '✨ ' + revisionPlan.encouragement)
                ),
                e('ol', { 'aria-label': 'Prioritized revision tasks', style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' } },
                  (revisionPlan.tasks || []).map(function (t, ti) {
                    return e('li', { key: ti, style: { background: '#fff', border: '2px solid #d8b4fe', borderRadius: '10px', padding: '10px 12px' } },
                      e('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start' } },
                        e('div', { 'aria-hidden': 'true', style: { background: '#7c3aed', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 } }, ti + 1),
                        e('div', { style: { minWidth: 0, flex: 1 } },
                          e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' } },
                            e('h5', { style: { fontSize: '12px', fontWeight: 800, color: '#581c87', margin: 0 } }, t.title || 'Task ' + (ti + 1)),
                            t.source && e('span', { style: { fontSize: '9px', fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '2px 6px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, t.source)
                          ),
                          t.detail && e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.55 } }, t.detail),
                          t.why && e('p', { style: { fontSize: '11px', color: '#6b21a8', margin: '4px 0 0', fontStyle: 'italic' } }, t.why)
                        )
                      )
                    );
                  })
                )
              ),
              !revisionPlan && e('p', { style: { fontSize: '11px', color: '#5b21b6', fontStyle: 'italic', margin: '6px 0 0' } }, 'Click "Build plan" to weave your helper outputs into one prioritized next step.')
            )
          ),

          // ── PERFORM TAB ──
          activeTab === 'perform' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' } },
            e('h3', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, '🎙️ Perform'),
            !poemText.trim() && e('p', { style: { color: '#475569', fontSize: '13px', margin: 0 } }, 'Write a poem first.'),
            poemText.trim() && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              // Poem display
              e('div', { style: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', minHeight: '200px' } },
                poemTitle && e('h4', { style: { fontFamily: 'Georgia, serif', fontSize: largeText ? '20px' : '17px', fontWeight: 800, color: '#1e293b', margin: '0 0 12px', textAlign: 'center' } }, poemTitle),
                e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: largeText ? 'system-ui, -apple-system, sans-serif' : 'Georgia, serif', fontSize: largeText ? '17px' : '15px', color: '#1e293b', margin: 0, lineHeight: largeText ? 1.85 : 1.7, letterSpacing: largeText ? '0.02em' : 'normal' } }, poemText)
              ),
              // Emotion picker
              e('div', null,
                e('label', { style: { fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' } }, 'Reading mood'),
                e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                  ['neutral', 'somber', 'joyful', 'urgent', 'contemplative'].map(function (em) {
                    var sel = emotion === em;
                    return e('button', { key: em, onClick: function () { setEmotion(em); },
                      'aria-pressed': sel ? 'true' : 'false',
                      'aria-label': 'Reading mood: ' + em,
                      style: { padding: '4px 10px', borderRadius: '14px', border: '1px solid ' + (sel ? TEAL : '#d1d5db'), background: sel ? TEAL_LIGHT : '#fff', color: sel ? TEAL_DARK : '#475569', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
                    }, em);
                  })
                )
              ),
              // Controls
              e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                !ttsPlaying
                  ? e('button', { onClick: playPoem, disabled: !onCallTTS,
                      autoFocus: true,
                      
                      style: { padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: onCallTTS ? 'pointer' : 'not-allowed', opacity: onCallTTS ? 1 : 0.5 }
                    }, '▶ Play')
                  : e('button', { onClick: stopPoem, 'aria-label': 'Stop playback',
                      style: { padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }
                    }, '⏹ Stop'),
                // Image Poem: primary "Imagine It" button shown only when this form is active.
                onCallImagen && form && form.id === 'image-poem' && e('button', { onClick: generateImagePoem, disabled: imagePoemLoading || !poemText.trim(),
                  'aria-busy': imagePoemLoading ? 'true' : 'false',
                  'aria-label': imagePoemLoading ? 'Rendering image poem, please wait' : (imagePoemUrl ? 'Re-render the image poem' : 'Render the poem as an image'),
                  style: { padding: '10px 18px', background: imagePoemLoading ? '#cbd5e1' : (poemText.trim() ? '#7c3aed' : '#cbd5e1'), color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: imagePoemLoading || !poemText.trim() ? 'not-allowed' : 'pointer' }
                }, imagePoemLoading ? '⏳ Imagining…' : (imagePoemUrl ? '🔄 Re-imagine' : '🖼️ Imagine It')),
                onCallImagen && e('button', { onClick: generateIllustration, disabled: illusLoading,
                  'aria-busy': illusLoading ? 'true' : 'false',
                  'aria-label': illusLoading ? 'Generating illustration, please wait' : 'Generate illustration with AI',
                  style: { padding: '10px 16px', background: illusLoading ? '#cbd5e1' : '#a78bfa', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: illusLoading ? 'wait' : 'pointer' }
                }, illusLoading ? '⏳ Painting…' : '🎨 Illustrate'),
                e('button', { onClick: startReadAloud, disabled: !poemText.trim() || readCountdown > 0,
                  'aria-label': 'Read aloud yourself in large-text recital mode',
                  style: { padding: '10px 16px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: poemText.trim() && !readCountdown ? 'pointer' : 'not-allowed', opacity: poemText.trim() ? 1 : 0.5 }
                }, readCountdown > 0 ? ('… ' + readCountdown) : '🎤 Read aloud'),
                e('button', { onClick: printBroadside, disabled: !poemText.trim(),
                  'aria-label': 'Open a printable broadside of this poem in a new window',
                  style: { padding: '10px 16px', background: '#fff', color: '#0d9488', border: '1px solid #0d9488', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: poemText.trim() ? 'pointer' : 'not-allowed', opacity: poemText.trim() ? 1 : 0.5 }
                }, '🖨️ Broadside')
              ),
              // Image Poem result — rendered as a primary first-class output, not a sidebar decoration.
              imagePoemUrl && form && form.id === 'image-poem' && e('figure', { style: { margin: 0, borderRadius: '12px', overflow: 'hidden', border: '2px solid #c4b5fd', background: 'linear-gradient(135deg, #faf5ff, #ede9fe)' } },
                e('img', { src: imagePoemUrl, alt: 'AI rendering of your image poem' + (poemTitle ? ' titled ' + poemTitle : ''), style: { width: '100%', display: 'block' } }),
                e('figcaption', { style: { padding: '10px 14px', fontSize: '11px', color: '#5b21b6', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
                  e('span', null, '🖼️ Your poem, made visible. Edit your words and re-imagine to see how the image changes.'),
                  e('button', { onClick: function () { setImagePoemUrl(null); announcePT('Image poem cleared.'); },
                    'aria-label': 'Clear the rendered image poem',
                    style: { fontSize: '10px', color: '#7c3aed', background: 'none', border: '1px solid #c4b5fd', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontWeight: 700 }
                  }, 'Clear')
                )
              ),
              illustration && e('div', { style: { borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' } },
                e('img', { src: illustration, alt: 'Illustration for the poem ' + (poemTitle || 'Untitled'), style: { width: '100%', display: 'block' } })
              )
            )
          ),

          // ── Read-aloud overlay (full-screen line-by-line, student paces themselves) ──
          (readAloudActive || readCountdown > 0) && (function () {
            var allLines = poemText.split('\n');
            var line = readAloudActive ? (allLines[readIdx] || '') : '';
            var totalLines = allLines.filter(function (l) { return l.trim(); }).length;
            var currentNonBlankIdx = allLines.slice(0, readIdx + 1).filter(function (l) { return l.trim(); }).length;
            return e('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Read-aloud recital mode',
              onClick: function () { if (readAloudActive) advanceReadAloud(); },
              onKeyDown: function (ev) {
                if (!readAloudActive) return;
                if (ev.key === 'Escape') { ev.preventDefault(); stopReadAloud(); }
                else if (ev.key === 'ArrowRight' || ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); advanceReadAloud(); }
                else if (ev.key === 'ArrowLeft') { ev.preventDefault(); rewindReadAloud(); }
              },
              tabIndex: 0,
              style: { position: 'fixed', inset: 0, zIndex: 70, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '40px', cursor: readAloudActive ? 'pointer' : 'default' }
            },
              // Countdown
              readCountdown > 0 && e('div', { style: { fontSize: '120px', fontWeight: 900, color: '#0d9488', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }, 'aria-live': 'assertive' }, readCountdown),
              // Active line
              readAloudActive && e('div', { style: { width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' } },
                // Top bar
                e('div', { onClick: function (ev) { ev.stopPropagation(); }, style: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' } },
                  e('span', { style: { color: '#94a3b8', fontSize: '13px', fontFamily: 'system-ui, sans-serif' } }, (poemTitle || 'Untitled') + (studentNickname ? ' · ' + studentNickname : '')),
                  e('span', { style: { color: '#94a3b8', fontSize: '12px', fontFamily: 'system-ui, sans-serif' } }, currentNonBlankIdx + ' / ' + totalLines)
                ),
                // Line display
                e('p', { style: { fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 5vw, 56px)', color: '#fff', margin: 0, lineHeight: 1.4, textAlign: 'center', maxWidth: '100%', wordWrap: 'break-word' }, 'aria-live': 'polite' },
                  line.trim() ? line : '— pause —'
                ),
                // Hint + controls (don't propagate clicks to advance)
                e('div', { onClick: function (ev) { ev.stopPropagation(); }, style: { display: 'flex', gap: '14px', alignItems: 'center', cursor: 'default' } },
                  e('button', { onClick: rewindReadAloud, 
                    style: { padding: '8px 14px', background: 'transparent', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
                  }, '◀ Back'),
                  e('button', { onClick: advanceReadAloud, autoFocus: true, 
                    style: { padding: '12px 28px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }
                  }, 'Next ▶'),
                  e('button', { onClick: stopReadAloud, 'aria-label': 'Exit read-aloud mode',
                    style: { padding: '8px 14px', background: 'transparent', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
                  }, '✕ Done')
                ),
                e('p', { style: { color: '#cbd5e1', fontSize: '11px', fontFamily: 'system-ui, sans-serif', margin: 0, textAlign: 'center' } }, 'Tap or press Space to advance · ← / → to step · Esc to exit')
              )
            );
          })(),

          // ── LIBRARY (SHARE) TAB ──
          activeTab === 'share' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' } },
            e('h3', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, '📚 Library'),
            saved.length === 0
              ? e('p', { style: { color: '#475569', fontSize: '13px', fontStyle: 'italic' } }, 'No poems saved yet. Save one from the Write tab to see it here.')
              : (function () {
                  // Compute which forms are represented in saved poems for the filter dropdown
                  var formsInLibrary = {};
                  saved.forEach(function (p) { formsInLibrary[p.formId || 'free'] = (formsInLibrary[p.formId || 'free'] || 0) + 1; });
                  var formIdsRepresented = Object.keys(formsInLibrary);
                  var filterCount = chapbookFilter ? (formsInLibrary[chapbookFilter] || 0) : saved.length;
                  return e('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                    // Print Chapbook panel
                    e('div', { style: { background: TEAL_LIGHT, border: '1px solid #99f6e4', borderRadius: '10px', padding: '12px' } },
                      e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
                        e('div', { style: { flex: 1, minWidth: '180px' } },
                          e('h4', { style: { fontSize: '13px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, '📖 Print as a chapbook'),
                          e('p', { style: { fontSize: '11px', color: '#475569', margin: '2px 0 0' } }, 'Cover, table of contents, and one page per poem. Print to paper or save as PDF.')
                        ),
                        formIdsRepresented.length > 1 && e('select', { value: chapbookFilter,
                          onChange: function (ev) { setChapbookFilter(ev.target.value); },
                          'aria-label': 'Filter chapbook by form',
                          style: { padding: '5px 8px', borderRadius: '6px', border: '1px solid #99f6e4', fontSize: '12px', background: '#fff' }
                        },
                          e('option', { value: '' }, 'All poems (' + saved.length + ')'),
                          formIdsRepresented.map(function (fid) {
                            var f = FORMS.find(function (ff) { return ff.id === fid; });
                            return e('option', { key: fid, value: fid }, (f ? f.icon + ' ' + f.name : 'Free verse') + ' (' + formsInLibrary[fid] + ')');
                          })
                        ),
                        e('button', { onClick: function () { printChapbook(chapbookFilter); },
                          'aria-label': 'Print chapbook of ' + filterCount + ' poems',
                          disabled: filterCount === 0,
                          style: { padding: '8px 14px', background: filterCount > 0 ? TEAL : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: filterCount > 0 ? 'pointer' : 'not-allowed' }
                        }, '🖨️ Print ' + filterCount + ' poem' + (filterCount === 1 ? '' : 's'))
                      )
                    ),
                    // Theme Tracker panel — patterns across saved poems (3+ required for meaningful analysis)
                    onCallGemini && e('div', { style: { background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '12px' } },
                      e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
                        e('div', { style: { flex: 1, minWidth: '180px' } },
                          e('h4', { style: { fontSize: '13px', fontWeight: 800, color: '#581c87', margin: 0 } }, '🌿 Patterns across my poems'),
                          e('p', { style: { fontSize: '11px', color: '#475569', margin: '2px 0 0' } }, saved.length < 3
                            ? ('Save at least 3 poems first (' + saved.length + ' so far). Then come back to see what patterns are emerging.')
                            : 'A craft-only reflection: what images, sounds, and forms keep showing up.')
                        ),
                        e('button', { onClick: runThemeTracker,
                          disabled: saved.length < 3 || themeLoading,
                          'aria-busy': themeLoading ? 'true' : 'false',
                          'aria-label': themeLoading ? 'Analyzing patterns, please wait' : (saved.length < 3 ? 'Need at least 3 saved poems' : (themeReport ? 'Re-run pattern analysis' : 'Find patterns across all saved poems')),
                          style: { padding: '8px 14px', background: saved.length >= 3 && !themeLoading ? '#7c3aed' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: saved.length >= 3 && !themeLoading ? 'pointer' : 'not-allowed' }
                        }, themeLoading ? '⏳ Reading…' : (themeReport ? '🔄 Re-analyze' : '🌿 Find patterns'))
                      ),
                      themeReport && themeReport.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: '8px 0 0' } }, themeReport.error),
                      themeReport && !themeReport.error && e('div', { role: 'region', 'aria-label': 'Pattern analysis results', 'aria-live': 'polite', style: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
                        themeReport.celebration && e('div', { style: { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 12px' } },
                          e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' } }, '✨ Already strong'),
                          e('p', { style: { fontSize: '13px', color: '#166534', margin: 0, lineHeight: 1.6 } }, themeReport.celebration)
                        ),
                        themeReport.voiceStrength && e('div', { style: { background: '#fff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '10px 12px' } },
                          e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#581c87', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' } }, '🎙️ Your voice'),
                          e('p', { style: { fontSize: '13px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, themeReport.voiceStrength)
                        ),
                        themeReport.recurringImages && themeReport.recurringImages.length > 0 && e('div', { style: { background: '#fff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '10px 12px' } },
                          e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#581c87', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, '🖼️ Images that come back'),
                          e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                            themeReport.recurringImages.map(function (img, ii) {
                              return e('span', { key: ii, style: { padding: '2px 8px', background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '12px', fontSize: '12px', color: '#6b21a8', fontFamily: 'Georgia, serif', fontStyle: 'italic' } }, img);
                            })
                          )
                        ),
                        themeReport.recurringSounds && themeReport.recurringSounds.length > 0 && e('div', { style: { background: '#fff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '10px 12px' } },
                          e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#581c87', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, '🔊 Sound habits'),
                          e('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#374151', lineHeight: 1.6 } },
                            themeReport.recurringSounds.map(function (s, si) { return e('li', { key: si }, s); })
                          )
                        ),
                        themeReport.favoredForms && e('div', { style: { background: '#fff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '10px 12px' } },
                          e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#581c87', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' } }, '📐 Forms you choose'),
                          e('p', { style: { fontSize: '13px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, themeReport.favoredForms)
                        ),
                        themeReport.growthEdge && e('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px' } },
                          e('div', { style: { fontSize: '10px', fontWeight: 800, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' } }, '🌱 Try next'),
                          e('p', { style: { fontSize: '13px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, themeReport.growthEdge)
                        )
                      )
                    ),
                    // Saved poem list
                    e('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                      saved.map(function (p) {
                    var f = FORMS.find(function (ff) { return ff.id === p.formId; });
                    return e('div', { key: p.id, style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px' } },
                      e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' } },
                        e('div', null,
                          e('h4', { style: { fontSize: '14px', fontWeight: 800, color: '#1e293b', margin: 0 } }, p.title),
                          e('p', { style: { fontSize: '10px', color: '#475569', margin: '2px 0 0' } },
                            (f ? f.icon + ' ' + f.name : 'Free verse') + ' · ' + new Date(p.savedAt).toLocaleDateString())
                        ),
                        e('div', { style: { display: 'flex', gap: '6px' } },
                          e('button', { onClick: function () { loadPoem(p); }, 'aria-label': 'Load ' + p.title, style: { padding: '4px 10px', background: TEAL, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, 'Open'),
                          e('button', { onClick: function () { if (confirm('Delete "' + p.title + '"?')) deletePoem(p.id); }, 'aria-label': 'Delete ' + p.title, style: { padding: '4px 10px', background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, 'Delete')
                        )
                      ),
                      e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '12px', color: '#374151', margin: 0, maxHeight: '120px', overflowY: 'auto', lineHeight: 1.5 } }, p.text.length > 320 ? p.text.slice(0, 320) + '…' : p.text)
                    );
                  })
                    )
                  );
                })()
          )
        )
      )
    );
  });

  // Expose to AlloFlow shell
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.PoetTree = PoetTree;
})();
