from pathlib import Path
import json, time

root=Path.cwd()
cases=[
dict(id='move',title='When everyday time changes',
 setup=dict(elementary='Your friend moves to another school. You miss playing together at recess. You do not know when you will see each other.',middle='A close friend changes schools. Your usual lunch and bus routines no longer overlap, and staying in touch takes more planning.',high='A close friend moves away. Your schedules, transport and access to devices differ, so your old pattern of daily contact is no longer possible.'),
 notice='Less contact can reflect access and schedules. It does not tell you how much someone cares. You can miss the old routine and build support where you are.',
 options=[dict(id='contact',title='Explore a workable way to stay in touch',benefit='A small, mutually welcome plan can make contact more practical.',limit='Check access, time, family rules and whether both people want this. A reply schedule is not a test of loyalty; neither person owes constant availability.',
 words=dict(elementary='Could we ask our grown-ups about a way to say hello sometimes?',middle='Would an occasional check-in work for you? We can choose something that fits both our schedules.',high='Would you like to stay in touch in a way that fits our time and access? We can adjust if the plan is too much.')),
 dict(id='routine',title='Build support into the changed routine',benefit='A familiar activity or supportive person can help with the part of the day that changed.',limit='A new connection does not replace someone or erase missing them. You can try a small step without having to make a new best friend.',
 words=dict(elementary='Lunch feels different now. Can you help me find someone or something to do?',middle='The bus ride feels lonely. I could sit near someone I know or bring an activity I enjoy.',high='I miss our usual time together. I could plan a regular activity here while keeping space for that feeling.'))],
 changed='You both want contact, but the planned time repeatedly does not work.',review='Change the format or frequency if both people want to. You can also pause the plan. Look for something workable rather than counting replies as proof of caring.'),
dict(id='space',title='When someone asks for space',
 setup=dict(elementary='A friend says they want to play separately for now. You still share a classroom and feel sad and unsure about tomorrow.',middle='A friend asks for no messages for now. You share a lunch area and a group project, so you still need a way to manage school routines.',high='Someone you were close to asks for distance and no personal messages. You still share a class and mutual friends, which makes the change complicated.'),
 notice='The request for space is clear even if the reason or future is uncertain. You can have strong feelings and still respect that request.',
 options=[dict(id='respect',title='Respect space without seeking another reply',benefit='Stopping personal contact follows the boundary that was stated.',limit='Do not ask friends to carry messages, switch accounts or demand an explanation. You can write an unsent note or talk with a trusted person instead.',
 words=dict(elementary='I can miss them and give them space. I can tell a grown-up how I feel.',middle='I do not need to send one more message. I can keep an unsent note and ask someone I trust for support.',high='I can respect no contact without agreeing with everything that happened. I can process my feelings elsewhere.')),
 dict(id='support',title='Plan for shared spaces with support',benefit='A practical plan can make class, lunch or shared work more manageable.',limit='Ask for help with routines, not a forced reconciliation. A brief task-related exchange does not mean personal contact is welcome; an adult can help arrange necessary communication.',
 words=dict(elementary='Can you help us have space and still do our class work?',middle='We need a way to finish the project while respecting space. Could you help us divide the work?',high='Could we agree on task-only communication or separate responsibilities with support from the teacher?'))],
 changed='Later, they say a friendly hello, but they have not changed the request for space.',review='A greeting does not automatically reopen the friendship or invite messages. Keep respecting the stated boundary. If necessary shared work is difficult, ask for help with that specific need.'),
dict(id='uncertain',title='When closeness feels uncertain',
 setup=dict(elementary='A friend has played with other children this week. They have not said they want space, but you wonder if they still want to play with you.',middle='A friend has replied less often lately and spends time with another group. They have not asked for no contact. You do not know whether they are busy or want a different level of closeness.',high='Contact with a friend has become less frequent. No boundary or reason has been stated. You are unsure whether to ask about it or allow the friendship to change.'),
 notice='Notice the change without deciding what it means for your worth or their motives. Friends can have other friends, and neither person has to promise the same level of closeness.',
 options=[dict(id='invite',title='Make one low-pressure invitation, if welcome',benefit='A simple invitation can leave room for a clear yes, no or different suggestion.',limit='Use this only when contact is welcome and there is no request for space. No answer is not permission to keep asking or to contact them through someone else.',
 words=dict(elementary='Would you like to play together sometime? It is okay if not.',middle='Would you want to hang out at lunch one day? It is okay if you do not want to.',high='I have missed spending time together. Would you like to make a plan sometime? You can say no.')),
 dict(id='pause',title='Pause and make room for other support',benefit='You can reduce the effort you are putting into contact while keeping supportive routines in your day.',limit='Pausing is a choice about your own effort, not a test to make someone chase you. You do not have to declare the friendship over or replace it immediately.',
 words=dict(elementary='I can choose another game today and talk to someone who helps me.',middle='I can stop checking for a reply and plan something I enjoy with someone who is available.',high='I can let this remain uncertain and choose where to put my time. I do not need a final verdict today.'))],
 changed='You make one invitation and do not receive an answer.',review='Do not repeat the invitation or use another person or account to get a response. You can step back and seek support for the uncertainty. Silence does not tell you the reason or define your worth.')
]
p=root/'sel_hub/sel_tool_friendship.js'; s=p.read_text(encoding='utf-8')
a=s.index('  // When friendships end'); b=s.index('  // Digital friendship dilemmas',a)
s=s[:a]+'  // Authored comparisons for changing friendships; no prescribed emotional outcome.\n  var ENDING_PRACTICE = '+json.dumps(cases,indent=2,ensure_ascii=False)+';\n\n'+s[b:]
a=s.index('      var endingsContent = null;'); b=s.index('      // \u2500\u2500 AI Practice Coach',a)
ui=r'''      var endingsContent = null;
      if (activeTab === 'endings') {
        var endingBand = ['elementary', 'middle', 'high'].indexOf(band) >= 0 ? band : 'middle';
        var endingObject = function(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; };
        var endingSelections = endingObject(d.endingSelections);
        var endingSelected = endingSelections[endingBand];
        var endingExample = ENDING_PRACTICE.find(function(item) { return item.id === endingSelected; }) || ENDING_PRACTICE[0];
        var endingContext = endingSelected === 'own' ? 'own' : endingExample.id;
        var endingOwn = endingContext === 'own';
        var endingKey = endingBand + ':' + endingContext;
        var endingDrafts = endingObject(d.endingDrafts);
        var endingDraft = endingObject(endingDrafts[endingKey]);
        var endingNote = function(key) { return typeof endingDraft[key] === 'string' ? endingDraft[key] : ''; };
        var saveEnding = function(values) { var drafts = Object.assign({}, endingDrafts); drafts[endingKey] = Object.assign({}, endingDraft, values); upd('endingDrafts', drafts); };
        var endingSurface = _frHC ? '#000000' : _frDark ? '#0f172a' : '#ffffff';
        var endingInk = _frHC ? '#ffffff' : _frDark ? _frC('#0f172a') : '#1f2937';
        var endingEdge = _frHC ? '#ffff00' : _frDark ? '#94a3b8' : '#64748b';
        var endingCard = { padding: '16px', margin: '14px 0', border: '1px solid ' + endingEdge, borderRadius: '12px', background: endingSurface, color: endingInk, minWidth: 0 };
        var endingControl = { width: '100%', maxWidth: '100%', minHeight: '44px', boxSizing: 'border-box', padding: '10px', border: '1px solid ' + endingEdge, borderRadius: '8px', background: endingSurface, color: endingInk, font: 'inherit', fontSize: '16px' };
        var endingSummary = { minHeight: '44px', padding: '10px 0', boxSizing: 'border-box', fontWeight: 700, cursor: 'pointer' };
        var endingFields = [
          { id: 'change', label: 'What feels different, and what is uncertain?', hint: endingBand === 'elementary' ? 'What changed? What do you miss, feel relieved about or not know yet? You can use a made-up example.' : 'Separate what changed from guesses about why. Mixed feelings, relief or not knowing how you feel are all possible.' },
          { id: 'boundary', label: 'What contact or space would respect both people?', hint: 'Consider what each person has actually said, access and routines. No contact is a valid boundary; an explanation or final conversation is not owed.' },
          { id: 'support', label: 'What could help in my day?', hint: 'Choose a small routine, activity or supportive person. You do not need to replace the friendship or feel grateful for the ending.' },
          { id: 'review', label: 'What would I keep or reconsider?', hint: 'Think about what is workable, whether boundaries are respected and what help you need. There is no deadline to feel better or reach a final decision.' }
        ];
        var endingField = function(field) {
          var id = 'fr-ending-' + field.id;
          return h('div', { key: field.id, style: { margin: '16px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'),
            h('p', { id: id + '-hint', style: { margin: '6px 0' } }, field.hint),
            h('textarea', { id: id, rows: 3, value: endingNote(field.id), 'aria-describedby': id + '-hint', style: Object.assign({}, endingControl, { resize: 'vertical' }),
              onChange: function(ev) { var values = {}; values[field.id] = ev.target.value; saveEnding(values); } }));
        };
        var endingPreview = ['My changing-friendship notes — possibilities, not a final decision.', 'Context: ' + (endingOwn ? 'My own example' : endingExample.title)]
          .concat(endingFields.map(function(field) { return field.label + '\n' + (endingNote(field.id).trim() || '(No note yet)'); })).join('\n\n');
        endingsContent = h('section', { role: 'region', 'aria-label': 'Changing friendship practice', style: { padding: '16px', maxWidth: '720px', margin: '0 auto', background: endingSurface, color: endingInk, lineHeight: 1.6, overflowWrap: 'anywhere' } },
          h('h3', { style: { margin: '0 0 8px', fontSize: '22px' } }, 'When friendships change'),
          h('p', null, endingBand === 'elementary' ? 'You can miss someone, need space, feel relieved or feel more than one thing. You do not have to decide everything today.' : 'A change in closeness does not require a final verdict. Explore uncertainty, boundaries and support without having to feel grateful, forgive or reconnect.'),
          h('p', null, 'Start with a fictional example or your own. Reading and thinking are enough; every note is optional.'),
          h('label', { htmlFor: 'fr-ending-context', style: { display: 'block', fontWeight: 700 } }, 'Choose a changing-friendship context'),
          h('select', { id: 'fr-ending-context', value: endingContext, style: endingControl, onChange: function(ev) { var choices = Object.assign({}, endingSelections); choices[endingBand] = ev.target.value; upd('endingSelections', choices); } },
            ENDING_PRACTICE.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); }), h('option', { value: 'own' }, 'My own example')),
          h('div', { key: endingKey, style: endingCard },
            h('h4', { style: { margin: '0 0 8px', fontSize: '18px' } }, endingOwn ? 'Start with the change you want to consider' : endingExample.title),
            h('p', null, endingOwn ? 'You can leave the future undecided. Notice what has actually changed and what contact, space or help you need now.' : endingExample.setup[endingBand]),
            !endingOwn && h('p', null, endingExample.notice)),
          !endingOwn && h('div', { key: endingKey + '-compare' },
            h('h4', { style: { fontSize: '18px', marginBottom: '6px' } }, 'Compare possible next steps'),
            h('p', null, 'Explore either or both. They may work together; these are possibilities, not instructions or a test.'),
            endingExample.options.map(function(option) { return h('details', { key: option.id, style: endingCard },
              h('summary', { style: endingSummary }, option.title),
              h('p', null, option.benefit), h('p', null, option.limit),
              h('h5', { style: { fontSize: '16px', margin: '12px 0 4px' } }, 'Words to adapt or think privately'),
              h('p', null, option.words[endingBand])); })),
          h('details', { key: endingKey + '-notes', style: endingCard },
            h('summary', { style: endingSummary }, 'Make room for my next day (optional)'),
            h('p', null, 'Notes are kept with this activity and grade level. They are not monitored and do not request help. Use a fictional example if you prefer not to record personal details.'),
            endingFields.map(endingField)),
          h('details', { key: endingKey + '-revisit', style: endingCard },
            h('summary', { style: endingSummary }, 'Reconsider after something changes'),
            h('p', null, endingOwn ? 'What if a reply does not come, a boundary changes or a plan no longer fits?' : endingExample.changed),
            h('p', null, endingOwn ? 'Base a new step on what is welcome and workable now. You can revise your notes, pause or ask for support without deciding the whole future.' : endingExample.review)),
          h('details', { key: endingKey + '-preview', style: endingCard },
            h('summary', { style: endingSummary }, 'Review my notes'),
            h('label', { htmlFor: 'fr-ending-preview', style: { display: 'block', fontWeight: 700 } }, 'Notes to review or copy'),
            h('textarea', { id: 'fr-ending-preview', readOnly: true, rows: 9, value: endingPreview, style: Object.assign({}, endingControl, { resize: 'vertical' }) })),
          h('p', null, 'If there are threats, repeated pressure or fear about shared spaces, tell a trusted adult and ask for help with a plan. You do not need a goodbye conversation first.')
        );
      }

'''
s=s[:a]+ui+s[b:]
lines=s.splitlines()
for i,line in enumerate(lines):
    if "endings: { accent:" in line:
        lines[i]="          endings: { accent: '#0891b2', soft: 'rgba(8,145,178,0.14)', icon: '\\uD83C\\uDF43', title: 'Endings \\u2014 make room for change', hint: 'Explore changing routines, uncertain contact and requests for space. You can have mixed feelings and choose support without a final goodbye or a decision to reconnect.' },"
s='\n'.join(lines)+'\n'
for target in [p,root/'desktop/web-app/public/sel_hub/sel_tool_friendship.js']:
    for attempt in range(5):
        try: target.write_bytes(s.encode('utf-8')); break
        except OSError:
            if attempt==4: raise
            time.sleep(1)
print('Updated Endings practice and its contextual guidance; public mirror matches.')
