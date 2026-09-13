export function canMixPractice(node) {
  const text = [node.instruction,node.explanation,...(node.hints || []),...(node.options || []),...(node.items || []),...(node.controls || []).flatMap(control => [control.label,...control.options])].join(' ');
  // Conservatively keep wording that may depend on displayed choice positions.
  return !(/\b(?:all|none|both|any)\s+(?:of\s+)?(?:the\s+)?(?:above|below|preceding|following)\b|\b(?:option|choice|answer)s?\s+(?:[a-e]|[1-5]|one|two|three|four|five)\b|\b(?:first|second|third|fourth|fifth|last|top|bottom|previous|next)\s+(?:option|choice|answer|item)\b|\b[a-e]\s+(?:and|or|&)\s+[a-e]\b|\b(?:todas?|ninguna|ambas)\s+(?:las?\s+)?(?:anteriores|siguientes)\b|\b(?:toutes?|aucune)\s+(?:les?\s+)?(?:réponses?\s+)?(?:ci-dessus|précédentes?)\b/i.test(text));
}

// Response orders are local practice variants. Lesson wording and answer meanings stay intact.
export function practiceVariant(node, round = 0) {
  const turn = Number.isSafeInteger(round) && round > 0 ? round : 0;
  const rotation = values => {
    const offset = turn % values.length;
    return values.slice(offset).concat(values.slice(0, offset));
  };
  if (!turn || !canMixPractice(node)) return node;
  if (node.kind === 'choice') {
    const indices = rotation(node.options.map((_, index) => index));
    return { ...node, options: indices.map(index => node.options[index]), answer: indices.indexOf(node.answer) };
  }
  if (node.kind === 'settings') return { ...node, controls: node.controls.map(control => {
    const indices = rotation(control.options.map((_, index) => index));
    return { ...control, options: indices.map(index => control.options[index]), answer: indices.indexOf(control.answer) };
  }) };
  if (node.kind === 'order') {
    const indices = rotation(node.items.map((_, index) => index));
    return { ...node, items: indices.map(index => node.items[index]), order: node.order.map(index => indices.indexOf(index)) };
  }
  return node;
}

// Review only locations with recorded evidence or an explicit practice priority.
// Unseen concepts must not be presented as missing learner responses.
export function conceptPriorities(report) {
  const eligible = new Set(report.learners.flatMap(learner => [
    ...learner.locations.filter(item => item.answered > 0).map(item => item.id),
    ...learner.practice.map(item => item.id)
  ]));
  return report.concepts.map(concept => {
    const records = report.learners.map(learner => ({ learner, locations: learner.locations.filter(item => item.conceptId === concept.id && eligible.has(item.id)) }));
    const pairs = records.flatMap(item => item.locations), reviewed = new Set(pairs.map(item => item.id));
    const group = predicate => records.filter(item => item.locations.some(predicate)).map(({learner,locations}) => ({uid:learner.uid,name:learner.name,locations:locations.filter(predicate).map(item=>({id:item.id,name:item.name}))}));
    return { ...concept, reviewed: reviewed.size, attempted: pairs.filter(item => item.answered > 0).length,
      firstCorrect: pairs.filter(item => item.firstCorrect === true).length, latestCorrect: pairs.filter(item => item.lastCorrect === true).length,
      revisit: group(item => item.answered > 0 && item.lastCorrect === false),
      missing: group(item => !item.answered),
      strengthen: group(item => item.improved === true)
    };
  });
}
