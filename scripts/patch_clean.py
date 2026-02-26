"""
Re-apply crash fixes to the restored @44f9dca working version.
The file was restored via `git checkout 44f9dca -- word_sounds_module.js`
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

print(f"File size: {len(c)} chars")

# Find insertion point - before fisherYatesShuffle or ts helper
anchor = "const fisherYatesShuffle"
idx = c.find(anchor)
if idx < 0:
    anchor = "const ts = typeof"
    idx = c.find(anchor)
    
if idx < 0:
    print("ERROR: No anchor found")
    exit()

insert_at = c.rfind('\n', 0, idx) + 1
print(f"Inserting at char {insert_at} (before '{anchor}')")

CRASH_FIXES = '''
        // === CDN crash fixes: constants defined in parent monolith ===
        const SOUND_MATCH_POOL = ['bat','bed','big','bib','bud','bus','but','bag','ban','bit','cat','cap','cup','cut','cob','cub','cab','kit','kid','dog','den','did','dip','dug','dim','dot','dam','dub','fan','fin','fix','fog','fun','fig','fit','fat','fib','fox','gum','gas','got','gut','gap','gab','gig','gob','hat','hen','him','hit','hop','hot','hug','hum','hut','hub','jet','jab','jam','jig','jog','jot','jug','jut','leg','let','lid','lip','lit','log','lot','lug','map','mat','men','met','mix','mob','mom','mop','mud','mug','nab','nag','nap','net','nip','nod','not','nun','nut','pig','pan','pat','peg','pen','pet','pin','pit','pod','pop','pot','pub','pun','pup','put','rag','ram','ran','rap','rat','red','rib','rid','rig','rim','rip','rob','rod','rot','rub','rug','run','rut','sat','set','sip','sit','six','sob','sod','sub','sum','sun','tab','tag','tan','tap','ten','tin','tip','top','tot','tub','tug','van','vat','vet','vim','vow','wag','web','wed','wig','win','wit','wok','won','yak','yam','yap','yes','yet','zap','zen','zip','zoo','box','wax','ship','shop','shed','shin','shut','shot','shell','fish','dish','wish','rush','bush','cash','mash','gush','chip','chin','chop','chat','rich','much','such','each','inch','thin','that','them','this','then','math','bath','path','with','when','whip','whiz','phone','ring','sing','king','long','song','hung','bang','lung','back','deck','kick','lock','luck','neck','pick','rock','sock','duck','car','far','jar','bar','star','park','dark','mark','her','fern','sir','bird','girl','dirt','firm','for','corn','fork','cord','torn','form','fur','burn','turn','hurt','curb','surf','brag','brim','clip','crab','crib','drag','drip','drop','drum','flag','flat','flip','frog','grab','grin','grip','plan','plum','plug','skip','slam','slap','slim','slip','slug','snap','snip','snug','spin','spot','step','stop','stub','stun','swim','trap','trim','trip','trot'];
        const PHONEME_STORAGE_KEY = 'allo_phoneme_bank_v1';
        const RIME_FAMILIES = {'at':['bat','cat','fat','hat','mat','pat','rat','sat','flat','chat'],'an':['ban','can','fan','man','pan','ran','tan','van','plan','clan'],'ap':['cap','gap','lap','map','nap','rap','tap','clap','trap','snap'],'ig':['big','dig','fig','jig','pig','rig','wig','twig'],'in':['bin','din','fin','pin','tin','win','chin','grin','spin','thin'],'ip':['dip','hip','lip','rip','sip','tip','zip','chip','ship','trip'],'it':['bit','fit','hit','kit','pit','sit','wit','grit','spit','slit'],'op':['cop','hop','mop','pop','top','chop','crop','drop','shop','stop'],'ot':['cot','dot','got','hot','jot','lot','not','pot','rot','shot'],'og':['bog','cog','dog','fog','hog','jog','log','frog','blog'],'ug':['bug','dug','hug','jug','mug','rug','tug','plug','slug','snug'],'un':['bun','fun','gun','nun','pun','run','sun','spun','stun'],'et':['bet','get','jet','let','met','net','pet','set','vet','wet'],'en':['ben','den','hen','men','pen','ten','then','when','wren'],'ed':['bed','fed','led','red','wed','shed','sled','shred'],'ell':['bell','cell','fell','sell','tell','well','yell','shell','smell','spell'],'ill':['bill','fill','hill','mill','pill','will','chill','drill','grill','skill'],'all':['ball','call','fall','hall','mall','tall','wall','small','stall'],'ack':['back','jack','pack','rack','sack','tack','black','crack','snack','track'],'ake':['bake','cake','fake','lake','make','rake','take','wake','shake','snake'],'ame':['came','fame','game','name','same','tame','blame','flame','frame'],'ate':['date','fate','gate','hate','late','mate','rate','plate','skate','state'],'ide':['hide','ride','side','wide','bride','glide','pride','slide'],'ine':['dine','fine','line','mine','nine','pine','vine','shine','spine'],'ore':['bore','core','more','pore','sore','tore','wore','shore','store','score'],'ook':['book','cook','hook','look','nook','took','brook','shook']};
        const GRADE_SUBTEST_BATTERIES = {'K':['segmentation','blending','isolation'],'1':['segmentation','blending','isolation','spelling','orf'],'2':['segmentation','blending','rhyming','spelling','orf'],'3-5':['segmentation','rhyming','spelling','orf']};
        const INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO || {};
        const ISOLATION_AUDIO = window.__ALLO_ISOLATION_AUDIO || {};
        const PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK || {};
        // === End crash fixes ===
'''

c = c[:insert_at] + CRASH_FIXES + c[insert_at:]

# Also fix the showReviewPanel TDZ
OLD_TDZ = "if (!playInstructions || !wordSoundsActivity || showReviewPanel) return;"
NEW_TDZ = "if (!playInstructions || !wordSoundsActivity || initialShowReviewPanel) return;"
if OLD_TDZ in c:
    c = c.replace(OLD_TDZ, NEW_TDZ)
    print("TDZ fix applied")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)
print("Crash fixes injected successfully")
print(f"New file size: {len(c)} chars")
