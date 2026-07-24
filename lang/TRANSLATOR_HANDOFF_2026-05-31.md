# Translator Handoff — Word Sounds Pass 1 Label Reframe

> **Historical translator handoff (2026-07-09):** This May 2026 note preserves a targeted Word Sounds label-reframe workflow. Verify the current English strings and each current language pack before treating the per-language proposals below as still-needed edits.

**Date:** 2026-05-31
**Scope:** 4 i18n keys across 6 major hand-translated language packs
**Languages:** Spanish (LATAM), French, Chinese (Simplified), Vietnamese, Portuguese (Brazil), German

## Context

Word Sounds Pass 1 reframed the module's clinical-sounding labels (RTI, benchmark, screening) toward practice- and target-focused terminology that better matches what the tool actually does: in-class practice and grouping for instruction, not formal RTI screening. The English strings for 4 keys have changed meaning enough that their existing hand translations no longer match the new intent and need to be revisited.

The 4 affected keys are:

| Key | Old English | New English |
| --- | --- | --- |
| `common.benchmark_probe_results` | Benchmark Probe Results | Practice probe results |
| `common.configure_rti_thresholds` | Configure RTI Thresholds | Configure group cutoffs |
| `common.export_rti_progress_report_as_csv` | Export RTI Progress Report as CSV | Export practice grouping (CSV) |
| `class_analytics.benchmark_vs` | vs. Benchmark | vs. Target |

All 6 major language packs already have these keys translated (no gap fills needed). What follows is per-key, per-language guidance.

---

## Per-Key Overview

### Key 1: `common.benchmark_probe_results`

- **Old English:** Benchmark Probe Results
- **New English:** Practice probe results
- **Rationale:** The activity is in-class practice repetitions, not a benchmark screening probe in the RTI sense. "Benchmark" carried a formal-assessment connotation we want to drop. "Probe" is retained because it still describes the short repeated sampling pattern.

### Key 2: `common.configure_rti_thresholds`

- **Old English:** Configure RTI Thresholds
- **New English:** Configure group cutoffs
- **Rationale:** Dropping the "RTI" framing entirely. What the teacher actually configures are the score cutoffs that bucket students into practice groups, not RTI tier thresholds. "Group cutoffs" is plainer and accurate.

### Key 3: `common.export_rti_progress_report_as_csv`

- **Old English:** Export RTI Progress Report as CSV
- **New English:** Export practice grouping (CSV)
- **Rationale:** The CSV exports the current practice grouping, not an RTI progress report. The shorter parenthetical-CSV form is consistent with sibling export labels.

### Key 4: `class_analytics.benchmark_vs`

- **Old English:** vs. Benchmark
- **New English:** vs. Target
- **Rationale:** The comparator in analytics is the per-student practice target, not a fixed benchmark. The key name retains `benchmark_vs` for code-stability reasons but the visible label is now "vs. Target."

---

## Per-Language Proposals

### Spanish (LATAM) — `spanish_latin_america.js`

**Style notes:** Formal, Title Case. Pack uses `Prueba` for probe, `Referencia` for benchmark, `Umbrales` for thresholds, `informes` for reports. Establish `Práctica` (preferred over `Entrenamiento`) and `Objetivo` (or `Meta`) for the new vocabulary.

#### `common.benchmark_probe_results`
- **Current:** Resultados de la Prueba de Referencia
- **Proposed:** Resultados de la Prueba de Práctica
- **Alternate:** Resultados de la Evaluación de Práctica
- **Notes:** Pattern established: `Prueba` used for probe activity across pack. Maintain `Resultados` for results. `Práctica` preferred in Spanish for practice context over `Entrenamiento`. Preserve Title Case capitalization.

#### `common.configure_rti_thresholds`
- **Current:** Configurar Umbrales de RTI
- **Proposed:** Configurar Cortes de Grupos de Práctica
- **Alternate:** Configurar Grupos de Práctica
- **Notes:** Remove `RTI` acronym since new focus is on practice grouping. `Cortes` = cutoffs (clean term used in educational contexts). Alternative: simpler `Grupos de Práctica`. Maintain imperative form `Configurar`.

#### `common.export_rti_progress_report_as_csv`
- **Current:** Exportar informe de progreso de RTI como CSV
- **Proposed:** Exportar Agrupamiento de Práctica (CSV)
- **Alternate:** Exportar Informe de Grupos de Práctica (CSV)
- **Notes:** Shift from progress report to grouping focus. `Agrupamiento` (grouping) more direct than `informe de progreso`. Alternative keeps closer to original structure. Parenthetical `(CSV)` acceptable, or `en CSV` form.

