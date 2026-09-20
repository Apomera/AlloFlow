from pathlib import Path
import json, time

root = Path.cwd()
p = root / 'sel_hub/sel_tool_friendship.js'
s = p.read_text(encoding='utf-8')
cases = [
  dict(id='plans', title='A missed plan',
    setup=dict(elementary='You planned to play with a friend after lunch. They joined another game. You do not know whether they remembered your plan.', middle='A friend did not arrive for your study plan. Later you saw them with someone else. You do not know what changed or whether they could contact you.', high='A friend cancelled a shared plan, then appeared in a photo from another gathering. The photo does not tell you when it was taken or why the plan changed.'),
    notice='Separate the missed agreement from a guess about why it happened. Feeling hurt does not prove intent, and uncertainty does not erase the impact.',
    model=dict(elementary='I waited for our game. Did you remember our plan? Next time, can we tell each other if the plan changes?', middle='I waited for our study time and felt let down. What happened? If we make another plan, I need us to confirm it first.', high='I was disappointed when our plan changed. I do not know the full context. If we plan again, could we agree how to communicate changes?'),
    limit='An invitation to explain is optional. It does not require sharing private information, accepting an explanation or promising another plan.',
    changed='They explain that a family obligation changed their day, but they also say they cannot reliably confirm plans.',
    revisit='You can understand the explanation and still choose more flexible plans, a check-in time or some distance. An explanation and a workable agreement are different things.'),
  dict(id='privacy', title='Taking responsibility for sharing',
    setup=dict(elementary='You told another child something a friend asked you to keep private. It was not about someone being unsafe. Your friend asks for space.', middle='You repeated a private story without permission. It was not a safety concern. Your friend says they feel exposed and does not want to talk yet.', high='You forwarded a private message without permission. It was not a safety concern. The person affected asks you to stop contacting them while they decide what they need.'),
    notice='Name the action and its impact without adding an excuse or demanding equal blame. Asking a trusted adult about a safety concern is different from spreading private information.',
    model=dict(elementary='I shared your private story. That was my choice. I will not share it again. I can give you space.', middle='I repeated your story without permission. I am sorry. I will stop sharing it and ask the person I told not to pass it on. You do not need to reply.', high='I forwarded your message without permission and breached your privacy. I will stop distributing it and seek help limiting further sharing. I will respect your request for no contact.'),
    limit='These are practice words, not a message to send after someone has asked for no contact. Changed behavior can begin without another message. You cannot guarantee that every copy or memory disappears.',
    changed='You have stopped sharing and taken a practical repair step. Your friend still does not want to reconnect.',
    revisit='Respect that boundary. An apology, forgiveness, trust and renewed friendship are separate choices. Repairing what you can does not buy a reply or a relationship.'),
  dict(id='pressure', title='When a boundary keeps being ignored', supportFirst=True,
    setup=dict(elementary='A child keeps saying you cannot play unless you give them your snack. You have said no, and you are worried it will happen again.', middle='Someone repeatedly threatens to exclude you unless you share homework answers. You have asked them to stop and worry about being singled out.', high='A peer repeatedly threatens to spread private information unless you do what they want. You are concerned about what might happen if you refuse.'),
    notice='Repeated pressure and fear of consequences call for support. You do not need to work out a label, confront the person or take responsibility for their threats before asking for help.',
    model=dict(elementary='I need help. They keep asking for my snack and say I cannot play if I say no. Can you stay with me and help?', middle='I need support with repeated pressure about homework. I am worried about being excluded if I refuse. Can we make a plan without a joint meeting?', high='I need help with threats involving private information. I am concerned about retaliation. Can we discuss protection and follow-up before anyone contacts the other person?'),
    limit='This is a request to a trusted adult, not a repair script for the person applying pressure. A joint meeting, apology or forgiveness is not a required first step.',
    changed='The first adult calls it a small disagreement, but the pressure continues.',
    revisit='Try another trusted adult or school support person and explain that it is continuing. Ask when they will check back with you. If there is immediate danger, seek nearby help now.')
]
a=s.index('  // Friendship repair strategies')
b=s.index('  // When friendships end', a)
s=s[:a]+'  // Authored practice examples; not a relationship assessment.\n  var REPAIR_PRACTICE = '+json.dumps(cases, ensure_ascii=False, indent=2)+';\n\n'+s[b:]
a=s.index('      var repairContent = null;')
b=s.index('      // \u2500\u2500 When Friendships End',a)
replacement=r'''      var repairContent = null;
      if (activeTab === 'repair') {
        var repairBand = ['elementary', 'middle', 'high'].indexOf(band) >= 0 ? band : 'middle';
        var repairObject = function(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; };
        var repairSelections = repairObject(d.repairSelections);
        var repairSelected = repairSelections[repairBand];
        var repairExample = REPAIR_PRACTICE.find(function(item) { return item.id === repairSelected; }) || REPAIR_PRACTICE[0];
        var repairContext = repairSelected === 'own' ? 'own' : repairExample.id;
        var repairOwn = repairContext === 'own';
        var repairKey = repairBand + ':' + repairContext;
        var repairDrafts = repairObject(d.repairDrafts);
        var repairDraft = repairObject(repairDrafts[repairKey]);
        var repairNote = function(key) { return typeof repairDraft[key] === 'string' ? repairDraft[key] : ''; };
        var saveRepair = function(values) {
          var drafts = Object.assign({}, repairDrafts);
          drafts[repairKey] = Object.assign({}, repairDraft, values);
          upd('repairDrafts', drafts);
        };
        var repairSupport = !repairOwn && !!repairExample.supportFirst;
        var repairRoutes = [
          { id: 'talk', label: 'Invite a conversation', hint: 'Check whether both people want to talk and can stop freely. Writing, a trusted helper or a later time may work better. No one owes personal disclosure.' },
          { id: 'space', label: 'Take or respect space', hint: 'You can pause, decline contact or respect someone else\'s request for space. A check-in is optional and needs consent; do not keep messaging for a reply.' },
          { id: 'support', label: 'Ask a trusted adult for support', hint: 'Tell a trusted adult what happened and what worries you. Ask for a practical plan and a follow-up. You do not have to arrange a joint conversation.' },
          { id: 'unsure', label: 'Still deciding', hint: 'You can leave this undecided and seek support. No explanation, apology or decision to stay friends is required here.' }
        ].filter(function(route) { return !repairSupport || route.id !== 'talk'; });
        var repairRoute = repairRoutes.find(function(route) { return route.id === repairNote('route'); });
        var repairSurface = _frHC ? '#000000' : _frDark ? '#0f172a' : '#ffffff';
        var repairInk = _frHC ? '#ffffff' : _frDark ? '#f1f5f9' : '#1f2937';
        var repairEdge = _frHC ? '#ffff00' : _frDark ? '#94a3b8' : '#64748b';
        var repairCard = { border: '1px solid ' + repairEdge, borderRadius: '12px', padding: '16px', margin: '14px 0', background: repairSurface, color: repairInk, minWidth: 0 };
        var repairControl = { width: '100%', maxWidth: '100%', minHeight: '44px', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid ' + repairEdge, background: repairSurface, color: repairInk, font: 'inherit', fontSize: '16px' };
        var repairSummary = { minHeight: '44px', padding: '10px 0', boxSizing: 'border-box', fontWeight: 700, cursor: 'pointer' };
        var repairFields = [
          { id: 'observations', label: 'What happened, and what is uncertain?', hint: repairBand === 'elementary' ? 'What did you see or hear? What do you not know yet?' : 'Separate observations, impact and guesses about intention. You may use the fictional example.' },
          { id: 'responsibility', label: 'What is mine to take responsibility for?', hint: 'Name a specific action only if it is yours. You do not need to invent fault or accept blame for someone else\'s behavior.' },
          { id: 'boundary', label: 'What boundary or support is needed?', hint: 'Consider space, consent to talk, a communication aid or a trusted adult. A no-contact request matters.' },
          { id: 'action', label: 'What could I say or do next?', hint: 'Try a practical action, an invitation that can be declined or a request for help. These notes do not send a message.' },
          { id: 'review', label: 'What would make me keep or change the plan?', hint: 'Look for behavior over time, respected boundaries and whether support is working. A reply or an apology alone does not prove repair.' }
        ];
        var repairField = function(field) {
          var id = 'fr-repair-' + field.id;
          return h('div', { key: field.id, style: { margin: '16px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'),
            h('p', { id: id + '-hint', style: { margin: '6px 0' } }, field.hint),
            h('textarea', { id: id, rows: 3, value: repairNote(field.id), 'aria-describedby': id + '-hint', style: Object.assign({}, repairControl, { resize: 'vertical' }),
              onChange: function(ev) { var values = {}; values[field.id] = ev.target.value; saveRepair(values); } })
          );
        };
        var repairPreview = ['My possible repair plan — a draft, not proof of reconciliation.', 'Context: ' + (repairOwn ? 'My own example' : repairExample.title), 'Route: ' + (repairRoute ? repairRoute.label : 'Not chosen')]
          .concat(repairFields.map(function(field) { return field.label + '\n' + (repairNote(field.id).trim() || '(No note yet)'); })).join('\n\n');
        repairContent = h('section', { role: 'region', 'aria-label': 'Friendship repair choices', style: { padding: '16px', maxWidth: '720px', margin: '0 auto', background: repairSurface, color: repairInk, lineHeight: 1.6, overflowWrap: 'anywhere' } },
          h('h3', { style: { margin: '0 0 8px', fontSize: '22px' } }, 'Repair, boundaries and next steps'),
          h('p', null, repairBand === 'elementary' ? 'You can care about a friend and still need space or help. Practise with a made-up example, or use your own.' : 'Explore what repair could involve without assuming shared blame, forgiveness or renewed friendship.'),
          h('p', null, 'You can be upset and still deserve to be heard. Choose a pace and way to communicate that work for you. Every note is optional; you can use an example without sharing personal details.'),
          h('label', { htmlFor: 'fr-repair-context', style: { display: 'block', fontWeight: 700 } }, 'Choose a repair practice context'),
          h('select', { id: 'fr-repair-context', value: repairContext, style: repairControl, onChange: function(ev) { var choices = Object.assign({}, repairSelections); choices[repairBand] = ev.target.value; upd('repairSelections', choices); } },
            REPAIR_PRACTICE.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); }),
            h('option', { value: 'own' }, 'My own example')),
          h('div', { key: repairKey, style: repairCard },
            h('h4', { style: { margin: '0 0 8px', fontSize: '18px' } }, repairOwn ? 'Start with what you want to consider' : repairExample.title),
            h('p', null, repairOwn ? 'You decide how much to include. If there are threats, repeated pressure or fear of retaliation, start with a trusted adult rather than a direct repair conversation.' : repairExample.setup[repairBand]),
            !repairOwn && h('p', null, repairExample.notice),
            repairSupport && h('p', { style: { fontWeight: 700 } }, 'This example starts with support, not a direct repair conversation.'),
            h('label', { htmlFor: 'fr-repair-route', style: { display: 'block', fontWeight: 700 } }, 'A next step to consider'),
            h('select', { id: 'fr-repair-route', value: repairRoute ? repairRoute.id : '', style: repairControl, onChange: function(ev) { saveRepair({ route: ev.target.value }); } },
              h('option', { value: '' }, 'Not chosen'), repairRoutes.map(function(route) { return h('option', { key: route.id, value: route.id }, route.label); })),
            h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, repairRoute ? repairRoute.hint : 'Choose a route to explore, or leave it open. Changing a route keeps your notes.')
          ),
          !repairOwn && h('details', { key: repairKey + '-model', style: repairCard },
            h('summary', { style: repairSummary }, 'Explore example words and their limits'),
            h('p', null, repairExample.model[repairBand]), h('p', null, repairExample.limit),
            h('p', null, 'Adapt or skip these words. No particular tone, eye contact or personal disclosure is required.')),
          h('details', { key: repairKey + '-notes', style: repairCard },
            h('summary', { style: repairSummary }, 'Build my possible plan (optional)'),
            h('p', null, 'Notes are kept with this activity and grade level. They are not monitored and do not request help; contact a trusted adult directly if you need support.'),
            repairFields.map(repairField)),
          h('details', { key: repairKey + '-revisit', style: repairCard },
            h('summary', { style: repairSummary }, 'Revisit when something changes'),
            h('p', null, repairOwn ? 'If a boundary is ignored, circumstances change or someone declines contact, what would you adjust?' : repairExample.changed),
            h('p', null, repairOwn ? 'You can change the plan, seek support or step back. Repair, forgiveness, trust and reconnecting do not have to happen together.' : repairExample.revisit)),
          h('details', { key: repairKey + '-preview', style: repairCard },
            h('summary', { style: repairSummary }, 'Review my plan text'),
            h('label', { htmlFor: 'fr-repair-preview', style: { display: 'block', fontWeight: 700 } }, 'Plan text to review or copy'),
            h('textarea', { id: 'fr-repair-preview', readOnly: true, rows: 10, value: repairPreview, style: Object.assign({}, repairControl, { resize: 'vertical' }) }))
        );
      }

'''
s=s[:a]+replacement+s[b:]
for target in [p, root/'desktop/web-app/public/sel_hub/sel_tool_friendship.js']:
    for attempt in range(5):
        try:
            target.write_bytes(s.encode('utf-8'))
            break
        except OSError:
            if attempt == 4: raise
            time.sleep(1)
test=root/'tests/sel_friendship_controls_a11y.test.js'
t=test.read_text(encoding='utf-8').replace('    expect(text).toContain("\'aria-current\': isCurrent ? \'step\' : undefined");', '    expect(text).toContain("\'aria-label\': \'Friendship repair choices\'");')
test.write_bytes(t.encode('utf-8'))
print('Updated friendship repair content and its public mirror.')
