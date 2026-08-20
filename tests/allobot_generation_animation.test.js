import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const botSource = fs.readFileSync('allobot_source.jsx', 'utf8');
const botModule = fs.readFileSync('allobot_module.js', 'utf8');
const publicBotModule = fs.readFileSync('desktop/web-app/public/allobot_module.js', 'utf8');
const appSource = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const generatedApp = fs.readFileSync('desktop/web-app/src/App.jsx', 'utf8');

describe('AlloBot generation animation signatures', () => {
  it('uses deterministic broad families for resource types', () => {
    const families = {
      analysis: 'analyze',
      outline: 'organize',
      simplified: 'clarify',
      quiz: 'assess',
      image: 'create',
      timeline: 'explore',
      persona: 'interview',
      math: 'solve',
    };

    for (const [type, family] of Object.entries(families)) {
      expect(botSource).toContain(`${type}: '${family}'`);
    }

    expect(botSource).toContain('const alloBotGenerationFamily = (generationType, activeView) =>');
    expect(botSource).toContain("|| 'generic';");
    expect(botSource).toContain('const generationFamily = alloBotGenerationFamily(generationType, activeView);');
  });

  it('provides a distinct animated SVG signature for each family', () => {
    const signatures = [
      'animate-allobot-generation-card',
      'animate-allobot-generation-scan',
      'animate-allobot-generation-resolve',
      'animate-allobot-generation-line',
      'animate-allobot-generation-clock',
      'animate-allobot-generation-question',
      'animate-allobot-generation-check',
      'animate-allobot-generation-spark',
      'animate-allobot-generation-complete',
      'animate-allobot-generation-completion-check',
      'animate-allobot-generation-progress',
      'animate-allobot-generation-enter',
    ];

    for (const signature of signatures) {
      expect(botSource).toContain(signature);
      expect(botModule).toContain(signature);
    }

    expect(botSource).toContain('data-allo-generation-family={alloBotGenerationFamily(generationType, activeView)}');
    expect(botSource).toContain('.allobot-motion-disabled *');
    expect(publicBotModule).toBe(botModule);
  });

  it('keeps the completion handoff tied to the last active family', () => {
    expect(botSource).toContain('lastGenerationFamilyRef.current = alloBotGenerationFamily(generationType, activeView);');
    expect(botSource).toContain('setCompletedGenerationFamily(lastGenerationFamilyRef.current || \'generic\');');
    expect(botSource).toContain('const generationOutcome = generationError');
    expect(botSource).toContain("outcome === 'cancelled'");
    expect(botSource).toContain('const generationHistorySignature =');
    expect(botSource).toContain('generationHistoryBaselineRef.current = generationHistorySignature;');
    expect(botSource).toContain('const hasVisibleResource = generationHistoryBaselineRef.current !== generationHistorySignature;');
    expect(botSource).toContain('data-allo-generation-complete={completedGenerationFamily}');
    expect(botSource).toContain('data-allo-generation-outcome={completedGenerationOutcome}');
    expect(botModule).toContain('renderGenerationCompletion');
  });

  it('threads batch progress into a determinate or indeterminate hologram ring', () => {
    expect(botSource).toContain('generationProgress = null');
    expect(botSource).toContain('const generationProgressFraction =');
    expect(botSource).toContain('const [generationPhase, setGenerationPhase] = useState(0);');
    expect(botSource).toContain('const generationProgressDasharray =');
    expect(botSource).toContain('strokeDashoffset={generationProgressFraction === null ? 24 : 100 - (generationProgressFraction * 100)}');
    expect(botSource).toContain('data-allo-generation-phase={generationPhase}');
    for (const app of [appSource, generatedApp]) {
      expect(app).toContain('generationProgress={isProcessing ? processingProgress : null}');
      expect(app).toContain('generationError={isProcessing ? null : error}');
    }
  });

  it('threads the active generation type from the canonical app into AlloBot', () => {
    const requiredAppTokens = [
      'const [alloGenerationType, setAlloGenerationType] = useState(null);',
      'if (type) setAlloGenerationType(type);',
      "setAlloGenerationType('lesson-plan');",
      "setAlloGenerationType('full-pack');",
      "generationType={isProcessing ? (alloGenerationType || activeView) : (isChatProcessing ? 'chat' : null)}",
      'generationProgress={isProcessing ? processingProgress : null}',
    ];

    for (const token of requiredAppTokens) {
      expect(appSource).toContain(token);
      expect(generatedApp).toContain(token);
    }
  });
});
