"""
Generates comprehension questions for the 18 drafted ORF probes,
extracts all unique words from questions and answers, and updates
the tts_words_needed.json file to ensure total coverage.
"""
import json
import re
import os

def clean_word(w):
    # Remove punctuation attached to words
    w = re.sub(r'^[^\w]+', '', w)
    w = re.sub(r'[^\w]+$', '', w)
    return w.lower()

def extract_words(text):
    words = set()
    for w in re.split(r'\s+', text):
        cw = clean_word(w)
        if cw and cw.isalpha():  # Only keep actual words
            words.add(cw)
    return words

# 1. First, load the base ORF probes we created earlier
try:
    with open('orf_probes.json', 'r', encoding='utf-8') as f:
        probes_data = json.load(f)
        probes = probes_data.get('probes', [])
    print(f"Loaded {len(probes)} existing ORF probes.")
except Exception as e:
    print(f"Error loading orf_probes.json (cannot proceed without it): {e}")
    exit(1)

# 2. Define comprehension questions for each probe (Level A to V)
# We will match them by title to add the questions array
questions_bank = {
    "My Pet Dog": [
        {"question": "What animal is in the story?", "options": ["A cat", "A dog", "A bird", "A fish"], "answer": "A dog"},
        {"question": "What size is the dog?", "options": ["Little", "Small", "Big", "Tiny"], "answer": "Big"},
        {"question": "What can the dog do?", "options": ["Sleep", "Fly", "Run", "Swim"], "answer": "Run"}
    ],
    "Snow Days": [
        {"question": "What is falling outside?", "options": ["Rain", "Leaves", "Snow", "Dirt"], "answer": "Snow"},
        {"question": "What what will they make?", "options": ["A snowman", "A fort", "A ball", "A sled"], "answer": "A snowman"},
        {"question": "What color is the hat?", "options": ["Blue", "Green", "Red", "Yellow"], "answer": "Red"}
    ],
    "The Little Bird": [
        {"question": "Where is the bird sitting?", "options": ["On a rock", "In a tree", "On the grass", "In the water"], "answer": "In a tree"},
        {"question": "What is the bird doing?", "options": ["Sleeping", "Eating", "Singing", "Flying"], "answer": "Singing"},
        {"question": "What are the baby birds hungry for?", "options": ["A seed", "A bug", "A worm", "A berry"], "answer": "A worm"}
    ],
    "Playing at the Park": [
        {"question": "What was the weather like?", "options": ["Cold and rainy", "Hot and bright", "Cloudy and dark", "Snowy and windy"], "answer": "Hot and bright"},
        {"question": "What animal was in the pond?", "options": ["A frog", "A turtle", "A fish", "A duck"], "answer": "A duck"},
        {"question": "Where did the child go high in the sky?", "options": ["On the slide", "On the swings", "In a tree", "On the monkey bars"], "answer": "On the swings"}
    ],
    "A Winter Walk": [
        {"question": "What covered the ground?", "options": ["Green grass", "Fallen leaves", "White snow", "Wet mud"], "answer": "White snow"},
        {"question": "What animal made the tracks?", "options": ["A large bear", "A small rabbit", "A quick deer", "A busy squirrel"], "answer": "A small rabbit"},
        {"question": "What did they drink when they went home?", "options": ["Cold water", "Warm milk", "Apple juice", "Hot chocolate"], "answer": "Hot chocolate"}
    ],
    "The School Garden": [
        {"question": "What is the class making?", "options": ["A new painting", "A new garden", "A tall tower", "A loud song"], "answer": "A new garden"},
        {"question": "Where did they plant the seeds?", "options": ["In a cup", "In the sand", "In the soft dirt", "In the water"], "answer": "In the soft dirt"},
        {"question": "What two things do the seeds need to grow?", "options": ["Water and sunlight", "Dirt and bugs", "Wind and rain", "Rocks and sand"], "answer": "Water and sunlight"}
    ],
    "The Lost Puppy": [
        {"question": "How did the puppy look when he wandered into the backyard?", "options": ["Happy and playful", "Hungry and scared", "Tired and sleepy", "Clean and dry"], "answer": "Hungry and scared"},
        {"question": "What did the mom give the puppy in a blue bowl?", "options": ["Dog food", "Milk", "Water", "A bone"], "answer": "Water"},
        {"question": "How did the family know who to call?", "options": ["They recognized the puppy", "There was a phone number on his tag", "They asked the neighbors", "They saw a poster"], "answer": "There was a phone number on his tag"}
    ],
    "The Ice Skating Trip": [
        {"question": "Why did the ice skates feel strange?", "options": ["They were too small", "They were too big", "They felt heavy", "They were very light"], "answer": "They felt heavy"},
        {"question": "What happened when the child first stepped on the ice?", "options": ["They started skating fast", "They immediately fell down", "They spun around", "They did a jump"], "answer": "They immediately fell down"},
        {"question": "How did the child learn to slide without falling?", "options": ["By watching others", "By holding their dad's hand", "By holding the wall", "By pushing a chair"], "answer": "By holding their dad's hand"}
    ],
    "A Weekend Camping Adventure": [
        {"question": "What did the family pack in the cooler?", "options": ["Fresh water", "Fresh food", "Extra clothes", "Camping tools"], "answer": "Fresh food"},
        {"question": "What did they have to do first before it got dark?", "options": ["Build a fire", "Go swimming", "Set up the tent", "Eat hot dogs"], "answer": "Set up the tent"},
        {"question": "What sound did they hear loudly in the distance at night?", "options": ["Owls hooting", "Wolves howling", "Crickets chirping", "Frogs croaking"], "answer": "Crickets chirping"}
    ],
    "The Treehouse Project": [
        {"question": "What kind of tree did they build the treehouse in?", "options": ["A pine tree", "A maple tree", "A sturdy oak tree", "An apple tree"], "answer": "A sturdy oak tree"},
        {"question": "Why did they measure the boards twice before cutting them?", "options": ["Because they had extra time", "To make sure they were very long", "Because it was important to be precise", "So the boards would look nice"], "answer": "Because it was important to be precise"},
        {"question": "Why did they paint the treehouse a bright forest green?", "options": ["It was their favorite color", "To keep the wood safe from rain", "So it would blend in with the leaves", "Because they had leftover paint"], "answer": "So it would blend in with the leaves"}
    ],
    "The Great Snow Fort": [
        {"question": "Why did the children decide to build a snow fort?", "options": ["It was a weekend project", "School was canceled due to a massive blizzard", "They needed a place to hide", "Their parents suggested the idea"], "answer": "School was canceled due to a massive blizzard"},
        {"question": "What did they use to pack the snow into sturdy, rectangular blocks?", "options": ["Wooden boxes", "Metal buckets", "Cardboard boxes", "Plastic storage containers"], "answer": "Plastic storage containers"},
        {"question": "Why did they need to make the fort's walls thicker as they grew higher?", "options": ["To keep the wind out", "So they wouldn't collapse under their own weight", "To make the fort warmer", "So the roof would fit better"], "answer": "So they wouldn't collapse under their own weight"}
    ],
    "The Science Fair Experiment": [
        {"question": "What variable did the investigator change between the three identical bean plants?", "options": ["The amount of daily sunlight exposure", "The precise volume of water administered", "The specific type of audio environment", "The exact composition of the potting soil"], "answer": "The specific type of audio environment"},
        {"question": "What vital purpose did the third pot serve in this biological experiment?", "options": ["It acted as the essential control group growing in silence", "It tested the negative impact of loud rock music", "It verified the optimal amount of daily watering", "It served as a backup in case the others failed"], "answer": "It acted as the essential control group growing in silence"},
        {"question": "What was the surprising quantifiable result of the three-week study?", "options": ["The plant exposed to rock music perished rapidly", "The plant listening to classical music grew almost two inches taller", "All three specimens demonstrated identical vertical growth patterns", "The silent control group produced the most extensive foliage"], "answer": "The plant listening to classical music grew almost two inches taller"}
    ],
    "The Ancient Fossil Discovery": [
        {"question": "What initial visual evidence suggested the fossilized claw belonged to a predatory dinosaur?", "options": ["Its smooth surface and lightweight porous structure", "Its immense overall length and hollow interior cavity", "Its sharp dramatic curve and jagged serrated edges", "Its close proximity to smaller fossilized herbivore remains"], "answer": "Its sharp dramatic curve and jagged serrated edges"},
        {"question": "Why does the process of extracting ancient fossils require such immense patience and care?", "options": ["The surrounding rock formations are incredibly dense and difficult to penetrate", "The ancient bones are incredibly fragile and can easily disintegrate if handled incorrectly", "The excavation site is located in treacherous and unstable badlands terrain", "The precise mapping of the location takes several weeks to complete accurately"], "answer": "The ancient bones are incredibly fragile and can easily disintegrate if handled incorrectly"},
        {"question": "What was the ultimate fate of the remarkable discovery unearthed by the paleontologists?", "options": ["It was immediately sold to a private wealthy collector", "It was buried again to preserve the integrity of the natural site", "It was transported to a natural history museum for comprehensive scientific study", "It was left partially exposed as an outdoor educational exhibit"], "answer": "It was transported to a natural history museum for comprehensive scientific study"}
    ],
    "The Migration of the Monarchs": [
        {"question": "What specific environmental factor compels the Monarch butterflies to embark on their annual southward migration?", "options": ["A severe depletion of their primary local food sources", "Their inability to survive harsh, prolonged freezing weather", "A sudden dramatic increase in the population of local predators", "The biological necessity to locate specific mating grounds in Mexico"], "answer": "Their inability to survive harsh, prolonged freezing weather"},
        {"question": "What makes the Monarch's navigational ability during this journey truly astonishing to scientists?", "options": ["They manage to fly thousands of miles without stopping to rest", "They can intentionally alter their flight path to avoid severe storms", "The migrating butterflies have never actually been to the Mexican destination before", "They coordinate their intricate flight patterns with millions of other insects"], "answer": "The migrating butterflies have never actually been to the Mexican destination before"},
        {"question": "How do the Monarchs primarily conserve their essential body heat upon arriving in the mountainous forests of central Mexico?", "options": ["By rapidly flapping their wings to generate internal friction", "By burrowing deeply beneath the thick layer of the forest floor", "By clustering tightly together on the branches of oyamel fir trees", "By continuously absorbing direct sunlight throughout the winter months"], "answer": "By clustering tightly together on the branches of oyamel fir trees"}
    ],
    "The Industrial Revolution": [
        {"question": "What fundamental transition characterized the profound transformation known as the Industrial Revolution?", "options": ["A shift from urban factory employment to widespread rural agricultural expansion", "A dramatic shift from traditional hand-crafted manufacturing to large-scale machine-based production", "A comprehensive transition from coal-powered machinery to renewable energy sources", "The complete cessation of international trade in favor of localized domestic production"], "answer": "A dramatic shift from traditional hand-crafted manufacturing to large-scale machine-based production"},
        {"question": "What primary factor compelled millions of workers to migrate from their rural farming villages to rapidly expanding cities?", "options": ["The sudden widespread failure of traditional agricultural crops", "The promise of newly available wage-based employment in massive factories", "The implementation of compulsory urban education programs by the government", "The desire to escape the increasingly harsh conditions of agricultural labor"], "answer": "The promise of newly available wage-based employment in massive factories"},
        {"question": "Despite spurring massive economic growth, what severe social challenge emerged as a direct consequence of rapid urbanization?", "options": ["A catastrophic decline in the overall global population", "The complete collapse of the international financial banking system", "Extreme resulting overcrowding, inadequate sanitation, and the rapid spread of diseases", "A sudden unprecedented shortage of crucial raw materials necessary for production"], "answer": "Extreme resulting overcrowding, inadequate sanitation, and the rapid spread of diseases"}
    ],
    "The Mysteries of the Deep Ocean": [
        {"question": "Why did marine scientists historically assume that the deep ocean floor was essentially a barren wasteland?", "options": ["Because the intense pressure instantly destroys all biological cellular structures", "Because absolute darkness prevails, as essential sunlight cannot penetrate such profound depths", "Because the water temperatures are significantly higher than the boiling point", "Because toxic chemical geysers continuously poison the surrounding marine environment"], "answer": "Because absolute darkness prevails, as essential sunlight cannot penetrate such profound depths"},
        {"question": "Unlike organisms near the surface that rely on photosynthesis, what unique process do many deep-sea ecosystems utilize for energy?", "options": ["They absorb intense geothermal heat radiating directly from the Earth's crust", "They harvest kinetic energy generated by powerful deep ocean currents", "They depend on chemosynthesis, harnessing chemical energy from mineral-rich hydrothermal vents", "They survive entirely by consuming organic detritus falling from the photic zone above"], "answer": "They depend on chemosynthesis, harnessing chemical energy from mineral-rich hydrothermal vents"},
        {"question": "What fascinating biological adaptation allows certain predatory deep-sea fish to successfully hunt in an environment totally devoid of sunlight?", "options": ["Developing highly sensitive echolocation capabilities similar to marine mammals", "Utilizing a glowing bioluminescent lure hanging from their heads to attract unsuspecting prey", "Possessing advanced thermal vision to detect the body heat of nearby organisms", "Generating powerful electrical pulses to completely paralyze surrounding creatures"], "answer": "Utilizing a glowing bioluminescent lure hanging from their heads to attract unsuspecting prey"}
    ],
    "The Ingenuity of the Roman Aqueducts": [
        {"question": "What specific critical crisis prompted Roman engineers to design and construct the extensive aqueduct network?", "options": ["A prolonged catastrophic drought that completely devastated the surrounding agricultural lands", "The local water sources from the nearby Tiber River became increasingly polluted and insufficient for the booming population", "The strategic military necessity of maintaining massive water reserves during protracted enemy sieges", "A mandate from the Emperor to construct spectacular decorative fountains throughout the expanding metropolis"], "answer": "The local water sources from the nearby Tiber River became increasingly polluted and insufficient for the booming population"},
        {"question": "Why was mathematical precision absolutely essential when calculating the gradient of the water channels?", "options": ["To ensure the water flowed uphill over specific mountainous terrain", "To prevent the heavy lead and clay pipes from bursting under extreme atmospheric pressure", "Because a slope that was too steep would erode the stone, while too shallow a slope would cause stagnation", "Because the water needed to travel at incredibly high velocities to power industrial milling machinery"], "answer": "Because a slope that was too steep would erode the stone, while too shallow a slope would cause stagnation"},
        {"question": "Beyond simple drinking water, what crucial public health function did the consistent supply of fresh aqueduct water facilitate?", "options": ["It continuously flushed the municipal sewer systems and supplied the numerous public bathhouses", "It provided essential irrigation for the medicinal herb gardens located within the city walls", "It was utilized extensively in the early sterilization of primitive medical and surgical instruments", "It allowed for the daily sweeping and cleaning of the heavily trafficked cobblestone streets"], "answer": "It continuously flushed the municipal sewer systems and supplied the numerous public bathhouses"}
    ],
    "The Dynamics of Global Ecosystems": [
        {"question": "How do contemporary biologists conceptualize the interactions within a functional ecosystem?", "options": ["As a rigid hierarchical structure where apex predators entirely dictate the survival of all subordinate organisms", "As a highly intricate, interconnected web of biological and environmental interactions maintaining a delicate equilibrium", "As a random, chaotic assemblage of independent species constantly competing in complete isolation", "As an entirely static environment that remarkably remains completely unchanged regardless of external influences"], "answer": "As a highly intricate, interconnected web of biological and environmental interactions maintaining a delicate equilibrium"},
        {"question": "Why does the introduction of an invasive species frequently result in devastating consequences for an established environment?", "options": ["They immediately introduce catastrophic new pathogens to which native species have absolutely zero natural immunity", "They typically lack natural predators in their new habitat, allowing their populations to explode and aggressively outcompete native species", "They interbreed extensively with native populations, rapidly diluting beneficial genetic adaptations", "They physically fundamentally alter the fundamental chemical composition of the local soil and water sources"], "answer": "They typically lack natural predators in their new habitat, allowing their populations to explode and aggressively outcompete native species"},
        {"question": "In the context of ecological conservation, what is the defining characteristic of a keystone species?", "options": ["An organism that boasts the highest population density within a specific geographic territory", "A highly adaptable species capable of thriving effortlessly in a multitude of diverse global climates", "An apex predator that exclusively consumes the weak and diseased members of prey populations", "An organism upon which the structural integrity of the entire environment heavily depends, and whose removal can trigger ecosystem collapse"], "answer": "An organism upon which the structural integrity of the entire environment heavily depends, and whose removal can trigger ecosystem collapse"}
    ]
}

