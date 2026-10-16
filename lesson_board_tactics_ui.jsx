import { EXPEDITION_KIT_IDS, expeditionKitMeta, expeditionKitProgress } from './lesson_board_tactics.js';
import { tr } from './lesson_board_strings.js';
const React = window.React;

function resourceNames(board, t) {
  return [board?.resources?.[0] || tr(t, 'kit_resource_0', 'first resource'), board?.resources?.[1] || tr(t, 'kit_resource_1', 'second resource')];
}
const kitLabel = (kit, t) => kit.id === 'surveyor' ? tr(t, 'kit_surveyor', 'Surveyor') : kit.id === 'builder' ? tr(t, 'kit_builder', 'Builder') : tr(t, 'kit_pathfinder', 'Pathfinder');
const amounts = (values, names) => values.flatMap((value, i) => value > 0 ? ['+' + value + ' ' + names[i]] : []).join(' · ');
function triggerText(kit, names, t) {
  if (kit.id === 'surveyor') return tr(t, 'kit_surveyor_trigger', 'First two new concepts explored: +2 {resource} each.', { resource: names[0] });
  if (kit.id === 'builder') return tr(t, 'kit_builder_trigger', 'First two constructions completed: +2 {resource} each, after paying the full cost.', { resource: names[1] });
  return tr(t, 'kit_pathfinder_trigger', 'First crossing of a built shortcut: +2 {first} and +2 {second}.', { first: names[0], second: names[1] });
}
function tradeoffText(kit, t) {
  return kit.id === 'surveyor' ? tr(t, 'kit_surveyor_tradeoff', 'Early research supplies from exploring new concepts.') : kit.id === 'builder' ? tr(t, 'kit_builder_tradeoff', 'Construction refunds after you pay the full building cost.') : tr(t, 'kit_pathfinder_tradeoff', 'A mixed supply bonus after building and crossing a shortcut.');
}

export function ExpeditionKitPicker({ board, currentValue, onChange, disabled = false, t }) {
  const id = React.useId(), names = resourceNames(board, t), candidate = currentValue === undefined ? board?.expeditionKit : currentValue;
  const value = expeditionKitMeta(candidate)?.id || '';
  if (board && board.playStyle !== 'tabletop') return null;
  return <fieldset data-expedition-kit-picker disabled={disabled} style={{ margin: '14px 0', padding: 12, border: '1px solid var(--line)', borderRadius: 12 }}>
    <legend>{tr(t, 'kit_picker_title', 'Expedition kit')}</legend>
    <p className="lb-muted">{tr(t, 'kit_picker_help', 'Choose a tactic before starting. Each kit can earn up to four bonus tokens. Changing kits creates a separate saved game.')}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(230px,100%),1fr))', gap: 8 }}>
      {['', ...EXPEDITION_KIT_IDS].map(option => {
        const kit = expeditionKitMeta(option), labelId = id + '-' + (option || 'standard'), helpId = labelId + '-help';
        return <label key={option} data-expedition-kit-option={option || 'standard'} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: 10, border: '1px solid var(--line)', borderRadius: 10, background: value === option ? 'var(--soft)' : 'var(--panel)' }}>
          <input type="radio" name={id + '-kit'} value={option} checked={value === option} aria-labelledby={labelId} aria-describedby={helpId} style={{ width: 'auto', flex: '0 0 auto', marginTop: 4 }} onChange={() => { if (!disabled) onChange?.(option); }}/>
          <span style={{ minWidth: 0 }}><strong id={labelId}>{kit ? kitLabel(kit, t) : tr(t, 'kit_standard', 'Standard expedition')}</strong><span id={helpId} style={{ display: 'block', fontSize: '.9em', marginTop: 4 }}>{kit ? triggerText(kit, names, t) : tr(t, 'kit_standard_help', 'Explore and build with the board’s usual rewards.')}</span>{kit && <small style={{ display: 'block', marginTop: 5 }}>{tradeoffText(kit, t)}</small>}</span>
        </label>;
      })}
    </div>
  </fieldset>;
}

export function ExpeditionKitHud({ board, earnedCount = 0, gains, t }) {
  const progress = expeditionKitProgress(board?.expeditionKit, earnedCount);
  if (board?.playStyle !== 'tabletop' || !progress) return null;
  const { kit } = progress, names = resourceNames(board, t), earned = Array.isArray(gains) && gains.length === 2 && gains.every((value, i) => value === progress.gains[i]) ? gains : progress.gains;
  return <div data-expedition-kit-hud={kit.id} data-kit-complete={progress.complete} style={{ margin: '6px 0', fontSize: '.86em', overflowWrap: 'anywhere' }}>
    <strong>{kitLabel(kit, t)}</strong>{' · '}{tr(t, 'kit_progress', '{done}/{total} bonuses earned', { done: progress.earnedCount, total: kit.maxAwards })}
    <span style={{ display: 'block', color: 'var(--muted)' }}>{progress.complete ? tr(t, 'kit_finished', 'Kit complete: {resources}.', { resources: amounts(earned, names) }) : triggerText(kit, names, t)}</span>
  </div>;
}

export function ExpeditionKitReward({ board, beforeCount = 0, earnedCount = 0, gain, t }) {
  const before = expeditionKitProgress(board?.expeditionKit, beforeCount), after = expeditionKitProgress(board?.expeditionKit, earnedCount);
  if (board?.playStyle !== 'tabletop' || !before || !after || after.earnedCount <= before.earnedCount) return null;
  const expected = after.gains.map((value, i) => value - before.gains[i]);
  const awarded = Array.isArray(gain) && gain.length === 2 && gain.every((value, i) => value === expected[i]) ? gain : expected;
  return <p className="lb-notice" data-expedition-kit-reward={after.kit.id} role="status">{tr(t, 'kit_reward', '{kit} bonus: {resources}.', { kit: kitLabel(after.kit, t), resources: amounts(awarded, resourceNames(board, t)) })}{after.complete && ' ' + tr(t, 'kit_all_earned', 'All kit bonuses earned.')}</p>;
}
