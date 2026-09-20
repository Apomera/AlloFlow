from pathlib import Path
import json,time
root=Path.cwd()
legacy=[dict(id=i,label=l) for i,l in [('helper','The Helper'),('listener','The Listener'),('adventurer','The Adventurer'),('loyalist','The Loyalist'),('includer','The Includer'),('cheerleader','The Cheerleader')]]
cases=[
dict(id='helper',title='Offer help with permission',
 setup=dict(elementary='A classmate is working on a tricky puzzle. You know a way to do it, but they have not asked for help.',middle='A friend is having trouble with an assignment. You want to help without taking over or doing it for them.',high='A friend mentions a difficult task. You have ideas, but you do not know whether they want suggestions, practical help or time to work independently.'),
 words=dict(elementary='Would you like a hint, help with one part, or time to try?',middle='Would a suggestion help, or would you rather work on it your way?',high='Would you like ideas, a specific practical offer or space to work independently?'),
 notice='Notice a possible need, then check rather than assuming. Help is useful when the person wants it and still has room to make choices.',
 limit='Do not take over, touch their work or make an offer you cannot sustain. A declined offer does not mean you failed to care.',
 changed='They say they want to do it themselves.',review='Respect that answer. You can step back without repeatedly offering, watching over them or doing the task secretly.'),
dict(id='listener',title='Listen in a way that fits',
 setup=dict(elementary='A friend wants to tell you about their day. You can listen better while drawing or moving quietly.',middle='A friend wants to talk about a disagreement. You have limited time and do not know whether they want advice.',high='A friend starts sharing a complicated experience. You want to understand without assuming their feelings or giving advice they did not request.'),
 words=dict(elementary='I can listen while I draw. Is that okay with you?',middle='I have a few minutes. Would you like me to listen, help think of ideas, or something else?',high='Would listening help, or are you looking for ideas? I may check that I understood rather than guess.'),
 notice='Listening can include checking understanding, giving processing time or using writing. Eye contact and stillness are not the only ways to pay attention.',
 limit='You can set a time or capacity limit. Understanding is not the same as agreeing, and listening does not require keeping someone unsafe.',
 changed='They want more time than you have and ask you to be their only support.',review='Be honest about what you can offer and suggest another trusted person. If someone may be hurt or unsafe, ask a trusted adult for help.'),
dict(id='adventurer',title='Share an experience that works',
 setup=dict(elementary='You want to play an energetic game, but your friend prefers something quieter today.',middle='You want to invite a friend to an activity, but it may involve cost, transport or rules you have not checked.',high='You enjoy a shared interest, but your usual way of doing it does not fit both people\'s schedules or access needs.'),
 words=dict(elementary='Would a quieter game work, or would you like to do different things nearby?',middle='Would you like to find something that works for our time, budget and access?',high='Could we adapt the activity or try another format? We can also choose separate plans.'),
 notice='Sharing time does not require identical interests or energy. A smaller, quieter or parallel activity can be an option if both people want it.',
 limit='An invitation is not a commitment. Do not require someone to explain private constraints or endure an inaccessible activity to belong.',
 changed='None of the options works for both of you today.',review='You can make separate plans without treating it as a loyalty test. Revisit another time only if that is welcome.'),
dict(id='loyalist',title='Be reliable and honest about limits',
 setup=dict(elementary='You promised to bring something for a shared project, then realize you cannot bring it.',middle='You agreed to help a friend, but a change at home means you cannot do what you promised.',high='You made a commitment and now know your time or capacity has changed. You want to be dependable without making a new promise you cannot keep.'),
 words=dict(elementary='I cannot bring it after all. I wanted to tell you. Can we ask for help with another plan?',middle='I cannot do what I promised. I am sorry for the impact. Could we work out an alternative that is realistic?',high='My capacity changed, and I cannot follow through as agreed. I want to acknowledge the impact and be clear about what I can actually offer.'),
 notice='Reliability can include communicating a change and taking responsibility for its impact. It does not mean never needing help or always being available.',
 limit='Do not promise secrecy about harm or agree to something unsafe to prove loyalty. Another person may still feel disappointed; an explanation does not erase the impact.',
 changed='They ask for a bigger promise to make up for it.',review='Name what is realistic rather than accepting a new obligation you cannot meet. You can discuss a smaller repair step without guaranteeing forgiveness.'),
dict(id='includer',title='Make room without putting someone on the spot',
 setup=dict(elementary='Someone is on their own near a game. You do not know whether they want to join.',middle='A group activity has a role that could be adapted so more people can take part. You want to invite someone without drawing unwanted attention.',high='You notice a barrier to participation in a group. You want to make access possible without assuming someone wants your invitation or asking them to explain an identity or diagnosis.'),
 words=dict(elementary='Would you like to join, watch, or do your own thing?',middle='Would you like to take part in any way? We could change how the activity works.',high='Would any change make participation work better for you? It is also okay to pass; you do not need to explain.'),
 notice='Inclusion involves access and choice. An invitation can be discreet, and someone can belong without taking part in every activity.',
 limit='Do not assume being alone means lonely. Do not publicize someone\'s needs or turn an invitation into pressure to join.',
 changed='They decline, while another person still cannot access the activity.',review='Respect the decline and address the access barrier without making the person who declined responsible for fixing it. Ask a trusted adult or organizer for support if needed.'),
dict(id='cheerleader',title='Recognize what matters to someone',
 setup=dict(elementary='A friend is proud of something they made. You want to show interest, but they may not want a big public cheer.',middle='A friend reaches a goal. You are pleased for them and also disappointed about your own result.',high='Someone shares a success or milestone. You want to acknowledge it without comparing achievements or assuming they want publicity.'),
 words=dict(elementary='You worked on that. Would you like to tell me about it?',middle='That mattered to you. Would you like to celebrate or talk about it?',high='I know this was important to you. How would you like it acknowledged, if at all?'),
 notice='Recognition can be quiet, specific or private. You can choose a considerate action while having mixed feelings of your own.',
 limit='You do not have to manufacture excitement or make every moment positive. Ask before sharing someone\'s news or image with other people.',
 changed='They say they do not want anyone else to know yet.',review='Keep the news private unless there is a safety concern. You can acknowledge it directly without posting, retelling it or insisting on a celebration.')
]
p=root/'sel_hub/sel_tool_friendship.js';s=p.read_text(encoding='utf-8')
a=s.index('  // Friendship styles (self-assessment)');b=s.index('  // Authored starters:',a)
s=s[:a]+'  // Old labels are retained only to explain a saved historical selection.\n  var FRIEND_STYLES = '+json.dumps(legacy,indent=2)+';\n\n  // Practices are flexible choices, not personality categories.\n  var CARE_PRACTICES = '+json.dumps(cases,indent=2,ensure_ascii=False)+';\n\n'+s[b:]
s=s.replace("label: 'My Style'", "label: 'Ways to Care'")
s=s.replace("      var stylePicked = myStyle ? (FRIEND_STYLES.find(function(s) { return s.id === myStyle; }) || {}).label || 'chosen' : 'not yet';\n",'')
s=s.replace("'Start with your style, then practice a specific move: open, maintain, repair, digital choices, or a hard conversation.'", "'Explore ways to care, conversation openings, sustainable contact, boundaries and changing friendships.'")
s=s.replace("friendStat('style picked', stylePicked, AMBER)","friendStat('ways to explore', CARE_PRACTICES.length, AMBER)")
s=s.replace("'Pick an opener and follow-up that feels natural.'","'Explore invitations, responses and respectful exits.'")
s=s.replace("friendRouteCard('Keep it warm', 'Try small maintenance moves before drift sets in.'", "friendRouteCard('Care with limits', 'Explore contact, access and realistic support.'")
s=s.replace("                  var styleCtx = myStyle ? ' Their friendship style is \"' + myStyle + '\".' : '';\n",'')
s=s.replace(" + band + ' school student.' + styleCtx + ' The student said:"," + band + ' school student. The student said:")
assert 'styleCtx' not in s
lines=s.splitlines()
for i,line in enumerate(lines):
    if 'compass: { accent:' in line:
        lines[i]="          compass: { accent: '#d97706', soft: 'rgba(217,119,6,0.14)', icon: '\\uD83E\\uDDED', title: 'Ways to Care \\u2014 flexible practices', hint: 'Explore helping, listening, shared experiences, reliability, inclusion and recognition. These are choices to adapt to context and consent, not fixed friendship types or a test of your worth.' },"
