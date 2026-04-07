import io
f = io.open('stem_tool_anatomy.js', 'a', encoding='utf-8')

f.write("""        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        // FUN FACTS
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        var FUN_FACTS = {
          skeletal: [
            'Babies are born with about 270 bones, but adults only have 206 because many fuse together as you grow!',
            'The smallest bone in your body is the stirrup (stapes) in your ear \\u2014 it is only about 3mm long!',
            'Bone is stronger than steel by weight \\u2014 a cubic inch of bone can withstand forces of up to 19,000 pounds!'
          ],
          muscular: [
            'You use about 200 muscles just to take a single step when walking!',
            'The heart is the hardest-working muscle \\u2014 it beats about 100,000 times a day without ever resting.',
            'The gluteus maximus is the largest muscle in your body, and the stapedius in your ear is the smallest!'
          ],
          circulatory: [
            'Your blood vessels, if stretched end to end, would wrap around the Earth about 2.5 times \\u2014 that is over 60,000 miles!',
            'Your heart pumps about 2,000 gallons of blood every single day without you thinking about it.',
            'Red blood cells live for only about 120 days, and your bone marrow makes about 2 million new ones every second!'
          ],
          nervous: [
            'Your brain has about 86 billion neurons, and each one can connect to up to 10,000 others \\u2014 making over 100 trillion connections!',
            'Nerve impulses travel at speeds up to 268 mph \\u2014 that is faster than a Formula 1 race car!',
            'The human brain generates about 20 watts of power \\u2014 enough to light a small LED bulb!'
          ],
          lymphatic: [
            'Your body has about 600 to 700 lymph nodes \\u2014 tiny filters that help trap germs and cancer cells!',
            'The spleen can store up to a cup of blood as an emergency reserve for when you need it most.',
            'Your lymphatic system moves about 3 liters of fluid back into your bloodstream every single day!'
          ],
          organs: [
            'Your liver performs over 500 different jobs, including making bile, filtering toxins, and storing vitamins!',
            'The small intestine, unfolded, would be about 20 feet long \\u2014 longer than most rooms!',
            'Your kidneys filter your entire blood supply about 40 times every day \\u2014 that is 180 liters of fluid!'
          ],
          integumentary: [
            'Your skin is your largest organ \\u2014 it covers about 2 square meters and makes up about 16% of your total body weight!',
            'You shed about 30,000 to 40,000 dead skin cells every hour \\u2014 a whole new outer layer every 2 to 4 weeks!',
            'Skin can stretch up to 3 times its original size, which is why it accommodates both growth and injury so well!'
          ],
          respiratory: [
            'You breathe about 22,000 times a day, moving around 11,000 liters of air through your lungs!',
            'If you unfolded all 300 million alveoli in your lungs, the surface area would be about the size of a tennis court!',
            'The lungs are the only organs that float on water because they are full of tiny air-filled sacs called alveoli!'
          ],
          endocrine: [
            'Your pituitary gland is only the size of a pea, but it controls nearly every other hormone-producing gland in your body!',
            'Adrenaline can be released in under a second during a stressful event, instantly boosting your heart rate and strength!',
            'The pancreas releases insulin within just minutes of you eating \\u2014 it is constantly monitoring your blood sugar 24/7!'
          ],
          reproductive: [
            'A single human egg is the largest cell in the body and is just barely visible to the naked eye \\u2014 about 0.1mm wide!',
            'Sperm are among the smallest cells in the body \\u2014 they are 10 times smaller than a red blood cell!',
            'During pregnancy, a woman\\'s heart grows larger and pumps about 50% more blood to support the growing baby!'
          ]
        };

        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        // CONNECTIONS DATA
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        var CONNECTIONS = [
          { id: 'conn_1', systems: ['circulatory', 'respiratory'], title: 'Gas Exchange', desc: 'The circulatory system delivers deoxygenated blood to the lungs, where the respiratory system loads it with oxygen and offloads carbon dioxide across the thin alveolar-capillary membrane.', example: 'Every breath you take replenishes the oxygen that your red blood cells carry to every organ in your body.', icon: '\\uD83D\\uDCA8' },
          { id: 'conn_2', systems: ['nervous', 'muscular'], title: 'Neuromuscular Junction', desc: 'Motor neurons from the nervous system release acetylcholine at the neuromuscular junction, triggering muscle fiber contraction. Without neural signals, muscles cannot move.', example: 'When you decide to kick a soccer ball, your motor cortex sends signals down the spinal cord to fire the quadriceps muscles.', icon: '\\u26A1' },
          { id: 'conn_3', systems: ['skeletal', 'muscular'], title: 'Lever System for Movement', desc: 'Muscles attach to bones via tendons and pull across joints, creating lever systems. The skeleton provides rigid levers; muscles provide the pulling force.', example: 'Your biceps pulls on the radius bone to flex your elbow \\u2014 a classic third-class lever that trades force for range of motion.', icon: '\\uD83E\\uDDB4' },
          { id: 'conn_4', systems: ['endocrine', 'reproductive'], title: 'Hormonal Regulation of Reproduction', desc: 'The hypothalamus-pituitary axis releases FSH and LH that regulate the gonads. Estrogen, progesterone, and testosterone from reproductive organs feedback to the endocrine system.', example: 'During puberty, rising levels of LH and FSH trigger the ovaries and testes to mature and begin producing sex hormones.', icon: '\\u2697\\uFE0F' },
          { id: 'conn_5', systems: ['circulatory', 'lymphatic'], title: 'Immune Defense and Fluid Balance', desc: 'The lymphatic system returns interstitial fluid to the bloodstream and deploys immune cells made in lymphoid organs. Both systems maintain fluid homeostasis and fight infection.', example: 'When you get a cut, lymph nodes near the wound swell as they activate immune cells, while the circulatory system sends white blood cells to the site.', icon: '\\uD83D\\uDFE2' },
          { id: 'conn_6', systems: ['nervous', 'endocrine'], title: 'Hypothalamic-Pituitary Axis', desc: 'The hypothalamus bridges the nervous and endocrine systems \\u2014 it integrates neural signals and translates them into hormonal commands that control the pituitary gland and all downstream hormone cascades.', example: 'When you are stressed, your hypothalamus signals the pituitary to release ACTH, which tells the adrenal glands to make cortisol.', icon: '\\uD83E\\uDDE0' },
          { id: 'conn_7', systems: ['respiratory', 'muscular'], title: 'Breathing Mechanics', desc: 'The diaphragm and intercostal muscles physically expand and compress the thoracic cavity to move air. Lungs have no muscle themselves and rely entirely on surrounding muscles.', example: 'During a deep breath, your diaphragm contracts downward and your external intercostals lift your ribs outward, creating negative pressure that pulls air in.', icon: '\\uD83E\\uDEC1' },
          { id: 'conn_8', systems: ['integumentary', 'nervous'], title: 'Sensory Receptors in Skin', desc: 'The skin contains millions of specialized nerve endings and encapsulated receptors that detect touch, pressure, temperature, and pain, feeding constant sensory data to the nervous system.', example: 'Meissner\\'s corpuscles in your fingertips allow you to feel light touch with incredible precision, which is why you can read Braille.', icon: '\\uD83E\\uDDF4' },
          { id: 'conn_9', systems: ['organs', 'circulatory'], title: 'Portal Circulation and Nutrient Processing', desc: 'Blood from the GI tract drains through the hepatic portal vein directly to the liver before entering general circulation, allowing the liver to process nutrients and detoxify substances first.', example: 'After you eat, glucose absorbed from the small intestine travels straight to the liver, which stores excess glucose as glycogen to prevent a blood sugar spike.', icon: '\\uD83C\\uDFE5' },
          { id: 'conn_10', systems: ['skeletal', 'circulatory'], title: 'Bone Marrow Blood Cell Production', desc: 'Red bone marrow inside the skeleton is the birthplace of all blood cells. Red blood cells, white blood cells, and platelets are all produced here through hematopoiesis.', example: 'The marrow in your sternum and pelvis produces about 2 million red blood cells per second to replace the ones that wear out after 120 days.', icon: '\\uD83E\\uDDB4' }
        ];

        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        // GUIDED TOURS DATA
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        var GUIDED_TOURS = {
          skeletal: [
            { structureId: 'skull', title: 'The Skull', narration: 'Your skull is like a super-strong helmet made of 22 fused bones. It protects your brain, houses your eyes and ears, and gives your face its shape.' },
            { structureId: 'vertebral', title: 'The Vertebral Column', narration: 'Your spine is a stack of 33 vertebrae that protects your spinal cord. It holds you upright and lets you bend and twist. The S-curve acts like a spring to absorb shocks.' },
            { structureId: 'ribs', title: 'The Rib Cage', narration: 'Your 12 pairs of ribs form a protective cage around your heart and lungs. They flex slightly with each breath to let your lungs expand and contract.' },
            { structureId: 'femur', title: 'The Femur', narration: 'The femur is your thigh bone and the longest, strongest bone in your body. It can bear loads of 2 to 3 times your body weight during walking.' },
            { structureId: 'pelvis', title: 'The Pelvis', narration: 'The pelvis is a ring of bones that transfers your body weight from your spine down to your legs. It also protects your bladder and reproductive organs.' }
          ],
          muscular: [
            { structureId: 'diaphragm_m', title: 'The Diaphragm', narration: 'The diaphragm is your main breathing muscle \\u2014 a dome-shaped sheet separating your chest from your abdomen. When it contracts and flattens, it creates room for your lungs to expand.' },
            { structureId: 'deltoid', title: 'The Deltoid', narration: 'The deltoid wraps around your shoulder. Its three sections let you raise your arm to the side, swing it forward, and pull it back. Every throw, wave, and reach uses this muscle.' },
            { structureId: 'rectus_ab', title: 'Rectus Abdominis', narration: 'The rectus abdominis creates the six-pack appearance. It flexes your trunk forward and helps stabilize your pelvis when you walk and run.' },
            { structureId: 'quads', title: 'The Quadriceps', narration: 'Your quadriceps are four powerful muscles on the front of your thigh. They straighten your knee and are critical for walking, climbing stairs, and running.' },
            { structureId: 'gastrocnemius', title: 'The Gastrocnemius', narration: 'The gastrocnemius is the big calf muscle on the back of the lower leg. It points your foot down for push-off when walking, connecting to the heel via the Achilles tendon.' }
          ],
          circulatory: [
            { structureId: 'heart', title: 'The Heart', narration: 'Your heart is a fist-sized pump that beats about 100,000 times every day. The right side sends blood to the lungs; the left pumps oxygen-rich blood to the whole body.' },
            { structureId: 'aorta', title: 'The Aorta', narration: 'The aorta is the biggest artery in your body. It carries oxygen-rich blood from the left ventricle, arches over your heart, then descends to supply every organ.' },
            { structureId: 'coronary', title: 'Coronary Arteries', narration: 'The coronary arteries are the heart\\'s own blood supply. When one gets blocked by a clot, that part of the heart is starved of oxygen \\u2014 that is a heart attack.' },
            { structureId: 'carotid', title: 'The Carotid Arteries', narration: 'You have two carotid arteries, one on each side of your neck. They are the main highways carrying blood to your brain. You can feel them pulsing in your neck.' }
          ],
          nervous: [
            { structureId: 'brain', title: 'The Brain', narration: 'Your brain is command central for your entire body, with about 86 billion neurons. The outer cortex handles thinking and senses. The cerebellum coordinates balance and movement.' },
            { structureId: 'cerebral_cortex', title: 'The Cerebral Cortex', narration: 'The cortex is the wrinkled outer layer of your brain. The front plans and controls movement. The back processes vision. The sides handle sound and memory.' },
            { structureId: 'spinal_cord', title: 'The Spinal Cord', narration: 'The spinal cord is the main highway of your nervous system, running inside the vertebral column. Messages travel up and down it thousands of times every second.' },
            { structureId: 'vagus', title: 'The Vagus Nerve', narration: 'The vagus nerve wanders from your brain stem all the way to your abdomen. It controls heart rate, digestion, and breathing as part of your rest-and-digest response.' }
          ],
          lymphatic: [
            { structureId: 'thymus', title: 'The Thymus', narration: 'The thymus is where immature T-cells learn to tell the difference between your own cells and foreign invaders. It is most active during childhood and shrinks after puberty.' },
            { structureId: 'spleen', title: 'The Spleen', narration: 'The spleen filters old and damaged red blood cells out of your blood and helps your immune system respond to blood-borne bacteria and viruses.' },
            { structureId: 'cervical_ln', title: 'Cervical Lymph Nodes', narration: 'Lymph nodes along your neck filter lymph fluid and trap germs draining from your head and throat. They swell and become tender when you have a sore throat.' },
            { structureId: 'bone_marrow', title: 'Bone Marrow', narration: 'Deep inside your larger bones is red bone marrow, a factory that produces all your blood cells \\u2014 billions of red blood cells, white blood cells, and platelets every hour.' }
          ],
          organs: [
            { structureId: 'lungs', title: 'The Lungs', narration: 'Your two lungs fill most of your chest cavity. Inside are about 300 million tiny alveoli where oxygen enters your blood and carbon dioxide leaves.' },
            { structureId: 'liver', title: 'The Liver', narration: 'The liver performs over 500 functions: making bile to digest fat, filtering toxins, storing sugar as glycogen, and producing essential proteins.' },
            { structureId: 'stomach', title: 'The Stomach', narration: 'Your stomach is a muscular J-shaped bag that churns food with acid and digestive enzymes, breaking it into a paste that slowly enters the small intestine.' },
            { structureId: 'kidneys', title: 'The Kidneys', narration: 'Your two kidneys each contain about a million tiny filters called nephrons. Together they filter all your blood about 40 times a day, removing waste and regulating fluid balance.' }
          ],
          integumentary: [
            { structureId: 'epidermis', title: 'The Epidermis', narration: 'The epidermis is the outermost layer of your skin \\u2014 a waterproof barrier you can see and touch. It renews itself completely about every 28 days.' },
            { structureId: 'dermis', title: 'The Dermis', narration: 'Just below the epidermis is the dermis, packed with collagen fibers, blood vessels, nerves, sweat glands, and hair follicles. It gives skin its strength and elasticity.' },
            { structureId: 'hair_follicle', title: 'Hair Follicles', narration: 'Each hair grows from a follicle deep in your skin. A tiny muscle attached to the follicle causes hair to stand up when you are cold or scared, creating goosebumps.' },
            { structureId: 'melanocytes', title: 'Melanocytes', narration: 'Melanocytes produce melanin, the pigment that gives skin and hair their color. UV light triggers them to make more melanin to protect your DNA \\u2014 that is what a tan actually is.' }
          ],
          respiratory: [
            { structureId: 'nasal_cavity', title: 'Nasal Cavity', narration: 'Your nose warms, humidifies, and filters the air before it reaches your lungs. Inside, turbinate bones create turbulence that maximizes contact with mucous membranes.' },
            { structureId: 'larynx', title: 'The Larynx', narration: 'The larynx, or voice box, sits at the top of your trachea. Two vocal cords inside vibrate as air passes over them to create sound.' },
            { structureId: 'bronchi', title: 'The Bronchial Tree', narration: 'The trachea splits into bronchi, which branch again and again like a tree into smaller tubes. By the time air reaches the alveoli, it has traveled through about 23 generations of branching.' },
            { structureId: 'alveoli', title: 'The Alveoli', narration: 'The alveoli are 300 million tiny balloon-like sacs at the end of the bronchial tree. Oxygen crosses into the blood and carbon dioxide crosses out in less than a second.' }
          ],
          endocrine: [
            { structureId: 'pituitary', title: 'The Pituitary Gland', narration: 'The pituitary is a pea-sized gland at the base of your brain. It is called the master gland because it sends hormonal commands to your thyroid, adrenals, gonads, and other glands.' },
            { structureId: 'thyroid', title: 'The Thyroid', narration: 'The thyroid gland wraps around the front of your trachea in a butterfly shape. It produces hormones that control your metabolic rate \\u2014 how fast your cells burn energy.' },
            { structureId: 'adrenal_endo', title: 'Adrenal Cortex', narration: 'Sitting on top of each kidney, the adrenal glands produce steroid hormones. The cortex makes cortisol for stress and aldosterone for salt balance. The medulla releases adrenaline in emergencies.' },
            { structureId: 'islets', title: 'Islets of Langerhans', narration: 'Scattered in the pancreas, beta cells make insulin to lower blood sugar and alpha cells make glucagon to raise it. Together they keep your blood glucose in a narrow safe range.' }
          ],
          reproductive: [
            { structureId: 'testes_repro', title: 'The Testes', narration: 'The testes are located in the scrotum where the temperature is 2 to 3 degrees cooler than the body, essential for sperm production. Each day they produce about 200 million sperm.' },
            { structureId: 'uterus', title: 'The Uterus', narration: 'The uterus is a muscular pear-shaped organ where a fertilized egg implants and grows into a baby. Its inner lining thickens each month and sheds during menstruation if no egg implants.' },
            { structureId: 'ovaries_repro', title: 'The Ovaries', narration: 'The two ovaries contain all the eggs a female will ever have. Each month, one egg matures and is released at ovulation, ready to be fertilized in the fallopian tube.' },
            { structureId: 'placenta', title: 'The Placenta', narration: 'The placenta develops during pregnancy, connecting mother and baby without their blood mixing. It transfers oxygen and nutrients to the baby while removing carbon dioxide and waste.' }
          ]
        };

        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        // CLINICAL CASES DATA
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        var CLINICAL_CASES = [
          { id: 'case_1', title: 'The Runner\\'s Knee', system: 'skeletal', presentation: 'A 16-year-old cross-country runner has dull aching pain around the front of the knee that worsens going down stairs and after long runs. No swelling or locking. Pain improves with rest.', question: 'Which structure is most likely affected?', answer: 'Patella / patellofemoral joint', explanation: 'Patellofemoral pain syndrome occurs when the patella does not track smoothly in its groove on the femur. Repeated stress from running causes cartilage irritation. Treatment includes quad strengthening, hip stabilization, and activity modification.', difficulty: 'intermediate' },
          { id: 'case_2', title: 'The Shoulder That Won\\'t Lift', system: 'muscular', presentation: 'A 45-year-old painter has gradual onset right shoulder pain for 3 months. He cannot lift his arm above 90 degrees without pain. He wakes up at night with shoulder pain and a grinding sensation.', question: 'Which structure is most likely torn?', answer: 'Supraspinatus tendon (rotator cuff)', explanation: 'The supraspinatus is the most commonly torn rotator cuff muscle. It runs under the acromion where it is susceptible to impingement and tears. Overhead work like painting increases this risk significantly.', difficulty: 'intermediate' },
          { id: 'case_3', title: 'Racing Heart After Exercise', system: 'circulatory', presentation: 'A 14-year-old athlete notices her heart racing and skipping beats for a few seconds after sprinting. She feels fine otherwise, with no chest pain or fainting. Physical exam is normal.', question: 'Which structure controls the normal heart rhythm?', answer: 'Sinoatrial (SA) node', explanation: 'The SA node in the right atrium is the heart\\'s natural pacemaker. During intense exercise, adrenaline can cause benign palpitations as the heart rate adjusts. Persistent arrhythmias should be evaluated to rule out structural heart disease.', difficulty: 'beginner' },
          { id: 'case_4', title: 'The Numb Hand', system: 'nervous', presentation: 'A 35-year-old office worker has progressive tingling and numbness in her thumb, index, and middle fingers for 2 months, worse at night. She shakes her hand to relieve it. She types 8 hours a day.', question: 'Which nerve is being compressed?', answer: 'Median nerve (carpal tunnel syndrome)', explanation: 'Carpal tunnel syndrome is compression of the median nerve under the flexor retinaculum at the wrist. The median nerve supplies sensation to the thumb and first 3.5 fingers. Repetitive wrist use is a major risk factor.', difficulty: 'intermediate' },
          { id: 'case_5', title: 'The Swollen Neck Node', system: 'lymphatic', presentation: 'A 17-year-old presents with a 3 cm painless, rubbery lymph node in the left neck for 6 weeks. He has had night sweats and lost 5 kg without trying. No fever or sore throat.', question: 'What diagnosis must be urgently ruled out?', answer: 'Lymphoma (Hodgkin lymphoma)', explanation: 'Painless lymphadenopathy with B-symptoms (night sweats, weight loss, fever) is the classic presentation of Hodgkin lymphoma in young adults. Biopsy showing Reed-Sternberg cells confirms the diagnosis.', difficulty: 'advanced' },
          { id: 'case_6', title: 'The Diabetic Emergency', system: 'endocrine', presentation: 'A 16-year-old with known Type 1 diabetes is found confused at home, breathing deeply and rapidly. His breath smells fruity. Blood glucose is 480 mg/dL. He missed his insulin doses for 2 days.', question: 'Which cells failed, and what is the emergency condition?', answer: 'Beta cells of islets of Langerhans; Diabetic Ketoacidosis (DKA)', explanation: 'Without insulin from beta cells, glucose cannot enter cells. The body burns fat, producing ketones that acidify the blood. Kussmaul breathing compensates by exhaling CO2. Treatment: IV fluids, insulin drip, and electrolyte replacement.', difficulty: 'advanced' },
          { id: 'case_7', title: 'The Broken Collarbone', system: 'skeletal', presentation: 'An 11-year-old falls off his bicycle and lands on his outstretched right hand. He has immediate pain and deformity at the middle third of his right clavicle. He holds his arm close to his side.', question: 'Why is the middle third of the clavicle the most common fracture site?', answer: 'The middle third is thinnest and has no muscular reinforcement', explanation: 'The clavicle is the most frequently fractured bone. Its middle third is thinnest and lacks muscular protection. Force from a fall on an outstretched hand concentrates at this weak point. Most heal with sling immobilization.', difficulty: 'beginner' },
          { id: 'case_8', title: 'Breathless at High Altitude', system: 'respiratory', presentation: 'A healthy 15-year-old hikes to 12,000 feet and develops headache, shortness of breath at rest, and a dry cough. Her oxygen saturation is 84%. At sea level it was 99%.', question: 'Why does altitude cause these symptoms, and which structure is most stressed?', answer: 'The alveoli and respiratory muscles; reduced atmospheric oxygen causes hypoxia', explanation: 'At high altitude, atmospheric pressure drops, reducing the partial pressure of oxygen. Less oxygen crosses the alveolar membrane. The body compensates by breathing faster and deeper, increasing respiratory muscle work.', difficulty: 'intermediate' }
        ];

        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        // DERIVED STATE
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

        var sysKey = d.system || 'skeletal';
        var sys = SYSTEMS[sysKey];
        var view = d.view || 'anterior';
        var searchTerm = (d.search || '').toLowerCase();
        var complexity = d.complexity || 3;

        // \u2500\u2500 Layer Transparency System \u2500\u2500
        var LAYER_DEFS = [
          { id: 'skin', icon: '\\uD83E\\uDDB4', name: 'Skin', color: '#f5e6d3', accent: '#c4aa94' },
          { id: 'skeletal', icon: '\\uD83E\\uDDB4', name: 'Skeletal', color: '#e2e8f0', accent: '#94a3b8', systems: ['skeletal'] },
          { id: 'muscular', icon: '\\uD83D\\uDCAA', name: 'Muscular', color: '#fecaca', accent: '#dc2626', systems: ['muscular'] },
          { id: 'organs', icon: '\\uD83E\\uDEC1', name: 'Organs', color: '#d1fae5', accent: '#16a34a', systems: ['digestive', 'respiratory', 'endocrine', 'reproductive'] },
          { id: 'circulatory', icon: '\\u2764\\uFE0F', name: 'Circulatory', color: '#fee2e2', accent: '#ef4444', systems: ['circulatory'] },
          { id: 'nervous', icon: '\\u26A1', name: 'Nervous', color: '#fef9c3', accent: '#eab308', systems: ['nervous'] },
          { id: 'lymphatic', icon: '\\uD83D\\uDFE2', name: 'Lymphatic', color: '#d1fae5', accent: '#22c55e', systems: ['lymphatic', 'integumentary'] }
        ];

        var layers = d.visibleLayers || { skin: true };
        var toggleLayer = function(lid) {
          var newLayers = Object.assign({}, layers);
          newLayers[lid] = !newLayers[lid];
          upd('visibleLayers', newLayers);
          playSound('layerToggle');
        };

        // Auto-activate layer matching current system
        var autoLayerId = null;
        LAYER_DEFS.forEach(function(ld) {
          if (ld.systems && ld.systems.indexOf(sysKey) !== -1) autoLayerId = ld.id;
        });
        var anyDeepLayer = LAYER_DEFS.some(function(ld) { return ld.id !== 'skin' && (layers[ld.id] || ld.id === autoLayerId); });
        var skinOpacity = anyDeepLayer ? 0.20 : 1.0;

        // \u2500\u2500 Complexity level lookup \u2500\u2500
        var ELEMENTARY_IDS = ['skull', 'ribs', 'femur', 'humerus', 'vertebral', 'pelvis', 'biceps', 'quads', 'heart', 'brain', 'lungs', 'stomach', 'kidneys', 'spinal_cord', 'deltoid', 'hamstrings', 'gastrocnemius', 'aorta', 'carotid', 'sciatic', 'liver', 'diaphragm', 'spleen', 'thymus', 'epidermis', 'dermis', 'trachea', 'alveoli', 'pituitary', 'uterus', 'testes_repro', 'mammary', 'cerebral_cortex', 'cerebellum', 'brainstem'];
        var MIDDLE_IDS = ELEMENTARY_IDS.concat(['mandible', 'clavicle', 'sternum', 'scapula', 'radius', 'ulna', 'tibia', 'fibula', 'patella', 'tarsals', 'carpals', 'sacrum', 'pectoralis', 'triceps', 'rectus_ab', 'obliques', 'trapezius', 'lats', 'glutes', 'tibialis', 'soleus', 'sartorius', 'sup_vena', 'inf_vena', 'pulm_art', 'jugular', 'coronary', 'femoral_a', 'brachial', 'portal', 'vagus', 'brachial_plexus', 'median', 'ulnar_n', 'femoral_n', 'cranial_n', 'sympathetic', 'sm_intestine', 'lg_intestine', 'pancreas', 'gallbladder', 'bladder', 'thyroid', 'adrenals', 'cervical_ln', 'axillary_ln', 'inguinal_ln', 'thoracic_duct', 'bone_marrow', 'hyoid', 'atlas_axis', 'metatarsals', 'metacarpals', 'scaphoid_bone', 'rotator_cuff', 'iliopsoas', 'intercostals', 'pelvic_floor', 'diaphragm_m', 'circle_willis', 'saphenous', 'lymph_circ', 'hypodermis', 'hair_follicle', 'sweat_glands', 'sebaceous', 'nails', 'melanocytes', 'nasal_cavity', 'pharynx', 'larynx', 'bronchi', 'pleura', 'resp_muscles', 'pineal', 'parathyroid', 'islets', 'ovaries_endo', 'testes_endo', 'hypothal_endo', 'adrenal_endo', 'epididymis', 'prostate', 'ovaries_repro', 'fallopian', 'placenta', 'hippocampus', 'amygdala', 'thalamus', 'hypothalamus', 'corpus_callosum', 'basal_ganglia']);

        function passesComplexity(st) {
          if (complexity >= 3) return true;
          if (complexity === 1) return ELEMENTARY_IDS.indexOf(st.id) !== -1;
          return MIDDLE_IDS.indexOf(st.id) !== -1;
        }

        var allStructures = sys.structures;
        var viewFiltered = allStructures.filter(function(s) { return (s.v === 'b' || s.v === (view === 'anterior' ? 'a' : 'p')) && passesComplexity(s); });
        var filtered = searchTerm ? viewFiltered.filter(function(s) { return s.name.toLowerCase().indexOf(searchTerm) >= 0 || s.fn.toLowerCase().indexOf(searchTerm) >= 0; }) : viewFiltered;
        var sel = d.selectedStructure ? allStructures.find(function(s) { return s.id === d.selectedStructure; }) : null;

        // \u2500\u2500 Fun fact state \u2500\u2500
        var sysFacts = FUN_FACTS[sysKey] || [];
        var factIdx = d._factIdx || 0;
        var currentFact = sysFacts.length > 0 ? sysFacts[factIdx % sysFacts.length] : null;

        // \u2500\u2500 Tour state \u2500\u2500
        var tourSteps = GUIDED_TOURS[sysKey] || [];
        var tourStepIdx = d._tourStepIdx || 0;
        var tourActive = d._tourActive || false;
        var currentTourStep = tourActive && tourSteps.length > 0 ? tourSteps[tourStepIdx] : null;

        // \u2500\u2500 Connections state \u2500\u2500
        var connectionsViewed = d._connectionsViewed || {};

        // \u2500\u2500 Clinical cases state \u2500\u2500
        var clinicalSolved = d._clinicalSolved || 0;
        var activeCaseIdx = d._activeCaseIdx || 0;
        var activeCaseFeedback = d._activeCaseFeedback || null;

        // \u2500\u2500 Enhanced Quiz logic \u2500\u2500
        var quizPool = allStructures.filter(function(s) { return s.fn && passesComplexity(s); });
        var quizTypeCount = 4;
        var quizQ = d.quizMode && quizPool.length > 0 ? quizPool[d.quizIdx % quizPool.length] : null;
        var quizType = d.quizMode ? ((d.quizIdx || 0) % quizTypeCount) : 0;
        var quizOptions = d._quizOpts || [];
        if (quizQ && d._quizOptsFor !== (sysKey + '|' + d.quizIdx + '|' + quizType)) {
          var wrong = quizPool.filter(function(s) { return s.id !== quizQ.id; });
          var shuffled = wrong.sort(function() { return Math.random() - 0.5; }).slice(0, 3);
          if (quizType === 0 || quizType === 3) {
            quizOptions = shuffled.concat([quizQ]).sort(function() { return Math.random() - 0.5; });
          } else if (quizType === 1) {
            quizOptions = [{ id: 'true', name: 'True' }, { id: 'false', name: 'False' }];
          } else if (quizType === 2) {
            var sysKeys = Object.keys(SYSTEMS);
            var wrongSys = sysKeys.filter(function(k) { return k !== sysKey; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
            quizOptions = wrongSys.concat([sysKey]).sort(function() { return Math.random() - 0.5; }).map(function(k) { return { id: k, name: SYSTEMS[k].name }; });
          }
          upd('_quizOpts', quizOptions);
          upd('_quizOptsFor', sysKey + '|' + d.quizIdx + '|' + quizType);
        }

        // \u2500\u2500 Hover state \u2500\u2500
        var hoverStructure = d._hoverStructure || null;
        var hoverX = d._hoverX || 0;
        var hoverY = d._hoverY || 0;

        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        // BADGE SYSTEM
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

        var badges = d._badges || {};
        var totalCorrect = d._totalCorrect || 0;
        var streak = d._streak || 0;
        var systemsExplored = d._systemsExplored || {};
        var structuresViewed = d._structuresViewed || {};
        var layersToggled = d._layersToggled || {};
        var viewsUsed = d._viewsUsed || {};
        var searchFinds = d._searchFinds || 0;
        var aiQuestions = d._aiQuestions || 0;

        function awardBadge(id) {
          if (badges[id]) return;
          var def = null;
          for (var bi = 0; bi < BADGE_DEFS.length; bi++) {
            if (BADGE_DEFS[bi].id === id) { def = BADGE_DEFS[bi]; break; }
          }
          if (!def) return;
          var newBadges = Object.assign({}, badges);
          newBadges[id] = true;
          upd('_badges', newBadges);
          playSound('badge');
          if (awardStemXP) awardStemXP(def.xp);
          if (stemCelebrate) stemCelebrate();
          if (addToast) addToast(def.icon + ' Badge: ' + def.name + ' (+' + def.xp + ' XP)');
          // Check anatomy champion
          var earnedCount = Object.keys(newBadges).length;
          if (earnedCount >= 10 && !newBadges.anatomyChampion) {
            var champBadges = Object.assign({}, newBadges);
            champBadges.anatomyChampion = true;
            upd('_badges', champBadges);
            if (awardStemXP) awardStemXP(50);
            if (addToast) addToast('\\uD83D\\uDC51 Badge: Anatomy Champion (+50 XP)');
          }
        }

        function checkBadges() {
          if (sel && !badges.firstStructure) awardBadge('firstStructure');
          if (Object.keys(systemsExplored).length >= 5 && !badges.systemExplorer5) awardBadge('systemExplorer5');
          if (Object.keys(systemsExplored).length >= 10 && !badges.allSystems) awardBadge('allSystems');
          if (Object.keys(layersToggled).length >= 7 && !badges.layerMaster) awardBadge('layerMaster');
          if (totalCorrect >= 5 && !badges.quizAce5) awardBadge('quizAce5');
          if (totalCorrect >= 15 && !badges.quizAce15) awardBadge('quizAce15');
          if (streak >= 3 && !badges.streak3) awardBadge('streak3');
          if (viewsUsed.anterior && viewsUsed.posterior && !badges.viewToggler) awardBadge('viewToggler');
          if (searchFinds >= 3 && !badges.searchPro) awardBadge('searchPro');
          if (aiQuestions >= 3 && !badges.aiCurious) awardBadge('aiCurious');
          if (Object.keys(structuresViewed).length >= 50 && !badges.structureScholar) awardBadge('structureScholar');
          if (d._tourCompleted && !badges.tourComplete) awardBadge('tourComplete');
          if (Object.keys(connectionsViewed).length >= 5 && !badges.connectionExplorer) awardBadge('connectionExplorer');
          if (clinicalSolved >= 3 && !badges.clinicalExpert) awardBadge('clinicalExpert');
        }

        // Track system explored
        if (!systemsExplored[sysKey]) {
          var newSE = Object.assign({}, systemsExplored);
          newSE[sysKey] = true;
          upd('_systemsExplored', newSE);
        }

        // Track view used
        if (!viewsUsed[view]) {
          var newVU = Object.assign({}, viewsUsed);
          newVU[view] = true;
          upd('_viewsUsed', newVU);
        }

        // Track structure viewed
        if (sel && !structuresViewed[sel.id]) {
          var newSV = Object.assign({}, structuresViewed);
          newSV[sel.id] = true;
          upd('_structuresViewed', newSV);
        }

        checkBadges();

""")

f.close()
print('Part 4 written (data blocks + derived state + badges)')
