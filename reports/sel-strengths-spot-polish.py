from pathlib import Path
p=Path('sel_hub/sel_tool_strengths.js');s=p.read_text(encoding='utf-8').replace('Strength Match Quiz Data','Strengths Observation Practice Data').replace('Choose if you want to compare','Choose a category').replace("label: 'Quiz Best'","label: 'Earlier Quiz Best'")
for line in ["        var quizActive = d.quizActive || false;\n","        var quizIdx = d.quizIdx || 0;\n","        var quizScore = d.quizScore || 0;\n","        var quizFeedback = d.quizFeedback || null;\n","        var quizDone = d.quizDone || false;\n"]: s=s.replace(line,'')
p.write_bytes(s.encode('utf-8'));Path('desktop/web-app/public/sel_hub/sel_tool_strengths.js').write_bytes(s.encode('utf-8'))
