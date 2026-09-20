'use strict';
// Illustration may add image resources, but cannot silently lose source activities or references.
function validateEditionPair(source, illustrated) {
  const errors = [];
  const original = Array.isArray(source?.history) ? source.history : [];
  const actual = Array.isArray(illustrated?.history) ? illustrated.history : [];
  if (!original.length || !actual.length) return ['Both editions need a nonempty history array.'];
  function indexRows(rows, edition) {
    const index = new Map();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' || !row.id.trim()) {
        errors.push('Invalid ' + edition + ' resource ID.'); continue;
      }
      if (index.has(row.id)) errors.push('Duplicate ' + edition + ' resource: ' + row.id);
      index.set(row.id, row);
      if (typeof row.type !== 'string' || !row.type.trim()) errors.push('Invalid ' + edition + ' resource type: ' + row.id);
    }
    return index;
  }
  const sourceById = indexRows(original, 'source'), illustratedById = indexRows(actual, 'illustrated');
  for (const [id, resource] of sourceById) {
    const peer = illustratedById.get(id);
    if (!peer) errors.push('Missing source resource: ' + id);
    else if (peer.type !== resource.type) errors.push('Changed source resource type: ' + id + ' (' + resource.type + ' -> ' + peer.type + ')');
  }
  for (const [edition, index] of [['source', sourceById], ['illustrated', illustratedById]]) {
    for (const resource of index.values()) {
      const data = resource.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
      const checkRef = (ref, field) => {
        if (typeof ref !== 'string' || !ref.trim()) errors.push(edition + ' ' + resource.id + ' has invalid ' + field);
        else if (!index.has(ref)) errors.push(edition + ' ' + resource.id + ' has unresolved resource reference: ' + ref);
      };
      if (data.objectives !== undefined) {
        if (!Array.isArray(data.objectives)) errors.push(edition + ' ' + resource.id + ' objectives must be an array');
        else for (const objective of data.objectives) {
          if (!objective || typeof objective !== 'object' || Array.isArray(objective)) errors.push(edition + ' ' + resource.id + ' has invalid objective');
          else if (objective.resourceRef !== undefined) checkRef(objective.resourceRef, 'objective resourceRef');
        }
      }
      if (data.lessonRef !== undefined) {
        if (!data.lessonRef || typeof data.lessonRef !== 'object' || Array.isArray(data.lessonRef)) errors.push(edition + ' ' + resource.id + ' has invalid lessonRef');
        else checkRef(data.lessonRef.resourceId, 'lessonRef.resourceId');
      }
    }
  }
  return errors;
}
module.exports = { validateEditionPair };
