/* Only provider responses are synthetic; UI, evidence engine and transport remain canonical. */
window.auditOptions = [];
window.auditLongTranscript = Array.from({ length: 18 }, (_, index) => 'Section ' + String(index + 1).padStart(2, '0') + ': ' + ['clouds', 'rivers', 'forests'][index % 3] + ' provide evidence marker ' + (index + 1) + '. This distinct transcript passage is long enough to inspect and select as source evidence.').join('\n\n');
const OriginalSourceGenPanel = AlloModules.SourceGenPanel;
AlloModules.SourceGenPanel = function ClipPreviewPanel(props) {
  return React.createElement(OriginalSourceGenPanel, { ...props,
    handleGenerateSource: options => {
      auditOptions.push(JSON.parse(JSON.stringify(options)));
      if (options.reviewedResearch) return Promise.resolve({ ok: true });
      return props.handleGenerateSource(options);
    }
  });
};
