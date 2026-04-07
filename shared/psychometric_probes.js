// PSYCHOMETRIC PROBE BANKS
// This unified file contains the developmentally sequenced assessment battery for the AlloFlow Screener.
// Includes Phonics/Phonemic Awareness Probes (Grades K-5) and Oral Reading Fluency Passages (Grades 1-5).
// Hosted on GitHub CDN to maintain monolith performance constraints.
//
// PHONEME STANDARDIZATION (Feb 2026):
// All segmentation and isolation words now include pre-validated phoneme arrays.
// Phonemes are aligned to the PHONEME_AUDIO_BANK inventory (42 tokens):
//   Consonants: b c d f g h j k l m n p q r s t v w y z
//   Digraphs:   ch ck ng ph sh th wh
//   Vowels:     a e i o u
//   Teams:      ay ee ie oa oo ow oy
//   R-ctrl:     ar er ir or ur air ear
//
// Format: {word:'cat', phonemes:['k','a','t']}
// Blending: {display:'b-a-t', answer:'bat', phonemes:['b','a','t']}
// Rhyming/Spelling: unchanged (no phoneme breakdown needed)

window.BENCHMARK_PROBE_BANKS = {

    'K': {

        A: {

            segmentation: [
                { word: 'cat', phonemes: ['k', 'a', 't'] },
                { word: 'dog', phonemes: ['d', 'o', 'g'] },
                { word: 'sun', phonemes: ['s', 'u', 'n'] },
                { word: 'map', phonemes: ['m', 'a', 'p'] },
                { word: 'red', phonemes: ['r', 'e', 'd'] },
                { word: 'big', phonemes: ['b', 'i', 'g'] },
                { word: 'hot', phonemes: ['h', 'o', 't'] },
                { word: 'cup', phonemes: ['k', 'u', 'p'] },
                { word: 'pen', phonemes: ['p', 'e', 'n'] },
                { word: 'leg', phonemes: ['l', 'e', 'g'] },
                { word: 'sit', phonemes: ['s', 'i', 't'] },
                { word: 'run', phonemes: ['r', 'u', 'n'] },
                { word: 'top', phonemes: ['t', 'o', 'p'] },
                { word: 'bus', phonemes: ['b', 'u', 's'] },
                { word: 'fan', phonemes: ['f', 'a', 'n'] }
            ],

            blending: [
                { display: 'b-a-t', answer: 'bat', phonemes: ['b', 'a', 't'] },
                { display: 'c-u-p', answer: 'cup', phonemes: ['k', 'u', 'p'] },
                { display: 's-i-t', answer: 'sit', phonemes: ['s', 'i', 't'] },
                { display: 'r-e-d', answer: 'red', phonemes: ['r', 'e', 'd'] },
                { display: 'h-o-p', answer: 'hop', phonemes: ['h', 'o', 'p'] },
                { display: 'd-o-g', answer: 'dog', phonemes: ['d', 'o', 'g'] },
                { display: 'p-i-n', answer: 'pin', phonemes: ['p', 'i', 'n'] },
                { display: 'b-u-s', answer: 'bus', phonemes: ['b', 'u', 's'] },
                { display: 'f-a-n', answer: 'fan', phonemes: ['f', 'a', 'n'] },
                { display: 'n-e-t', answer: 'net', phonemes: ['n', 'e', 't'] }
            ],

            isolation: [
                { word: 'mat', phonemes: ['m', 'a', 't'] },
                { word: 'sit', phonemes: ['s', 'i', 't'] },
                { word: 'hop', phonemes: ['h', 'o', 'p'] },
                { word: 'bed', phonemes: ['b', 'e', 'd'] },
                { word: 'fun', phonemes: ['f', 'u', 'n'] },
                { word: 'tap', phonemes: ['t', 'a', 'p'] },
                { word: 'lip', phonemes: ['l', 'i', 'p'] },
                { word: 'cot', phonemes: ['k', 'o', 't'] },
                { word: 'rug', phonemes: ['r', 'u', 'g'] },
                { word: 'gem', phonemes: ['j', 'e', 'm'] },
                { word: 'bat', phonemes: ['b', 'a', 't'] },
                { word: 'cup', phonemes: ['k', 'u', 'p'] },
                { word: 'red', phonemes: ['r', 'e', 'd'] },
                { word: 'dog', phonemes: ['d', 'o', 'g'] },
                { word: 'pin', phonemes: ['p', 'i', 'n'] }
            ]

        },

        B: {

            segmentation: [
                { word: 'hen', phonemes: ['h', 'e', 'n'] },
                { word: 'pig', phonemes: ['p', 'i', 'g'] },
                { word: 'tub', phonemes: ['t', 'u', 'b'] },
                { word: 'jam', phonemes: ['j', 'a', 'm'] },
                { word: 'wet', phonemes: ['w', 'e', 't'] },
                { word: 'dip', phonemes: ['d', 'i', 'p'] },
                { word: 'fog', phonemes: ['f', 'o', 'g'] },
                { word: 'nut', phonemes: ['n', 'u', 't'] },
                { word: 'wig', phonemes: ['w', 'i', 'g'] },
                { word: 'cod', phonemes: ['k', 'o', 'd'] },
                { word: 'bud', phonemes: ['b', 'u', 'd'] },
                { word: 'lap', phonemes: ['l', 'a', 'p'] },
                { word: 'vet', phonemes: ['v', 'e', 't'] },
                { word: 'gum', phonemes: ['g', 'u', 'm'] },
                { word: 'rob', phonemes: ['r', 'o', 'b'] }
            ],

            blending: [
                { display: 'h-e-n', answer: 'hen', phonemes: ['h', 'e', 'n'] },
                { display: 'p-i-g', answer: 'pig', phonemes: ['p', 'i', 'g'] },
                { display: 't-u-b', answer: 'tub', phonemes: ['t', 'u', 'b'] },
                { display: 'j-a-m', answer: 'jam', phonemes: ['j', 'a', 'm'] },
                { display: 'w-e-t', answer: 'wet', phonemes: ['w', 'e', 't'] },
                { display: 'd-i-p', answer: 'dip', phonemes: ['d', 'i', 'p'] },
                { display: 'f-o-g', answer: 'fog', phonemes: ['f', 'o', 'g'] },
                { display: 'n-u-t', answer: 'nut', phonemes: ['n', 'u', 't'] },
                { display: 'w-i-g', answer: 'wig', phonemes: ['w', 'i', 'g'] },
                { display: 'c-o-d', answer: 'cod', phonemes: ['k', 'o', 'd'] }
            ],

            isolation: [
                { word: 'hen', phonemes: ['h', 'e', 'n'] },
                { word: 'pig', phonemes: ['p', 'i', 'g'] },
                { word: 'tub', phonemes: ['t', 'u', 'b'] },
                { word: 'jam', phonemes: ['j', 'a', 'm'] },
                { word: 'wet', phonemes: ['w', 'e', 't'] },
                { word: 'dip', phonemes: ['d', 'i', 'p'] },
                { word: 'fog', phonemes: ['f', 'o', 'g'] },
                { word: 'nut', phonemes: ['n', 'u', 't'] },
                { word: 'wig', phonemes: ['w', 'i', 'g'] },
                { word: 'cod', phonemes: ['k', 'o', 'd'] },
                { word: 'bud', phonemes: ['b', 'u', 'd'] },
                { word: 'lap', phonemes: ['l', 'a', 'p'] },
                { word: 'vet', phonemes: ['v', 'e', 't'] },
                { word: 'gum', phonemes: ['g', 'u', 'm'] },
                { word: 'rob', phonemes: ['r', 'o', 'b'] }
            ]

        },

        C: {

            segmentation: [
                { word: 'kit', phonemes: ['k', 'i', 't'] },
                { word: 'mud', phonemes: ['m', 'u', 'd'] },
                { word: 'sob', phonemes: ['s', 'o', 'b'] },
                { word: 'wax', phonemes: ['w', 'a', 'k', 's'] },
                { word: 'zip', phonemes: ['z', 'i', 'p'] },
                { word: 'hug', phonemes: ['h', 'u', 'g'] },
                { word: 'den', phonemes: ['d', 'e', 'n'] },
                { word: 'pot', phonemes: ['p', 'o', 't'] },
                { word: 'rib', phonemes: ['r', 'i', 'b'] },
                { word: 'tag', phonemes: ['t', 'a', 'g'] },
                { word: 'fin', phonemes: ['f', 'i', 'n'] },
                { word: 'log', phonemes: ['l', 'o', 'g'] },
                { word: 'dug', phonemes: ['d', 'u', 'g'] },
                { word: 'yam', phonemes: ['y', 'a', 'm'] },
                { word: 'cab', phonemes: ['k', 'a', 'b'] }
            ],

            blending: [
                { display: 'k-i-t', answer: 'kit', phonemes: ['k', 'i', 't'] },
                { display: 'm-u-d', answer: 'mud', phonemes: ['m', 'u', 'd'] },
                { display: 's-o-b', answer: 'sob', phonemes: ['s', 'o', 'b'] },
                { display: 'w-a-x', answer: 'wax', phonemes: ['w', 'a', 'k', 's'] },
                { display: 'z-i-p', answer: 'zip', phonemes: ['z', 'i', 'p'] },
                { display: 'h-u-g', answer: 'hug', phonemes: ['h', 'u', 'g'] },
                { display: 'd-e-n', answer: 'den', phonemes: ['d', 'e', 'n'] },
                { display: 'p-o-t', answer: 'pot', phonemes: ['p', 'o', 't'] },
                { display: 'r-i-b', answer: 'rib', phonemes: ['r', 'i', 'b'] },
                { display: 't-a-g', answer: 'tag', phonemes: ['t', 'a', 'g'] }
            ],

            isolation: [
                { word: 'kit', phonemes: ['k', 'i', 't'] },
                { word: 'mud', phonemes: ['m', 'u', 'd'] },
                { word: 'sob', phonemes: ['s', 'o', 'b'] },
                { word: 'wax', phonemes: ['w', 'a', 'k', 's'] },
                { word: 'zip', phonemes: ['z', 'i', 'p'] },
                { word: 'hug', phonemes: ['h', 'u', 'g'] },
                { word: 'den', phonemes: ['d', 'e', 'n'] },
                { word: 'pot', phonemes: ['p', 'o', 't'] },
                { word: 'rib', phonemes: ['r', 'i', 'b'] },
                { word: 'tag', phonemes: ['t', 'a', 'g'] },
                { word: 'fin', phonemes: ['f', 'i', 'n'] },
                { word: 'log', phonemes: ['l', 'o', 'g'] },
                { word: 'dug', phonemes: ['d', 'u', 'g'] },
                { word: 'yam', phonemes: ['y', 'a', 'm'] },
                { word: 'cab', phonemes: ['k', 'a', 'b'] }
            ]

        }

    },

    '1': {

        A: {

            segmentation: [
                { word: 'frog', phonemes: ['f', 'r', 'o', 'g'] },
                { word: 'stop', phonemes: ['s', 't', 'o', 'p'] },
                { word: 'grin', phonemes: ['g', 'r', 'i', 'n'] },
                { word: 'ship', phonemes: ['sh', 'i', 'p'] },
                { word: 'drum', phonemes: ['d', 'r', 'u', 'm'] },
                { word: 'plan', phonemes: ['p', 'l', 'a', 'n'] },
                { word: 'clap', phonemes: ['k', 'l', 'a', 'p'] },
                { word: 'step', phonemes: ['s', 't', 'e', 'p'] },
                { word: 'trip', phonemes: ['t', 'r', 'i', 'p'] },
                { word: 'flag', phonemes: ['f', 'l', 'a', 'g'] },
                { word: 'spin', phonemes: ['s', 'p', 'i', 'n'] },
                { word: 'swim', phonemes: ['s', 'w', 'i', 'm'] },
                { word: 'blob', phonemes: ['b', 'l', 'o', 'b'] },
                { word: 'snap', phonemes: ['s', 'n', 'a', 'p'] },
                { word: 'sled', phonemes: ['s', 'l', 'e', 'd'] }
            ],

            blending: [
                { display: 'sh-i-p', answer: 'ship', phonemes: ['sh', 'i', 'p'] },
                { display: 'th-a-t', answer: 'that', phonemes: ['th', 'a', 't'] },
                { display: 'ch-i-n', answer: 'chin', phonemes: ['ch', 'i', 'n'] },
                { display: 't-r-a-p', answer: 'trap', phonemes: ['t', 'r', 'a', 'p'] },
                { display: 'c-l-a-p', answer: 'clap', phonemes: ['k', 'l', 'a', 'p'] },
                { display: 's-t-e-p', answer: 'step', phonemes: ['s', 't', 'e', 'p'] },
                { display: 'g-r-a-b', answer: 'grab', phonemes: ['g', 'r', 'a', 'b'] },
                { display: 'b-l-o-ck', answer: 'block', phonemes: ['b', 'l', 'o', 'ck'] },
                { display: 'f-r-o-g', answer: 'frog', phonemes: ['f', 'r', 'o', 'g'] },
                { display: 's-p-i-n', answer: 'spin', phonemes: ['s', 'p', 'i', 'n'] }
            ],

            isolation: [
                { word: 'chip', phonemes: ['ch', 'i', 'p'] },
                { word: 'thin', phonemes: ['th', 'i', 'n'] },
                { word: 'shop', phonemes: ['sh', 'o', 'p'] },
                { word: 'black', phonemes: ['b', 'l', 'a', 'ck'] },
                { word: 'grass', phonemes: ['g', 'r', 'a', 's'] },
                { word: 'sting', phonemes: ['s', 't', 'i', 'ng'] },
                { word: 'truck', phonemes: ['t', 'r', 'u', 'ck'] },
                { word: 'plum', phonemes: ['p', 'l', 'u', 'm'] },
                { word: 'crumb', phonemes: ['k', 'r', 'u', 'm'] },
                { word: 'swift', phonemes: ['s', 'w', 'i', 'f', 't'] },
                { word: 'step', phonemes: ['s', 't', 'e', 'p'] },
                { word: 'flag', phonemes: ['f', 'l', 'a', 'g'] },
                { word: 'drum', phonemes: ['d', 'r', 'u', 'm'] },
                { word: 'snap', phonemes: ['s', 'n', 'a', 'p'] },
                { word: 'swim', phonemes: ['s', 'w', 'i', 'm'] }
            ],

            spelling: ['cat', 'dog', 'sit', 'run', 'big', 'hot', 'red', 'cup', 'pen', 'fan', 'ship', 'chin', 'step', 'clap', 'drum']

        },

        B: {

            segmentation: [
                { word: 'crab', phonemes: ['k', 'r', 'a', 'b'] },
                { word: 'skip', phonemes: ['s', 'k', 'i', 'p'] },
                { word: 'grit', phonemes: ['g', 'r', 'i', 't'] },
                { word: 'chop', phonemes: ['ch', 'o', 'p'] },
                { word: 'plod', phonemes: ['p', 'l', 'o', 'd'] },
                { word: 'skit', phonemes: ['s', 'k', 'i', 't'] },
                { word: 'slap', phonemes: ['s', 'l', 'a', 'p'] },
                { word: 'grip', phonemes: ['g', 'r', 'i', 'p'] },
                { word: 'brim', phonemes: ['b', 'r', 'i', 'm'] },
                { word: 'plug', phonemes: ['p', 'l', 'u', 'g'] },
                { word: 'fled', phonemes: ['f', 'l', 'e', 'd'] },
                { word: 'blot', phonemes: ['b', 'l', 'o', 't'] },
                { word: 'slim', phonemes: ['s', 'l', 'i', 'm'] },
                { word: 'snug', phonemes: ['s', 'n', 'u', 'g'] },
                { word: 'trod', phonemes: ['t', 'r', 'o', 'd'] }
            ],

            blending: [
                { display: 'ch-o-p', answer: 'chop', phonemes: ['ch', 'o', 'p'] },
                { display: 'c-r-a-b', answer: 'crab', phonemes: ['k', 'r', 'a', 'b'] },
                { display: 's-k-i-p', answer: 'skip', phonemes: ['s', 'k', 'i', 'p'] },
                { display: 'g-r-i-t', answer: 'grit', phonemes: ['g', 'r', 'i', 't'] },
                { display: 'p-l-o-d', answer: 'plod', phonemes: ['p', 'l', 'o', 'd'] },
                { display: 's-l-a-p', answer: 'slap', phonemes: ['s', 'l', 'a', 'p'] },
                { display: 'g-r-i-p', answer: 'grip', phonemes: ['g', 'r', 'i', 'p'] },
                { display: 'b-r-i-m', answer: 'brim', phonemes: ['b', 'r', 'i', 'm'] },
                { display: 'f-l-e-d', answer: 'fled', phonemes: ['f', 'l', 'e', 'd'] },
                { display: 'b-l-o-t', answer: 'blot', phonemes: ['b', 'l', 'o', 't'] }
            ],

            isolation: [
                { word: 'chop', phonemes: ['ch', 'o', 'p'] },
                { word: 'shrug', phonemes: ['sh', 'r', 'u', 'g'] },
                { word: 'crop', phonemes: ['k', 'r', 'o', 'p'] },
                { word: 'pluck', phonemes: ['p', 'l', 'u', 'ck'] },
                { word: 'grits', phonemes: ['g', 'r', 'i', 't', 's'] },
                { word: 'sling', phonemes: ['s', 'l', 'i', 'ng'] },
                { word: 'broom', phonemes: ['b', 'r', 'oo', 'm'] },
                { word: 'slug', phonemes: ['s', 'l', 'u', 'g'] },
                { word: 'crisp', phonemes: ['k', 'r', 'i', 's', 'p'] },
                { word: 'twist', phonemes: ['t', 'w', 'i', 's', 't'] },
                { word: 'grip', phonemes: ['g', 'r', 'i', 'p'] },
                { word: 'plug', phonemes: ['p', 'l', 'u', 'g'] },
                { word: 'brim', phonemes: ['b', 'r', 'i', 'm'] },
                { word: 'fled', phonemes: ['f', 'l', 'e', 'd'] },
                { word: 'slap', phonemes: ['s', 'l', 'a', 'p'] }
            ],

            spelling: ['hen', 'pig', 'tub', 'jam', 'wet', 'fog', 'nut', 'wig', 'cod', 'bud', 'chop', 'crab', 'skip', 'grit', 'slap']

        },

        C: {

            segmentation: [
                { word: 'crop', phonemes: ['k', 'r', 'o', 'p'] },
                { word: 'slug', phonemes: ['s', 'l', 'u', 'g'] },
                { word: 'spit', phonemes: ['s', 'p', 'i', 't'] },
                { word: 'shed', phonemes: ['sh', 'e', 'd'] },
                { word: 'clip', phonemes: ['k', 'l', 'i', 'p'] },
                { word: 'smog', phonemes: ['s', 'm', 'o', 'g'] },
                { word: 'prim', phonemes: ['p', 'r', 'i', 'm'] },
                { word: 'bled', phonemes: ['b', 'l', 'e', 'd'] },
                { word: 'swig', phonemes: ['s', 'w', 'i', 'g'] },
                { word: 'clog', phonemes: ['k', 'l', 'o', 'g'] },
                { word: 'stab', phonemes: ['s', 't', 'a', 'b'] },
                { word: 'snip', phonemes: ['s', 'n', 'i', 'p'] },
                { word: 'drab', phonemes: ['d', 'r', 'a', 'b'] },
                { word: 'glum', phonemes: ['g', 'l', 'u', 'm'] },
                { word: 'skulk', phonemes: ['s', 'k', 'u', 'l', 'k'] }
            ],

            blending: [
                { display: 'c-r-o-p', answer: 'crop', phonemes: ['k', 'r', 'o', 'p'] },
                { display: 's-l-u-g', answer: 'slug', phonemes: ['s', 'l', 'u', 'g'] },
                { display: 's-p-i-t', answer: 'spit', phonemes: ['s', 'p', 'i', 't'] },
                { display: 'sh-e-d', answer: 'shed', phonemes: ['sh', 'e', 'd'] },
                { display: 'c-l-i-p', answer: 'clip', phonemes: ['k', 'l', 'i', 'p'] },
                { display: 's-m-o-g', answer: 'smog', phonemes: ['s', 'm', 'o', 'g'] },
                { display: 'p-r-i-m', answer: 'prim', phonemes: ['p', 'r', 'i', 'm'] },
                { display: 'b-l-e-d', answer: 'bled', phonemes: ['b', 'l', 'e', 'd'] },
                { display: 's-w-i-g', answer: 'swig', phonemes: ['s', 'w', 'i', 'g'] },
                { display: 'c-l-o-g', answer: 'clog', phonemes: ['k', 'l', 'o', 'g'] }
            ],

            isolation: [
                { word: 'shed', phonemes: ['sh', 'e', 'd'] },
                { word: 'spit', phonemes: ['s', 'p', 'i', 't'] },
                { word: 'clip', phonemes: ['k', 'l', 'i', 'p'] },
                { word: 'smog', phonemes: ['s', 'm', 'o', 'g'] },
                { word: 'clog', phonemes: ['k', 'l', 'o', 'g'] },
                { word: 'skulk', phonemes: ['s', 'k', 'u', 'l', 'k'] },
                { word: 'snip', phonemes: ['s', 'n', 'i', 'p'] },
                { word: 'drab', phonemes: ['d', 'r', 'a', 'b'] },
                { word: 'glum', phonemes: ['g', 'l', 'u', 'm'] },
                { word: 'stab', phonemes: ['s', 't', 'a', 'b'] },
                { word: 'prim', phonemes: ['p', 'r', 'i', 'm'] },
                { word: 'bled', phonemes: ['b', 'l', 'e', 'd'] },
                { word: 'swig', phonemes: ['s', 'w', 'i', 'g'] },
                { word: 'crop', phonemes: ['k', 'r', 'o', 'p'] },
                { word: 'slug', phonemes: ['s', 'l', 'u', 'g'] }
            ],

            spelling: ['kit', 'mud', 'sob', 'wax', 'zip', 'hug', 'den', 'pot', 'rib', 'tag', 'shed', 'clip', 'crop', 'slug', 'spit']

        }

    },

    '2': {

        A: {

            segmentation: [
                { word: 'splash', phonemes: ['s', 'p', 'l', 'a', 'sh'] },
                { word: 'string', phonemes: ['s', 't', 'r', 'i', 'ng'] },
                { word: 'branch', phonemes: ['b', 'r', 'a', 'n', 'ch'] },
                { word: 'strong', phonemes: ['s', 't', 'r', 'o', 'ng'] },
                { word: 'stream', phonemes: ['s', 't', 'r', 'ee', 'm'] },
                { word: 'shrimp', phonemes: ['sh', 'r', 'i', 'm', 'p'] },
                { word: 'spring', phonemes: ['s', 'p', 'r', 'i', 'ng'] },
                { word: 'scrape', phonemes: ['s', 'k', 'r', 'ay', 'p'] },
                { word: 'stripe', phonemes: ['s', 't', 'r', 'ie', 'p'] },
                { word: 'thread', phonemes: ['th', 'r', 'e', 'd'] },
                { word: 'squint', phonemes: ['s', 'k', 'w', 'i', 'n', 't'] },
                { word: 'thrush', phonemes: ['th', 'r', 'u', 'sh'] },
                { word: 'scrimp', phonemes: ['s', 'k', 'r', 'i', 'm', 'p'] },
                { word: 'sprawl', phonemes: ['s', 'p', 'r', 'aw', 'l'] },
                { word: 'strewn', phonemes: ['s', 't', 'r', 'oo', 'n'] }
            ],

            blending: [
                { display: 's-p-l-a-sh', answer: 'splash', phonemes: ['s', 'p', 'l', 'a', 'sh'] },
                { display: 's-t-r-i-ng', answer: 'string', phonemes: ['s', 't', 'r', 'i', 'ng'] },
                { display: 's-p-r-i-ng', answer: 'spring', phonemes: ['s', 'p', 'r', 'i', 'ng'] },
                { display: 's-k-r-ay-p', answer: 'scrape', phonemes: ['s', 'k', 'r', 'ay', 'p'] },
                { display: 'th-r-e-d', answer: 'thread', phonemes: ['th', 'r', 'e', 'd'] },
                { display: 'sh-r-i-m-p', answer: 'shrimp', phonemes: ['sh', 'r', 'i', 'm', 'p'] },
                { display: 'b-r-a-n-ch', answer: 'branch', phonemes: ['b', 'r', 'a', 'n', 'ch'] },
                { display: 's-t-r-o-ng', answer: 'strong', phonemes: ['s', 't', 'r', 'o', 'ng'] },
                { display: 's-t-r-ee-m', answer: 'stream', phonemes: ['s', 't', 'r', 'ee', 'm'] },
                { display: 's-t-r-ie-p', answer: 'stripe', phonemes: ['s', 't', 'r', 'ie', 'p'] }
            ],

            rhyming: [
                { target: 'cake', options: ['lake', 'make', 'rake', 'desk'] },
                { target: 'light', options: ['night', 'fight', 'right', 'list'] },
                { target: 'train', options: ['rain', 'brain', 'main', 'trim'] },
                { target: 'dream', options: ['stream', 'cream', 'team', 'drum'] },
                { target: 'ground', options: ['sound', 'found', 'round', 'green'] }
            ],

            spelling: ['brave', 'shade', 'stripe', 'branch', 'stream', 'throne', 'shrimp', 'spring', 'flight', 'ground', 'splash', 'thread', 'squint', 'crunch', 'bridge']

        },

        B: {

            segmentation: [
                { word: 'shriek', phonemes: ['sh', 'r', 'ee', 'k'] },
                { word: 'stench', phonemes: ['s', 't', 'e', 'n', 'ch'] },
                { word: 'sprint', phonemes: ['s', 'p', 'r', 'i', 'n', 't'] },
                { word: 'scrimp', phonemes: ['s', 'k', 'r', 'i', 'm', 'p'] },
                { word: 'throng', phonemes: ['th', 'r', 'o', 'ng'] },
                { word: 'splint', phonemes: ['s', 'p', 'l', 'i', 'n', 't'] },
                { word: 'strung', phonemes: ['s', 't', 'r', 'u', 'ng'] },
                { word: 'thrift', phonemes: ['th', 'r', 'i', 'f', 't'] },
                { word: 'scrawl', phonemes: ['s', 'k', 'r', 'aw', 'l'] },
                { word: 'sprout', phonemes: ['s', 'p', 'r', 'ow', 't'] },
                { word: 'squash', phonemes: ['s', 'k', 'w', 'o', 'sh'] },
                { word: 'strand', phonemes: ['s', 't', 'r', 'a', 'n', 'd'] },
                { word: 'struck', phonemes: ['s', 't', 'r', 'u', 'ck'] },
                { word: 'shrewd', phonemes: ['sh', 'r', 'oo', 'd'] },
                { word: 'sprawl', phonemes: ['s', 'p', 'r', 'aw', 'l'] }
            ],

            blending: [
                { display: 'sh-r-ee-k', answer: 'shriek', phonemes: ['sh', 'r', 'ee', 'k'] },
                { display: 's-t-e-n-ch', answer: 'stench', phonemes: ['s', 't', 'e', 'n', 'ch'] },
                { display: 's-p-r-i-n-t', answer: 'sprint', phonemes: ['s', 'p', 'r', 'i', 'n', 't'] },
                { display: 'th-r-o-ng', answer: 'throng', phonemes: ['th', 'r', 'o', 'ng'] },
                { display: 's-p-l-i-n-t', answer: 'splint', phonemes: ['s', 'p', 'l', 'i', 'n', 't'] },
                { display: 's-t-r-u-ng', answer: 'strung', phonemes: ['s', 't', 'r', 'u', 'ng'] },
                { display: 'th-r-i-f-t', answer: 'thrift', phonemes: ['th', 'r', 'i', 'f', 't'] },
                { display: 's-k-r-aw-l', answer: 'scrawl', phonemes: ['s', 'k', 'r', 'aw', 'l'] },
                { display: 's-p-r-ow-t', answer: 'sprout', phonemes: ['s', 'p', 'r', 'ow', 't'] },
                { display: 's-k-w-o-sh', answer: 'squash', phonemes: ['s', 'k', 'w', 'o', 'sh'] }
            ],

            rhyming: [
                { target: 'bake', options: ['sake', 'flake', 'wake', 'best'] },
                { target: 'bright', options: ['slight', 'tight', 'knight', 'brick'] },
                { target: 'chain', options: ['strain', 'brain', 'plain', 'charm'] },
                { target: 'steam', options: ['gleam', 'beam', 'seam', 'stem'] },
                { target: 'mound', options: ['hound', 'bound', 'wound', 'mouse'] }
            ],

            spelling: ['shriek', 'stench', 'sprint', 'throng', 'splint', 'strung', 'thrift', 'scrawl', 'sprout', 'squash', 'strand', 'struck', 'shrewd', 'fright', 'pledge']

        },

        C: {

            segmentation: [
                { word: 'screech', phonemes: ['s', 'k', 'r', 'ee', 'ch'] },
                { word: 'strain', phonemes: ['s', 't', 'r', 'ay', 'n'] },
                { word: 'shrank', phonemes: ['sh', 'r', 'a', 'ng', 'k'] },
                { word: 'sprung', phonemes: ['s', 'p', 'r', 'u', 'ng'] },
                { word: 'thwart', phonemes: ['th', 'w', 'or', 't'] },
                { word: 'squelch', phonemes: ['s', 'k', 'w', 'e', 'l', 'ch'] },
                { word: 'stretch', phonemes: ['s', 't', 'r', 'e', 'ch'] },
                { word: 'shrine', phonemes: ['sh', 'r', 'ie', 'n'] },
                { word: 'script', phonemes: ['s', 'k', 'r', 'i', 'p', 't'] },
                { word: 'splotch', phonemes: ['s', 'p', 'l', 'o', 'ch'] },
                { word: 'strewn', phonemes: ['s', 't', 'r', 'oo', 'n'] },
                { word: 'thrash', phonemes: ['th', 'r', 'a', 'sh'] },
                { word: 'splice', phonemes: ['s', 'p', 'l', 'ie', 's'] },
                { word: 'squirm', phonemes: ['s', 'k', 'w', 'er', 'm'] },
                { word: 'sprawl', phonemes: ['s', 'p', 'r', 'aw', 'l'] }
            ],

            blending: [
                { display: 's-k-r-ee-ch', answer: 'screech', phonemes: ['s', 'k', 'r', 'ee', 'ch'] },
                { display: 's-t-r-ay-n', answer: 'strain', phonemes: ['s', 't', 'r', 'ay', 'n'] },
                { display: 's-p-r-u-ng', answer: 'sprung', phonemes: ['s', 'p', 'r', 'u', 'ng'] },
                { display: 's-k-w-e-l-ch', answer: 'squelch', phonemes: ['s', 'k', 'w', 'e', 'l', 'ch'] },
                { display: 's-t-r-e-ch', answer: 'stretch', phonemes: ['s', 't', 'r', 'e', 'ch'] },
                { display: 'sh-r-ie-n', answer: 'shrine', phonemes: ['sh', 'r', 'ie', 'n'] },
                { display: 's-k-r-i-p-t', answer: 'script', phonemes: ['s', 'k', 'r', 'i', 'p', 't'] },
                { display: 's-p-l-o-ch', answer: 'splotch', phonemes: ['s', 'p', 'l', 'o', 'ch'] },
                { display: 'th-r-a-sh', answer: 'thrash', phonemes: ['th', 'r', 'a', 'sh'] },
                { display: 's-p-l-ie-s', answer: 'splice', phonemes: ['s', 'p', 'l', 'ie', 's'] }
            ],

            rhyming: [
                { target: 'gate', options: ['late', 'crate', 'fate', 'gift'] },
                { target: 'kite', options: ['write', 'quite', 'spite', 'kiss'] },
                { target: 'blame', options: ['flame', 'shame', 'frame', 'blaze'] },
                { target: 'peach', options: ['reach', 'teach', 'beach', 'pearl'] },
                { target: 'town', options: ['brown', 'gown', 'clown', 'toast'] }
            ],

            spelling: ['screech', 'strain', 'sprung', 'squelch', 'stretch', 'shrine', 'script', 'splice', 'squirm', 'thrash', 'growth', 'plunge', 'splotch', 'wretch', 'knight']

        }

    },

    '3-5': {

        A: {

            segmentation: [
                { word: 'adventure', phonemes: ['a', 'd', 'v', 'e', 'n', 'ch', 'er'] },
                { word: 'important', phonemes: ['i', 'm', 'p', 'or', 't', 'a', 'n', 't'] },
                { word: 'beautiful', phonemes: ['b', 'ee', 'oo', 't', 'i', 'f', 'u', 'l'] },
                { word: 'understand', phonemes: ['u', 'n', 'd', 'er', 's', 't', 'a', 'n', 'd'] },
                { word: 'different', phonemes: ['d', 'i', 'f', 'er', 'e', 'n', 't'] },
                { word: 'everything', phonemes: ['e', 'v', 'r', 'ee', 'th', 'i', 'ng'] },
                { word: 'wonderful', phonemes: ['w', 'u', 'n', 'd', 'er', 'f', 'u', 'l'] },
                { word: 'impossible', phonemes: ['i', 'm', 'p', 'o', 's', 'i', 'b', 'l'] },
                { word: 'discovery', phonemes: ['d', 'i', 's', 'k', 'u', 'v', 'er', 'ee'] },
                { word: 'celebration', phonemes: ['s', 'e', 'l', 'e', 'b', 'r', 'ay', 'sh', 'u', 'n'] },
                { word: 'temperature', phonemes: ['t', 'e', 'm', 'p', 'er', 'a', 'ch', 'er'] },
                { word: 'photograph', phonemes: ['f', 'oa', 't', 'o', 'g', 'r', 'a', 'f'] },
                { word: 'electricity', phonemes: ['i', 'l', 'e', 'k', 't', 'r', 'i', 's', 'i', 't', 'ee'] },
                { word: 'communication', phonemes: ['k', 'o', 'm', 'ee', 'oo', 'n', 'i', 'k', 'ay', 'sh', 'u', 'n'] },
                { word: 'extraordinary', phonemes: ['e', 'k', 's', 't', 'r', 'or', 'd', 'i', 'n', 'er', 'ee'] }
            ],

            rhyming: [
                { target: 'station', options: ['nation', 'creation', 'vacation', 'garden'] },
                { target: 'measure', options: ['treasure', 'pleasure', 'leisure', 'master'] },
                { target: 'motion', options: ['ocean', 'potion', 'lotion', 'button'] },
                { target: 'careful', options: ['cheerful', 'peaceful', 'playful', 'carpet'] },
                { target: 'birthday', options: ['doorway', 'halfway', 'pathway', 'brother'] }
            ],

            spelling: ['adventure', 'beautiful', 'different', 'important', 'wonderful', 'temperature', 'discovery', 'celebrate', 'photograph', 'communicate', 'electricity', 'extraordinary', 'impossible', 'information', 'understand']

        },

        B: {

            segmentation: [
                { word: 'mysterious', phonemes: ['m', 'i', 's', 't', 'ear', 'ee', 'u', 's'] },
                { word: 'independent', phonemes: ['i', 'n', 'd', 'i', 'p', 'e', 'n', 'd', 'e', 'n', 't'] },
                { word: 'experiment', phonemes: ['e', 'k', 's', 'p', 'er', 'i', 'm', 'e', 'n', 't'] },
                { word: 'environment', phonemes: ['e', 'n', 'v', 'ie', 'r', 'u', 'n', 'm', 'e', 'n', 't'] },
                { word: 'accomplish', phonemes: ['a', 'k', 'o', 'm', 'p', 'l', 'i', 'sh'] },
                { word: 'continuous', phonemes: ['k', 'o', 'n', 't', 'i', 'n', 'ee', 'oo', 'u', 's'] },
                { word: 'vocabulary', phonemes: ['v', 'oa', 'k', 'a', 'b', 'ee', 'oo', 'l', 'er', 'ee'] },
                { word: 'constitution', phonemes: ['k', 'o', 'n', 's', 't', 'i', 't', 'oo', 'sh', 'u', 'n'] },
                { word: 'remarkable', phonemes: ['r', 'i', 'm', 'ar', 'k', 'a', 'b', 'l'] },
                { word: 'population', phonemes: ['p', 'o', 'p', 'ee', 'oo', 'l', 'ay', 'sh', 'u', 'n'] },
                { word: 'alternative', phonemes: ['aw', 'l', 't', 'er', 'n', 'a', 't', 'i', 'v'] },
                { word: 'recognition', phonemes: ['r', 'e', 'k', 'o', 'g', 'n', 'i', 'sh', 'u', 'n'] },
                { word: 'development', phonemes: ['d', 'i', 'v', 'e', 'l', 'o', 'p', 'm', 'e', 'n', 't'] },
                { word: 'professional', phonemes: ['p', 'r', 'o', 'f', 'e', 'sh', 'u', 'n', 'a', 'l'] },
                { word: 'transportation', phonemes: ['t', 'r', 'a', 'n', 's', 'p', 'or', 't', 'ay', 'sh', 'u', 'n'] }
            ],

            rhyming: [
                { target: 'direction', options: ['connection', 'protection', 'selection', 'diamond'] },
                { target: 'feature', options: ['creature', 'teacher', 'preacher', 'feather'] },
                { target: 'condition', options: ['position', 'tradition', 'permission', 'kitchen'] },
                { target: 'wonderful', options: ['plentiful', 'merciful', 'beautiful', 'wandered'] },
                { target: 'someday', options: ['display', 'relay', 'hooray', 'sunset'] }
            ],

            spelling: ['mysterious', 'independent', 'experiment', 'environment', 'accomplish', 'continuous', 'vocabulary', 'constitution', 'remarkable', 'population', 'alternative', 'recognition', 'development', 'professional', 'transportation']

        },

        C: {

            segmentation: [
                { word: 'organization', phonemes: ['or', 'g', 'a', 'n', 'i', 'z', 'ay', 'sh', 'u', 'n'] },
                { word: 'particular', phonemes: ['p', 'ar', 't', 'i', 'k', 'ee', 'oo', 'l', 'er'] },
                { word: 'opportunity', phonemes: ['o', 'p', 'er', 't', 'oo', 'n', 'i', 't', 'ee'] },
                { word: 'absolutely', phonemes: ['a', 'b', 's', 'o', 'l', 'oo', 't', 'l', 'ee'] },
                { word: 'elementary', phonemes: ['e', 'l', 'e', 'm', 'e', 'n', 't', 'er', 'ee'] },
                { word: 'imagination', phonemes: ['i', 'm', 'a', 'j', 'i', 'n', 'ay', 'sh', 'u', 'n'] },
                { word: 'determination', phonemes: ['d', 'i', 't', 'er', 'm', 'i', 'n', 'ay', 'sh', 'u', 'n'] },
                { word: 'generation', phonemes: ['j', 'e', 'n', 'er', 'ay', 'sh', 'u', 'n'] },
                { word: 'responsible', phonemes: ['r', 'i', 's', 'p', 'o', 'n', 's', 'i', 'b', 'l'] },
                { word: 'uncomfortable', phonemes: ['u', 'n', 'k', 'u', 'm', 'f', 'er', 't', 'a', 'b', 'l'] },
                { word: 'accomplishment', phonemes: ['a', 'k', 'o', 'm', 'p', 'l', 'i', 'sh', 'm', 'e', 'n', 't'] },
                { word: 'entertainment', phonemes: ['e', 'n', 't', 'er', 't', 'ay', 'n', 'm', 'e', 'n', 't'] },
                { word: 'investigation', phonemes: ['i', 'n', 'v', 'e', 's', 't', 'i', 'g', 'ay', 'sh', 'u', 'n'] },
                { word: 'characteristic', phonemes: ['k', 'a', 'r', 'a', 'k', 't', 'er', 'i', 's', 't', 'i', 'ck'] },
                { word: 'encyclopedia', phonemes: ['e', 'n', 's', 'ie', 'k', 'l', 'o', 'p', 'ee', 'd', 'ee', 'a'] }
            ],

            rhyming: [
                { target: 'attention', options: ['invention', 'dimension', 'convention', 'antique'] },
                { target: 'adventure', options: ['furniture', 'signature', 'temperature', 'average'] },
                { target: 'election', options: ['perfection', 'reflection', 'collection', 'electric'] },
                { target: 'powerful', options: ['sorrowful', 'meaningful', 'bountiful', 'poverty'] },
                { target: 'stairway', options: ['railway', 'hallway', 'freeway', 'standard'] }
            ],

            spelling: ['organization', 'particular', 'opportunity', 'absolutely', 'elementary', 'imagination', 'determination', 'generation', 'responsible', 'uncomfortable', 'accomplishment', 'entertainment', 'investigation', 'characteristic', 'encyclopedia']

        }

    }

};