#### `class_analytics.benchmark_vs`
- **Current:** vs. Referencia
- **Proposed:** vs. Objetivo
- **Alternate:** vs. Meta
- **Notes:** Simple substitution. `Objetivo` (objective/target) is standard Spanish for target. `Meta` also valid (goal/target). Maintain `vs.` convention (also used in Spanish analytics). Check analytics context for consistency with other target references.

---

### French — `french.js`

**Style notes:** Article-rich, formal (e.g., `l'évaluation`). Lowercase `vs.` convention in analytics. Pack uses `évaluation` for assessment/probe, `seuils` for thresholds, `groupe` for groups. Prefer `pratique` over `entraînement` for practice; `cible` for target.

#### `common.benchmark_probe_results`
- **Current:** Résultats de l'évaluation de référence
- **Proposed:** Résultats de l'évaluation de pratique
- **Alternate:** Résultats des évaluations d'entraînement
- **Notes:** French convention: preserve article structure `Résultats de l'évaluation` (evaluation results). `de pratique` (of practice) mirrors `de référence` (of reference). Alternative uses `d'entraînement` (of training). Maintain capitalization pattern from source.

#### `common.configure_rti_thresholds`
- **Current:** Configurer les seuils RTI
- **Proposed:** Configurer les groupes de pratique
- **Alternate:** Configurer les seuils de pratique
- **Notes:** Remove RTI context. `les groupes de pratique` (practice groups) cleaner than threshold focus. Alternative maintains threshold terminology if needed. French prefers definite article `les`. Imperative `Configurer` standard.

#### `common.export_rti_progress_report_as_csv`
- **Current:** Exporter le rapport de progression RTI en CSV
- **Proposed:** Exporter le groupement de pratique (CSV)
- **Alternate:** Exporter les groupes de pratique (CSV)
- **Notes:** From `rapport de progression` (progress report) to `groupement` (grouping). `Exporter` (infinitive) standard. Parenthetical `(CSV)` acceptable in French. Alternative uses plural `groupes`.

#### `class_analytics.benchmark_vs`
- **Current:** vs. référence
- **Proposed:** vs. cible
- **Alternate:** vs. Objectif
- **Notes:** Direct substitution: `cible` (target) replaces `référence` (reference). Maintain lowercase `vs.` convention (French analytics context). `Objectif` also acceptable for goal/target.

---

### Chinese (Simplified) — `chinese_simplified.js`

**Style notes:** Dense, technical, no Title Case. Pack uses `基准` (benchmark/base), `探测` (probe), `配置` (configure), `阈值` (threshold). Introduce `练习` for practice and `目标` for target.

#### `common.benchmark_probe_results`
- **Current:** 基准探测结果
- **Proposed:** 练习探测结果
- **Alternate:** 实践检测结果
- **Notes:** Replace `基准` (benchmark/base) with `练习` (practice/training). Maintain `探测结果` (probe results) structure. Alternative: `实践` (practice/implementation) if more formal register preferred. Keep dense technical style (no Title Case).

#### `common.configure_rti_thresholds`
- **Current:** 配置 RTI 阈值
- **Proposed:** 配置练习分组
- **Alternate:** 配置学习小组划分
- **Notes:** Shift from `阈值` (threshold — technical) to `分组` (grouping/division). `练习分组` (practice grouping) is more natural than threshold focus. Alternative: `学习小组划分` (study group division). Remove RTI. Maintain `配置` (configure).

#### `common.export_rti_progress_report_as_csv`
- **Current:** 将 RTI 进度报告导出为 CSV
- **Proposed:** 导出练习分组(CSV)
- **Alternate:** 将练习分组导出为 CSV
- **Notes:** Simplify: `导出练习分组` (export practice grouping). Parenthetical `(CSV)` standard. Alternative maintains `将...导出为` structure. Remove `RTI` and `progress report`. Maintain density.

#### `class_analytics.benchmark_vs`
- **Current:** 对比基准
- **Proposed:** 对比目标
- **Alternate:** vs. 目标
- **Notes:** Direct: `基准` (benchmark) → `目标` (target). Maintain `对比` (comparison/vs) prefix if consistent with analytics style, or simplify to `vs. 目标` if brevity preferred.

