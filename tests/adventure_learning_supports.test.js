import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const viewSource = read('view_adventure_source.jsx');
const viewModule = read('view_adventure_module.js');
const appSource = read('AlloFlowANTI.txt');
const handlerSource = read('adventure_handlers_source.jsx');

describe('Adventure typing pace support', () => {
  it('is default-off and only reports pace for free response', () => {
    expect(appSource).toContain('adventureTypingPaceEnabled: false');
    expect(viewSource).toContain('adventureTypingPaceEnabled && adventureFreeResponseEnabled');
    expect(viewSource).toContain("Math.round((charCount / 5) / (activeMs / 60000))");
  });

  it('pauses timing away from the editor and resets each cleared turn', () => {
    expect(viewSource).toContain("document.addEventListener('visibilitychange', onVisibility)");
    expect(viewSource).toContain('onFocus={typingPace.resume}');
    expect(viewSource).toContain('onBlur={typingPace.pause}');
    expect(viewSource).toContain('if (!enabled || !text) reset();');
  });

  it('suppresses comparative WPM for paste and dictation', () => {
    expect(viewSource).toContain("typingPace.markAssisted('paste')");
    expect(viewSource).toContain("assistedRef.current = 'dictation'");
    expect(viewSource).toContain("t('adventure.typing_pace_assisted') || 'assisted input'");
  });

  it('covers both standard and immersive free-response editors', () => {
    expect(viewSource.match(/onChange=\{handleAdventureTextChange\}/g)?.length).toBe(2);
    expect(viewSource).toContain('{renderTypingPace(true)}');
    expect(viewSource).toContain('{renderTypingPace(false)}');
  });
});

describe('Adventure scene reading practice', () => {
  it('is default-off and student initiated', () => {
    expect(appSource).toContain('adventureFluencyEnabled: false');
    expect(viewSource).toContain('data-help-key="adventure_scene_reading_practice"');
    expect(viewSource).toContain('data-help-key="adventure_immersive_reading_practice"');
    expect(viewSource).toContain("var _cloudState = React.useState(false)");
  });

  it('uses local analysis first and requires explicit consent for cloud fallback', () => {
    const localIndex = viewSource.indexOf('fluency.analyzeFluencyLocal');
    const cloudIndex = viewSource.indexOf('fluency.analyzeFluencyWithGemini');
    expect(localIndex).toBeGreaterThan(-1);
    expect(cloudIndex).toBeGreaterThan(localIndex);
    expect(viewSource).toContain('if (!analysis && allowCloud');
    expect(viewSource).toContain('this recording may be sent to Google Gemini');
  });

  it('marks every generated scene passage uncalibrated and descriptive-only', () => {
    expect(viewSource).toContain('calibrated: false');
    expect(appSource).toContain("sourceKind: 'adventure-scene'");
    expect(appSource).toContain('benchmarkEligible: false');
    expect(appSource).not.toContain('handleScoreUpdate(result.wcpm');
  });

  it('does not save until the learner chooses the Save action', () => {
    expect(viewSource).toContain("t('adventure.fluency_save') || 'Save to reading history'");
    expect(viewSource).toContain("typeof props.onSave !== 'function'");
    expect(viewSource).toContain('await props.onSave(result)');
    expect(appSource).toContain('const saveAdventureFluencyResult = useCallback');
  });

  it('persists support choices in saved and live Adventure configuration', () => {
    expect(appSource).toContain('typingPace: adventureTypingPaceEnabled');
    expect(appSource).toContain('sceneReadingPractice: adventureFluencyEnabled');
    expect(handlerSource).toContain('savedConfig.typingPace');
    expect(handlerSource).toContain('savedConfig.sceneReadingPractice');
  });

  it('keeps generated Adventure view assets synchronized', () => {
    expect(read('desktop/web-app/public/view_adventure_module.js')).toBe(viewModule);
    expect(viewModule).toContain('adventureTypingPaceEnabled');
    expect(viewModule).toContain('AdventureFluencyPractice');
  });
});
