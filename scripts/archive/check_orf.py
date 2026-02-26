with open('AlloFlowANTI.txt','r',encoding='utf-8') as f:
    c=f.read()

results = []
tests = [
    ('FLUENCY_BENCHMARKS const', 'FLUENCY_BENCHMARKS' in c),
    ('calculateRunningRecordMetrics fn', 'calculateRunningRecordMetrics' in c),
    ('getBenchmarkComparison fn', 'getBenchmarkComparison' in c),
    ('self_corrected in prompt', 'self_corrected": Said a wrong word first' in c),
    ('said field in prompt example', '"said": "house"' in c),
    ('insertions array in prompt', '"insertions": ["um"' in c),
    ('Localization: running_record', 'running_record: "Running Record"' in c),
    ('Localization: substitutions', 'substitutions: "Substitutions"' in c),
    ('Localization: benchmark_title', 'benchmark_title: "Benchmark"' in c),
    ('State: fluencyBenchmarkGrade', 'fluencyBenchmarkGrade' in c),
    ('State: fluencyBenchmarkSeason', 'fluencyBenchmarkSeason' in c),
    ('UI: rrMetrics usage', 'rrMetrics' in c),
    ('UI: benchmarkResult usage', 'benchmarkResult' in c),
    ('UI: grade selector', 'FLUENCY_BENCHMARKS).map' in c),
    ('Word display: self_corrected color', "self_corrected' ? 'bg-blue-100" in c),
    ('Word display: said tooltip', "said_label" in c),
    ('Legend: 5 categories', 'legend_self_corrected' in c),
    ('Legend: mispronounced entry', 'legend_mispronounced' in c),
]
ok_count = 0
for name, result in tests:
    status = 'OK' if result else 'MISSING'
    if result: ok_count += 1
    results.append(f'{status}: {name}')

with open('orf_check_results.txt', 'w') as f:
    f.write('\n'.join(results))
    f.write(f'\n\nTotal: {ok_count}/{len(tests)} passed')

print(f'{ok_count}/{len(tests)} tests passed. See orf_check_results.txt')
