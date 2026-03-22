# Contributing to AlloFlow

First off, thank you for considering contributing to AlloFlow! This project exists because educators and developers like you believe that high-quality, universally designed education should be free and accessible to everyone.

## The Hub-and-Spoke Architecture
AlloFlow operates on a massive but highly structured **Local-First Monolithic architecture** coupled with a **Hub-and-Spoke Module system**. Understanding this is critical before submitting pull requests.

### 1. The Core Orchestrator (`AlloFlowANTI.txt` / `App.jsx`)
The core UI, state management, and primary interaction tools (like `Allobot` and `TeacherGate`) live entirely within the ~67K-line `AlloFlowANTI.txt` file (which compiles to `App.jsx`).
* **Rule:** Do NOT split the core file into standard React components (e.g., `Button.jsx`). AlloFlow must remain easily deployable as a single unified bundle for offline School Box instances without complex transpilation workflows.
* **Navigation:** Navigate the file using our explicit `// @section SECTION_NAME` markers in your IDE.

### 2. The Spoke Modules (STEM Lab, BehaviorLens, Report Writer)
To preserve memory on older school Chromebooks, heavy modules are loaded dynamically at runtime based on user interaction.
* **STEM Lab:** (`stem_lab_module.js`) Add new interactive simulations by creating a new `// @tool TOOL_NAME` block following the established Canvas API / React rendering pattern.
* **Clinical Specs:** (`report_writer_module.js` & `behavior_lens_module.js`) These tools handle highly sensitive Educator data. Make absolutely sure no `console.log` statements are left that could output PII or ABA metrics to the developer console.

### 3. Pinned Dependency Injection (CRITICAL)
If you add a new library or significantly alter a spoke module, you **must update the commit-hash pinned URLs** in the `AlloFlowANTI.txt` dynamic module loader. We do not use floating `latest` tags on our CDNs; every tool is rigidly pinned to ensure deterministic execution offline.

## Development Workflow
1. **Fork the Repository** and clone it locally.
2. Ensure you have the Chrome experimental QUIC protocol disabled (`chrome://flags`) if you are testing service-worker cache invalidations frequently.
3. Make your edits. 
4. **Test the School Box:** If modifying the `aiProvider.js` integration, ensure that Ollama endpoints (`http://localhost:11434`) still parse generic Llama/Phi prompts correctly without hallucinating formats.
5. Create a descriptive Pull Request explaining what UDL checkpoint or Clinical Workflow your tool enhances.

## Code of Conduct
Please be respectful and remember that the end-users are teachers, clinicians, and diverse students. Code should default to accessibility (ARIA labels on everything), safety, and zero-PII architectural design.