---

### Vietnamese — `vietnamese.js`

**Style notes:** Medium formality. Pack uses `đánh giá chuẩn mực` (standard assessment), `Cấu hình` (configure), `nhóm` (group), `mục tiêu` (target), `luyện` for practice context (e.g., `từ đã luyện` = practiced words).

#### `common.benchmark_probe_results`
- **Current:** Kết quả đánh giá chuẩn mực
- **Proposed:** Kết quả đánh giá luyện tập
- **Alternate:** Kết quả sàng lọc thực hành
- **Notes:** Substitute `chuẩn mực` (standard/benchmark) with `luyện tập` (practice/training). Maintain `Kết quả đánh giá` (assessment results) structure. Alternative: `sàng lọc thực hành` (practical screening). Pattern established in pack with `luyện` for practice context.

#### `common.configure_rti_thresholds`
- **Current:** Cấu hình ngưỡng RTI
- **Proposed:** Cấu hình nhóm luyện tập
- **Alternate:** Cấu hình ngưỡng phân nhóm
- **Notes:** Shift focus from `ngưỡng RTI` (RTI thresholds) to `nhóm luyện tập` (practice groups). Remove RTI. Maintain `Cấu hình` (configure). Alternative keeps threshold approach if needed.

#### `common.export_rti_progress_report_as_csv`
- **Current:** Xuất báo cáo tiến độ RTI dưới dạng CSV
- **Proposed:** Xuất nhóm luyện tập (CSV)
- **Alternate:** Xuất phân nhóm thực hành (CSV)
- **Notes:** From `báo cáo tiến độ` (progress report) to `phân nhóm` (grouping). Simplify structure. `Xuất` (export) standard. Parenthetical `(CSV)` acceptable Vietnamese style. Alternative uses `phân nhóm`.

#### `class_analytics.benchmark_vs`
- **Current:** so với Chuẩn mực
- **Proposed:** so với Mục tiêu
- **Alternate:** so với Đích
- **Notes:** Direct substitution: `Chuẩn mực` (benchmark/standard) → `Mục tiêu` (target/objective). Maintain `so với` (compared to/vs) convention. Alternative: `Đích` also means target.

---

### Portuguese (Brazil) — `portuguese_brazil.js`

**Style notes:** Title Case with hyphenated compounds. Pack uses `Sondagem` (probe/screening — established educational term), `Referência` (benchmark), `Limiares` (thresholds), `Alvo` for target (e.g., `som-alvo`, `grupo-alvo`, `idioma-alvo`). Use `Prática` for practice.

#### `common.benchmark_probe_results`
- **Current:** Resultados da Sondagem de Referência
- **Proposed:** Resultados da Sondagem de Prática
- **Alternate:** Resultados da Avaliação de Treinamento
- **Notes:** Substitute `Referência` (reference) with `Prática` (practice). Maintain `Sondagem` (probe/screening — educational term established in pack). Keep `Resultados da` structure. Alternative: `Avaliação de Treinamento` (Training Assessment). Preserve Title Case.

#### `common.configure_rti_thresholds`
- **Current:** Configurar Limiares de RTI
- **Proposed:** Configurar Grupos de Prática
- **Alternate:** Configurar Limites de Agrupamento
- **Notes:** Shift from `Limiares de RTI` (RTI thresholds) to `Grupos de Prática` (Practice Groups). Remove RTI. Maintain `Configurar` (Configure) imperative. Alternative uses `Limites de Agrupamento` if threshold concept retained. Title Case consistent with Portuguese conventions.

#### `common.export_rti_progress_report_as_csv`
- **Current:** Exportar relatório de progresso de RTI como CSV
- **Proposed:** Exportar Agrupamento de Prática (CSV)
- **Alternate:** Exportar Grupos de Prática (CSV)
- **Notes:** From `relatório de progresso` (progress report) to `Agrupamento de Prática` (Practice Grouping). Remove RTI. Maintain `Exportar` (Export) form. Parenthetical `(CSV)` acceptable. Alternative uses plural `Grupos`.

#### `class_analytics.benchmark_vs`
- **Current:** vs. Referência
- **Proposed:** vs. Alvo
- **Alternate:** vs. Meta
- **Notes:** Direct substitution: `Referência` (reference) → `Alvo` (target). Pattern established in pack: `alvo` used throughout (`som-alvo`, `grupo-alvo`, `idioma-alvo`). Maintain lowercase `vs.` and uppercase `Alvo` for consistency. Alternative: `Meta` (goal/target).

