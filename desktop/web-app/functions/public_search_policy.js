/* One search-query rule for every transport: the browser, the Canvas Worker and the
 * Firebase proxy. Any subject may be searched; there is no topic list. The rule only
 * tidies the query and refuses one that looks like it carries a personal identifier
 * (an email address, a phone number, a Social Security-style number or a student ID
 * number), so a pasted student detail is not sent to Serper. Names are not detected.
 */
function publicSearchQuery(value) {
  return publicSearchQuery.reason(value) ? '' : value.trim().replace(/\s+/g, ' ');
}
publicSearchQuery.MAX_LENGTH = 500;
// '' when the query may be sent; otherwise why it may not.
publicSearchQuery.reason = function (value) {
  if (typeof value !== 'string' || !value.trim()) return 'empty';
  if (value.length > publicSearchQuery.MAX_LENGTH) return 'too-long';
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) return 'control-characters';
  const q = value.trim().replace(/\s+/g, ' ');
  if (/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.test(q)) return 'email';
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(q) || /\b(?:student|pupil|learner)\s*(?:id|#|number|no\.?)\s*[:#]?\s*\d{3,}/i.test(q)) return 'id-number';
  // Grouped like a phone number (555-123-4567, (555) 123 4567); bare long numbers are allowed.
  if (/(?:^|\D)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)/.test(q)) return 'phone';
  return '';
};
// A sentence a teacher can act on, or '' when the query is fine.
publicSearchQuery.explain = function (value) {
  const reason = publicSearchQuery.reason(value);
  if (!reason) return '';
  if (reason === 'email') return 'This search looks like it contains an email address, so it was not sent. Remove it and try again.';
  if (reason === 'phone') return 'This search looks like it contains a phone number, so it was not sent. Remove it and try again.';
  if (reason === 'id-number') return 'This search looks like it contains an ID number, so it was not sent. Remove it and try again.';
  if (reason === 'too-long') return 'This search is longer than 500 characters. Shorten it and try again.';
  return 'Enter a search of 1 to 500 characters.';
};
// Every intent follows the same rule; these names stay so callers need no change.
publicSearchQuery.userTopic = function (value) { return publicSearchQuery(value); };
publicSearchQuery.forIntent = function (value) { return publicSearchQuery(value); };
module.exports = publicSearchQuery;
