from pathlib import Path
import json,time
root=Path.cwd()
# Order retains the six original contexts per band for legacy starterIdx fallback.
rows={
'elementary':[
['game','Joining a game','Someone is playing a game you like.','Wait for a break. Check whether the game has room and whether you want to follow its rules.','That looks fun. Is there room for me to play?','A simple question lets the group say whether joining is possible. You do not need to promise to do anything they ask.','Ask how to play or what role is available. You can say if you need help or a different way to join.'],
['lunch','Sitting near someone new','You are sitting near someone new at lunch.','They may want quiet time or need time to eat. A greeting can be enough.','Hi, I am ___. Would you like to talk or have quiet time?','Offering a choice leaves room for either answer. Quiet time is not a judgment about you.','Share one thing you enjoy and ask whether they want to share something too.'],
['interest','Noticing a shared interest','Someone has a picture of a game you enjoy on their bag.','Comment only if you genuinely want to. Avoid touching their belongings or asking private questions.','I like that game too. Do you want to talk about it?','A shared topic can give you something to discuss; it does not mean you will like all the same things.','Mention one part you enjoy, then leave room for their idea.'],
['group','Approaching a group','You want to join a group activity at recess.','Check what the group is doing and whether joining is safe and welcome. You can ask a grown-up for help.','Is this a game I can join? What are the rules?','Learning the rules can help you decide whether the activity works for you too.','Ask about a place in the activity. You can explain an access need or choose another activity.'],
['company','Offering company','Someone is sitting alone. You wonder if they want company.','Being alone does not tell you how they feel. They may like being by themselves.','Would you like company, or would you like to sit on your own?','Asking leaves the choice with them instead of deciding that they are lonely.','Ask whether they want to talk, do something together or just sit quietly.'],
['project','Meeting a project partner','You have a class project with someone you do not know well.','Start with the shared task. Ask for help from the teacher if directions or roles are unclear.','Which part would you like to try? I would like to try ___.','Talking about the task can help you cooperate without having to become close friends.','Listen to their idea and share what helps you work, such as drawing, taking turns or writing.']
],
'middle':[
['class','A shared class','You share a class with someone you would like to know.','Choose a pause rather than interrupting work. Do not pretend to need help to get their attention.','Do you have a minute to compare how we understood the assignment?','A real shared task can offer a starting point, if both people have time.','Share one question or idea of your own, then make room for theirs.'],
['interest','A shared interest','Someone mentions an activity you also enjoy.','Check whether they want to continue the topic. You can have different tastes within the same interest.','I like that too. Would you want to talk about it?','An interest gives you a possible topic, not a guarantee of friendship.','Share a favorite part and invite their view without testing how much they know.'],
['invite','Inviting someone along','You want to invite someone to a group activity outside school.','Use a real plan and check permission, cost, transport and access. Do not promise an invitation on behalf of others without checking.','Some of us are planning ___. Would you like the details? It is okay if not.','Clear information can help someone decide whether they want and are able to join.','Offer the details and let them decide without asking them to explain private constraints.'],
['presentation','After a presentation','Someone shared an idea in a presentation that interested you.','Wait until they are free. They may not want feedback or another conversation immediately.','Your point about ___ interested me. Would you be up for talking about it sometime?','A specific observation explains your interest without requiring praise or a personal story in return.','Ask one question about the idea and share what it made you think about.'],
['newschool','Finding your way','You are new to the school and would like to connect with others.','You can ask a practical question without disclosing your personal history. Staff can help too.','Hi, I am new here. Could you tell me where ___ is?','A small practical question can open contact, but the other person is not responsible for becoming your guide or friend.','Thank them. If they keep talking, share something you choose about your interests.'],
['mutual','A mutual connection','You know someone through a mutual friend and would like to introduce yourself.','Use only information that was okay to share. Knowing the same person does not mean you already know each other.','Hi, we both know ___. I am ___. Would you like to join this activity?','A simple introduction offers a connection while leaving room for their choice.','Talk about the shared activity rather than repeating private stories about the mutual friend.']
],
'high':[
['study','Inviting a study partner','You would like to study with someone from a shared class.','Check timing, format and access. Avoid assuming they should tutor you or do the work.','Would you be interested in studying together sometime? We could each bring a question.','An invitation can make the purpose and contribution clearer without presuming agreement.','Discuss a format and time that work for both people, including the option to decline later.'],
['acquaintance','Getting to know an acquaintance','You would like to know a classmate beyond routine small talk.','Start with a topic you are comfortable sharing. They do not owe deeper disclosure.','We have talked a few times. Would you want to grab lunch or join an activity sometime?','An optional shared activity can create time to talk without asking for immediate closeness.','Offer a concrete, accessible possibility and ask what works for them.'],
['discussion','Continuing an interesting discussion','Something a classmate said in a discussion made you think.','Ask before extending the discussion, especially if the topic is personal or tiring.','Your point about ___ gave me something to think about. Would you want to talk more, or leave it there?','Permission to stop matters as much as an invitation to continue.','Share your own thought and ask a question without treating them as a representative of a whole group.'],
['checkin','Offering a check-in','Someone you know has seemed quieter lately. You are considering checking in.','A change you notice does not tell you its cause. Do not press for personal details or promise unlimited availability.','Would you like company or a check-in? You do not have to explain anything.','A specific, optional offer leaves them control over what to share.','Ask what kind of company would help and be honest about what you can offer.'],
['reconnect','Reconnecting after a gap','You have drifted from someone and would like to ask about reconnecting.','Only approach if contact is welcome and there has been no request for space or no contact.','I have missed talking with you. Would you be interested in catching up sometime? It is okay if not.','You can name your interest without assuming they feel the same or owe a return to the old friendship.','Ask what kind of contact would fit now rather than promising to recreate the past.'],
['difference','Connecting across different experiences','You would like to get to know someone whose experiences may differ from yours.','Do not assume their identity, experiences or willingness to explain them. Start with an actual shared context.','I enjoyed working on ___ with you. Would you like to do another activity together?','An invitation around shared experience can leave room for differences without making someone teach you about their identity.','Let them choose what to share. Ask about preferences rather than making assumptions about a group.']
]}
data={band:[dict(zip(['id','title','situation','check','say','why','follow'],row)) for row in items] for band,items in rows.items()}
p=root/'sel_hub/sel_tool_friendship.js'; s=p.read_text(encoding='utf-8')
a=s.index('  // Conversation starters by grade band'); b=s.index('  // Authored practice examples;',a)
s=s[:a]+'  // Authored starters: invitations, not guarantees of friendship.\n  var STARTERS = '+json.dumps(data,indent=2,ensure_ascii=False)+';\n\n'+s[b:]
a=s.index('      var startContent = null;'); b=s.index('      // \u2500\u2500 Keeping Friends',a)
ui=r'''      var startContent = null;
      if (activeTab === 'start') {
        var startBand = ['elementary', 'middle', 'high'].indexOf(band) >= 0 ? band : 'middle';
        var startObject = function(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; };
        var starters = STARTERS[startBand];
        var startSelections = startObject(d.starterSelections);
        var startSelected = startSelections[startBand];
        var startExample = starters.find(function(item) { return item.id === startSelected; }) || starters[starterIdx % starters.length];
        var startOwn = startSelected === 'own';
        var startContext = startOwn ? 'own' : startExample.id;
        var startKey = startBand + ':' + startContext;
        var startDrafts = startObject(d.starterDrafts);
        var startDraft = startObject(startDrafts[startKey]);
        var startNote = function(key) { return typeof startDraft[key] === 'string' ? startDraft[key] : ''; };
        var saveStart = function(values) { var drafts = Object.assign({}, startDrafts); drafts[startKey] = Object.assign({}, startDraft, values); upd('starterDrafts', drafts); };
        var startResponses = [
          { id: 'welcome', label: 'They welcome the conversation', cue: startBand === 'elementary' ? 'They say, "Yes, I would like to," and ask you a question.' : 'They agree to talk or join in and ask a question back.', next: startOwn ? 'Share one thing you choose and leave room for their response. Check that continuing is still welcome.' : startExample.follow, limit: 'A yes applies to this exchange, not every future invitation. Both people can change their minds.' },
          { id: 'decline', label: 'They decline or ask for space', cue: startBand === 'elementary' ? 'They say, "No, thank you," or "I want to be on my own."' : 'They decline the invitation or say they do not want contact.', next: startBand === 'elementary' ? 'You could say, "Okay," and give them space. Choose another activity or ask a grown-up for support if you need it.' : 'A brief acknowledgment is enough. Stop the invitation and respect the boundary; you do not need to ask why or bargain.', limit: 'Do not keep asking, recruit someone to persuade them or switch accounts. Their choice is not a score of your worth.' },
          { id: 'unclear', label: 'The response is unclear', cue: startBand === 'elementary' ? 'They do not answer, or give a short answer. You do not know why.' : 'They are silent or give a brief reply without clearly inviting more conversation.', next: startBand === 'elementary' ? 'Give them time. You can leave it there. If they use a different way to communicate, make room for that without rushing them.' : 'Allow processing time and room for their communication method. You can pause or leave the exchange there rather than sending repeated questions.', limit: 'Silence, tone and eye contact do not reliably tell you someone\'s feelings or intentions. Uncertainty is not permission to continue contact.' }
        ];
        var startResponse = startResponses.find(function(item) { return item.id === startNote('response'); });
        var startSurface = _frHC ? '#000000' : _frDark ? '#0f172a' : '#ffffff';
        var startInk = _frHC ? '#ffffff' : _frDark ? _frC('#0f172a') : '#1f2937';
        var startEdge = _frHC ? '#ffff00' : _frDark ? '#94a3b8' : '#64748b';
        var startCard = { padding: '16px', margin: '14px 0', border: '1px solid ' + startEdge, borderRadius: '12px', background: startSurface, color: startInk, minWidth: 0 };
        var startControl = { width: '100%', maxWidth: '100%', minHeight: '44px', boxSizing: 'border-box', padding: '10px', border: '1px solid ' + startEdge, borderRadius: '8px', background: startSurface, color: startInk, font: 'inherit', fontSize: '16px' };
        var startSummary = { minHeight: '44px', padding: '10px 0', boxSizing: 'border-box', fontWeight: 700, cursor: 'pointer' };
        var startFields = [
          { id: 'access', label: 'What would make this a workable moment?', hint: 'Think about timing, welcome contact, access and communication preferences. Speech, writing, gestures or a communication aid can all be options.' },
          { id: 'opener', label: 'What opening words or action could I try?', hint: 'Adapt an example or choose your own. A greeting or shared activity can be enough; you do not have to perform a script or make eye contact.' },
          { id: 'next', label: 'How could I respond or step back?', hint: 'Consider the practice response you explored. Leave room for the other person to decline, pause or communicate differently.' },
          { id: 'review', label: 'What would I notice or adjust next time?', hint: 'Notice your own choices and what felt workable. Getting a yes is not the measure of successful practice.' }
        ];
        var startField = function(field) {
          var id = 'fr-start-' + field.id;
          return h('div', { key: field.id, style: { margin: '16px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'),
            h('p', { id: id + '-hint', style: { margin: '6px 0' } }, field.hint),
            h('textarea', { id: id, rows: 3, value: startNote(field.id), 'aria-describedby': id + '-hint', style: Object.assign({}, startControl, { resize: 'vertical' }),
              onChange: function(ev) { var values = {}; values[field.id] = ev.target.value; saveStart(values); } }));
        };
        var startPreview = ['My conversation practice — not a prediction of friendship.', 'Context: ' + (startOwn ? 'My own example' : startExample.title), 'Fictional response explored: ' + (startResponse ? startResponse.label : 'Not chosen')]
          .concat(startFields.map(function(field) { return field.label + '\n' + (startNote(field.id).trim() || '(No note yet)'); })).join('\n\n');
        startContent = h('section', { role: 'region', 'aria-label': 'Starting friendship practice', style: { padding: '16px', maxWidth: '720px', margin: '0 auto', background: startSurface, color: startInk, lineHeight: 1.6, overflowWrap: 'anywhere' } },
          h('h3', { style: { margin: '0 0 8px', fontSize: '22px' } }, 'Start a conversation, leave room for choice'),
          h('p', null, startBand === 'elementary' ? 'Try an opening and practise what could happen next. You can choose to wait, and the other person can say no.' : 'Practise an invitation, a response and a respectful exit. No opening line guarantees connection, and you do not have to start a conversation.'),
          h('p', null, 'Use words and communication methods that fit you. You can read, think or practise with a trusted person; every note is optional.'),
          h('label', { htmlFor: 'fr-start-context', style: { display: 'block', fontWeight: 700 } }, 'Choose a conversation context'),
          h('select', { id: 'fr-start-context', value: startContext, style: startControl, onChange: function(ev) { var selections = Object.assign({}, startSelections); selections[startBand] = ev.target.value; upd('starterSelections', selections); } },
            starters.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); }), h('option', { value: 'own' }, 'My own example')),
          h('div', { key: startKey, style: startCard },
            h('h4', { style: { margin: '0 0 8px', fontSize: '18px' } }, startOwn ? 'Consider the moment' : startExample.title),
            h('p', null, startOwn ? 'Choose a context where contact is welcome. If someone has asked for space or no contact, respect that instead of rehearsing another approach to them.' : startExample.situation),
            h('h5', { style: { fontSize: '16px', margin: '12px 0 4px' } }, 'Before approaching'),
            h('p', null, startOwn ? 'Check timing, access and whether you want to join in. You may prefer writing, a shared activity or support from a trusted person.' : startExample.check),
            !startOwn && h('p', { style: { fontWeight: 700 } }, startExample.say),
            !startOwn && h('p', null, startExample.why)),
          h('div', { key: startKey + '-responses', style: startCard },
            h('label', { htmlFor: 'fr-start-response', style: { display: 'block', fontWeight: 700 } }, 'Explore a fictional response'),
            h('p', { id: 'fr-start-response-hint' }, 'These are made-up responses to practise with, not a way to classify a real person. Try more than one; changing this choice keeps your notes.'),
            h('select', { id: 'fr-start-response', value: startResponse ? startResponse.id : '', 'aria-describedby': 'fr-start-response-hint', style: startControl, onChange: function(ev) { saveStart({ response: ev.target.value }); } },
              h('option', { value: '' }, 'Choose a response to explore'), startResponses.map(function(item) { return h('option', { key: item.id, value: item.id }, item.label); })),
            h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, startResponse ? startResponse.cue : 'You can leave this open or explore a possible response.'),
            startResponse && h('div', null, h('h5', { style: { fontSize: '16px', margin: '12px 0 4px' } }, 'A possible next step'), h('p', null, startResponse.next), h('p', null, startResponse.limit))),
          h('details', { key: startKey + '-notes', style: startCard },
            h('summary', { style: startSummary }, 'Adapt and rehearse (optional)'),
            h('p', null, 'Notes are kept with this activity and grade level. They are not monitored and do not send a message. A fictional example is enough.'), startFields.map(startField)),
          h('details', { key: startKey + '-review', style: startCard },
            h('summary', { style: startSummary }, 'Review my practice notes'),
            h('label', { htmlFor: 'fr-start-preview', style: { display: 'block', fontWeight: 700 } }, 'Practice notes to review or copy'),
            h('textarea', { id: 'fr-start-preview', readOnly: true, rows: 9, value: startPreview, style: Object.assign({}, startControl, { resize: 'vertical' }) })),
          h('p', null, 'If someone repeatedly mocks, pressures or excludes you, ask a trusted adult for support. You do not have to find a better opening line to make that behavior stop.')
        );
      }

'''
s=s[:a]+ui+s[b:]
lines=s.splitlines()
for i,line in enumerate(lines):
    if 'start:   { accent:' in line:
        lines[i]="          start:   { accent: '#10b981', soft: 'rgba(16,185,129,0.14)', icon: '\\uD83D\\uDCAC', title: 'Starting \\u2014 an invitation and a choice', hint: 'Check timing and welcome contact. Try words that fit you, explore different responses and practise stepping back. Friendship is not guaranteed by a script or measured by getting a yes.' },"
s='\n'.join(lines)+'\n'
for target in [p,root/'desktop/web-app/public/sel_hub/sel_tool_friendship.js']:
    for attempt in range(5):
        try: target.write_bytes(s.encode('utf-8')); break
        except OSError:
            if attempt==4: raise
            time.sleep(1)
print('Updated all 18 starter contexts, response rehearsal and mirrored UI.')
