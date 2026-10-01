const fs=require('fs');
const translations={
  french:{
    restart_quiz:'Recommencer le quiz',restart_quiz_2:'↺ Recommencer',end_quiz:'Terminer le quiz',end_quiz_and_explore:'Terminer le quiz et revenir à Explorer',quiz_misses_go_to_review:'Les réponses incorrectes sont ajoutées à votre liste de révision.',
    quiz_flow_restart_help:'Recommencer remet le score de ce quiz à zéro. Vos notes et votre historique de révision restent enregistrés.',
    quiz_flow_saved:'Votre question, votre réponse et votre score sont conservés pendant votre exploration.',
    quiz_flow_return:'Revenir à la question {number}',quiz_flow_number:'Question {number}',
    quiz_flow_continuous:'Entraînement continu',quiz_flow_score:'{correct} réponses correctes · {attempts} réponses données',
    quiz_flow_function:'Fonction → Structure',quiz_flow_system:'Identifier le système du corps',
    quiz_flow_diagram:'Les questions correspondent à la vue {view} du schéma.',quiz_flow_anterior:'antérieure',quiz_flow_posterior:'postérieure',
    quiz_flow_keys:'Choisissez une réponse. Les touches 1–{count} fonctionnent aussi.',
    quiz_flow_correct_option:'Bonne réponse',quiz_flow_chosen_option:'Votre réponse',quiz_flow_correct:'Correct ! ',quiz_flow_answer:'La réponse était : '
  },
  spanish_latin_america:{
    restart_quiz:'Reiniciar cuestionario',restart_quiz_2:'↺ Reiniciar',end_quiz:'Terminar cuestionario',end_quiz_and_explore:'Terminar el cuestionario y volver a Explorar',quiz_misses_go_to_review:'Las respuestas incorrectas se añaden a tu lista de repaso.',
    quiz_flow_restart_help:'Reiniciar restablece el puntaje de este cuestionario. Tus notas y tu historial de repaso se conservan.',
    quiz_flow_saved:'Tu pregunta, tu respuesta y tu puntaje se conservan mientras exploras.',
    quiz_flow_return:'Volver a la pregunta {number}',quiz_flow_number:'Pregunta {number}',
    quiz_flow_continuous:'Práctica continua',quiz_flow_score:'{correct} correctas · {attempts} respondidas',
    quiz_flow_function:'Función → Estructura',quiz_flow_system:'Identifica el sistema del cuerpo',
    quiz_flow_diagram:'Las preguntas corresponden a la vista {view} del diagrama.',quiz_flow_anterior:'anterior',quiz_flow_posterior:'posterior',
    quiz_flow_keys:'Elige una respuesta. También puedes usar las teclas 1–{count}.',
    quiz_flow_correct_option:'Respuesta correcta',quiz_flow_chosen_option:'Tu respuesta',quiz_flow_correct:'¡Correcto! ',quiz_flow_answer:'La respuesta era: '
  },
  arabic:{
    restart_quiz:'إعادة بدء الاختبار',restart_quiz_2:'↺ إعادة البدء',end_quiz:'إنهاء الاختبار',end_quiz_and_explore:'إنهاء الاختبار والعودة إلى الاستكشاف',quiz_misses_go_to_review:'تُضاف الإجابات غير الصحيحة إلى قائمة المراجعة.',
    quiz_flow_restart_help:'تؤدي إعادة البدء إلى تصفير نتيجة هذا الاختبار. تبقى ملاحظاتك وسجل مراجعتك محفوظة.',
    quiz_flow_saved:'يبقى سؤالك وإجابتك ونتيجتك محفوظة أثناء الاستكشاف.',
    quiz_flow_return:'العودة إلى السؤال {number}',quiz_flow_number:'السؤال {number}',
    quiz_flow_continuous:'تدريب مستمر',quiz_flow_score:'{correct} إجابات صحيحة · {attempts} إجابات مقدمة',
    quiz_flow_function:'الوظيفة ← البنية',quiz_flow_system:'حدّد جهاز الجسم',
    quiz_flow_diagram:'تتوافق الأسئلة مع المنظر {view} في الرسم.',quiz_flow_anterior:'الأمامي',quiz_flow_posterior:'الخلفي',
    quiz_flow_keys:'اختر إجابة واحدة. يمكنك أيضًا استخدام المفاتيح من 1 إلى {count}.',
    quiz_flow_correct_option:'الإجابة الصحيحة',quiz_flow_chosen_option:'إجابتك',quiz_flow_correct:'صحيح! ',quiz_flow_answer:'الإجابة هي: '
  }
};
function objectEnd(text,start){let depth=0,quoted=false,escaped=false;for(let i=start;i<text.length;i++){const ch=text[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}else if(ch==='"')quoted=true;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return i;}throw Error('Unclosed object');}
for(const [lang,values] of Object.entries(translations)){
  const file='lang/'+lang+'.js',mirror='desktop/web-app/public/'+file,source=fs.readFileSync(file,'utf8');
  if(source!==fs.readFileSync(mirror,'utf8'))throw Error('Mirror drift: '+lang);
  const data=JSON.parse(source),missing=Object.entries(values).filter(([key])=>data.stem.anatomy[key]===undefined);
  if(!missing.length)continue;
  const stem=/^[ \t]*"stem"\s*:\s*\{/m.exec(source).index,anatomy=/"anatomy"\s*:\s*\{/.exec(source.slice(stem)),start=stem+anatomy.index+anatomy[0].length-1,end=objectEnd(source,start);
  const indent=source.slice(source.lastIndexOf('\n',end)+1,end),newline=source.includes('\r\n')?'\r\n':'\n';
  const prefix=source.slice(0,end).trimEnd();
  const updated=prefix+','+newline+missing.map(([key,value])=>indent+'  '+JSON.stringify(key)+': '+JSON.stringify(value)).join(','+newline)+newline+source.slice(source.lastIndexOf('\n',end)+1);
  const parsed=JSON.parse(updated);for(const [key,value]of Object.entries(values))if(parsed.stem.anatomy[key]!==value)throw Error('Invalid insertion '+key);
  fs.writeFileSync(file,updated);fs.writeFileSync(mirror,updated);console.log(lang+': '+missing.length+' labels');
}
