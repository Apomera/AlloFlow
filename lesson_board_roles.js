export const CLASS_ROLES = [
  { id: 'navigator', key: 'role_navigator', label: 'Navigator', helpKey: 'role_navigator_help', help: 'Invite route proposals and explain which location the party could explore next.' },
  { id: 'reader', key: 'role_reader', label: 'Evidence Reader', helpKey: 'role_reader_help', help: 'Read or summarize the lesson evidence and invite another interpretation.' },
  { id: 'builder', key: 'role_builder', label: 'Builder', helpKey: 'role_builder_help', help: 'Compare project costs and benefits, and explain what the party could build.' }
];
export function roleAssignments(config, roster = {}, turn = 0) {
  if (!config?.enabled) return [];
  // Learners receive a filtered roster. The teacher's move snapshot is authoritative.
  const members = [...new Set(Array.isArray(config.members) ? config.members.filter(uid => typeof uid === 'string' && uid) : Object.keys(roster).sort())];
  if (!members.length) return [];
  const move = Number.isInteger(turn) && turn >= 0 ? turn : 0;
  return CLASS_ROLES.map((role, index) => ({ ...role, uid: members[(move + index) % members.length] }));
}
export function rolesConfig(enabled, roster = {}) { return { enabled: !!enabled, members: Object.keys(roster).sort() }; }