window.ORF_SCREENING_PASSAGES = {
    "K": {
        "A": [
            {
                "grade": "K",
                "season": "Fall",
                "level": "A",
                "title": "My Pet Dog",
                "wordCount": 17,
                "text": "I see the dog. The dog is big. The dog can run. I like the big dog.",
                "questions": [
                    {
                        "question": "What animal is in the story?",
                        "options": [
                            "A cat",
                            "A dog",
                            "A bird",
                            "A fish"
                        ],
                        "answer": "A dog"
                    },
                    {
                        "question": "What size is the dog?",
                        "options": [
                            "Little",
                            "Small",
                            "Big",
                            "Tiny"
                        ],
                        "answer": "Big"
                    },
                    {
                        "question": "What can the dog do?",
                        "options": [
                            "Sleep",
                            "Fly",
                            "Run",
                            "Swim"
                        ],
                        "answer": "Run"
                    }
                ]
            }
        ],
        "B": [
            {
                "grade": "K",
                "season": "Winter",
                "level": "B",
                "title": "Snow Days",
                "wordCount": 29,
                "text": "Look at the snow falling down. It is very cold outside. We can make a snowman. I will give him a red hat. We have fun in the snow.",
                "questions": [
                    {
                        "question": "What is falling outside?",
                        "options": [
                            "Rain",
                            "Leaves",
                            "Snow",
                            "Dirt"
                        ],
                        "answer": "Snow"
                    },
                    {
                        "question": "What will they make?",
                        "options": [
                            "A snowman",
                            "A fort",
                            "A ball",
                            "A sled"
                        ],
                        "answer": "A snowman"
                    },
                    {
                        "question": "What color is the hat?",
                        "options": [
                            "Blue",
                            "Green",
                            "Red",
                            "Yellow"
                        ],
                        "answer": "Red"
                    }
                ]
            }
        ],
        "C": [
            {
                "grade": "K",
                "season": "Spring",
                "level": "C",
                "title": "The Little Bird",
                "wordCount": 30,
                "text": "A little bird sits in the tree. The bird has a nest. It is singing a sweet song. I can see the baby birds. They are hungry for a worm.",
                "questions": [
                    {
                        "question": "Where is the bird sitting?",
                        "options": [
                            "On a rock",
                            "In a tree",
                            "On the grass",
                            "In the water"
                        ],
                        "answer": "In a tree"
                    },
                    {
                        "question": "What is the bird doing?",
                        "options": [
                            "Sleeping",
                            "Eating",
                            "Singing",
                            "Flying"
                        ],
                        "answer": "Singing"
                    },
                    {
                        "question": "What are the baby birds hungry for?",
                        "options": [
                            "A seed",
                            "A bug",
                            "A worm",
                            "A berry"
                        ],
                        "answer": "A worm"
                    }
                ]
            }
        ]
    },
    "1": {
        "A": [
            {
                "grade": "1",
                "season": "Fall",
                "level": "E",
                "title": "Playing at the Park",
                "wordCount": 53,
                "text": "Today we went to the big park. The sun was hot and bright. I walked to the pond and saw a little duck. It was swimming in the cool water. Then I went to the swings. I went up high in the sky. It was a very good day at the park.",
                "questions": [
                    {
                        "question": "What was the weather like?",
                        "options": [
                            "Cold and rainy",
                            "Hot and bright",
                            "Cloudy and dark",
                            "Snowy and windy"
                        ],
                        "answer": "Hot and bright"
                    },
                    {
                        "question": "What animal was in the pond?",
                        "options": [
                            "A frog",
                            "A turtle",
                            "A fish",
                            "A duck"
                        ],
                        "answer": "A duck"
                    },
                    {
                        "question": "Where did the child go high in the sky?",
                        "options": [
                            "On the slide",
                            "On the swings",
                            "In a tree",
                            "On the monkey bars"
                        ],
                        "answer": "On the swings"
                    }
                ]
            }
        ],
        "B": [
            {
                "grade": "1",
                "season": "Winter",
                "level": "G",
                "title": "A Winter Walk",
                "wordCount": 61,
                "text": "We put on our thick coats and warm hats to go for a winter walk. The white snow covered the ground and crunched under our boots. We saw animal tracks near the trees. My brother said they were from a small rabbit. We followed the tracks until it started to get dark. Then we went home for hot chocolate.",
                "questions": [
                    {
                        "question": "What covered the ground?",
                        "options": [
                            "Green grass",
                            "Fallen leaves",
                            "White snow",
                            "Wet mud"
                        ],
                        "answer": "White snow"
                    },
                    {
                        "question": "Who said the tracks were from a rabbit?",
                        "options": [
                            "Mom",
                            "Dad",
                            "My brother",
                            "My sister"
                        ],
                        "answer": "My brother"
                    },
                    {
                        "question": "What did they have when they got home?",
                        "options": [
                            "Hot tea",
                            "Hot chocolate",
                            "Warm soup",
                            "Apple cider"
                        ],
                        "answer": "Hot chocolate"
                    }
                ]
            }
        ],
        "C": [
            {
                "grade": "1",
                "season": "Spring",
                "level": "I",
                "title": "The Garden",
                "wordCount": 68,
                "text": "In the spring, my family plants a garden. We dig in the soft brown dirt and put in tiny seeds. Every day we give them water and watch the sun shine on them. After many days, we see small green leaves poking through the soil. By summer, we have big red tomatoes and long green beans. I like to pick them and eat them for dinner. Gardening is hard work, but it makes me happy.",
                "questions": [
                    {
                        "question": "When does the family plant a garden?",
                        "options": [
                            "In the winter",
                            "In the fall",
                            "In the spring",
                            "In the summer"
                        ],
                        "answer": "In the spring"
                    },
                    {
                        "question": "What do they see poking through the soil?",
                        "options": [
                            "Flowers",
                            "Rocks",
                            "Small green leaves",
                            "Worms"
                        ],
                        "answer": "Small green leaves"
                    },
                    {
                        "question": "What vegetables do they grow?",
                        "options": [
                            "Corn and carrots",
                            "Tomatoes and beans",
                            "Peas and potatoes",
                            "Lettuce and peppers"
                        ],
                        "answer": "Tomatoes and beans"
                    }
                ]
            }
        ]
    },
    "2": {
        "A": [
            {
                "grade": "2",
                "season": "Fall",
                "level": "K",
                "title": "The Lost Kitten",
                "wordCount": 89,
                "text": "Maya was walking home from school when she heard a soft sound coming from behind the bushes. She bent down and saw a tiny gray kitten with bright green eyes. The kitten was shaking because it was cold and scared. Maya carefully picked up the kitten and wrapped it in her warm jacket. She carried it home and gave it a bowl of milk. Her mother said they could keep the kitten if no one came to find it. Maya named the kitten Misty and gave it a soft bed by the fireplace. Soon Misty was purring loudly and felt safe at last.",
                "questions": [
                    {
                        "question": "Where did Maya find the kitten?",
                        "options": [
                            "At school",
                            "Behind the bushes",
                            "At a pet store",
                            "In her house"
                        ],
                        "answer": "Behind the bushes"
                    },
                    {
                        "question": "What color was the kitten?",
                        "options": [
                            "Black",
                            "Orange",
                            "White",
                            "Gray"
                        ],
                        "answer": "Gray"
                    },
                    {
                        "question": "What did Maya name the kitten?",
                        "options": [
                            "Smoky",
                            "Shadow",
                            "Misty",
                            "Fluffy"
                        ],
                        "answer": "Misty"
                    }
                ]
            }
        ],
        "B": [
            {
                "grade": "2",
                "season": "Winter",
                "level": "L",
                "title": "The Snow Fort",
                "wordCount": 95,
                "text": "After the big snowstorm, Carlos and his friends decided to build the biggest snow fort on the block. They rolled enormous snowballs and stacked them into thick walls. Carlos used a shovel to pack the snow tightly so the walls would be strong. His friend Ana made a special window so they could see outside. They even built a tunnel to crawl through to get inside. When the fort was finished, they brought out cups of hot cocoa and sat inside their snowy castle. The wind blew outside, but they were warm and cozy. They felt like real explorers who had built their very own shelter.",
                "questions": [
                    {
                        "question": "What did Carlos use to pack the snow?",
                        "options": [
                            "His hands",
                            "A bucket",
                            "A shovel",
                            "A rake"
                        ],
                        "answer": "A shovel"
                    },
                    {
                        "question": "What did Ana make in the fort?",
                        "options": [
                            "A door",
                            "A window",
                            "A flag",
                            "A bench"
                        ],
                        "answer": "A window"
                    },
                    {
                        "question": "What did they drink inside the fort?",
                        "options": [
                            "Juice",
                            "Warm tea",
                            "Hot cocoa",
                            "Cold water"
                        ],
                        "answer": "Hot cocoa"
                    }
                ]
            }
        ],
        "C": [
            {
                "grade": "2",
                "season": "Spring",
                "level": "M",
                "title": "The Butterfly Garden",
                "wordCount": 102,
                "text": "Mrs. Patel's second grade class started a butterfly garden at their school. First, they learned which plants butterflies like best. They planted milkweed for the monarch butterflies and lavender for the painted ladies. Every morning, the students would check the garden for caterpillars. One exciting day, they found five tiny green caterpillars munching on the milkweed leaves. The class watched carefully as the caterpillars grew bigger each day. After two weeks, each caterpillar formed a chrysalis. The students waited patiently for ten more days. Then one bright morning, beautiful orange and black butterflies came out of the chrysalis. The whole class cheered as the butterflies spread their new wings and flew into the spring sky.",
                "questions": [
                    {
                        "question": "What did they plant for monarch butterflies?",
                        "options": [
                            "Roses",
                            "Daisies",
                            "Milkweed",
                            "Sunflowers"
                        ],
                        "answer": "Milkweed"
                    },
                    {
                        "question": "How many caterpillars did they find?",
                        "options": [
                            "Three",
                            "Five",
                            "Seven",
                            "Ten"
                        ],
                        "answer": "Five"
                    },
                    {
                        "question": "What colors were the butterflies?",
                        "options": [
                            "Blue and white",
                            "Red and yellow",
                            "Orange and black",
                            "Purple and green"
                        ],
                        "answer": "Orange and black"
                    }
                ]
            }
        ]
    },
    "3-5": {
        "A": [
            {
                "grade": "3",
                "season": "Fall",
                "level": "O",
                "title": "The Science Fair Project",
                "wordCount": 128,
                "text": "Jamal couldn't wait for the school science fair. He had been working on his project for three whole weeks. His experiment tested which type of soil helped plants grow the tallest. He used three different kinds of soil: sandy soil from the beach, dark garden soil from his backyard, and clay soil that his uncle brought from his farm. Jamal planted the same type of bean seed in each pot and gave them equal amounts of water and sunlight every day. He measured each plant carefully with a ruler and wrote down the results in his notebook. After twenty-one days, the plant in the garden soil was the tallest at twelve inches. The sandy soil plant grew to eight inches, and the clay soil plant only reached five inches. Jamal made a colorful chart showing his results and practiced explaining his conclusions.",
                "questions": [
                    {
                        "question": "How many types of soil did Jamal test?",
                        "options": [
                            "Two",
                            "Three",
                            "Four",
                            "Five"
                        ],
                        "answer": "Three"
                    },
                    {
                        "question": "Which soil grew the tallest plant?",
                        "options": [
                            "Sandy soil",
                            "Clay soil",
                            "Garden soil",
                            "Rocky soil"
                        ],
                        "answer": "Garden soil"
                    },
                    {
                        "question": "How long did the experiment last?",
                        "options": [
                            "Fourteen days",
                            "Twenty-one days",
                            "Thirty days",
                            "Seven days"
                        ],
                        "answer": "Twenty-one days"
                    }
                ]
            }
        ],
        "B": [
            {
                "grade": "4",
                "season": "Winter",
                "level": "R",
                "title": "The Underground Railroad",
                "wordCount": 142,
                "text": "In the 1800s, many brave people helped enslaved African Americans escape to freedom through a secret network called the Underground Railroad. It wasn't actually underground, and it wasn't a railroad. Instead, it was a series of safe houses, called stations, connected by secret routes. The people who guided the freedom seekers were called conductors. One of the most famous conductors was Harriet Tubman. She had escaped slavery herself and then risked her life by returning to the South nineteen times to help over three hundred people reach freedom. The journey was dangerous and could take weeks or even months. Travelers moved mostly at night, following the North Star to guide their way. Many communities in the North and in Canada provided shelter and support. The courage of both the freedom seekers and those who helped them remains one of the most important stories in American history.",
                "questions": [
                    {
                        "question": "What were the safe houses called?",
                        "options": [
                            "Camps",
                            "Stations",
                            "Hotels",
                            "Shelters"
                        ],
                        "answer": "Stations"
                    },
                    {
                        "question": "How many times did Harriet Tubman return to the South?",
                        "options": [
                            "Ten times",
                            "Fifteen times",
                            "Nineteen times",
                            "Twenty-five times"
                        ],
                        "answer": "Nineteen times"
                    },
                    {
                        "question": "What did travelers follow to guide their way?",
                        "options": [
                            "A compass",
                            "A map",
                            "The North Star",
                            "River paths"
                        ],
                        "answer": "The North Star"
                    }
                ]
            }
        ],
        "C": [
            {
                "grade": "5",
                "season": "Spring",
                "level": "T",
                "title": "Ocean Exploration",
                "wordCount": 156,
                "text": "The ocean covers more than seventy percent of Earth's surface, yet scientists estimate that we have explored less than five percent of it. The deepest part of the ocean, the Mariana Trench in the Pacific Ocean, reaches nearly seven miles below the surface. The pressure at that depth is so intense that it would crush most submarines. In 1960, two explorers named Jacques Piccard and Don Walsh became the first humans to reach the bottom of the Mariana Trench in a vessel called the Trieste. They spent only twenty minutes at the bottom before returning to the surface. More recently, filmmaker James Cameron made a solo dive to the trench floor in 2012. Scientists continue to discover remarkable creatures living in the deepest parts of the ocean, including fish that produce their own light and giant tube worms that can survive without sunlight. Each new expedition reveals something unexpected about the mysterious world beneath the waves, reminding us how much there is still left to learn about our own planet.",
                "questions": [
                    {
                        "question": "How much of the ocean has been explored?",
                        "options": [
                            "Less than five percent",
                            "About twenty percent",
                            "Nearly half",
                            "Over seventy percent"
                        ],
                        "answer": "Less than five percent"
                    },
                    {
                        "question": "When was the first dive to the Mariana Trench?",
                        "options": [
                            "1950",
                            "1960",
                            "1970",
                            "1980"
                        ],
                        "answer": "1960"
                    },
                    {
                        "question": "What can some deep-sea fish produce?",
                        "options": [
                            "Electricity",
                            "Poison",
                            "Their own light",
                            "Fresh water"
                        ],
                        "answer": "Their own light"
                    }
                ]
            }
        ]
    }
};
