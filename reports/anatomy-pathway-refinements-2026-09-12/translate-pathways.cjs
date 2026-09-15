const fs=require('node:fs');
const content=JSON.parse(fs.readFileSync('reports/anatomy-pathway-refinements-2026-09-12/content-english.json','utf8'));
const learning=JSON.parse(fs.readFileSync('reports/anatomy-pathway-refinements-2026-09-12/learning-english.json','utf8'));
const translated={};
function add(lang,source,lines){const values=lines.trim().split('\n'),keys=Object.keys(source);if(values.length!==keys.length)throw Error(lang+': '+values.length+' vs '+keys.length);translated[lang]??={};keys.forEach((key,i)=>translated[lang][key]=values[i]+(/ $/.test(source[key])?' ':''));}
add('french',content,`
Le repère montre le cœur entier ; cette étape suit son oreillette droite.
Le ventricule droit est une cavité à l’intérieur du cœur indiqué par ce repère.
Le repère des alvéoles situe la zone d’échange. Le sang reste dans les capillaires voisins ; il ne pénètre pas dans les sacs aériens.
Le repère des poumons situe la région. Les veines pulmonaires transportent le sang des poumons vers l’oreillette gauche ; chaque veine n’est pas dessinée ici.
Le repère montre le cœur entier ; cette étape suit son oreillette gauche.
Le ventricule gauche se remplit par la valve mitrale et produit la pression qui envoie le sang dans la circulation générale.
Le ventricule gauche est une cavité à l’intérieur du cœur indiqué par ce repère.
L’artère fémorale est un exemple de vaisseau d’acheminement. Les échanges avec les tissus ont lieu en aval, dans les capillaires, et non dans cette artère.
L’air traverse le pharynx vers le larynx. L’oropharynx et le laryngopharynx laissent aussi passer les aliments avalés ; le nasopharynx laisse passer l’air.
Le cartilage aide à maintenir la trachée ouverte. Le mucus piège les particules et les cils le déplacent vers la gorge.
De nombreuses petites alvéoles offrent une vaste surface d’échange très fine. L’oxygène diffuse vers le sang capillaire voisin, tandis que le dioxyde de carbone diffuse vers l’air alvéolaire.
Expiration au repos
Lors d’une respiration calme, les muscles inspiratoires se relâchent et le recul élastique réduit le volume pulmonaire. La pression alvéolaire dépasse la pression atmosphérique, ce qui fait sortir l’air. L’expiration forcée mobilise aussi des muscles.
Le repère du diaphragme montre un muscle respiratoire. L’air passe par les voies respiratoires, pas à travers le diaphragme.
La mandibule est un repère osseux de la mâchoire qui contribue à la mastication. Les aliments restent dans la cavité buccale ; ils ne traversent pas l’os.
La déglutition déplace le bol alimentaire du pharynx vers l’œsophage. Des contractions musculaires coordonnées le propulsent vers l’estomac tout en protégeant les voies respiratoires.
Le repère montre le pharynx. L’œsophage se prolonge en dessous et ne possède pas de repère distinct dans ce catalogue.
Le duodénum est la première partie de l’intestin grêle ; le repère représente l’organe entier.
Les plis, les villosités et les microvillosités augmentent la surface d’absorption de l’intestin grêle. La plupart des nutriments y sont absorbés.
Le jéjunum et l’iléon sont des régions de l’intestin grêle ; le repère représente l’organe entier.
Le gros intestin absorbe l’eau et les électrolytes restants et contribue à former les selles. Les microbes intestinaux fermentent une partie des matières non digérées.
Rectum et défécation
Les selles sont retenues dans le rectum, zone terminale de stockage du gros intestin, avant de sortir par le canal anal et l’anus. La vessie stocke l’urine et ne fait pas partie de ce trajet alimentaire.
Le repère montre le gros intestin. Le rectum est sa zone terminale de stockage ; ce repère ne dessine pas séparément le rectum.
Dans cet exemple de retrait de la main, un stimulus potentiellement nocif sur la face palmaire de l’index active des terminaisons nerveuses sensitives de la peau.
Le repère cutané représente un type de tissu. Le stimulus de l’exemple se trouve sur le doigt, pas à l’emplacement du repère sur le corps.
Les axones sensitifs de cette partie du doigt passent dans le nerf médian vers la moelle épinière cervicale et y entrent par les racines dorsales. Un nerf périphérique contient de nombreux axones, pas un seul neurone.
Le nerf médian transporte les fibres sensitives utilisées dans cet exemple. Ses fibres motrices ont d’autres fonctions.
L’information sensitive atteint les circuits spinaux. Le retrait peut commencer sans attendre une décision consciente, tandis que l’information se propage aussi vers le cerveau.
Le repère montre la moelle épinière entière. Cet exemple du membre supérieur utilise des circuits spinaux cervicaux.
Les interneurones spinaux relient l’entrée sensitive à la sortie motrice et contribuent à activer les muscles du retrait et à inhiber les muscles opposés.
Les interneurones se trouvent dans la substance grise spinale ; le repère de la moelle entière ne montre pas chaque cellule.
Les axones moteurs quittent la moelle épinière par les racines ventrales. Ceux destinés au biceps passent par le plexus brachial puis par sa branche, le nerf musculocutané.
Le repère montre le réseau du plexus brachial. Le nerf musculocutané qui dessert le biceps n’est pas dessiné séparément.
La signalisation par l’acétylcholine aux jonctions neuromusculaires active les fibres musculaires. La contraction du biceps contribue à fléchir le coude lors du retrait du bras ; d’autres muscles participent aussi.
Les voies ascendantes transmettent l’information vers le cerveau pour la perception consciente. Les voies cérébrales peuvent aussi modifier les réflexes spinaux ; aucun délai fixe ne sépare la prise de conscience du retrait.
Le repère montre le cerveau entier. La perception fait intervenir des réseaux, pas un seul point à cet emplacement.
Grêle désigne son diamètre plus étroit. Les plis de sa paroi, les villosités et les microvillosités augmentent la surface d’absorption ; les estimations de longueur et de surface dépendent de la méthode de mesure.
Une faiblesse du grand fessier gêne l’extension puissante de la hanche, par exemple pour se lever d’une chaise. La démarche de Trendelenburg est liée à un dysfonctionnement des abducteurs de la hanche, surtout les moyen et petit fessiers. Le nerf glutéal inférieur innerve le grand fessier.
`);
add('french',learning,`
Les artères pulmonaires transportent du sang pauvre en oxygène. Pourquoi sont-elles appelées artères ?
Les artères transportent toujours du sang riche en oxygène.
La teneur en oxygène varie selon le circuit. Elle ne définit pas une artère.
Elles transportent le sang en s’éloignant du cœur.
Les artères transportent le sang depuis le cœur ; les veines le ramènent vers le cœur.
Tout vaisseau relié à un poumon est une artère.
Les veines pulmonaires sont aussi reliées aux poumons. Le sens du flux par rapport au cœur distingue les artères des veines.
Après les échanges gazeux dans les poumons, où va le sang ?
Vers l’oreillette droite par les veines caves.
Les veines caves ramènent le sang du corps. Le sang provenant des poumons entre dans l’oreillette gauche.
Vers le ventricule droit par les artères pulmonaires.
Cela inverse le sens du flux artériel pulmonaire. Les artères pulmonaires transportent le sang du ventricule droit vers les poumons.
Vers l’oreillette gauche par les veines pulmonaires.
Les veines pulmonaires ramènent le sang riche en oxygène des poumons vers l’oreillette gauche.
Qu’est-ce qui passe entre l’air alvéolaire et le sang voisin lors des échanges gazeux ?
L’oxygène et le dioxyde de carbone diffusent à travers une fine barrière.
Les gaz diffusent à travers la barrière air-sang. Le sang reste dans les capillaires.
Des bulles d’air entières entrent dans le sang.
Les échanges gazeux normaux transfèrent des molécules de gaz, pas des bulles d’air, dans le sang.
L’air traverse le diaphragme pour entrer dans le sang.
Le diaphragme contribue à modifier le volume thoracique. Les échanges gazeux ont lieu entre les alvéoles et les capillaires voisins.
Lors d’une respiration calme au repos, qu’est-ce qui aide l’air à sortir ?
Le diaphragme se contracte et s’aplatit.
Cela agrandit le thorax pendant l’inspiration. L’expiration calme suit le relâchement des muscles inspiratoires.
Les muscles inspiratoires se relâchent et les poumons reviennent élastiquement vers leur volume de repos.
Le recul élastique réduit le volume pulmonaire et élève la pression alvéolaire au-dessus de la pression atmosphérique, ce qui fait sortir l’air.
La gravité attire tout l’air vers le bas, hors des poumons.
L’air s’écoule selon une différence de pression. Son trajet ne se définit pas par une direction vers le haut ou vers le bas.
Quel trajet permet aux selles de quitter le tube digestif ?
Rectum → canal anal → anus.
Les selles passent par le rectum et le canal anal jusqu’à l’anus. L’urine emprunte une autre voie.
Vessie → urètre.
La vessie stocke l’urine. La vessie et l’urètre sont des structures urinaires, pas le trajet des selles.
Vésicule biliaire → intestin grêle.
La vésicule biliaire stocke la bile utilisée dans la digestion. Elle ne stocke ni n’expulse les selles.
Comment les villosités intestinales favorisent-elles l’absorption des nutriments ?
Elles laissent passer de gros morceaux d’aliments directement dans le sang.
Les nutriments doivent traverser la paroi intestinale. Des morceaux entiers d’aliments n’entrent normalement pas dans le sang.
Elles bloquent tout mouvement dans l’intestin.
Les villosités tapissent la paroi intestinale ; elles ne ferment pas le passage dans l’intestin.
Elles augmentent la surface disponible pour l’absorption.
Les villosités et les microvillosités offrent davantage de surface d’absorption dans la paroi intestinale.
Dans cet exemple, quel nerf transporte l’information sensitive de la face palmaire de l’index ?
Le nerf sciatique.
Le nerf sciatique dessert le membre inférieur. Il ne transporte pas la sensibilité de ce doigt.
Le nerf médian.
Le nerf médian transporte les fibres sensitives de cette partie de l’index vers la moelle épinière.
Le nerf fémoral.
Le nerf fémoral dessert des parties du membre inférieur, pas la main.
Comment le retrait peut-il commencer sans attendre une décision consciente ?
Des circuits spinaux relient l’entrée sensitive à la sortie motrice.
Les circuits spinaux peuvent déclencher le réflexe tandis que l’information se propage aussi vers le cerveau.
Le muscle prend une décision sans signaux nerveux.
Les fibres musculaires répondent aux signaux moteurs. Elles ne remplacent pas les parties sensitives et spinales de ce réflexe.
Aucune information sur le stimulus n’atteint jamais le cerveau.
L’information remonte aussi pour permettre la perception, et les voies cérébrales peuvent modifier les réflexes spinaux.
Expliquer le trajet
Choisis une explication pour chaque situation. Ces questions évaluent le processus, pas le repère voisin sur le schéma.
réponses données
Correct.
À reconsidérer.
Réponse :
Revoir l’étape correspondante
réponses correctes aux questions de compréhension. Revoir un trajet et évaluer sa confiance sont distincts de ces réponses.
Retour aux étapes
Terminer le trajet
Terminer sans répondre à toutes les questions
réponses correctes au dernier questionnaire terminé
Aller à l’étape
Afficher le repère sur le schéma
Ce que montre ce repère :
En savoir plus sur ce trajet — OpenStax
Vérification du trajet : choisis des explications pour deux situations.
`);
add('spanish_latin_america',content,`
El marcador muestra todo el corazón; este paso sigue su aurícula derecha.
El ventrículo derecho es una cavidad dentro del corazón que señala este marcador.
El marcador de los alvéolos ubica la región de intercambio. La sangre permanece en los capilares cercanos; no entra en los sacos de aire.
El marcador de los pulmones ubica la región. Las venas pulmonares llevan sangre de los pulmones a la aurícula izquierda; aquí no se dibuja cada vena.
El marcador muestra todo el corazón; este paso sigue su aurícula izquierda.
El ventrículo izquierdo se llena a través de la válvula mitral y genera presión para enviar sangre a la circulación sistémica.
El ventrículo izquierdo es una cavidad dentro del corazón que señala este marcador.
La arteria femoral es un ejemplo de vaso de distribución. El intercambio con los tejidos ocurre más adelante en los capilares, no en esta arteria.
El aire pasa por la faringe hacia la laringe. La orofaringe y la laringofaringe también conducen los alimentos al tragarlos; la nasofaringe conduce aire.
El cartílago ayuda a mantener abierta la tráquea. El moco atrapa partículas y los cilios lo desplazan hacia la garganta.
Muchos alvéolos diminutos ofrecen una superficie amplia y delgada para el intercambio. El oxígeno difunde hacia la sangre capilar cercana y el dióxido de carbono hacia el aire alveolar.
Exhalación en reposo
Durante la respiración tranquila, los músculos inspiratorios se relajan y el retroceso elástico reduce el volumen pulmonar. La presión alveolar supera la atmosférica y el aire sale. La exhalación forzada también utiliza músculos.
El marcador del diafragma muestra un músculo respiratorio. El aire pasa por las vías respiratorias, no a través del diafragma.
La mandíbula es una referencia ósea que contribuye a la masticación. Los alimentos permanecen en la cavidad de la boca; no atraviesan el hueso.
La deglución mueve el bolo alimenticio por la faringe hacia el esófago. Las contracciones musculares coordinadas lo impulsan hacia el estómago mientras se protege la vía respiratoria.
El marcador muestra la faringe. El esófago continúa por debajo y no tiene un marcador separado en este catálogo.
El duodeno es la primera parte del intestino delgado; el marcador representa el órgano completo.
Los pliegues, las vellosidades y las microvellosidades aumentan la superficie de absorción del intestino delgado. Allí ocurre la mayor parte de la absorción de nutrientes.
El yeyuno y el íleon son regiones del intestino delgado; el marcador representa el órgano completo.
El intestino grueso absorbe el agua y los electrolitos restantes y ayuda a formar las heces. Los microbios intestinales fermentan parte del material que no se digirió.
Recto y defecación
Las heces se almacenan en el recto, la región final de almacenamiento del intestino grueso, antes de salir por el canal anal y el ano. La vejiga almacena orina y no forma parte de esta ruta alimentaria.
El marcador muestra el intestino grueso. El recto es su región final de almacenamiento; este marcador no dibuja el recto por separado.
En este ejemplo de retirada de la mano, un estímulo potencialmente dañino en la cara palmar del dedo índice activa terminaciones nerviosas sensitivas de la piel.
El marcador de la piel representa un tipo de tejido. El estímulo del ejemplo está en el dedo, no en la ubicación corporal del marcador.
Los axones sensitivos de esta parte del dedo viajan por el nervio mediano hacia la médula espinal cervical y entran por las raíces dorsales. Un nervio periférico contiene muchos axones, no solo una neurona.
El nervio mediano lleva las fibras sensitivas usadas en este ejemplo. Sus fibras motoras tienen otras funciones.
La información sensitiva llega a los circuitos espinales. La retirada puede comenzar sin esperar una decisión consciente, mientras la información también viaja hacia el cerebro.
El marcador muestra toda la médula espinal. Este ejemplo del miembro superior utiliza circuitos espinales cervicales.
Las interneuronas espinales conectan la entrada sensitiva con la salida motora y ayudan a activar los músculos de retirada e inhibir los músculos opuestos.
Las interneuronas se encuentran en la sustancia gris espinal; el marcador de toda la médula no muestra células individuales.
Los axones motores salen de la médula espinal por las raíces ventrales. Los axones hacia el bíceps pasan por el plexo braquial y su rama, el nervio musculocutáneo.
El marcador muestra la red del plexo braquial. La rama del nervio musculocutáneo que llega al bíceps no se dibuja por separado.
La señalización por acetilcolina en las uniones neuromusculares activa las fibras musculares. La contracción del bíceps contribuye a flexionar el codo al retirar el brazo; también participan otros músculos.
Las vías ascendentes llevan información hacia el cerebro para la percepción consciente. Las vías cerebrales también pueden modificar los reflejos espinales; no hay un único retraso fijo entre la percepción y la retirada.
El marcador muestra todo el cerebro. La percepción involucra redes, no un solo punto en este marcador.
Delgado se refiere a su menor diámetro. Los pliegues de su revestimiento, las vellosidades y las microvellosidades aumentan el área de absorción; las estimaciones de longitud y superficie dependen de cómo se midan.
La debilidad del glúteo mayor dificulta la extensión fuerte de la cadera, por ejemplo al levantarse de una silla. La marcha de Trendelenburg se asocia con disfunción de los abductores de la cadera, especialmente los glúteos medio y menor. El nervio glúteo inferior inerva el glúteo mayor.
`);
add('spanish_latin_america',learning,`
Las arterias pulmonares llevan sangre con poco oxígeno. ¿Por qué se llaman arterias?
Las arterias siempre deben llevar sangre rica en oxígeno.
El contenido de oxígeno varía según el circuito. No define qué es una arteria.
Llevan sangre que se aleja del corazón.
Las arterias llevan sangre desde el corazón; las venas la llevan hacia el corazón.
Todo vaso conectado a un pulmón es una arteria.
Las venas pulmonares también se conectan con los pulmones. La dirección respecto al corazón distingue arterias y venas.
Después del intercambio gaseoso en los pulmones, ¿a dónde va la sangre?
A la aurícula derecha por las venas cavas.
Las venas cavas devuelven sangre del cuerpo. La sangre de los pulmones entra en la aurícula izquierda.
Al ventrículo derecho por las arterias pulmonares.
Eso invierte el flujo arterial pulmonar. Las arterias pulmonares llevan sangre del ventrículo derecho hacia los pulmones.
A la aurícula izquierda por las venas pulmonares.
Las venas pulmonares devuelven sangre rica en oxígeno de los pulmones a la aurícula izquierda.
¿Qué pasa entre el aire alveolar y la sangre cercana durante el intercambio gaseoso?
El oxígeno y el dióxido de carbono difunden a través de una barrera delgada.
Los gases difunden a través de la barrera entre aire y sangre. La sangre permanece en los capilares.
Burbujas enteras de aire entran en la sangre.
El intercambio gaseoso normal transfiere moléculas de gas, no burbujas de aire, a la sangre.
El aire atraviesa el diafragma para entrar en la sangre.
El diafragma ayuda a cambiar el volumen del tórax. El intercambio gaseoso ocurre en los alvéolos y los capilares que los rodean.
Durante la respiración tranquila en reposo, ¿qué ayuda a que salga el aire?
El diafragma se contrae y se aplana.
Esto amplía el tórax durante la inhalación. La exhalación tranquila sigue a la relajación de los músculos inspiratorios.
Los músculos inspiratorios se relajan y los pulmones retroceden elásticamente.
El retroceso elástico reduce el volumen pulmonar y eleva la presión alveolar por encima de la atmosférica, por lo que el aire sale.
La gravedad jala todo el aire hacia abajo y fuera de los pulmones.
El aire fluye por una diferencia de presión. Su flujo no se define por ir hacia arriba o hacia abajo.
¿Qué ruta lleva las heces fuera del tubo digestivo?
Recto → canal anal → ano.
Las heces pasan por el recto y el canal anal hasta el ano. La orina sale por otra ruta.
Vejiga → uretra.
La vejiga almacena orina. La vejiga y la uretra son estructuras urinarias, no la ruta de las heces.
Vesícula biliar → intestino delgado.
La vesícula biliar almacena la bilis usada en la digestión. No almacena ni expulsa heces.
¿Cómo ayudan las vellosidades intestinales a absorber nutrientes?
Dejan pasar trozos grandes de comida directamente a la sangre.
Los nutrientes deben atravesar el revestimiento intestinal. Normalmente, los trozos enteros de comida no entran en la sangre.
Bloquean todo movimiento a través del intestino.
Las vellosidades recubren la pared intestinal; no cierran el paso por el intestino.
Aumentan la superficie disponible para la absorción.
Las vellosidades y microvellosidades ofrecen más superficie de absorción en el revestimiento intestinal.
En este ejemplo, ¿qué nervio lleva información sensitiva de la cara palmar del dedo índice?
Nervio ciático.
El nervio ciático sirve al miembro inferior. No lleva la sensibilidad de este dedo.
Nervio mediano.
El nervio mediano lleva fibras sensitivas de esta parte del índice hacia la médula espinal.
Nervio femoral.
El nervio femoral sirve a partes del miembro inferior, no a la mano.
¿Cómo puede comenzar la retirada sin esperar una decisión consciente?
Los circuitos espinales conectan la entrada sensitiva con la salida motora.
Los circuitos espinales pueden iniciar el reflejo mientras la información también viaja hacia el cerebro.
El músculo toma una decisión sin señales nerviosas.
Las fibras musculares responden a señales motoras. No reemplazan las partes sensitivas y espinales de este reflejo.
Ninguna información sobre el estímulo llega jamás al cerebro.
La información también asciende para la percepción, y las vías cerebrales pueden modificar los reflejos espinales.
Explica la ruta
Elige una explicación para cada situación. Estas preguntas evalúan el proceso, no el marcador cercano del diagrama.
respondidas
Correcto.
Reconsidera.
Respuesta:
Revisar el paso relacionado
respuestas correctas de comprensión. Revisar una ruta y valorar la confianza son actividades separadas de estas respuestas.
Volver a los pasos
Terminar la ruta
Terminar sin responder todas las preguntas
respuestas correctas en la última evaluación completada
Ir al paso
Mostrar marcador en el diagrama
Qué muestra este marcador:
Lee sobre esta ruta — OpenStax
Evaluación de la ruta: elige explicaciones para dos situaciones.
`);
add('arabic',content,`
تُظهر العلامة القلب كاملًا؛ وتتتبّع هذه الخطوة الأذين الأيمن فيه.
البطين الأيمن حجرة داخل القلب الذي تشير إليه هذه العلامة.
تحدد علامة الحويصلات الهوائية منطقة التبادل. يبقى الدم في الشعيرات المحيطة ولا يدخل الأكياس الهوائية.
تحدد علامة الرئتين المنطقة. تنقل الأوردة الرئوية الدم من الرئتين إلى الأذين الأيسر؛ ولا يُرسم كل وريد هنا على حدة.
تُظهر العلامة القلب كاملًا؛ وتتتبّع هذه الخطوة الأذين الأيسر فيه.
يمتلئ البطين الأيسر عبر الصمام التاجي ويولّد ضغطًا لإرسال الدم إلى الدورة الدموية الجهازية.
البطين الأيسر حجرة داخل القلب الذي تشير إليه هذه العلامة.
الشريان الفخذي مثال على وعاء يوصل الدم. يحدث التبادل مع أنسجة الجسم لاحقًا في الشعيرات الدموية، وليس في هذا الشريان.
يمر الهواء عبر البلعوم نحو الحنجرة. ينقل البلعوم الفموي والبلعوم الحنجري أيضًا الطعام المبتلع، بينما ينقل البلعوم الأنفي الهواء.
يساعد الغضروف في إبقاء القصبة الهوائية مفتوحة. يحتجز المخاط الجسيمات وتحركه الأهداب نحو الحلق.
توفر الحويصلات الهوائية الصغيرة الكثيرة سطحًا واسعًا ورقيقًا للتبادل. ينتشر الأكسجين إلى دم الشعيرات المجاورة، بينما ينتشر ثاني أكسيد الكربون نحو الهواء السنخي.
الزفير الهادئ
أثناء التنفس الهادئ، ترتخي عضلات الشهيق ويقل حجم الرئتين بفعل الارتداد المرن. يرتفع الضغط السنخي فوق الضغط الجوي فيخرج الهواء. ويستعين الزفير القسري أيضًا بالعضلات.
تُظهر علامة الحجاب الحاجز عضلة تنفسية. يمر الهواء عبر الممرات الهوائية، وليس عبر الحجاب الحاجز.
الفك السفلي معلم عظمي يدعم المضغ. يبقى الطعام في تجويف الفم ولا يمر عبر العظم.
ينقل البلع اللقمة الغذائية عبر البلعوم إلى المريء. وتدفعها انقباضات عضلية منسقة نحو المعدة مع حماية المجرى التنفسي.
تُظهر العلامة البلعوم. يمتد المريء تحته ولا توجد له علامة منفصلة في هذا الفهرس.
الاثنا عشر هو الجزء الأول من الأمعاء الدقيقة؛ وتمثل العلامة العضو الأكبر كاملًا.
تزيد الطيات والزغابات والزغيبات الدقيقة سطح الامتصاص في الأمعاء الدقيقة. ويحدث فيها معظم امتصاص المغذيات.
الصائم واللفائفي منطقتان من الأمعاء الدقيقة؛ وتمثل العلامة العضو الأكبر كاملًا.
تمتص الأمعاء الغليظة الماء والكهارل المتبقية وتساعد على تكوين البراز. وتخمّر ميكروبات الأمعاء بعض المواد التي لم تُهضم.
المستقيم والتغوط
يُحتجز البراز في المستقيم، منطقة التخزين النهائية في الأمعاء الغليظة، قبل خروجه عبر القناة الشرجية والشرج. وتخزن المثانة البول ولا تنتمي إلى هذا المسار الغذائي.
تُظهر العلامة الأمعاء الغليظة. المستقيم هو منطقة التخزين النهائية فيها؛ ولا ترسم هذه العلامة حدود المستقيم بشكل منفصل.
في هذا المثال لسحب اليد، ينشّط منبّه قد يسبب أذى على الجانب الراحي من السبابة نهايات عصبية حسية في الجلد.
تمثل علامة الجلد نوعًا من الأنسجة. يقع المنبّه في المثال على الإصبع، وليس في موضع العلامة على الجسم.
تسير المحاور الحسية من هذا الجزء من الإصبع ضمن العصب المتوسط نحو الحبل الشوكي العنقي، وتدخل عبر الجذور الظهرية. يحتوي العصب المحيطي على محاور كثيرة، وليس عصبونًا واحدًا فقط.
يحمل العصب المتوسط الألياف الحسية المستخدمة في هذا المثال. ولأليافه الحركية أدوار أخرى.
تصل المعلومات الحسية إلى الدوائر الشوكية. ويمكن أن يبدأ الانسحاب دون انتظار قرار واعٍ، بينما تنتقل المعلومات أيضًا نحو الدماغ.
تُظهر العلامة الحبل الشوكي كاملًا. يستخدم هذا المثال للطرف العلوي دوائر شوكية عنقية.
تربط العصبونات البينية الشوكية المدخلات الحسية بالمخرجات الحركية، وتساعد على تنشيط عضلات الانسحاب وتثبيط العضلات المضادة.
تقع العصبونات البينية داخل المادة الرمادية الشوكية؛ ولا تُظهر علامة الحبل الشوكي الكامل الخلايا منفردة.
تغادر المحاور الحركية الحبل الشوكي عبر الجذور البطنية. وتمر المحاور المتجهة إلى العضلة ذات الرأسين عبر الضفيرة العضدية وفرعها، العصب العضلي الجلدي.
تُظهر العلامة شبكة الضفيرة العضدية. ولا يُرسم فرع العصب العضلي الجلدي المتجه إلى العضلة ذات الرأسين بشكل منفصل.
ينشّط تأشير الأستيل كولين في الوصلات العصبية العضلية الألياف العضلية. ويسهم انقباض العضلة ذات الرأسين في ثني المرفق عند سحب الذراع؛ وتشارك أيضًا عضلات أخرى.
تحمل المسارات الصاعدة المعلومات نحو الدماغ للإدراك الواعي. ويمكن لمسارات الدماغ أيضًا تعديل المنعكسات الشوكية؛ ولا تفصل مدة تأخير ثابتة واحدة بين الوعي والانسحاب.
تُظهر العلامة الدماغ كاملًا. يشترك في الإدراك عدد من الشبكات، وليس نقطة واحدة عند هذه العلامة.
تشير كلمة دقيقة إلى قطرها الأضيق. تزيد طيات بطانتها والزغابات والزغيبات الدقيقة مساحة الامتصاص؛ وتعتمد تقديرات الطول والمساحة السطحية على طريقة القياس.
يضعف قصور العضلة الألوية الكبرى بسط الورك بقوة، كما عند النهوض من كرسي. وترتبط مشية ترندلينبورغ بخلل مبعدات الورك، وخاصة الألويتين الوسطى والصغرى. ويعصب العصب الألوي السفلي العضلة الألوية الكبرى.
`);
add('arabic',learning,`
تحمل الشرايين الرئوية دمًا فقيرًا بالأكسجين. فلماذا تُسمى شرايين؟
يجب أن تحمل الشرايين دائمًا دمًا غنيًا بالأكسجين.
يختلف محتوى الأكسجين باختلاف الدورة، ولا يحدد تعريف الشريان.
تحمل الدم بعيدًا عن القلب.
تحمل الشرايين الدم بعيدًا عن القلب، وتحمله الأوردة باتجاه القلب.
كل وعاء متصل برئة هو شريان.
تتصل الأوردة الرئوية أيضًا بالرئتين. يميز اتجاه الجريان بالنسبة إلى القلب الشرايين عن الأوردة.
بعد تبادل الغازات في الرئتين، إلى أين يذهب الدم؟
إلى الأذين الأيمن عبر الوريدين الأجوفين.
يعيد الوريدان الأجوفان الدم من الجسم. أما الدم القادم من الرئتين فيدخل الأذين الأيسر.
إلى البطين الأيمن عبر الشرايين الرئوية.
هذا يعكس اتجاه الجريان الشرياني الرئوي. تنقل الشرايين الرئوية الدم من البطين الأيمن نحو الرئتين.
إلى الأذين الأيسر عبر الأوردة الرئوية.
تعيد الأوردة الرئوية الدم الغني بالأكسجين من الرئتين إلى الأذين الأيسر.
ما الذي يعبر بين الهواء السنخي والدم القريب أثناء تبادل الغازات؟
ينتشر الأكسجين وثاني أكسيد الكربون عبر حاجز رقيق.
تنتشر الغازات عبر الحاجز بين الهواء والدم. ويبقى الدم في الشعيرات الدموية.
تدخل فقاعات هواء كاملة إلى الدم.
ينقل تبادل الغازات الطبيعي جزيئات الغاز إلى الدم، وليس فقاعات الهواء.
يمر الهواء عبر الحجاب الحاجز إلى الدم.
يساعد الحجاب الحاجز على تغيير حجم الصدر. ويحدث تبادل الغازات في الحويصلات الهوائية والشعيرات المحيطة بها.
أثناء التنفس الهادئ في الراحة، ما الذي يساعد على خروج الهواء؟
ينقبض الحجاب الحاجز ويتسطح.
يوسع ذلك الصدر أثناء الشهيق. أما الزفير الهادئ فيتبع ارتخاء عضلات الشهيق.
ترتخي عضلات الشهيق وترتد الرئتان بمرونتهما.
يقلل الارتداد المرن حجم الرئة ويرفع الضغط السنخي فوق الضغط الجوي، فيخرج الهواء.
تسحب الجاذبية كل الهواء إلى أسفل وخارج الرئتين.
يتبع جريان الهواء فرق الضغط، ولا يُعرّف باتجاه إلى أعلى أو إلى أسفل.
أي مسار يخرج عبره البراز من القناة الهضمية؟
المستقيم ← القناة الشرجية ← الشرج.
يمر البراز عبر المستقيم والقناة الشرجية إلى الشرج. ويخرج البول عبر مسار منفصل.
المثانة ← الإحليل.
تخزن المثانة البول. والمثانة والإحليل من البنى البولية، وليسا مسار خروج البراز.
المرارة ← الأمعاء الدقيقة.
تخزن المرارة الصفراء المستخدمة في الهضم. ولا تخزن البراز أو تطرده.
كيف تدعم الزغابات المعوية امتصاص المغذيات؟
تسمح بمرور قطع طعام كبيرة مباشرة إلى الدم.
يجب أن تعبر المغذيات بطانة الأمعاء. ولا تدخل قطع الطعام الكاملة عادةً إلى الدم.
تمنع كل حركة عبر الأمعاء.
تبطن الزغابات جدار الأمعاء ولا تغلق الممر خلالها.
تزيد المساحة المتاحة للامتصاص.
توفر الزغابات والزغيبات الدقيقة مساحة امتصاص أكبر في بطانة الأمعاء.
في هذا المثال، أي عصب يحمل المعلومات الحسية من الجانب الراحي للسبابة؟
العصب الوركي.
يخدم العصب الوركي الطرف السفلي، ولا يحمل الإحساس من هذا الإصبع.
العصب المتوسط.
يحمل العصب المتوسط أليافًا حسية من هذا الجزء من السبابة نحو الحبل الشوكي.
العصب الفخذي.
يخدم العصب الفخذي أجزاء من الطرف السفلي، وليس اليد.
كيف يمكن أن يبدأ الانسحاب دون انتظار قرار واعٍ؟
تربط الدوائر الشوكية المدخلات الحسية بالمخرجات الحركية.
يمكن للدوائر الشوكية بدء المنعكس بينما تنتقل المعلومات أيضًا نحو الدماغ.
تتخذ العضلة قرارًا دون إشارات عصبية.
تستجيب الألياف العضلية للإشارات الحركية، ولا تحل محل الأجزاء الحسية والشوكية لهذا المنعكس.
لا تصل أي معلومات عن المنبّه إلى الدماغ أبدًا.
تصعد المعلومات أيضًا من أجل الإدراك، ويمكن لمسارات الدماغ تعديل المنعكسات الشوكية.
اشرح المسار
اختر تفسيرًا لكل موقف. تقيّم هذه الأسئلة العملية، وليس علامة الرسم القريبة.
تمت الإجابة عنها
صحيح.
أعد النظر.
الإجابة:
راجع الخطوة ذات الصلة
إجابات صحيحة في أسئلة الفهم. مراجعة المسار وتقييم الثقة أمران منفصلان عن هذه الإجابات.
العودة إلى الخطوات
إنهاء المسار
الإنهاء دون إكمال الأسئلة
إجابات صحيحة في آخر تقييم مكتمل للفهم
انتقل إلى الخطوة
أظهر العلامة على الرسم
ما الذي تُظهره هذه العلامة:
اقرأ عن هذا المسار — OpenStax
تقييم المسار: اختر تفسيرات لموقفين.
`);
fs.writeFileSync('dev-tools/i18n/handtl_anatomy_pathways_20260912.json',JSON.stringify(translated,null,2)+'\n');
const registry='dev-tools/i18n/stem_anatomy_en.json';const en=JSON.parse(fs.readFileSync(registry,'utf8'));Object.assign(en,content,learning);fs.writeFileSync(registry,JSON.stringify(en,null,2)+'\n');
for(const [lang,dict]of Object.entries(translated))for(const prefix of ['', 'desktop/web-app/public/']){const file=prefix+'lang/'+lang+'.js';const pack=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(pack.stem.anatomy,dict);fs.writeFileSync(file,JSON.stringify(pack,null,2)+'\n');}
console.log(Object.keys(content).length+Object.keys(learning).length+' new strings translated into three languages across six packs.');
