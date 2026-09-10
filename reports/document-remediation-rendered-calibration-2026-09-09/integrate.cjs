const fs=require('fs');const p='dev-tools/document_export_at_acceptance.cjs';let s=fs.readFileSync(p,'utf8');const nl=s.includes('\r\n')?'\r\n':'\n';s=s.replace(/\r\n/g,'\n');const anchor='      artifacts.push({ id: artifact.id, documentKind: artifact.documentKind, kind: artifact.kind, path: file,';
if(!s.includes(anchor))throw Error('Missing artifact report boundary');
s=s.replace(anchor,`      // Optional source-authored whole-artifact comparison. It may require review
      // or remain unavailable; it never promotes human acceptance or delivery.
      if (artifact.sourceFidelity) {
        try {
          if (artifact.kind !== 'html') throw Error('Rendered source fidelity currently supports HTML artifacts only.');
          const source = path.resolve(path.dirname(manifestPath), artifact.sourceFidelity.sourcePath);
          const rendered = await require('./rendered_document_fidelity.cjs').compareFiles(browser, source, file, artifact.sourceFidelity);
          observations.renderedFidelity = rendered;
          observations.checks.push({ id: 'html.rendered-source-fidelity', status: rendered.status === 'passed' ? 'passed' : rendered.status === 'unavailable' ? 'unavailable' : 'failed', observed: { status: rendered.status, coverage: rendered.coverage } });
        } catch (error) {
          observations.renderedFidelity = { status: 'unavailable', reason: String(error.message).slice(0, 500), humanValidation: 'not-run' };
          observations.checks.push({ id: 'html.rendered-source-fidelity', status: 'unavailable', observed: observations.renderedFidelity.reason });
        }
      }
`+anchor);fs.writeFileSync(p,s.replace(/\n/g,nl));
