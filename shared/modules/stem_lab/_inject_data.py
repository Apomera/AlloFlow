import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('stem_tool_anatomy.js', 'r', encoding='utf-8') as f:
    txt = f.read()

sep_before = txt.rfind('        // \u2550', 0, txt.find('        // DERIVED STATE'))
print('sep_before:', sep_before)

INSERT = (
    '\n'
    '        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n'
    '        // FUN FACTS\n'
    '        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n'
    '        var FUN_FACTS = {\n'
    '          skeletal: [\n'
    "            'Babies are born with about 270 bones, but adults only have 206 because many fuse together as you grow!',\n"
    "            'The smallest bone in your body is the stirrup (stapes) in your ear \u2014 it is only about 3mm long!',\n"
    "            'Bone is stronger than steel by weight \u2014 a cubic inch of bone can withstand forces of up to 19,000 pounds!'\n"
    '          ],\n'
    '          muscular: [\n'
    "            'You use about 200 muscles just to take a single step when walking!',\n"
    "            'The heart is the hardest-working muscle \u2014 it beats about 100,000 times a day without ever resting.',\n"
    "            'The gluteus maximus is the largest muscle in your body, and the stapedius in your ear is the smallest!'\n"
    '          ],\n'
    '          circulatory: [\n'
    "            'Your blood vessels, if stretched end to end, would wrap around the Earth about 2.5 times \u2014 that is over 60,000 miles!',\n"
    "            'Your heart pumps about 2,000 gallons of blood every single day without you thinking about it.',\n"
    "            'Red blood cells live for only about 120 days, and your bone marrow makes about 2 million new ones every second!'\n"
    '          ],\n'
    '          nervous: [\n'
    "            'Your brain has about 86 billion neurons, and each one can connect to up to 10,000 others \u2014 making over 100 trillion connections!',\n"
    "            'Nerve impulses travel at speeds up to 268 mph \u2014 that is faster than a Formula 1 race car!',\n"
    "            'The human brain generates about 20 watts of power \u2014 enough to light a small LED bulb!'\n"
    '          ],\n'
    '          lymphatic: [\n'
    "            'Your body has about 600 to 700 lymph nodes \u2014 tiny filters that help trap germs and cancer cells!',\n"
    "            'The spleen can store up to a cup of blood as an emergency reserve for when you need it most.',\n"
    "            'Your lymphatic system moves about 3 liters of fluid back into your bloodstream every single day!'\n"
    '          ],\n'
    '          organs: [\n'
    "            'Your liver performs over 500 different jobs, including making bile, filtering toxins, and storing vitamins!',\n"
    "            'The small intestine, unfolded, would be about 20 feet long \u2014 longer than most rooms!',\n"
    "            'Your kidneys filter your entire blood supply about 40 times every day \u2014 that is 180 liters of fluid!'\n"
    '          ],\n'
    '          integumentary: [\n'
    "            'Your skin is your largest organ \u2014 it covers about 2 square meters and makes up about 16% of your total body weight!',\n"
    "            'You shed about 30,000 to 40,000 dead skin cells every hour \u2014 a whole new outer layer every 2 to 4 weeks!',\n"
    "            'Skin can stretch up to 3 times its original size, which is why it accommodates both growth and injury so well!'\n"
    '          ],\n'
    '          respiratory: [\n'
    "            'You breathe about 22,000 times a day, moving around 11,000 liters of air through your lungs!',\n"
    "            'If you unfolded all 300 million alveoli in your lungs, the surface area would be about the size of a tennis court!',\n"
    "            'The lungs are the only organs that float on water because they are full of tiny air-filled sacs called alveoli!'\n"
    '          ],\n'
    '          endocrine: [\n'
    "            'Your pituitary gland is only the size of a pea, but it controls nearly every other hormone-producing gland in your body!',\n"
    "            'Adrenaline can be released in under a second during a stressful event, instantly boosting your heart rate and strength!',\n"
    "            'The pancreas releases insulin within just minutes of you eating \u2014 it is constantly monitoring your blood sugar 24/7!'\n"
    '          ],\n'
    '          reproductive: [\n'
    "            'A single human egg is the largest cell in the body and is just barely visible to the naked eye \u2014 about 0.1mm wide!',\n"
    "            'Sperm are among the smallest cells in the body \u2014 they are 10 times smaller than a red blood cell!',\n"
    "            'During pregnancy, a woman\\'s heart grows larger and pumps about 50% more blood to support the growing baby!'\n"
    '          ]\n'
    '        };\n'
    '\n'
    '        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n'
    '        // CONNECTIONS DATA\n'
    '        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n'
    '        var CONNECTIONS = [\n'
    "          { id: 'conn_1', systems: ['circulatory', 'respiratory'], title: 'Gas Exchange', desc: 'The circulatory system delivers deoxygenated blood to the lungs, where the respiratory system loads it with oxygen and offloads carbon dioxide across the thin alveolar-capillary membrane.', example: 'Every breath you take replenishes the oxygen that your red blood cells carry to every organ in your body.', icon: '\uD83D\uDCA8' },\n"
    "          { id: 'conn_2', systems: ['nervous', 'muscular'], title: 'Neuromuscular Junction', desc: 'Motor neurons from the nervous system release acetylcholine at the neuromuscular junction, triggering muscle fiber contraction. Without neural signals, muscles cannot move.', example: 'When you decide to kick a soccer ball, your motor cortex sends signals down the spinal cord to fire the quadriceps muscles.', icon: '\u26A1' },\n"
    "          { id: 'conn_3', systems: ['skeletal', 'muscular'], title: 'Lever System for Movement', desc: 'Muscles attach to bones via tendons and pull across joints, creating lever systems. The skeleton provides rigid levers; muscles provide the pulling force.', example: 'Your biceps pulls on the radius bone to flex your elbow \u2014 a classic third-class lever that trades force for range of motion.', icon: '\uD83E\uDDB4' },\n"
    "          { id: 'conn_4', systems: ['endocrine', 'reproductive'], title: 'Hormonal Regulation of Reproduction', desc: 'The hypothalamus-pituitary axis releases FSH and LH that regulate the gonads. Estrogen, progesterone, and testosterone from reproductive organs feedback to the endocrine system.', example: 'During puberty, rising levels of LH and FSH trigger the ovaries and testes to mature and begin producing sex hormones.', icon: '\u2697\uFE0F' },\n"
    "          { id: 'conn_5', systems: ['circulatory', 'lymphatic'], title: 'Immune Defense and Fluid Balance', desc: 'The lymphatic system returns interstitial fluid to the bloodstream and deploys immune cells made in lymphoid organs. Both systems maintain fluid homeostasis and fight infection.', example: 'When you get a cut, lymph nodes near the wound swell as they activate immune cells, while the circulatory system sends white blood cells to the site.', icon: '\uD83D\uDFE2' },\n"
    "          { id: 'conn_6', systems: ['nervous', 'endocrine'], title: 'Hypothalamic-Pituitary Axis', desc: 'The hypothalamus bridges the nervous and endocrine systems \u2014 it integrates neural signals and translates them into hormonal commands that control the pituitary gland and all downstream hormone cascades.', example: 'When you are stressed, your hypothalamus signals the pituitary to release ACTH, which tells the adrenal glands to make cortisol.', icon: '\uD83E\uDDE0' },\n"
    "          { id: 'conn_7', systems: ['respiratory', 'muscular'], title: 'Breathing Mechanics', desc: 'The diaphragm and intercostal muscles physically expand and compress the thoracic cavity to move air. Lungs have no muscle themselves and rely entirely on surrounding muscles.', example: 'During a deep breath, your diaphragm contracts downward and your external intercostals lift your ribs outward, creating negative pressure that pulls air in.', icon: '\uD83E\uDEC1' },\n"
    "          { id: 'conn_8', systems: ['integumentary', 'nervous'], title: 'Sensory Receptors in Skin', desc: 'The skin contains millions of specialized nerve endings and encapsulated receptors that detect touch, pressure, temperature, and pain, feeding constant sensory data to the nervous system.', example: 'Meissner\\'s corpuscles in your fingertips allow you to feel light touch with incredible precision, which is why you can read Braille.', icon: '\uD83E\uDDF4' },\n"
    "          { id: 'conn_9', systems: ['organs', 'circulatory'], title: 'Portal Circulation and Nutrient Processing', desc: 'Blood from the GI tract drains through the hepatic portal vein directly to the liver before entering general circulation, allowing the liver to process nutrients and detoxify substances first.', example: 'After you eat, glucose absorbed from the small intestine travels straight to the liver, which stores excess glucose as glycogen to prevent a blood sugar spike.', icon: '\uD83C\uDFE5' },\n"
    "          { id: 'conn_10', systems: ['skeletal', 'circulatory'], title: 'Bone Marrow Blood Cell Production', desc: 'Red bone marrow inside the skeleton is the birthplace of all blood cells. Red blood cells, white blood cells, and platelets are all produced here through hematopoiesis.', example: 'The marrow in your sternum and pelvis produces about 2 million red blood cells per second to replace the ones that wear out after 120 days.', icon: '\uD83E\uDDB4' }\n"
    '        ];\n'
    '\n'
    '        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n'
    '        // GUIDED TOURS DATA\n'
    '        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n'
    '        var GUIDED_TOURS = {\n'
    '          skeletal: [\n'
    "            { structureId: 'skull', title: 'The Skull', narration: 'Your skull is like a super-strong helmet made of 22 fused bones. It protects your brain, houses your eyes and ears, and gives your face its shape.' },\n"
    "            { structureId: 'vertebral', title: 'The Vertebral Column', narration: 'Your spine is a stack of 33 vertebrae that protects your spinal cord. It holds you upright and lets you bend and twist. The S-curve acts like a spring to absorb shocks.' },\n"
    "            { structureId: 'ribs', title: 'The Rib Cage', narration: 'Your 12 pairs of ribs form a protective cage around your heart and lungs. They flex slightly with each breath to let your lungs expand and contract.' },\n"
    "            { structureId: 'femur', title: 'The Femur', narration: 'The femur is your thigh bone and the longest, strongest bone in your body. It can bear loads of 2 to 3 times your body weight during walking.' },\n"
    "            { structureId: 'pelvis', title: 'The Pelvis', narration: 'The pelvis is a ring of bones that transfers your body weight from your spine down to your legs. It also protects your bladder and reproductive organs.' }\n"
    '          ],\n'
    '          muscular: [\n'
    "            { structureId: 'diaphragm_m', title: 'The Diaphragm', narration: 'The diaphragm is your main breathing muscle \u2014 a dome-shaped sheet separating your chest from your abdomen. When it contracts and flattens, it creates room for your lungs to expand.' },\n"
    "            { structureId: 'deltoid', title: 'The Deltoid', narration: 'The deltoid wraps around your shoulder. Its three sections let you raise your arm to the side, swing it forward, and pull it back. Every throw, wave, and reach uses this muscle.' },\n"
    "            { structureId: 'rectus_ab', title: 'Rectus Abdominis', narration: 'The rectus abdominis creates the six-pack appearance. It flexes your trunk forward and helps stabilize your pelvis when you walk and run.' },\n"
    "            { structureId: 'quads', title: 'The Quadriceps', narration: 'Your quadriceps are four powerful muscles on the front of your thigh. They straighten your knee and are critical for walking, climbing stairs, and running.' },\n"
    "            { structureId: 'gastrocnemius', title: 'The Gastrocnemius', narration: 'The gastrocnemius is the big calf muscle on the back of the lower leg. It points your foot down for push-off when walking, connecting to the heel via the Achilles tendon.' }\n"
    '          ],\n'
    '          circulatory: [\n'
    "            { structureId: 'heart', title: 'The Heart', narration: 'Your heart is a fist-sized pump that beats about 100,000 times every day. Four chambers route blood: the right side sends it to the lungs, and the left pumps oxygen-rich blood to the whole body.' },\n"
    "            { structureId: 'aorta', title: 'The Aorta', narration: 'The aorta is the biggest artery in your body. It carries oxygen-rich blood from the left ventricle, arches over your heart, then descends to supply every organ.' },\n"
    "            { structureId: 'coronary', title: 'Coronary Arteries', narration: 'The coronary arteries are the heart\\'s own blood supply. When one gets blocked by a clot, that part of the heart is starved of oxygen \u2014 that is a heart attack.' },\n"
    "            { structureId: 'carotid', title: 'The Carotid Arteries', narration: 'You have two carotid arteries, one on each side of your neck. They are the main highways carrying blood to your brain. You can feel them pulsing in your neck.' }\n"
    '          ],\n'
    '          nervous: [\n'
    "            { structureId: 'brain', title: 'The Brain', narration: 'Your brain is command central for your entire body, with about 86 billion neurons. The outer cortex handles thinking and senses. The cerebellum coordinates balance and movement.' },\n"
    "            { structureId: 'cerebral_cortex', title: 'The Cerebral Cortex', narration: 'The cortex is the wrinkled outer layer of your brain. The front plans and controls movement. The back processes vision. The sides handle sound and memory.' },\n"
    "            { structureId: 'spinal_cord', title: 'The Spinal Cord', narration: 'The spinal cord is the main highway of your nervous system, running inside the vertebral column. Messages travel up and down it thousands of times every second.' },\n"
    "            { structureId: 'vagus', title: 'The Vagus Nerve', narration: 'The vagus nerve wanders from your brain stem all the way to your abdomen. It controls heart rate, digestion, and breathing as part of your rest-and-digest response.' }\n"
    '          ],\n'
    '          lymphatic: [\n'
    "            { structureId: 'thymus', title: 'The Thymus', narration: 'The thymus is where immature T-cells learn to tell the difference between your own cells and foreign invaders. It is most active during childhood and shrinks after puberty.' },\n"
    "            { structureId: 'spleen', title: 'The Spleen', narration: 'The spleen filters old and damaged red blood cells out of your blood and helps your immune system respond to blood-borne bacteria and viruses.' },\n"
    "            { structureId: 'cervical_ln', title: 'Cervical Lymph Nodes', narration: 'Lymph nodes along your neck filter lymph fluid and trap germs draining from your head and throat. They swell and become tender when you have a sore throat or infection.' },\n"
    "            { structureId: 'bone_marrow', title: 'Bone Marrow', narration: 'Deep inside your larger bones is red bone marrow, a factory that produces all your blood cells \u2014 billions of red blood cells, white blood cells, and platelets every hour.' }\n"
    '          ],\n'
    '          organs: [\n'
    "            { structureId: 'lungs', title: 'The Lungs', narration: 'Your two lungs fill most of your chest cavity. Inside are about 300 million tiny alveoli where oxygen enters your blood and carbon dioxide leaves.' },\n"
    "            { structureId: 'liver', title: 'The Liver', narration: 'The liver performs over 500 functions: making bile to digest fat, filtering toxins, storing sugar as glycogen, and producing essential proteins.' },\n"
    "            { structureId: 'stomach', title: 'The Stomach', narration: 'Your stomach is a muscular J-shaped bag that churns food with acid and digestive enzymes, breaking it into a paste that slowly enters the small intestine.' },\n"
    "            { structureId: 'kidneys', title: 'The Kidneys', narration: 'Your two kidneys each contain about a million tiny filters called nephrons. Together they filter all your blood about 40 times a day, removing waste and regulating fluid balance.' }\n"
    '          ],\n'
    '          integumentary: [\n'
    "            { structureId: 'epidermis', title: 'The Epidermis', narration: 'The epidermis is the outermost layer of your skin \u2014 a waterproof barrier you can see and touch. It renews itself completely about every 28 days.' },\n"
    "            { structureId: 'dermis', title: 'The Dermis', narration: 'Just below the epidermis is the dermis, packed with collagen fibers, blood vessels, nerves, sweat glands, and hair follicles. It gives skin its strength and elasticity.' },\n"
    "            { structureId: 'hair_follicle', title: 'Hair Follicles', narration: 'Each hair grows from a follicle deep in your skin. A tiny muscle attached to the follicle causes hair to stand up when you are cold or scared, creating goosebumps.' },\n"
    "            { structureId: 'melanocytes', title: 'Melanocytes', narration: 'Melanocytes produce melanin, the pigment that gives skin and hair their color. UV light triggers them to make more melanin to protect your DNA \u2014 that is what a tan actually is.' }\n"
    '          ],\n'
    '          respiratory: [\n'
    "            { structureId: 'nasal_cavity', title: 'Nasal Cavity', narration: 'Your nose warms, humidifies, and filters the air before it reaches your lungs. Inside, turbinate bones create turbulence that maximizes contact with mucous membranes.' },\n"
    "            { structureId: 'larynx', title: 'The Larynx', narration: 'The larynx, or voice box, sits at the top of your trachea. Two vocal cords inside vibrate as air passes over them to create sound.' },\n"
    "            { structureId: 'bronchi', title: 'The Bronchial Tree', narration: 'The trachea splits into bronchi, which branch again and again like a tree into smaller tubes. By the time air reaches the alveoli, it has traveled through about 23 generations of branching.' },\n"
    "            { structureId: 'alveoli', title: 'The Alveoli', narration: 'The alveoli are 300 million tiny balloon-like sacs at the end of the bronchial tree. Oxygen crosses into the blood and carbon dioxide crosses out in less than a second.' }\n"
    '          ],\n'
    '          endocrine: [\n'
    "            { structureId: 'pituitary', title: 'The Pituitary Gland', narration: 'The pituitary is a pea-sized gland at the base of your brain. It is called the master gland because it sends hormonal commands to your thyroid, adrenals, gonads, and other glands.' },\n"
    "            { structureId: 'thyroid', title: 'The Thyroid', narration: 'The thyroid gland wraps around the front of your trachea in a butterfly shape. It produces hormones that control your metabolic rate \u2014 how fast your cells burn energy.' },\n"
    "            { structureId: 'adrenal_endo', title: 'Adrenal Cortex', narration: 'Sitting on top of each kidney, the adrenal glands produce steroid hormones. The cortex makes cortisol for stress and aldosterone for salt balance. The medulla releases adrenaline in emergencies.' },\n"
    "            { structureId: 'islets', title: 'Islets of Langerhans', narration: 'Scattered in the pancreas, beta cells make insulin to lower blood sugar and alpha cells make glucagon to raise it. Together they keep your blood glucose in a narrow safe range.' }\n"
    '          ],\n'
    '          reproductive: [\n'
    "            { structureId: 'testes_repro', title: 'The Testes', narration: 'The testes are located in the scrotum where the temperature is 2 to 3 degrees cooler than the body, essential for sperm production. Each day they produce about 200 million sperm.' },\n"
    "            { structureId: 'uterus', title: 'The Uterus', narration: 'The uterus is a muscular pear-shaped organ where a fertilized egg implants and grows into a baby. Its inner lining thickens each month and sheds during menstruation if no egg implants.' },\n"
    "            { structureId: 'ovaries_repro', title: 'The Ovaries', narration: 'The two ovaries contain all the eggs a female will ever have. Each month, one egg matures and is released at ovulation, ready to be fertilized in the fallopian tube.' },\n"
    "            { structureId: 'placenta', title: 'The Placenta', narration: 'The placenta develops during pregnancy, connecting mother and baby without their blood mixing. It transfers oxygen and nutrients to the baby while removing carbon dioxide and waste.' }\n"
    '          ]\n'
    '        };\n'
    '\n'
    '        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n'
    '        // CLINICAL CASES DATA\n'
    '        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n'
    '        var CLINICAL_CASES = [\n'
    "          { id: 'case_1', title: 'The Runner\\'s Knee', system: 'skeletal', presentation: 'A 16-year-old cross-country runner has dull aching pain around the front of the knee that worsens going down stairs and after long runs. No swelling or locking. Pain improves with rest.', question: 'Which structure is most likely affected?', answer: 'Patella / patellofemoral joint', explanation: 'Patellofemoral pain syndrome occurs when the patella does not track smoothly in its groove on the femur. Repeated stress from running causes cartilage irritation. Treatment includes quad strengthening, hip stabilization, and activity modification.', difficulty: 'intermediate' },\n"
    "          { id: 'case_2', title: 'The Shoulder That Won\\'t Lift', system: 'muscular', presentation: 'A 45-year-old painter has gradual onset right shoulder pain for 3 months. He cannot lift his arm above 90 degrees without pain. He wakes up at night with shoulder pain and a grinding sensation.', question: 'Which structure is most likely torn?', answer: 'Supraspinatus tendon (rotator cuff)', explanation: 'The supraspinatus is the most commonly torn rotator cuff muscle. It runs under the acromion where it is susceptible to impingement and tears. Overhead work like painting increases this risk significantly.', difficulty: 'intermediate' },\n"
    "          { id: 'case_3', title: 'Racing Heart After Exercise', system: 'circulatory', presentation: 'A 14-year-old athlete notices her heart racing and skipping beats for a few seconds after sprinting. She feels fine otherwise, with no chest pain or fainting. Physical exam is normal.', question: 'Which structure controls the normal heart rhythm?', answer: 'Sinoatrial (SA) node', explanation: 'The SA node in the right atrium is the heart\\'s natural pacemaker. During intense exercise, adrenaline can cause benign palpitations as the heart rate adjusts. Persistent arrhythmias should be evaluated to rule out structural heart disease.', difficulty: 'beginner' },\n"
    "          { id: 'case_4', title: 'The Numb Hand', system: 'nervous', presentation: 'A 35-year-old office worker has progressive tingling and numbness in her thumb, index, and middle fingers for 2 months, worse at night. She shakes her hand to relieve it. She types 8 hours a day.', question: 'Which nerve is being compressed?', answer: 'Median nerve (carpal tunnel syndrome)', explanation: 'Carpal tunnel syndrome is compression of the median nerve under the flexor retinaculum at the wrist. The median nerve supplies sensation to the thumb and first 3.5 fingers. Repetitive wrist use is a major risk factor.', difficulty: 'intermediate' },\n"
    "          { id: 'case_5', title: 'The Swollen Neck Node', system: 'lymphatic', presentation: 'A 17-year-old presents with a 3 cm painless, rubbery lymph node in the left neck for 6 weeks. He has had night sweats and lost 5 kg without trying. No fever or sore throat.', question: 'What diagnosis must be urgently ruled out?', answer: 'Lymphoma (Hodgkin lymphoma)', explanation: 'Painless lymphadenopathy with B-symptoms (night sweats, weight loss, fever) is the classic presentation of Hodgkin lymphoma in young adults. Biopsy showing Reed-Sternberg cells confirms the diagnosis.', difficulty: 'advanced' },\n"
    "          { id: 'case_6', title: 'The Diabetic Emergency', system: 'endocrine', presentation: 'A 16-year-old with known Type 1 diabetes is found confused at home, breathing deeply and rapidly. His breath smells fruity. Blood glucose is 480 mg/dL. He missed his insulin doses for 2 days.', question: 'Which cells failed, and what is the emergency condition?', answer: 'Beta cells of islets of Langerhans; Diabetic Ketoacidosis (DKA)', explanation: 'Without insulin from beta cells, glucose cannot enter cells. The body burns fat, producing ketones that acidify the blood. Kussmaul breathing compensates by exhaling CO2. Treatment: IV fluids, insulin drip, and electrolyte replacement.', difficulty: 'advanced' },\n"
    "          { id: 'case_7', title: 'The Broken Collarbone', system: 'skeletal', presentation: 'An 11-year-old falls off his bicycle and lands on his outstretched right hand. He has immediate pain and deformity at the middle third of his right clavicle. He holds his arm close to his side.', question: 'Why is the middle third of the clavicle the most common fracture site?', answer: 'The middle third is thinnest and has no muscular reinforcement', explanation: 'The clavicle is the most frequently fractured bone. Its middle third is thinnest and lacks muscular protection. Force from a fall on an outstretched hand concentrates at this weak point. Most heal with sling immobilization.', difficulty: 'beginner' },\n"
    "          { id: 'case_8', title: 'Breathless at High Altitude', system: 'respiratory', presentation: 'A healthy 15-year-old hikes to 12,000 feet and develops headache, shortness of breath at rest, and a dry cough. Her oxygen saturation is 84%. At sea level it was 99%.', question: 'Why does altitude cause these symptoms, and which structure is most stressed?', answer: 'The alveoli and respiratory muscles; reduced atmospheric oxygen causes hypoxia', explanation: 'At high altitude, atmospheric pressure drops, reducing the partial pressure of oxygen. Less oxygen crosses the alveolar membrane. The body compensates by breathing faster and deeper, increasing respiratory muscle work.', difficulty: 'intermediate' }\n"
    '        ];\n'
    '\n'
)

new_txt = txt[:sep_before] + INSERT + txt[sep_before:]
print('New length:', len(new_txt))
with open('stem_tool_anatomy.js', 'w', encoding='utf-8') as f:
    f.write(new_txt)
print('Done step 1: data blocks inserted')