s='\n'.join(lines)+'\n'
a=s.index('      var compassContent = null;');b=s.index('      // \u2500\u2500 Starting Friendships',a)
ui=r'''      var compassContent = null;
      if (activeTab === 'compass') {
        var careBand = ['elementary', 'middle', 'high'].indexOf(band) >= 0 ? band : 'middle';
        var careObject = function(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; };
        var careSelections = careObject(d.careSelections);
        var careSelected = careSelections[careBand];
        var careExample = CARE_PRACTICES.find(function(item) { return item.id === careSelected; }) || CARE_PRACTICES[0];
        var careOwn = careSelected === 'own';
        var careContext = careOwn ? 'own' : careExample.id;
        var careKey = careBand + ':' + careContext;
        var careDrafts = careObject(d.careDrafts);
        var careDraft = careObject(careDrafts[careKey]);
        var careNote = function(key) { return typeof careDraft[key] === 'string' ? careDraft[key] : ''; };
        var saveCare = function(values) { var drafts = Object.assign({}, careDrafts); drafts[careKey] = Object.assign({}, careDraft, values); upd('careDrafts', drafts); };
        var careSurface = _frHC ? '#000000' : _frDark ? '#0f172a' : '#ffffff';
        var careInk = _frHC ? '#ffffff' : _frDark ? _frC('#0f172a') : '#1f2937';
        var careEdge = _frHC ? '#ffff00' : _frDark ? '#94a3b8' : '#64748b';
        var careCard = { padding: '16px', margin: '14px 0', border: '1px solid ' + careEdge, borderRadius: '12px', background: careSurface, color: careInk, minWidth: 0 };
        var careControl = { width: '100%', maxWidth: '100%', minHeight: '44px', boxSizing: 'border-box', padding: '10px', border: '1px solid ' + careEdge, borderRadius: '8px', background: careSurface, color: careInk, font: 'inherit', fontSize: '16px' };
        var careSummary = { minHeight: '44px', padding: '10px 0', boxSizing: 'border-box', fontWeight: 700, cursor: 'pointer' };
        var careFields = [
          { id: 'notice', label: 'What do I notice or need to ask?', hint: 'Separate what you observe from guesses about feelings or needs. You can use the fictional example.' },
          { id: 'offer', label: 'What could I offer, adapt or decline?', hint: 'Consider what is welcome, accessible and realistic for both people. You can choose more than one way to care, or pause.' },
          { id: 'check', label: 'What would show this is welcome or needs changing?', hint: 'Look for what the person communicates and whether boundaries are respected. They can decline or change their mind.' }
        ];
        var careField = function(field) {
          var id = 'fr-care-' + field.id;
          return h('div', { key: field.id, style: { margin: '16px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'),
            h('p', { id: id + '-hint', style: { margin: '6px 0' } }, field.hint),
            h('textarea', { id: id, rows: 3, value: careNote(field.id), 'aria-describedby': id + '-hint', style: Object.assign({}, careControl, { resize: 'vertical' }),
              onChange: function(ev) { var values = {}; values[field.id] = ev.target.value; saveCare(values); } }));
        };
        var carePreview = ['Ways I could care — practice notes, not a personality assessment.', 'Context: ' + (careOwn ? 'My own example' : careExample.title)]
          .concat(careFields.map(function(field) { return field.label + '\n' + (careNote(field.id).trim() || '(No note yet)'); })).join('\n\n');
        var earlierStyle = typeof myStyle === 'string' ? FRIEND_STYLES.find(function(item) { return item.id === myStyle; }) : null;
        compassContent = h('div', { style: { maxWidth: '720px', margin: '0 auto' } },
          h('section', { role: 'region', 'aria-label': 'Ways to care practice', style: { padding: '16px', background: careSurface, color: careInk, lineHeight: 1.6, overflowWrap: 'anywhere' } },
            h('h3', { style: { margin: '0 0 8px', fontSize: '22px' } }, 'Different ways to show care'),
            h('p', null, careBand === 'elementary' ? 'You can care in lots of ways. What helps depends on the person and the moment. You do not have to choose one kind of friend to be.' : 'Explore practices you can combine, adapt or decline. A useful approach in one situation may not fit another; these are not fixed friendship types.'),
            h('p', null, 'Choose something to explore, not a label for yourself. Reading, thinking or practising with a trusted person is enough; every note is optional.'),
            h('label', { htmlFor: 'fr-care-context', style: { display: 'block', fontWeight: 700 } }, 'Choose a way to care to explore'),
            h('select', { id: 'fr-care-context', value: careContext, style: careControl, onChange: function(ev) { var choices = Object.assign({}, careSelections); choices[careBand] = ev.target.value; upd('careSelections', choices); } },
              CARE_PRACTICES.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); }), h('option', { value: 'own' }, 'My own example')),
            h('div', { key: careKey, style: careCard },
              h('h4', { style: { margin: '0 0 8px', fontSize: '18px' } }, careOwn ? 'Consider what this moment needs' : careExample.title),
              h('p', null, careOwn ? 'Start with what you notice, what you do not know and what you want to offer. Someone else can want a different kind of support or none.' : careExample.setup[careBand]),
              !careOwn && h('p', null, careExample.notice)),
            !careOwn && h('details', { key: careKey + '-example', style: careCard },
              h('summary', { style: careSummary }, 'Explore words and boundaries'), h('p', { style: { fontWeight: 700 } }, careExample.words[careBand]), h('p', null, careExample.limit)),
            h('details', { key: careKey + '-notes', style: careCard },
              h('summary', { style: careSummary }, 'Adapt a practice (optional)'),
              h('p', null, 'Notes stay with this practice and grade level. They are not monitored, do not request help and do not become a friendship profile.'), careFields.map(careField)),
            h('details', { key: careKey + '-revisit', style: careCard },
              h('summary', { style: careSummary }, 'Adjust when the situation changes'),
              h('p', null, careOwn ? 'What if an offer is declined, capacity changes or a different kind of support is needed?' : careExample.changed),
              h('p', null, careOwn ? 'You can ask, adapt or step back. If someone may be hurt or unsafe, seek help from a trusted adult rather than handling it alone.' : careExample.review)),
            h('details', { key: careKey + '-preview', style: careCard },
              h('summary', { style: careSummary }, 'Review my practice notes'),
              h('label', { htmlFor: 'fr-care-preview', style: { display: 'block', fontWeight: 700 } }, 'Practice notes to review or copy'),
              h('textarea', { id: 'fr-care-preview', readOnly: true, rows: 9, value: carePreview, style: Object.assign({}, careControl, { resize: 'vertical' }) })),
            myStyle != null && h('details', { style: careCard },
              h('summary', { style: careSummary }, 'Earlier style selection'),
              h('p', null, earlierStyle ? 'Earlier selection: ' + earlierStyle.label + '.' : 'An earlier value remains stored, but it has no matching style label.'),
              h('p', null, 'This was a choice in an earlier activity, not an assessment of who you are. It is retained as history and is not supplied as your identity in new friendship-coach prompts.'))),
          h('details', { style: Object.assign({}, careCard, { margin: '16px' }) },
            h('summary', { style: careSummary }, 'Explore other friendship activities'), friendshipLaunchPanel)
        );
      }

'''
s=s[:a]+ui+s[b:]
for target in [p,root/'desktop/web-app/public/sel_hub/sel_tool_friendship.js']:
    for attempt in range(5):
        try:target.write_bytes(s.encode('utf-8'));break
        except OSError:
            if attempt==4:raise
            time.sleep(1)
p=root/'tests/sel_friendship_controls_a11y.test.js';s=p.read_text(encoding='utf-8')
s=s.replace('tab controls, panel relationships, and radio-group semantics','tab controls, panel relationships, and practice-region semantics')
s=s.replace("expect(text).toContain(\"role: 'radiogroup', 'aria-label': 'Friendship styles'\");", "expect(text).toContain(\"'aria-label': 'Ways to care practice'\");")
p.write_bytes(s.encode('utf-8'))
print('Replaced fixed style selection with flexible care practice and retained old labels only as history.')