---

### German — `german.js`

> **QUALITY FLAG (HIGH):** The German pack has documented contamination issues (see `PACK_QUALITY_STATUS.md`) — current strings for these keys include typos (`Ergebniss` for `Ergebnisse`) and English residuals (e.g., `Exportieren ... as CSV`). Recommend a baseline quality review of these strings before finalizing the new translations below.

**Style notes:** Compounds with hyphens, verb-final or imperative form (e.g., `RTI-Schwellenwerte konfigurieren`). Pack uses `Gruppen`, `Zielgruppe` conventions; `Ziel` is the natural German for "target."

#### `common.benchmark_probe_results`
- **Current:** Benchmark Probe Ergebniss
- **Proposed:** Übungsprobe-Ergebnisse
- **Alternate:** Praxis-Testergebnisse
- **Notes:** Current translation has typo (`Ergebniss` should be `Ergebnisse`). Propose `Übungsprobe-Ergebnisse` (practice probe results) with proper plural and compound form. Alternative: `Praxis-Testergebnisse`. Verify baseline quality before implementation. German uses compounds + hyphenation.

#### `common.configure_rti_thresholds`
- **Current:** RTI-Schwellenwerte konfigurieren
- **Proposed:** Praktikumsgruppen konfigurieren
- **Alternate:** Übungsgruppen-Schwellenwerte konfigurieren
- **Notes:** Propose `Praktikumsgruppen konfigurieren` (configure practice groups) with proper imperative form. Remove RTI. Alternative keeps threshold approach. German convention: verb-final or imperative form. Verify quality.

#### `common.export_rti_progress_report_as_csv`
- **Current:** Exportieren RTI Fortschritt Bericht as CSV
- **Proposed:** Praktikumsgruppierung als CSV exportieren
- **Alternate:** Übungsgruppen-Zuordnung exportieren (CSV)
- **Notes:** Current translation has English residuals (`Exportieren ... as CSV` mixing English `as`). Propose `Praktikumsgruppierung als CSV exportieren` (export practice grouping as CSV) with proper German form. Alternative: `Übungsgruppen-Zuordnung exportieren`. Remove RTI and progress report focus. Verify quality baseline first.

#### `class_analytics.benchmark_vs`
- **Current:** vs. Target
- **Proposed:** [NO CHANGE REQUIRED]
- **Alternate:** vs. Ziel
- **Notes:** Current translation `vs. Target` is already in the English form expected for the new meaning. This suggests either (1) German is using the English loanword `Target`, or (2) a prior translation pass was already aligned with the new semantic. If German implementation is happy with `Target` as-is, no change needed. If a fully German rendering is preferred: `vs. Ziel` (goal/target). Verify intent with stakeholders.

---

## Closing Notes

### Reference

For the full rationale behind the Word Sounds Pass 1 label reframe (which clinical/RTI-flavored labels were changed, why, and how the new vocabulary maps to the underlying activity), see:

- `_dev/word_sounds_clinical_label_inventory.md`

That document is the source of truth for the semantic intent behind each new English string.

### How to Verify in Context

Before finalizing a translation, translators should open the in-app UI and view each string in its rendered context. Recommended path:

1. Launch the AlloFlow tool (Gemini Canvas or `desktop/web-app` mirror).
2. Switch the UI language to the target locale.
3. Open the **Word Sounds** module.
4. Locate each label:
   - `benchmark_probe_results` — appears at the top of the post-practice results panel.
   - `configure_rti_thresholds` — teacher settings panel, grouping configuration section.
   - `export_rti_progress_report_as_csv` — export action button in the grouping panel.
   - `benchmark_vs` — class analytics view, comparison column header.
5. Confirm the proposed translation reads naturally in its surrounding UI (column widths, sibling labels, tone of voice).

### German Pack — Read First

Before applying the German proposals, please complete a baseline quality review of `german.js` for the affected `common` and `class_analytics` sections. The existing strings show evidence of incomplete or contaminated translation work, and any new German strings should be landed alongside fixes to the surrounding pack so the new vocabulary doesn't sit next to broken neighbors.

### Coverage Summary

- **Total keys:** 4
- **Total languages:** 6
- **Total handoff rows:** 24
- **Missing translations / gaps:** 0
- **Quality flags:** German (high — baseline review needed); other 5 packs clean.
