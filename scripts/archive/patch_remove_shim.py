"""Remove migration shim - no current users to migrate."""
FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')

shim = """
        // MIGRATION SHIM: Rename word_families -> sound_sort in saved lessonPlan
        React.useEffect(() => {
            if (lessonPlan.word_families) {
                setLessonPlan(prev => {
                    const { word_families, ...rest } = prev;
                    return { ...rest, sound_sort: word_families };
                });
            }
            if (lessonPlanOrder.includes('word_families')) {
                setLessonPlanOrder(prev => prev.map(id => id === 'word_families' ? 'sound_sort' : id));
            }
        }, []);
"""

if shim in content:
    content = content.replace(shim, '\n')
    content = content.replace('\n', '\r\n')
    with open(FILE, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print("Removed migration shim (10 lines)")
else:
    print("Shim not found")
