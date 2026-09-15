const fs=require('fs');
let p='applied_challenge_source.jsx',s=fs.readFileSync(p,'utf8');
s=s.replace("const [artifactError, setArtifactError] = React.useState('');", "const [artifactError, setArtifactError] = React.useState('');\n  React.useEffect(() => { setArtifactLink(data.workspace.artifactUrl); }, [data.workspace.artifactUrl]);");
fs.writeFileSync(p,s);
p='doc_pipeline_source.jsx';s=fs.readFileSync(p,'utf8');const start=s.indexOf('const _acFallbackModel = (raw) => {'),end=s.indexOf('const m = _acModule',start);let block=s.slice(start,end);
block=block.replace("const visual = raw.visual || {};", "const visual = raw.visual || {};\n              const factSources = Array.isArray(brief.factSources) ? brief.factSources : [];");
block=block.replaceAll('(brief.factSources || [])','factSources');
block=block.replace("['testReflection', '8. Test or challenge the draft', false]", "['testReflection', '8. Test or challenge the draft', true]").replace("['revision', '9. Revise after testing', false]", "['revision', '9. Keep or revise after checking', true]");
fs.writeFileSync(p,s.slice(0,start)+block+s.slice(end));
p='tests/applied_challenge_interaction.test.js';s=fs.readFileSync(p,'utf8');
s=s.replace("it('treats a first criteria note",`it('refreshes the artifact link when saved work is restored for the same resource', async () => {
    await renderChallenge();
    const updated = baseData(); updated.workspace.artifactUrl = 'https://example.org/restored-work';
    await replaceChallenge('challenge-1', updated);
    expect(host.querySelector('input[type="url"]').value).toBe('https://example.org/restored-work');
  });

  it('treats a first criteria note`);fs.writeFileSync(p,s);
