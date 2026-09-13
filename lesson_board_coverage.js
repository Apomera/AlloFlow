const normalize = value => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const textOf = value => typeof value === 'string' || typeof value === 'number' ? String(value) : value && typeof value === 'object' ? String(value.text || value.label || '') : '';
export function assessmentCatalog(content) {
  const questions = Array.isArray(content?.data?.questions) ? content.data.questions : [];
  return questions.map((item, index) => {
    const q = item && typeof item === 'object' ? item : { question: textOf(item) };
    const prompt = textOf(q.question || q.prompt || q.text), options = Array.isArray(q.options) ? q.options : [];
    const keyed = Number.isInteger(q.correctIndex) ? options[q.correctIndex] : Number.isInteger(q.correctAnswer) ? options[q.correctAnswer] : q.correctAnswer;
    const evidence = [prompt, textOf(keyed), q.explanation, q.factCheck, q.rationale, q.modelAnswer, q.sampleAnswer, q.expectedFill, q.orderingPrinciple].filter(value => typeof value === 'string' && value.trim()).map(normalize);
    return { index: index + 1, label: prompt.slice(0, 180) || 'Item ' + (index + 1), evidence };
  });
}
export function assessmentCoverage(board, content) {
  const catalog = assessmentCatalog(content);
  const items = catalog.map(item => ({ index: item.index, label: item.label, locations: board ? board.locations.filter(node => {
    const quote = normalize(node.sourceQuote);
    // Exact, substantial excerpts support traceable links. Similar keywords alone do not.
    return quote.length >= 24 && item.evidence.some(part => part.includes(quote));
  }).map(node => ({ id: node.id, name: node.name })) : [] }));
  return { version: 1, total: items.length, linked: items.filter(item => item.locations.length).length, items, method: 'exact-excerpt' };
}
export function coverageSnapshot(coverage) {
  if (!coverage?.total) return null;
  // The full bank stays in setup. A live session carries only counts and its board's links.
  const linked = coverage.items.filter(item => item.locations.length);
  const items = linked.slice(0, 48).map(item => ({ index: item.index, label: item.label, locations: item.locations.map(node => ({ id: node.id, name: node.name })) }));
  return { version: 1, total: coverage.total, linked: coverage.linked, method: 'exact-excerpt', items, listed: items.length };
}
