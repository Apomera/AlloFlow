import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const botSource = fs.readFileSync('allobot_source.jsx', 'utf8');
const botModule = fs.readFileSync('allobot_module.js', 'utf8');
const publicBotModule = fs.readFileSync('desktop/web-app/public/allobot_module.js', 'utf8');
const dispatcherSource = fs.readFileSync('generate_dispatcher_source.jsx', 'utf8');
const dispatcherModule = fs.readFileSync('generate_dispatcher_module.js', 'utf8');
const publicDispatcherModule = fs.readFileSync('desktop/web-app/public/generate_dispatcher_module.js', 'utf8');
const generationHelpersSource = fs.readFileSync('generation_helpers_source.jsx', 'utf8');
const generationHelpersModule = fs.readFileSync('generation_helpers_module.js', 'utf8');
const publicGenerationHelpersModule = fs.readFileSync('desktop/web-app/public/generation_helpers_module.js', 'utf8');
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
    expect(botSource).toContain("const generationStepText = String(generationStep || '').trim().toLowerCase();");
    expect(botSource).toContain('generationStage: generationStageSignal = null');
    expect(botSource).toContain('generationBatchType = null');
    expect(botSource).toContain('const normalizedGenerationStageSignal =');
    expect(botSource).toContain('const generationStage = normalizedGenerationStageSignal || generationStageFromStep;');
    expect(botSource).toContain("data-allo-generation-stage={generationStage || 'working'}");
    expect(botSource).toContain('strokeDashoffset={generationProgressFraction === null ? 24 : 100 - (generationProgressFraction * 100)}');
    expect(botSource).toContain('data-allo-generation-phase={generationAnimationPhase}');
    for (const app of [appSource, generatedApp]) {
      expect(app).toContain('generationProgress={isProcessing ? processingProgress : null}');
      expect(app).toContain('generationError={isProcessing ? null : error}');
      expect(app).toContain("generationStep={isProcessing ? generationStep : ''}");
      expect(app).toContain('generationStage={isProcessing ? generationStage : null}');
      expect(app).toContain('generationBatchType={isProcessing ? generationBatchType : null}');
    }
  });

  it('shows family-specific milestones during Full Pack runs', () => {
    expect(botSource).toContain("const isFullPackGeneration = String(generationBatchType || '').trim().toLowerCase() === 'full-pack';");
    expect(botSource).toContain('const generationMilestoneActiveRef = useRef(false);');
    expect(botSource).toContain('const latestResource = Array.isArray(history) ? history[history.length - 1] : null;');
    expect(botSource).toContain("setCompletedGenerationOutcome('success');");
    expect(botSource).toContain('generationMilestoneTimerRef.current = setTimeout');
    expect(botModule).toContain('generationMilestoneActiveRef');
  });

  it('publishes explicit dispatcher stages while retaining the status-text fallback', () => {
    expect(dispatcherSource).toContain('const GENERATION_STAGE_BY_TYPE = Object.freeze({');
    expect(dispatcherSource).toContain('const setGenerationStatus = (label, stage = null) =>');
    expect(dispatcherSource).toContain('setGenerationStage,');
    expect(dispatcherSource).toContain("setGenerationStatus(t('status_steps.initializing'), initialGenerationStage);");
    expect(dispatcherSource).toContain("setGenerationStatus(t('status_steps.analyzing_visuals'), 'analyze');");
    expect(dispatcherSource).toContain("setGenerationStatus(t('status.refining_image'), 'finalize');");
    expect(generationHelpersSource).toContain('setGenerationStage');
    expect(generationHelpersSource).toContain("setGenerationStage('analyze')");
    expect(generationHelpersSource).toContain("setGenerationStage('finalize')");
    expect(dispatcherModule).toContain('GENERATION_STAGE_BY_TYPE');
    expect(generationHelpersModule).toContain('setGenerationStage');
    expect(publicDispatcherModule).toBe(dispatcherModule);
    expect(publicGenerationHelpersModule).toBe(generationHelpersModule);
  });

  it('pauses generation motion while hidden or outside the viewport', () => {
    expect(botSource).toContain('document.addEventListener(\'visibilitychange\', handleVisibilityChange);');
    expect(botSource).toContain('new IntersectionObserver');
    expect(botSource).toContain('const generationMotionPaused = isDocumentHidden || isGenerationOffscreen;');
    expect(botSource).toContain('allobot-generation-paused');
    expect(botSource).toContain('else if (generationMotionPaused) { _svg.pauseAnimations(); }');
    expect(botModule).toContain('new IntersectionObserver');
  });

  it('threads the active generation type from the canonical app into AlloBot', () => {
    const requiredAppTokens = [
      'const [alloGenerationType, setAlloGenerationType] = useState(null);',
      'if (type) setAlloGenerationType(type);',
      "setAlloGenerationType('lesson-plan');",
      "setAlloGenerationType('full-pack');",
      "generationType={isProcessing ? (alloGenerationType || activeView) : (isChatProcessing ? 'chat' : null)}",
      'generationProgress={isProcessing ? processingProgress : null}',
      "generationStep={isProcessing ? generationStep : ''}",
    ];

    for (const token of requiredAppTokens) {
      expect(appSource).toContain(token);
      expect(generatedApp).toContain(token);
    }
  });
});
