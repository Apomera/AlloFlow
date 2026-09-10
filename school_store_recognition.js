// Shared local-only recognition grammar. Build tools embed this factory verbatim.
// The detector is deliberately broader than the parser: callers must run it before
// chat persistence, AI, or tool routing. It is NOT a universal personal-data detector.
// Neither function resolves people, chooses categories, authorizes, or awards points.
function createSchoolStoreRecognitionTools() {
  'use strict';
  var invisible = /[\p{Cf}\u034f\u180b-\u180d\ufe00-\ufe0f]/gu;
  var forbidden = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\p{Cf}\u034f\u180b-\u180d\ufe00-\ufe0f\ud800-\udfff]/u;
  var points = /\b(?:points?|pts?|puntos?)\b/i;
  var numberPoints = /(?:[+\-]?\d[\d.,]*|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|hundred|cero|un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:points?|pts?|puntos?)\b/i;
  var action = /\b(?:give|award|grant|add|assign|credit|deduct|remove|revoke|reward|recognize|gets?|receives?|earns?|deserves?|gains?|wins?|otorga|otorgar|da|dar|dale|suma|añade|recompensa|recibe|gana|merece)\b/i;
  var additional = /(?:\b(?:and|then|also|y|luego|también|después)\s+|[.!?]\s*)(?:please\s+)?(?:give|award|grant|add|assign|credit|deduct|remove|revoke|reward|send|delete|open|write|summari[sz]e|translate|explain|show|ignore|otorga|da|suma|añade|envía|borra|abre|escribe|resume|traduce|explica)\b/i;

  function isRecognitionRequest(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return false;
    // Normalize compatibility characters and strip invisible obfuscators ONLY for
    // detection. The strict parser rejects invisible/control characters outright.
    var text = raw.normalize('NFKC').replace(invisible, '').toLowerCase();
    var words = text.replace(/[_-]/g, ' ');
    // Check both control-as-space and control-as-obfuscation interpretations.
    words = words.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ') + ' ' + words.replace(/[\u0000-\u001f\u007f-\u009f]/g, '');
    // Exact academic topics only, with no trailing recipient or extra directive.
    // Do not generalize this into an exemption for arbitrary "explain ..." text.
    if (/^(?:please\s+)?(?:(?:explain|what\s+is)\s+(?:speech|pattern|image|optical\s+character|facial)\s+recognition|create\s+a\s+lesson\s+about\s+(?:the\s+)?nobel\s+(?:prizes|awards))[.!?]?\s*$/.test(text)) return false;
    // A tightly bounded ordinary academic list request is not a recognition draft.
    // Any extra directive, sentence, reward/person marker defeats this exception.
    var academic = /^(?:please\s+)?give\s+me\s+(?:\d+|five|ten|three)\s+(?:bullet|key|main|talking)\s+points\s+(?:about|on|explaining)\s+[^\r\n;.!?{}<>]+[.!?]?\s*$/.test(text);
    if (academic && !additional.test(text) && !/\b(?:student|learner|codename|award|reward|recognition|earned|deserves?|give|grant)\b/.test(text.replace(/^(?:please\s+)?give\b/, '')) && !numberPoints.test(text.replace(/^.*?\bpoints\b/, ''))) return false;
    if (/\b(?:school\s+(?:store|rewards?)|alloflow\s+(?:store|rewards?))\b/.test(words)) return true;
    if (/\b(?:award|awards|awarded|awarding|reward|rewarded|rewarding|recognize|recognise|recognition)\b/.test(words)) return true;
    if (points.test(words) && (action.test(words) || numberPoints.test(words))) return true;
    // Typed/JSON-like tool sentinels must not sneak past the natural-language guard.
    if (/[{}<>]/.test(text) && /(?:award|recognition|reward|give[ _-]?points)/.test(text)) return true;
    if (/[{}]/.test(text) && /["'](?:codename|learnerid|studentid)["']\s*:/.test(text) && /["'](?:amount|points)["']\s*:/.test(text)) return true;
    if (points.test(words) && /\b(?:student|learner|codename|studentid|learnerid|amount|reason)\b/.test(words)) return true;
    return false;
  }

  function failure(code) { return { ok: false, code: code }; }

  function parseRecognitionRequest(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return failure('INPUT_REQUIRED');
    if (raw.length > 512) return failure('TOO_LONG');
    if (forbidden.test(raw)) return failure('INVALID_CHARACTERS');
    var text = raw.normalize('NFKC').trim();
    if (text.length > 512) return failure('TOO_LONG');
    if (/[;]|&&|\|\|/.test(text) || additional.test(text)) return failure('MULTIPLE_COMMANDS');
    var match, codename, amountText, reason;
    // Amount-first is deliberately only the explicit award/otorga ... to/a form.
    match = /^(?:award) +(\S+) +points? +to +(.+?) +for(?: +(.*))?$/i.exec(text);
    if (!match) match = /^otorga +(\S+) +puntos? +a +(.+?) +por(?: +(.*))?$/i.exec(text);
    if (match) { amountText = match[1]; codename = match[2]; reason = match[3] || ''; }
    else {
      match = /^(?:give|award) +(.+?) +(\S+) +points? +for(?: +(.*))?$/i.exec(text);
      if (!match) match = /^(?:da|otorga) +(.+?) +(\S+) +puntos? +por(?: +(.*))?$/i.exec(text);
      if (!match) return failure('UNSUPPORTED_FORMAT');
      codename = match[1]; amountText = match[2]; reason = match[3] || '';
    }
    // Reject signs, fractions, exponent notation, words and leading zeros. Never
    // coerce, round, truncate, infer a recipient, or parse several awards at once.
    if (!/^[1-9]\d{0,3}$/.test(amountText) || Number(amountText) > 1000 || /(?:^| )[-+]$/.test(codename)) return failure('INVALID_AMOUNT');
    codename = codename.trim();
    reason = reason.trim();
    if (!codename || codename.length > 80 || !/[\p{L}\p{N}]/u.test(codename) || /[{}\[\]<>;,]|\s(?:and|y)\s/i.test(codename) || /^(?:__proto__|prototype|constructor)$/i.test(codename)) return failure('INVALID_CODENAME');
    if (!reason || reason.length > 180) return failure('INVALID_REASON');
    if (numberPoints.test(reason) || (action.test(reason) && points.test(reason))) return failure('MULTIPLE_COMMANDS');
    return { ok: true, codename: codename, amount: Number(amountText), reason: reason };
  }

  return { isRecognitionRequest: isRecognitionRequest, parseRecognitionRequest: parseRecognitionRequest };
}