# 3. Add questions to probes and extract all words
all_probe_words = set()

for probe in probes:
    title = probe.get('title')
    
    # Extract passage words
    passage_words = extract_words(probe.get('text', ''))
    all_probe_words.update(passage_words)
    
    if title in questions_bank:
        probe['questions'] = questions_bank[title]
        
        # Extract question & answer words
        for q in probe['questions']:
            all_probe_words.update(extract_words(q['question']))
            for opt in q['options']:
                all_probe_words.update(extract_words(opt))
        
        # Update word count to include questions? No, wordCount usually means passage words.
        # But we do want to ensure all TTS vocabulary is captured.
        
# 4. Save the updated comprehensive probes file
with open('orf_probes.json', 'w', encoding='utf-8') as f:
    json.dump({"probes": probes}, f, indent=2)
print("Added comprehension questions to all 18 probes and saved back to orf_probes.json")

# 5. Reconcile with tts_words_needed.json
try:
    with open('tts_words_needed.json', 'r', encoding='utf-8') as f:
        tts_data = json.load(f)
        
    existing_words = set(tts_data.get('words_short', [])) | \
                     set(tts_data.get('words_medium', [])) | \
                     set(tts_data.get('words_long', []))
    print(f"Loaded {len(existing_words)} existing TTS words.")
