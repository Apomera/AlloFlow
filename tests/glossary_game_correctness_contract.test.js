import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('games_source.jsx', 'utf8');
const built = readFileSync('games_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/games_module.js', 'utf8');

describe('Glossary game correctness improvements', () => {
  it('keeps Memory image cards identifiable to nonvisual players', () => {
    const component = source.slice(source.indexOf('const MemoryGame ='), source.indexOf('const MatchingGame ='));
    expect(component).toContain('meaningfulImageLabel');
    expect(component).toContain('accessibleLabel: accessibleLabel1');
    expect(component).toContain('accessibleLabel: accessibleLabel2');
    expect(component).toContain('alt={card.accessibleLabel');
    expect(component).not.toContain('const cardContent = cards[index].type === \'image\' ? "Image card"');
  });

  it('prevents revealed Crosswords from receiving credit and supports touch entry', () => {
    const component = source.slice(source.indexOf('const CrosswordGame ='), source.indexOf('const SyntaxScramble ='));
    expect(component).toContain('const [wasRevealed, setWasRevealed] = useState(false)');
    expect(component).toContain('if (isWon || wasRevealed) return;');
    expect(component).toContain('currentScore = Math.max(0, currentScore - hintsUsed)');
    expect(component).toContain("status: wasRevealed ? 'incorrect' : 'correct'");
    expect(component).toContain('ref={crosswordTouchInputRef}');
    expect(component).toContain('inputMode="text"');
    expect(component).toContain('onChange={handleTouchInputChange}');
  });

  it('stops hidden Bingo caller work and prefers saved audio', () => {
    const component = source.slice(source.indexOf('const BingoGame ='), source.indexOf('const StudentBingoGame ='));
    expect(component).toContain('const stopCallerPlayback = () =>');
    expect(component).toContain('clearTimeout(autoPlayTimerRef.current)');
    expect(component).toContain('onClick={handleExitCaller}');
    expect(component).toContain('onClick={handleCloseBingo}');
    expect(component).toContain('window.__alloResolveGlossaryAudio');
    expect(component).toContain('if (playPromise !== undefined) await playPromise');
  });

  it('bounds Word Scramble and fully resets replay state', () => {
    const component = source.slice(source.indexOf('const WordScrambleGame ='), source.indexOf('const _MultiZoneColorMap'));
    expect(source).toContain('SCRAMBLE_MAX_SHUFFLE_ATTEMPTS');
    expect(source).not.toContain('return result === word ? scrambleWord(word) : result');
    expect(component).toContain('canScrambleWord(item.term)');
    expect(component).toContain('const resetScrambleGame = () =>');
    expect(component).toContain('setHintLevel(0)');
    expect(component).toContain('No terms are available for Word Scramble.');
  });

  it('keeps built and deployed game artifacts synchronized', () => {
    expect(deployed).toBe(built);
  });
});
