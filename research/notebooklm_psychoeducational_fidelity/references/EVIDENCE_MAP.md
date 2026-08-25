# Initial Evidence Map

Status: targeted starting search, not yet a systematic review. Search dates and complete strategies will be added before manuscript submission.

## Direct NotebookLM evaluations

### Hagar, Agustianto, and Diakopoulos (2025)

**Title:** Not Wrong, But Untrue: LLM Overconfidence in Document-Based Queries  
**Link:** https://arxiv.org/abs/2509.25498  
**Design:** Reporting-style questions grounded in a 300-document corpus; sentence-level annotation.  
**Relevant finding:** At least one hallucination appeared in 13% of NotebookLM outputs in that task, compared with 40% for ChatGPT and Gemini. Errors often reflected interpretive overconfidence rather than fabricated entities or numbers.  
**Use here:** Demonstrates the importance of claim-level coding and of distinguishing unsupported interpretation from obvious fabrication. The rate is not transferable to psychoeducational reports.

### Tozuka et al. (2024/2025)

**Title:** Application of NotebookLM, a Large Language Model with Retrieval-Augmented Generation, for Lung Cancer Staging  
**Link:** https://arxiv.org/abs/2410.10869  
**Design:** One hundred fictional lung-cancer cases with expert-confirmed TNM classifications.  
**Relevant finding:** NotebookLM achieved 86% full staging accuracy and 95% reference-location accuracy; some failures occurred despite appropriate retrieval, including numerical-comparison errors.  
**Use here:** Precedent for expert-developed synthetic cases and separate evaluation of answer accuracy and source retrieval.

### Beber et al. (2025)

**Title:** Not Ready for Prime Time: Limitations of a Retrieval-Augmented Generation Large Language Model in Assessing Risk of Bias in Observational Studies  
**Link:** https://pmc.ncbi.nlm.nih.gov/articles/PMC12768933/  
**Design:** Repeated NotebookLM application of a judgment-dependent risk-of-bias instrument.  
**Relevant finding:** Poor single-measure agreement and low within-system consistency under the evaluated conditions.  
**Use here:** Supports repeated runs and analysis by task complexity rather than assuming that retrieval grounding ensures professional judgment.

### Dufey-Portilla et al. (2026)

**Title:** Evaluating Guideline Adherence in Gemini-Powered Dental Trauma Workflows: Standalone Gemini Chat vs. Document-Grounded NotebookLM  
**DOI:** https://doi.org/10.1111/edt.70065  
**Design:** Ninety-nine guideline-derived yes/no questions submitted through three independent accounts.  
**Relevant finding:** NotebookLM accuracy was 92.93% with 100% inter-account consistency in this constrained workflow.  
**Use here:** Shows that high performance and reproducibility are possible on structured questions while underscoring that workflow-level findings do not establish long-form clinical utility.

### Lin and Cho (2026)

**Title:** Evaluating Source-Based Large Language Models for Preclinical Dermatology Education: Comparative Study  
**DOI:** https://doi.org/10.2196/88008  
**Design:** Repeated evaluation of NotebookLM with and without student notes on 121 questions.  
**Relevant finding:** Source provision increased reproducibility, while performance decreased on more difficult questions and omission behavior differed across conditions.  
**Use here:** Supports separate omission measurement and stratification by task difficulty.

## School psychology and report-writing context

### Lockwood et al. (2025)

**Title:** Human vs. Machine: Comparing AI-Generated and Human-Written Psychological Reports  
**DOI:** https://doi.org/10.1177/07342829251346623  
**Design:** 249 licensed psychologists rated human-written and ChatGPT-4-generated psychological reports.  
**Relevant finding:** Human reports were generally favored, usually with small effects; human summaries and AI recommendations showed different relative strengths.  
**Use here:** Establishes professional relevance but does not provide a source-level NotebookLM fidelity evaluation.

### Farmer et al. (2026)

**Title:** AI in Psychoeducational Assessment: A Descriptive Study of Report Generation  
**DOI:** https://doi.org/10.1080/15377903.2026.2629395  
**Design:** National descriptive sample of school psychologists using AI at work.  
**Relevant finding:** Among 45 practitioners using AI for report writing, most used it for bounded drafting tasks, nearly all edited AI content, and estimated time savings were substantial.  
**Use here:** Supports practical importance and inclusion of human editing as an ecological-validity limitation of a raw-output benchmark.

## Evaluation and reporting guidance

### TRIPOD-LLM (2025)

**Title:** The TRIPOD-LLM Reporting Guideline for Studies Using Large Language Models  
**DOI:** https://doi.org/10.1038/s41591-024-03425-5  
**Use here:** Transparent reporting of model, prompting, data, evaluation, and reproducibility details.

### RAGChecker (Ru et al., 2024)

**Title:** RAGChecker: A Fine-Grained Framework for Diagnosing Retrieval-Augmented Generation  
**Link:** https://arxiv.org/abs/2408.08067  
**Use here:** Supports fine-grained separation of retrieval and generation failures and claim-level evaluation.

## AI authorship and disclosure policies

- APA Journals generative-AI policy: https://www.apa.org/pubs/journals/resources/publishing-tips/policy-generative-ai
- ICMJE use of AI by authors: https://icmje.org/recommendations/browse/artificial-intelligence/ai-use-by-authors.html
- COPE authorship and AI tools: https://doi.org/10.24318/cCVRZBms

These sources consistently place accountability on human authors and require transparent disclosure of substantive generative-AI use. The target journal's current policy will be checked again immediately before submission.

## Federal evaluation background for synthetic rule development

- IDEA evaluation procedures, 34 C.F.R. § 300.304: https://sites.ed.gov/idea/regs/b/d/300.304
- IDEA criteria for determining the existence of a specific learning disability, 34 C.F.R. § 300.309: https://sites.ed.gov/idea/regs/b/d/300.309
- IDEA Subpart D index, including § 300.311 documentation requirements: https://sites.ed.gov/idea/regs/b/d

These sources inform the ecological structure of fictional benchmark rules. The benchmark rules deliberately remain study-defined, simplified, and jurisdiction-neutral; they do not claim to reproduce a real team's complete legal determination.

## Preliminary gap statement

The initial search identified direct NotebookLM evaluations in journalism, literature appraisal, medical staging, dental guideline questions, and medical education, alongside school-psychology studies of AI report ratings and practitioner use. It did not identify a claim-level, source-grounded evaluation of NotebookLM-generated psychoeducational reports using an open synthetic benchmark. This is a provisional gap statement pending a reproducible database search.
