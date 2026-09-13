const fs=require('fs'),{chromium}=require('playwright'),{D}=require('./five_advanced_diagrams.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const sources=read('scratch/five-advanced-sources.json');
const cfg=[
  {
    "slug": "figurative_language_grade5",
    "prefix": "flx",
    "style": "Felt applique with editable concept diagrams",
    "groups": [
      "Comparisons in context",
      "Human qualities and exaggeration",
      "Conventional and literal meanings",
      "Interpret the effect"
    ],
    "titles": [
      "A churning feeling",
      "A simile comparison",
      "An object with human intention",
      "Deliberate exaggeration",
      "Phrase and meaning",
      "Literal meaning",
      "Sensory language",
      "Explain the shared feature"
    ],
    "terms": [
      "simile",
      "washer",
      "clock",
      "hyperbole",
      "idiom",
      "literal",
      "compare",
      "imagery",
      "compare",
      "symbol"
    ],
    "anchors": [
      "simile",
      "washer",
      "clock",
      "hyperbole",
      "idiom"
    ],
    "sort": [
      "bell",
      "zoo",
      "wind",
      "backpack",
      "glacier",
      "time",
      "clock",
      "time",
      "stars",
      "shadow",
      "ice",
      "bed"
    ],
    "lessons": [
      "washer",
      "simile",
      "clock",
      "hyperbole",
      "idiom",
      "literal",
      "imagery",
      "compare"
    ]
  },
  {
    "slug": "argument_evidence_grade6",
    "prefix": "agx",
    "style": "Screenprinted paper collage and argument diagrams",
    "groups": [
      "A claim and its support",
      "Connect evidence to a conclusion",
      "Check what is missing",
      "Evaluate another proposal"
    ],
    "titles": [
      "The library proposal",
      "Build an argument",
      "The reasoning bridge",
      "Check the source",
      "A missing explanation",
      "An opposing claim",
      "The cooking proposal",
      "Relevant to which claim?"
    ],
    "terms": [
      "argument",
      "claim",
      "evidence",
      "reasoning",
      "counter",
      "objective",
      "opinion",
      "relevant",
      "source",
      "counter"
    ],
    "anchors": [
      "claim",
      "evidence",
      "reasoning",
      "gap",
      "counter"
    ],
    "sort": [
      "library",
      "cooking",
      "team",
      "evidence",
      "survey",
      "team",
      "reasoning",
      "reasoning",
      "reasoning"
    ],
    "lessons": [
      "library",
      "argument",
      "reasoning",
      "source",
      "gap",
      "counter",
      "cooking",
      "relevant"
    ]
  },
  {
    "slug": "central_idea_grade7",
    "prefix": "cix",
    "style": "Linocut and watercolor with reading-evidence diagrams",
    "groups": [
      "Trace the text",
      "Locate and interpret evidence",
      "Separate context from support",
      "Represent the source fairly"
    ],
    "titles": [
      "The River Project",
      "Two developing ideas",
      "Evidence has a location",
      "Build an inference",
      "The recycling proposal",
      "Relevance to a claim",
      "Quote accurately",
      "Summarize fairly"
    ],
    "terms": [
      "threads",
      "claim",
      "evidence",
      "cite",
      "relevant",
      "develop",
      "inference",
      "reasoning",
      "objective",
      "bias",
      "quote",
      "reasoning"
    ],
    "anchors": [
      "claim",
      "cite",
      "reasoning",
      "relevant"
    ],
    "sort": [
      "bike",
      "counts",
      "town",
      "recycling",
      "counts",
      "recycling",
      "library",
      "counts",
      "town",
      "counts"
    ],
    "lessons": [
      "river",
      "threads",
      "cite",
      "inference",
      "recycling",
      "relevant",
      "quote",
      "summary"
    ]
  },
  {
    "slug": "theme_development_grade8",
    "prefix": "thx",
    "style": "Drypoint etching and watercolor with narrative diagrams",
    "groups": [
      "A story and a subject",
      "Recurring details",
      "Choices and change",
      "Test and summarize"
    ],
    "titles": [
      "The key on the table",
      "From topic to theme",
      "An open doorway",
      "A motif across the story",
      "A turning point",
      "Development across the work",
      "Consider counterevidence",
      "An objective summary"
    ],
    "terms": [
      "theme",
      "topic",
      "moral",
      "develop",
      "motif",
      "objective",
      "inference",
      "evidence",
      "turn",
      "counter",
      "resolution",
      "summary"
    ],
    "anchors": [
      "topic",
      "moral",
      "theme",
      "motif"
    ],
    "sort": [
      "courage",
      "door",
      "loyalty",
      "distance",
      "courage",
      "loyalty",
      "counter",
      "door",
      "truth",
      "truth",
      "courage",
      "loyalty"
    ],
    "lessons": [
      "key",
      "theme",
      "door",
      "motif",
      "turn",
      "develop",
      "counter",
      "summary"
    ]
  },
  {
    "slug": "scarcity_choice_grade7",
    "prefix": "scx",
    "style": "Crafted-paper miniatures with economic-choice diagrams",
    "groups": [
      "A limited shared resource",
      "Feasible uses and choice",
      "Trade-offs and opportunity cost",
      "Past and additional costs"
    ],
    "titles": [
      "The community room",
      "Competing wants",
      "One possible use",
      "Choose among alternatives",
      "Benefits exchanged",
      "The next-best forgone benefit",
      "Sunk costs and future choices",
      "One additional unit"
    ],
    "terms": [
      "scarcity",
      "scarcity",
      "choice",
      "tradeoff",
      "nextbest",
      "choice",
      "benefit",
      "sunk",
      "marginal",
      "incentive"
    ],
    "anchors": [
      "scarcity",
      "choice",
      "nextbest",
      "sunk",
      "marginal"
    ],
    "sort": [
      "hours",
      "parking",
      "sand",
      "air",
      "sea",
      "sunlight",
      "ticket",
      "sunk",
      "sunk"
    ],
    "lessons": [
      "room",
      "scarcity",
      "band",
      "choice",
      "tradeoff",
      "nextbest",
      "sunk",
      "marginal"
    ]
  }
];
const note="Pictures support interpretation of the editable lesson text; they are not standalone evidence or answer keys. Numerical records and named practice stories are fictional. Read each sort in its stated context. Educator review is pending.";
async function main(){const b=await chromium.launch();try{const page=await b.newPage({viewport:{width:1000,height:1000}});for(const c of cfg){const dir='allopacks/media/'+c.slug+'/';fs.mkdirSync(dir,{recursive:true});if(fs.existsSync(dir+'manifest.json'))throw Error('Refusing overwrite '+c.slug);const ss=sources.filter(s=>s.slug===c.slug).map(s=>{const file='source-'+s.key+'.png';fs.copyFileSync(s.sourcePath,dir+file);return {...s,file,status:'visual-review-passed',reviewedAt:'2026-09-13'};});for(const [key,d]of Object.entries(D[c.slug])){fs.writeFileSync(dir+'diagram-'+key+'.svg',d.svg);await page.setContent(d.svg);await page.locator('svg').screenshot({path:dir+'diagram-'+key+'.png'});}const assets=[];for(const [kind,keys]of [['term',c.terms],['anchor',c.anchors],['sort',c.sort],['lesson',c.lessons]])keys.forEach((key,index)=>{const s=ss.find(s=>s.key===key),d=D[c.slug][key];if(!s&&!d)throw Error(key);assets.push({id:c.prefix+'-'+kind+'-'+(index+1),kind,index,sourceKey:key,file:s?s.file:'diagram-'+key+'.png',...(d?{vectorFile:'diagram-'+key+'.svg'}:{}),method:s?'built-in-imagegen':'deterministic-svg',prompt:s?s.prompt:'Text-free instructional diagram: '+d.alt,alt:s?s.alt:d.alt,caption:s?s.caption:d.caption,status:s?'visual-review-passed':'diagram-review-pending'});});const m={slug:c.slug,prefix:c.prefix,status:'in-progress',style:c.style,provider:'Built-in image generation and deterministic SVG diagrams',groups:c.groups,lessonTitles:c.titles,note,sources:ss,assets};fs.writeFileSync(dir+'manifest.json',JSON.stringify(m,null,2));fs.writeFileSync(dir+'source-prompts.json',JSON.stringify(ss,null,2));console.log(c.slug+' '+assets.length);}}finally{await b.close();}}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});module.exports={cfg};