except Exception as e:
    print(f"Error loading tts_words_needed.json: {e}")
    existing_words = set()

# What words are missing?
missing_words = all_probe_words - existing_words
print(f"Found {len(missing_words)} NEW words exclusively from the comprehension questions and options.")

if missing_words:
    missing_by_len = { 'short': [], 'medium': [], 'long': [] }
    for w in sorted(list(missing_words)):
        if len(w) <= 4:
            missing_by_len['short'].append(w)
        elif len(w) <= 8:
            missing_by_len['medium'].append(w)
        else:
            missing_by_len['long'].append(w)

    print(f"  Short: {len(missing_by_len['short'])}, Medium: {len(missing_by_len['medium'])}, Long: {len(missing_by_len['long'])}")
    
    # Merge and save
    all_short = sorted(list(set(tts_data.get('words_short', [])) | set(missing_by_len['short'])))
    all_medium = sorted(list(set(tts_data.get('words_medium', [])) | set(missing_by_len['medium'])))
    all_long = sorted(list(set(tts_data.get('words_long', [])) | set(missing_by_len['long'])))
    
    tts_data['summary']['total_real_words'] = len(all_short) + len(all_medium) + len(all_long)
    tts_data['summary']['breakdown'] = {
        "short_words_2_to_4": len(all_short),
        "medium_words_5_to_8": len(all_medium),
        "long_words_9_plus": len(all_long)
    }
    tts_data['words_short'] = all_short
    tts_data['words_medium'] = all_medium
    tts_data['words_long'] = all_long
    
    with open('tts_words_needed_updated.json', 'w', encoding='utf-8') as f:
        json.dump(tts_data, f, indent=2)
    print(f"Saved updated TTS words list to tts_words_needed_updated.json (new global total: {tts_data['summary']['total_real_words']})")
else:
    print("All vocabulary from questions and options was already present in the TTS list.")
