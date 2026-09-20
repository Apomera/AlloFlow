from pathlib import Path
import json,time
root=Path.cwd()
cases=[
dict(id='contact',title='Different amounts of contact',
 setup=dict(elementary='You like playing together every day. Your friend sometimes chooses quiet time or another game. You wonder how to stay friends.',middle='You enjoy frequent messages. Your friend replies less often and has family responsibilities and limited phone time.',high='You and a friend have different schedules, energy and access to devices. The amount of contact that works for one of you feels difficult for the other.'),
 notice='Different availability does not by itself tell you how much someone cares. Caring can take different forms; equal numbers of messages are not the goal.',
 model=dict(elementary='Would you like to choose a game together sometimes? It is okay to want quiet time too.',middle='What kind of check-in works for you? I would like to stay connected without expecting quick replies.',high='Could we find a way to stay in touch that fits both our capacity and access? We can revisit it if it becomes too much.'),
 why='A flexible, mutually welcome plan can make expectations clearer. You can name your own needs without requiring the same communication style.',
 limit='Do not use reply speed or a contact quota to test loyalty. If the arrangement keeps leaving one person overwhelmed or unsupported, it can change or stop.',
 changed='You try a regular check-in, but the time repeatedly does not work for one person.',review='Ask whether a different format or less frequent contact would work, if discussion is welcome. You can also step back. Repeated reminders are not the same as mutual agreement.'),
dict(id='activities',title='Making shared time work',
 setup=dict(elementary='Your friend wants to play a noisy game. You like being with them, but that game is too loud for you.',middle='Your group keeps choosing an activity that costs more than you can spend. You want time together without having to explain private family details.',high='Friends repeatedly plan an activity that does not fit your transport, sensory or access needs. You want your preferences included without becoming responsible for every plan.'),
 notice='Taking turns is not enough if some options remain inaccessible. Friendship does not require you to ignore an access need or reveal private information.',
 model=dict(elementary='I want to play with you. This game is too loud for me. Could we try a quieter game?',middle='That plan does not work for me. Could we choose something free, or another way to spend time together?',high='I would like to join, but this format does not work for me. Could we share the planning and find an accessible option?'),
 why='A specific preference or alternative gives the group something practical to consider. Responsibility for making shared time work can be shared.',
 limit='You do not have to provide a diagnosis, pay more or repeatedly design every alternative. Others may decline an activity, and you may decline an inaccessible plan.',
 changed='The group says you can join only if you put up with the same barrier again.',review='That does not make the barrier disappear. You can decline, suggest a different plan if you want, or seek support with repeated exclusion. You do not need to prove friendship by enduring discomfort.'),
dict(id='support',title='Caring without carrying everything',
 setup=dict(elementary='A friend wants you to listen to a worry every playtime. You care, and you also need time to play and rest.',middle='A friend often asks for support late at night. You want to help, but you need sleep and cannot always reply.',high='A friend increasingly relies on you as their only support. You care about them, but the expectation of constant availability is becoming too much.'),
 notice='You can care and have limits. Being a friend does not make you responsible for solving every problem or being available all the time.',
 model=dict(elementary='I can listen for a little while. Then I need to play. Could we ask a grown-up to help too?',middle='I care about you, and I cannot keep messaging tonight. Is there a trusted person you can talk with as well?',high='I want you to have support, and I cannot be your only support or always be available. Could we think about other trusted people you can reach?'),
 why='A clear, realistic offer can show care without promising more than you can give. Asking for other support can be part of friendship.',
 limit='Respect ordinary privacy, but do not promise to keep concerns about someone being hurt or unsafe secret. You can seek adult help even if the friend is upset about it.',
 changed='Your friend says someone is hurting them and asks you not to tell anyone.',review='Tell a trusted adult who can help with safety; do not try to handle it alone. If the first adult does not help, try another. If someone is in immediate danger, seek nearby help now. You do not have to investigate or confront anyone.')
]
p=root/'sel_hub/sel_tool_friendship.js';s=p.read_text(encoding='utf-8')
marker='  // Authored practice examples; not a relationship assessment.'
assert marker in s
s=s.replace(marker,'  // Sustainable friendship care: examples, not relationship scores.\n  var KEEPING_PRACTICE = '+json.dumps(cases,indent=2,ensure_ascii=False)+';\n\n'+marker,1)
a=s.index('      // \u2500\u2500 Keeping Friends (journal + tips)'); b=s.index('      // \u2500\u2500 Friendship Repair',a)
ui=r'''      // ── Keeping Friends: sustainable care and an optional journal ──
      var keepContent = null;
      if (activeTab === 'keep') {
        var keepBand = ['elementary', 'middle', 'high'].indexOf(band) >= 0 ? band : 'middle';
        var keepObject = function(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; };
        var keepSelections = keepObject(d.keepingSelections);
        var keepSelected = keepSelections[keepBand];
        var keepExample = KEEPING_PRACTICE.find(function(item) { return item.id === keepSelected; }) || KEEPING_PRACTICE[0];
        var keepOwn = keepSelected === 'own';
        var keepContext = keepOwn ? 'own' : keepExample.id;
        var keepKey = keepBand + ':' + keepContext;
        var keepDrafts = keepObject(d.keepingDrafts);
        var keepDraft = keepObject(keepDrafts[keepKey]);
        var keepNote = function(key) { return typeof keepDraft[key] === 'string' ? keepDraft[key] : ''; };
        var saveKeep = function(values) { var drafts = Object.assign({}, keepDrafts); drafts[keepKey] = Object.assign({}, keepDraft, values); upd('keepingDrafts', drafts); };
        var keepSurface = _frHC ? '#000000' : _frDark ? '#0f172a' : '#ffffff';
        var keepInk = _frHC ? '#ffffff' : _frDark ? _frC('#0f172a') : '#1f2937';
        var keepEdge = _frHC ? '#ffff00' : _frDark ? '#94a3b8' : '#64748b';
        var keepCard = { padding: '16px', margin: '14px 0', border: '1px solid ' + keepEdge, borderRadius: '12px', background: keepSurface, color: keepInk, minWidth: 0 };
        var keepControl = { width: '100%', maxWidth: '100%', minHeight: '44px', boxSizing: 'border-box', padding: '10px', border: '1px solid ' + keepEdge, borderRadius: '8px', background: keepSurface, color: keepInk, font: 'inherit', fontSize: '16px' };
        var keepSummary = { minHeight: '44px', padding: '10px 0', boxSizing: 'border-box', fontWeight: 700, cursor: 'pointer' };
        var keepFields = [
          { id: 'needs', label: 'What matters, and what is workable for each person?', hint: 'Consider preferences, time, energy and access. You do not need to know or record private reasons.' },
          { id: 'care', label: 'What small act of care could fit?', hint: 'It could be shared time, a welcome check-in, a practical offer or respecting space. No one has to match the same number of actions.' },
          { id: 'boundary', label: 'What limit or support would make this sustainable?', hint: 'Think about what you can offer, what you cannot, and who else could help. A limit does not cancel care.' },
          { id: 'review', label: 'What would tell me to keep or change the plan?', hint: 'Look for respected boundaries and workable arrangements over time. A friendship is not a streak or a score.' }
        ];
        var keepField = function(field) {
          var id = 'fr-keep-' + field.id;
          return h('div', { key: field.id, style: { margin: '16px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'),
            h('p', { id: id + '-hint', style: { margin: '6px 0' } }, field.hint),
            h('textarea', { id: id, rows: 3, value: keepNote(field.id), 'aria-describedby': id + '-hint', style: Object.assign({}, keepControl, { resize: 'vertical' }),
              onChange: function(ev) { var values = {}; values[field.id] = ev.target.value; saveKeep(values); } }));
        };
        var keepPreview = ['A possible friendship-care plan — not an agreement made by the other person.', 'Context: ' + (keepOwn ? 'My own example' : keepExample.title)]
          .concat(keepFields.map(function(field) { return field.label + '\n' + (keepNote(field.id).trim() || '(No note yet)'); })).join('\n\n');
        // Retain the original array verbatim; malformed old records are not rendered as text.
        var keepJournalNotes = friendNotes.filter(function(note) { return note && typeof note === 'object' && typeof note.text === 'string'; });
        var keepAddJournal = function() {
          var text = newNote.trim();
          if (!text) return;
          upd({ friendNotes: [{ id: Date.now().toString(), text: text, date: new Date().toLocaleDateString() }].concat(friendNotes), newNote: '', keepingJournalNotice: 'Note added to your journal.' });
          if (soundEnabled) sfxHeart();
        };
        var keepJournalEntry = function(note, index) {
          return h('li', { key: index, style: { margin: '12px 0', padding: '12px 0', borderBottom: '1px solid ' + keepEdge, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } },
            h('div', { style: { fontWeight: 700 } }, typeof note.date === 'string' && note.date ? note.date : 'Saved note'), h('p', { style: { margin: '6px 0' } }, note.text));
        };
        keepContent = h('section', { role: 'region', 'aria-label': 'Keeping friendship practice', style: { padding: '16px', maxWidth: '720px', margin: '0 auto', background: keepSurface, color: keepInk, lineHeight: 1.6, overflowWrap: 'anywhere' } },
          h('h3', { style: { margin: '0 0 8px', fontSize: '22px' } }, 'Care that works for both people'),
          h('p', null, keepBand === 'elementary' ? 'Friends can care in different ways. You can enjoy time together and still need quiet, help or a different plan.' : 'Explore care, shared effort and boundaries without measuring friendship by messages, constant availability or keeping everyone happy.'),
          h('p', null, 'Use a fictional example or your own. Thinking through the choices is enough; every note is optional.'),
          h('label', { htmlFor: 'fr-keep-context', style: { display: 'block', fontWeight: 700 } }, 'Choose a friendship-care context'),
          h('select', { id: 'fr-keep-context', value: keepContext, style: keepControl, onChange: function(ev) { var choices = Object.assign({}, keepSelections); choices[keepBand] = ev.target.value; upd('keepingSelections', choices); } },
            KEEPING_PRACTICE.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); }), h('option', { value: 'own' }, 'My own example')),
          h('div', { key: keepKey, style: keepCard },
            h('h4', { style: { margin: '0 0 8px', fontSize: '18px' } }, keepOwn ? 'Consider what care could look like' : keepExample.title),
            h('p', null, keepOwn ? 'Notice what each person wants and what they can realistically offer. You can leave unknowns open and choose what you want to record.' : keepExample.setup[keepBand]),
            !keepOwn && h('p', null, keepExample.notice)),
          !keepOwn && h('details', { key: keepKey + '-example', style: keepCard },
            h('summary', { style: keepSummary }, 'Explore a possible plan and its limits'),
            h('p', { style: { fontWeight: 700 } }, keepExample.model[keepBand]), h('p', null, keepExample.why), h('p', null, keepExample.limit)),
          h('details', { key: keepKey + '-notes', style: keepCard },
            h('summary', { style: keepSummary }, 'Consider my own plan (optional)'),
            h('p', null, 'Planning notes stay with this context and grade level. They do not send a message, request help or show that another person agreed.'), keepFields.map(keepField)),
          h('details', { key: keepKey + '-review', style: keepCard },
            h('summary', { style: keepSummary }, 'Revisit if the plan stops working'),
            h('p', null, keepOwn ? 'What if someone needs more space, an activity stays inaccessible or the help needed is more than you can offer?' : keepExample.changed),
            h('p', null, keepOwn ? 'You can revise the plan, decline an activity or ask for support. If someone may be hurt or unsafe, tell a trusted adult rather than trying to manage it alone.' : keepExample.review)),
          h('details', { key: keepKey + '-preview', style: keepCard },
            h('summary', { style: keepSummary }, 'Review my plan text'),
            h('label', { htmlFor: 'fr-keep-preview', style: { display: 'block', fontWeight: 700 } }, 'Plan text to review or copy'),
            h('textarea', { id: 'fr-keep-preview', readOnly: true, rows: 9, value: keepPreview, style: Object.assign({}, keepControl, { resize: 'vertical' }) })),
          h('details', { key: 'friendship-journal', style: keepCard },
            h('summary', { style: keepSummary }, 'Friendship journal (optional)'),
            h('p', null, 'Your journal is shared across this tool\'s examples and grade levels. You can record a welcome moment, a difficulty, a boundary or a fictional reflection. It does not need to be positive or grateful. Notes are not monitored and do not request help.'),
            h('label', { htmlFor: 'fr-keep-journal', style: { display: 'block', fontWeight: 700 } }, 'Friendship journal entry'),
            h('input', { 'aria-label': 'Friendship journal entry', id: 'fr-keep-journal', type: 'text', value: newNote,
              onChange: function(ev) { upd({ newNote: ev.target.value, keepingJournalNotice: '' }); },
              onKeyDown: function(ev) { if (ev.key === 'Enter' && !ev.isComposing && !(ev.nativeEvent && ev.nativeEvent.isComposing) && ev.keyCode !== 229) { ev.preventDefault(); keepAddJournal(); } },
              placeholder: keepBand === 'elementary' ? 'Something I want to remember or think about...' : 'A real or fictional friendship reflection...', style: keepControl }),
            h('button', { type: 'button', 'aria-label': 'Add friendship journal entry', onClick: keepAddJournal, disabled: !newNote.trim(),
              style: Object.assign({}, keepControl, { width: 'auto', marginTop: '10px', fontWeight: 700, cursor: newNote.trim() ? 'pointer' : 'not-allowed', opacity: newNote.trim() ? 1 : 0.7 }) }, 'Save journal note'),
            h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, typeof d.keepingJournalNotice === 'string' ? d.keepingJournalNotice : ''),
            keepJournalNotes.length > 0 ? h('div', null,
              h('h4', { style: { fontSize: '18px' } }, 'Saved journal notes'),
              h('ol', { style: { paddingLeft: '22px' } }, keepJournalNotes.slice(0, 10).map(keepJournalEntry)),
              keepJournalNotes.length > 10 && h('details', null,
                h('summary', { style: keepSummary }, 'Earlier journal notes (' + (keepJournalNotes.length - 10) + ')'),
                h('ol', { start: 11, style: { paddingLeft: '22px' } }, keepJournalNotes.slice(10).map(keepJournalEntry))))
              : h('p', null, 'No readable journal notes yet. You can leave this empty.'))
        );
      }

'''
s=s[:a]+ui+s[b:]
lines=s.splitlines()
for i,line in enumerate(lines):
    if 'keep:    { accent:' in line:
        lines[i]="          keep:    { accent: '#fbbf24', soft: 'rgba(251,191,36,0.14)', icon: '\\uD83D\\uDC9B', title: 'Keeping \\u2014 care with room for limits', hint: 'Explore different capacities, accessible shared time and realistic support. Small acts of care should be welcome and workable; friendship is not a contact quota or a promise to be always available.' },"
s='\n'.join(lines)+'\n'
s=s.replace("friendStat('private notes', friendNotes.length", "friendStat('saved notes', friendNotes.length")
for target in [p,root/'desktop/web-app/public/sel_hub/sel_tool_friendship.js']:
    for attempt in range(5):
        try: target.write_bytes(s.encode('utf-8')); break
        except OSError:
            if attempt==4: raise
            time.sleep(1)
print('Updated Keeping practice, journal behavior and mirrored source.')
