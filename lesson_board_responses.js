// First and latest responses, plus answer reveals, per learner and stop. They are kept on the
// device that resolves activities (the teacher's in live play) so answer content never enters
// the shared session document. The 20 most recent games are kept per app and owner.
const MAX_GAMES = 20, MAX_CHARS = 600000;
export const responseStoreKey = (appId, owner) => 'allo-board-responses-v1:' + encodeURIComponent(String(appId || 'alloflow-local')) + ':' + encodeURIComponent(String(owner || 'local'));
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
function readStore(storage, appId, owner) {
  try { const data = JSON.parse(storage.getItem(responseStoreKey(appId, owner)) || 'null'); return object(data) && data.version === 1 && object(data.games) ? data : { version: 1, games: {} }; }
  catch (_) { return { version: 1, games: {} }; }
}
function writeStore(storage, appId, owner, data) {
  const games = Object.entries(data.games).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, MAX_GAMES);
  const text = JSON.stringify({ version: 1, games: Object.fromEntries(games) });
  if (text.length <= MAX_CHARS) storage.setItem(responseStoreKey(appId, owner), text);
}
function update(storage, context, change) {
  const attempt = String(context?.attemptId || '');
  if (!attempt || !storage) return;
  try { const data = readStore(storage, context.appId, context.owner), game = data.games[attempt] || (data.games[attempt] = { at: 0, stops: {} }); game.at = Date.now(); change(game.stops); writeStore(storage, context.appId, context.owner, data); } catch (_) {}
}
// answers: { uid: value } for one stop, recorded just before the activity resolves.
export function recordResponses(storage, context, locationId, answers) {
  if (!locationId || !object(answers)) return;
  update(storage, context, stops => {
    const stop = stops[locationId] || (stops[locationId] = {});
    for (const [uid, value] of Object.entries(answers)) {
      if (typeof value !== 'string' || !value || value.length > 64 || uid.length > 128) continue;
      const entry = stop[uid] || (stop[uid] = { first: value });
      entry.latest = value;
    }
  });
}
// uid '*' marks a reveal shown to the whole class (the teacher's screen).
export function recordReveal(storage, context, locationId, uid) {
  if (!locationId || !uid) return;
  update(storage, context, stops => { const stop = stops[locationId] || (stops[locationId] = {}); const entry = stop[uid] || (stop[uid] = {}); entry.revealed = true; });
}
export function readResponses(storage, context) {
  const attempt = String(context?.attemptId || '');
  if (!attempt || !storage) return {};
  try { return readStore(storage, context.appId, context.owner).games[attempt]?.stops || {}; } catch (_) { return {}; }
}
