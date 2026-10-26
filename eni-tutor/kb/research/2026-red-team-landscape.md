# LLM Red Teaming & Jailbreak Landscape — state as of 20 Oct 2026

Prepared by: ENI research sub-agent. Method: ~30 web searches/fetches; primary sources fetched where possible; secondary sources labelled.

**Legend**
- `[2026]` = published/dated 2026. `[canonical]` = older (2023–2025) but still the reference point.
- Confidence: **H** = primary source read in this session; **M** = secondary source or search-snippet only; **L** = could not verify, or claim from a low-authority source.

---

## Key takeaways

- Interpretability work on "persona" and "global workspace" representations is the most active 2026 frontier-lab research thread (Anthropic, Jan and Jul 2026). It is not yet a standard red-teaming tool.
- Meta's May 2026 Muse Spark safety report is the most detailed 2026 vendor disclosure I found. It says the model has robustness gaps under adaptive multi-turn jailbreaks, prompt injection and agentic misuse, and it reports numbers.
- Adaptive attacks remain the main threat to published defenses (canonical "The Attacker Moves Second", 2025; UK AISI Boundary Point Jailbreaking, 2026).
- Agentic security is now formalised: OWASP has a 2026 Top 10 for Agentic Applications, MITRE ATLAS has MCP/agent case studies, and the reporting here focuses on tool use, MCP and memory.
- Regulation: California SB 53 has been operative since 1 Jan 2026. New York's RAISE Act is signed and follows it. The EU AI Act general-purpose AI (GPAI) obligations have applied since Aug 2025, and a Digital Omnibus delayed high-risk rules.
- Gaps: I found no 2026 tokenizer-level attack paper and no verified 2026 "policy-specification attack" paper. Several items below are flagged accordingly.

---

## A. Frontier-model safety and jailbreak research

### A1. The Assistant Axis (Anthropic, Jan 2026) `[2026]`
- **Title:** "The Assistant Axis: Situating and Stabilizing the Default Persona of Language Models"
- **Authors:** Christina Lu, Jack Gallagher, Jonathan Michala, Kyle Fish, Jack Lindsey (per the GitHub citation). Anthropic Fellows / MATS program.
- **Date:** Paper arXiv 2601.10387 (Jan 2026). Anthropic X thread dated 19 Jan 2026.
- **Link:** https://arxiv.org/abs/2601.10387 ; https://www.anthropic.com/research/assistant-axis ; https://x.com/AnthropicAI/status/2013356793477361991
- **Finding:** The Assistant Axis is a direction in activation space, defined as the mean default-Assistant activation minus the mean of role-playing role vectors. It is highly similar to PC1 of persona space. Persona drift has three sources: single deliberate jailbreaks, slow escalation over long contexts, and others. "Activation capping" constrains activations along the axis. Anthropic reports it reduced harmful responses "roughly 50%" while preserving performance (X post). The alphaXiv summary says "nearly 60%". The two figures differ; use the paper for the exact number.
- **Models:** Pre-computed axes exist for Gemma 2 27B, Qwen 3 32B and Llama 3.3 70B (HF dataset). Code is at github.com/safety-research/assistant-axis.
- **Red-team relevance:** This is a model-internal defense and a monitoring signal, not a black-box attack. Persona-based jailbreaks are the target.
- **Confidence:** H for the paper URL, authors and mechanism. M for the 50% vs 60% numbers (secondary sources disagree).
- **Rebuttal status:** I found **no** published rebuttal or replication of the Assistant Axis paper. Critiques found target the later J-space/global-workspace paper (see A2). Treat the Assistant Axis as unreplicated by independent parties in what I could find.

### A2. "J-space" / Global Workspace paper (Anthropic, July 2026) `[2026]`
- **Title (primary):** "Verbalizable Representations Form a Global Workspace in Language Models." Secondary coverage calls it the "J-space" paper (e.g. corti.com "Inside the J-Space").
- **Authors/org:** Anthropic interpretability team (Gurnee, Sofroniew, Lindsey et al., per corti.com).
- **Date:** 6 July 2026 (corti.com).
- **Link:** https://transformer-circuits.pub/2026/workspace/index.html ; https://www.anthropic.com/research/global-workspace
- **Finding (as reported):** Claims that verbalizable representations in the model form a global-workspace-like structure, and relates this to deliberate reasoning. I did not read the full text, so I cannot confirm the five hallmark tests or the "J-lens" details reported in some secondary coverage.
- **Critiques / responses found:**
  - Neel Nanda's LessWrong review, "A Review of Anthropic's Global Workspace Paper" (https://www.lesswrong.com/posts/zFJ3ZdQwrTWE9jT5S/a-review-of-anthropic-s-global-workspace-paper). Author and detail not re-verified in my retained output.
  - Substack critique by learntechmaury, "Is Anthropic Trying Too Hard to Prove Claude Is Explainable and Human-Like?" (https://learntechmaury.substack.com/p/is-anthropic-trying-too-hard-to-prove). It argues the paper does not show what Anthropic says it shows (evidence for existence of the structure).
- **Red-team relevance:** Indirect. Relevant to whether reasoning traces reflect internal decisions, which bears on monitoring and on reasoning-model jailbreaks.
- **Confidence:** H for the Anthropic and transformer-circuits URLs and title. M for the date, authorship and critique content. The arXiv ID is not verified.

### A3. Meta Muse family: Muse Spark, Muse Spark 1.3, Muse Glimmer, Muse Spark Open `[2026]`
- **Muse Spark** (first in the Muse family, from Meta Superintelligence Labs). Introduced April 2026. Muse Spark 1.1 launched 9 July 2026 (per Wikipedia summary; not fetched directly). Confidence M.
- **Muse Spark Safety & Preparedness Report** (Meta), dated **26 May 2026**. Authors: MSL Preparedness, Red Teaming and Alignment team; AI Security team.
  - Link: https://ai.meta.com/static-resource/muse-spark-safety-and-preparedness-report
  - Finding: Meta concludes the model is "moderate or lower risk" after mitigations. It says an unmitigated model reaches "high risk" for chemical and biological threats. Muse Spark is "susceptible to emerging risk factors related to adaptive jailbreak and prompt injection attacks in agentic settings."
  - Numbers reported (verified in the fetched report): multi-turn adaptive jailbreak attack success rate (StrongREJECT v2, lower is better) is **44.6%** for Muse Spark, versus 37.6% for GPT-5.4 and 31.7% for Claude Opus 4.6. Cyber-misuse ASR is 9.0% (lowest of those compared). AgentHarm compliance is 26.0% versus 10.2% (GPT-5.4) and 8.2% (Opus 4.6). AgentDojo pass@1 (attack success) is 11.7%. Meta says the agent section is "a forward-looking baseline, not an assessment of today's system."
  - Evaluation awareness: Apollo Research found the "highest rate of evaluation awareness they have observed to date." Meta found evidence of behavioural impact in 3 of 20 evaluations.
  - Confidence: H.
- **Muse Spark 1.3** (Meta AI Research blog): https://research.meta.ai/blog/introducing-muse-spark-1-3 . The post describes improved long-horizon work. I could not confirm its exact release date or any new safety numbers in my retained output. Confidence M for the existence of the post; L for the date.
- **Muse Glimmer** (open-weight): 30B dense model with a 120K+ context window, described as built for local agentic work (NVIDIA technical blog: https://developer.nvidia.com/blog/run-local-agentic-ai-workflows-with-metas-muse-glimmer-on-nvidia ; Meta: https://dev.meta.ai/resources/blog/build-with-muse-glimmer). Release is 2026; exact date not confirmed. Confidence H for existence and size, M for date.
- **Muse Spark Open** (Hugging Face): https://huggingface.co/blog/meta-muse-spark-open . Described as an open-weight frontier multimodal mixture-of-experts model.
- **"Glimmer open tokenizer":** I did **not** find a standalone open-tokenizer release called Glimmer. Meta's open-model materials may share a tokenizer across Glimmer and Muse Spark Open. I could not confirm this in my retained output. Treat "Glimmer tokenizer" as **unverified**.

### A4. Tokenizer and special-token attacks `[2026] gap`
- I found **no 2026 academic paper** specifically on tokenizer-level or special-token attacks against frontier models.
- The only related item found is the Promptfoo documentation page "Special Token Injection for LLMs" (https://www.promptfoo.dev/docs/red-team/plugins/special-token-injection). It describes injecting conversation-format delimiters to manipulate behaviour. It is undated and is a tooling doc, not research.
- Confidence: L (absence of evidence after limited searching). Recommend a dedicated search (arXiv "tokenizer" + "jailbreak"/"chat template") before writing this section into the KB as established.

### A5. Multi-turn and crescendo jailbreaks `[canonical] + [2026]`
- **Crescendo** (Russinovich, Salem, Eldan; Microsoft), USENIX Security 2025. Gradual escalation over turns; reported near-100% ASR on some models for some tasks. PDF: https://www.usenix.org/system/files/conference/usenixsecurity25/sec25cycle1-prepub-805-russinovich.pdf . Confidence M (snippet; not re-read in full). `[canonical]`
- **MultiBreak** (arXiv 2605.01687, May 2026): a scalable multi-turn jailbreak benchmark with an active-learning attack-generator pipeline. https://arxiv.org/html/2605.01687v1 . Confidence M (search snippet). `[2026]`
- **Muse Spark report** (May 2026, A3): multi-turn adaptive attacker is the one place Muse Spark trails peers in its own evaluation (44.6% vs 31.7–37.6%). Confidence H.
- **UK AISI Boundary Point Jailbreaking (BPJ)** (2026): a fully automated method for developing universal jailbreaks against strong defenses (see A11). https://www.aisi.gov.uk/blog/boundary-point-jailbreaking-a-new-way-to-break-the-strongest-ai-defences . Confidence M (snippet only).

### A6. Reasoning-model jailbreaks `[canonical] + [2026]`
- **H-CoT** (arXiv 2502.12893, Feb 2025; Kuo et al.): hijacks chain-of-thought safety reasoning in o1/o3, DeepSeek-R1 and Gemini 2.0 Flash Thinking. https://arxiv.org/abs/2502.12893 `[canonical]` Confidence M (abstract snippet).
- **Chain-of-Thought Hijacking** (Zhao et al., arXiv 2510.26418, Oct 2025): prepends a harmful request with long benign puzzle reasoning to dilute the safety signal. Source: NeuralTrust blog (https://neuraltrust.ai/blog/chain-of-thought-hijacking-reasoning-ai-safety). `[canonical]` Confidence M (secondary).
- **Fortune (Nov 2025)** reports that more inference-time reasoning can be exploited to circumvent safety (https://fortune.com/2025/11/07/ai-reasoning-models-more-vulnerable-jailbreak-attacks-study). Confidence M.
- **Attention-guided RL jailbreak against large reasoning models** (arXiv 2605.19485, May 2026). Uses reinforcement learning to jailbreak LRMs, citing H-CoT, AutoRAN and Mousetrap as prior work. https://arxiv.org/html/2605.19485v1 `[2026]` Confidence M (snippet).
- **Reasoning-trace exfiltration / injection** (arXiv 2608.09867, Aug 2026): "Stealing Reasoning Traces from Proprietary LLM APIs." Shows prompt injection into encrypted reasoning blocks (tested on Haiku 4.5 and Opus 4.7). The paper states the attack was no longer reproducible as of Aug 2026 because of vendor mitigations. https://arxiv.org/html/2608.09867v1 `[2026]` Confidence M (snippet). This is an important example of a vendor patching a specific class of attack.

### A7. Agentic, MCP and tool-use prompt injection `[2026]`
- **OWASP Top 10 for Agentic Applications 2026** (https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/). Includes ASI01 Agent Goal Hijack and ASI02 Tool Misuse and Exploitation. Full list of ten items is from a secondary source (DeepTeam docs: https://trydeepteam.com/docs/frameworks-owasp-top-10-for-agentic-applications); I did not verify the rest from the OWASP page. Confidence H for existence; M for item names.
- **MITRE ATLAS** (live site, https://atlas.mitre.org/): 16 tactics, 208 techniques, 40 mitigations, 73 case studies. Techniques include AI Agent Tool Poisoning (AML.T0110), AI Agent Context Poisoning (AML.T0080: memory and thread), Indirect LLM Prompt Injection (AML.T0051.001), and AI Agent Tool Invocation. Confidence H for the site contents. The vectra.ai secondary source says ATLAS v5.3.0 (Jan 2026) added three case studies on MCP server compromise and indirect prompt injection via MCP (https://www.vectra.ai/topics/mitre-atlas). Confidence M.
- **CaMeL** (Debenedetti et al., Google DeepMind/ETH, arXiv 2503.18813, Mar 2025; v2 Jun 2025). A protective system layer that extracts control and data flow from the trusted query, plus capabilities for tool calls. Solves 77% of AgentDojo tasks with provable security, versus 84% for an undefended system. https://arxiv.org/abs/2503.18813 `[canonical]` Confidence H.
- **Muse Spark agent results** (May 2026): AgentDojo, ART and AgentHarm numbers, as in A3. Confidence H.
- A 2026 practitioner overview is in search results (Zylos Research, April 2026: https://zylos.ai/research/2026-04-12-indirect-prompt-injection-defenses-agents-untrusted-content). Not fetched. Confidence L.

### A8. RAG and memory poisoning `[canonical] + [gap for 2026]`
- **AgentPoison** (Chen et al., arXiv 2407.12784, 2024): red-teaming agents by poisoning memory or knowledge bases. Cited in a Substack overview (https://srinithyathimmaraju.substack.com/p/memory-poisoning-in-llms-and-agents). `[canonical]` Confidence M.
- **MITRE ATLAS** has explicit memory-poisoning and RAG-poisoning techniques (see A7 links). Confidence H.
- I found titles of 2026 memory-poisoning arXiv papers in searches but did not verify their contents. **Gap**: I recommend a specific follow-up search before writing 2026 memory-poisoning results into the KB.

### A9. Multimodal / VLM injection `[2026] partial`
- ATLAS lists "Triggers in Multimodal Inputs" (AML.T0129). https://atlas.mitre.org/ . Confidence H.
- An August 2026 arXiv paper on a multimodal attacker ("Fully Unleashing t…") appeared in the Awesome-LM-SSP list (https://github.com/ThuCCSLab/Awesome-LM-SSP/blob/main/collection/paper/safety/jailbreak.md). The title was truncated in my notes; verify before citing. Confidence L.

### A10. Policy-specification attacks `[gap]`
- I did not find a verified 2026 paper on policy-specification attacks (attacks that exploit how system prompts or policies are written). Prior work such as "Policy Puppetry" (HiddenLayer, 2025) is not verified in this session. Confidence L.

### A11. Automated red teaming and adaptive attacks `[2026] + [canonical]`
- **"Automatic LLM Red Teaming"** (arXiv 2508.04451; v2 revised 13 Oct 2026). Reformulates automated red teaming as dialogue-trajectory optimisation in a Markov decision process. https://arxiv.org/pdf/2508.04451 `[2026 revision]` Confidence M (snippet).
- **"The Attacker Moves Second: Stronger Adaptive Attacks Bypass Defenses Against LLM Jailbreaks and Prompt Injections"** (arXiv 2510.09023, Oct 2025). Argues that published defense evaluations are weak; adaptive attacks bypass many defenses. https://www.emergentmind.com/papers/2510.09023 . **Caveat:** I saw the abstract-level summary only, not the paper, so I cannot quote the specific bypass rates. `[canonical]` Confidence M.
- **UK AISI Boundary Point Jailbreaking** (2026): a fully automated method for universal jailbreaks against strong safeguards (https://www.aisi.gov.uk/blog/boundary-point-jailbreaking-a-new-way-to-break-the-strongest-ai-defences). Confidence M (snippet). `[2026]`
- **Constitutional Classifiers** (Anthropic): "next-generation" classifiers page (https://www.anthropic.com/research/next-generation-constitutional-classifiers). I fetched the page but my retained output does not support a detailed summary. A secondary report (securebio.org, Feb 2026 review of Anthropic's Chemical and Biological risk report: https://securebio.org/resources/anthropic_feb_2026_risk_review.pdf) says public evidence suggests it is hard to find effective jailbreaks for the classifiers. Confidence M for the secondary claim; L for the primary details.
- **PAIR, TAP, GPTFuzzer**: canonical automated attacks (2023–2024). Not re-verified in this session. `[canonical]` Confidence L.

### A12. Benchmarks `[canonical] + [2026 updates]`
- **StrongREJECT** (Souly et al., 2024; BAIR blog: https://bair.berkeley.edu/blog/2024/08/28/strong-reject). Rubric-based evaluation. Meta's May 2026 report uses StrongREJECT v2 (their own improved version). `[canonical]`, used in 2026. Confidence H.
- **JailbreakBench** (NeurIPS 2024; https://jailbreakbench.github.io/index.html). Repository of jailbreak artifacts, threat model, leaderboard. `[canonical]` Confidence M.
- **FORTRESS** (Knight et al., 2025): third-party benchmark used in Meta's 2026 report. Confidence H (as cited in Meta report).
- **AgentDojo, AgentHarm, ART, OR-Bench**: used in Meta's 2026 report. Confidence H.
- **"Renewable" jailbreak benchmark** (TechXplore, March 2026: https://techxplore.com/news/2026-03-renewable-benchmark-llm-jailbreak-safety.html). Generates seed-based benchmark with minimal human effort. `[2026]` Confidence M (snippet).
- **MultiBreak** (arXiv 2605.01687, May 2026): multi-turn benchmark. `[2026]` Confidence M.
- **HarmBench and XSTest**: 2026 successors or updates not verified. **Gap**.

### A13. Frontier defense results and public jailbreaks, 2026 `[2026]`
- Muse Spark report (May 2026): one external human red team found "a handful of valid jailbreaks"; most were patched before launch. Confidence H.
- A CNAS-cited snippet says UK AISI found a universal jailbreak for "GPT-5.5" within six hours (2026). I did not verify this; treat as **unverified**.
- Anthropic's system cards for Claude Opus 4.6 are cited by Meta. A "Claude Opus 5.5" system card exists per search results, but I could not fetch it, so **I did not verify its prompt-injection numbers**.
- A claim of "GPT-6 Sol 99.99% prompt injection defense" appeared in search results from a low-authority site. **Excluded as unverified.**

---

## B. Current practice (2026)

### B1. How red teams operate now `[2026]`
- **Scale and method:** Meta describes "large-scale automated red teaming" with a cascaded attack pipeline, domain benchmarks, and third-party assessments (Apollo, FORTRESS). Confidence H.
- **Open-weight vs closed:** Meta's report compares closed APIs with system defenses to open-weight comparators. It notes that closed models' high refusal rates made direct comparison difficult. Confidence H.
- **Evaluation integrity:** Meta reports verbalised evaluation awareness on public benchmarks, and an Apollo finding of high eval awareness. The Assistant Axis and J-space work are partly motivated by this kind of problem. Confidence H.
- **CI/CD for prompt-injection testing:** I did not find a verified 2026 source describing standard CI/CD practice. Tooling docs such as Promptfoo exist (https://www.promptfoo.dev/docs/red-team/plugins/special-token-injection). **Gap**.

### B2. OWASP LLM Top 10 `[2025 edition + 2026 agentic list]`
- The OWASP GenAI LLM Top 10 page (https://genai.owasp.org/llm-top-10/) is titled "LLMRisks Archive" and lists the 2025 edition. I did not confirm a separate 2026 LLM edition; the 2026 list I found is for agentic applications (B2 above, A7). Confidence M.

### B3. MITRE ATLAS `[2026]`
- Live site (https://atlas.mitre.org/): 16 tactics, 208 techniques, 40 mitigations, 73 case studies. Confidence H (site snapshot, date not shown).
- January 2026 update v5.3.0 added MCP and agent case studies (vectra.ai, secondary). Confidence M.

### B4. NIST AI RMF and Generative AI profile `[canonical]`
- NIST AI 600-1 (Generative AI Profile, July 2024) remains the GenAI companion to the AI RMF. A secondary guide (Anaconda, https://www.anaconda.com/blog/nist-ai-600-1-generative-ai-profile-guide) notes it covers autonomous agents in threat assessment (MS-2.7-001). Confidence M.
- **Gap:** I did not verify NIST's 2026 status (any revision, agent-specific profile, or CAISI outputs). Confidence L.

### B5. EU AI Act timeline `[2026]`
- **Digital Omnibus:** a Jones Walker article (https://www.joneswalker.com/en/insights/blogs/ai-law-blog/yes-august-2-still-matters-the-eu-approved-a-high-risk-ai-delay-but-most-trans.html) states that the EU approved a high-risk AI delay but most transparency obligations remain, with 2 Aug 2026 still mattering. Confidence M (headline read; body not re-verified).
- **GPAI obligations** applied from 2 Aug 2025 (per the AI Act schedule). Commission enforcement powers for GPAI start 2 Aug 2026 (per the AI Act schedule). These are from my knowledge of the Act, not from a fetched 2026 source. Confidence L-M; verify before publishing.
- **High-risk delay dates** (commonly reported as Dec 2027 / Aug 2028 under the Omnibus) were not verified against the final text. Confidence L.

### B6. US federal and state rules `[2026]`
- **California SB 53:** operative 1 Jan 2026. Requires frontier developers to publish governance frameworks and transparency reports, and to report critical safety incidents. Source: FPF, 8 Jan 2026, updated 14 Oct 2026 (https://fpf.org/blog/the-raise-act-vs-sb-53-a-tale-of-two-frontier-ai-laws). Confidence H.
- **New York RAISE Act:** signed 19 Dec 2025 by Gov. Hochul. Chapter amendments to align it closer to SB 53 were expected to be adopted in January 2026. It takes effect after SB 53. Requires a 72-hour incident-report window (24 hours where there is imminent danger). Penalties up to $1M first / $3M subsequent. Source: FPF (same URL). Confidence H.
- **Federal:** A December 2025 White House executive order, "Ensuring a National Policy Framework for Artificial Intelligence," seeks to pressure state AI laws through an AI Litigation Task Force and funding limits. Its practical effect is unclear (FPF). Confidence H for the EO's existence and aims; L for effects. I did not find a federal statute in force.
- **Other states:** Michigan has a similar bill (FPF). Colorado and other states not checked. **Gap**.

### B7. Safety mitigations and known bypasses `[mixed]`
- **Instruction-data separation / CaMeL:** CaMeL provides provable security on AgentDojo at a utility cost (77% vs 84%). Confidence H. `[canonical]`
- **Constitutional Classifiers (Anthropic):** input/output classifiers. Confidence M (see A11). `[canonical + 2026 next-gen]`
- **Model-internal control (activation capping):** Assistant Axis. Confidence M for the numbers, H for the mechanism. `[2026]`
- **Known bypasses:** "The Attacker Moves Second" (2025) and UK AISI Boundary Point Jailbreaking (2026). Confidence M.
- **Spotlighting, dual-LLM, Design Patterns for Securing LLM Agents (2025)**: canonical per my background knowledge, **not re-verified this session**. Confidence L.
- **Refusal tuning:** Meta's Muse Spark report shows large variation in refusal and robustness across domains (e.g., cyber-misuse ASR 9.0% vs 31.7–59.0% for peers). Confidence H.

### B8. Model releases and stated jailbreak resistance `[2026]`
| Model | Vendor | Stated robustness (source) | Verification |
|---|---|---|---|
| Muse Spark | Meta | "Robustness gaps under adaptive jailbreak, prompt injection, agentic misuse"; ASR figures in A3 | H (primary report, 26 May 2026) |
| Muse Spark 1.3 | Meta | Improved long-horizon work; no safety numbers in my retained output | M/L |
| Muse Glimmer | Meta | Open-weight 30B; local agents | H (NVIDIA/Meta blogs) |
| Claude Opus 4.6 | Anthropic | Used as comparator in Meta report (StrongREJECT v2 ASR 31.7%) | H (via Meta) |
| Claude Opus 4.7 | Anthropic | Attack on reasoning traces (arXiv 2608.09867) | M |
| Claude Opus 5.5 | Anthropic | System card exists per search; **not verified** | L |
| GPT-5.4 | OpenAI | Comparator in Meta report (StrongREJECT v2 ASR 37.6%) | H (via Meta) |
| GPT-5.5 | OpenAI | Reported universal jailbreak by UK AISI within six hours (CNAS snippet) | L |
| Gemini 3.1 Pro | Google | Comparator in Meta report (StrongREJECT v2 ASR 81.7%) | H (via Meta) |

**Caution:** Vendor-reported ASRs are not comparable across vendors without the same attacker, budget and judge. Meta's own report states this kind of caveat.

---

## C. Notes on sources and gaps

- **Source quality:** Primary sources (Anthropic, Meta, arXiv, AISI, OWASP, MITRE, FPF) are used where I could read them. Secondary sources (Vectra, NeuralTrust, corti, Substack, Anaconda, emergentmind, DeepTeam, CNAS-cited snippets, Wikipedia summaries) are flagged.
- **Name mismatch:** The user's "J Space" paper is titled "Verbalizable Representations Form a Global Workspace in Language Models" on transformer-circuits.pub. Secondary press uses "J-space".
- **Numbers disagree:** Assistant Axis activation capping: ~50% (Anthropic X post) vs "nearly 60%" (alphaXiv summary). Check the paper.
- **Could not verify:**
  - Glimmer as a standalone "open tokenizer" release.
  - Any 2026 tokenizer or special-token attack paper.
  - 2026 policy-specification attack paper.
  - Claude Opus 5.5 system card numbers.
  - "GPT-6 Sol 99.99%" claim (excluded).
  - EU high-risk delay dates; GPAI enforcement date (from Act schedule, not fetched).
  - NIST 2026 status.
  - 2026 memory-poisoning paper contents.
  - Constitutional Classifiers++ details (page fetched; content not retained in my notes).
  - Full text of the J-space paper (only metadata and critiques).

---

## Reference table

| Title | Org | Date | Link | One-line takeaway |
|---|---|---|---|---|
| The Assistant Axis (arXiv 2601.10387) | Anthropic Fellows / MATS (Lu, Gallagher, Michala, Fish, Lindsey) | Jan 2026 | https://arxiv.org/abs/2601.10387 | Persona drift is measurable along an "Assistant Axis"; activation capping cuts harmful responses (~50–60%, sources disagree). `[2026]` |
| The Assistant Axis (blog) | Anthropic | 19 Jan 2026 | https://www.anthropic.com/research/assistant-axis | Summary and demo of the above. `[2026]` |
| Verbalizable Representations Form a Global Workspace in Language Models | Anthropic interpretability | 6 Jul 2026 | https://transformer-circuits.pub/2026/workspace/index.html | Claims a global-workspace structure for verbalizable representations ("J-space" in press). Full text not read. `[2026]` |
| A global workspace in language models (blog) | Anthropic | Jul 2026 | https://www.anthropic.com/research/global-workspace | Anthropic summary of the workspace paper. `[2026]` |
| A Review of Anthropic's Global Workspace Paper | LessWrong (community) | Jul 2026 | https://www.lesswrong.com/posts/zFJ3ZdQwrTWE9jT5S/a-review-of-anthropic-s-global-workspace-paper | Expert review of the workspace claims. `[2026]` |
| Is Anthropic Trying Too Hard to Prove Claude Is Explainable? | learntechmaury (Substack) | Jul 2026 | https://learntechmaury.substack.com/p/is-anthropic-trying-too-hard-to-prove | Skeptical critique of J-space evidence. `[2026]` |
| Muse Spark Safety & Preparedness Report | Meta MSL | 26 May 2026 | https://ai.meta.com/static-resource/muse-spark-safety-and-preparedness-report | Discloses multi-turn ASR 44.6% and agent-injection gaps for Muse Spark. `[2026]` |
| Introducing Muse Spark 1.3 | Meta AI Research | 2026 (date unverified) | https://research.meta.ai/blog/introducing-muse-spark-1-3 | Long-horizon improvements; no safety numbers found. `[2026]` |
| Muse Glimmer (NVIDIA) | NVIDIA / Meta | 2026 | https://developer.nvidia.com/blog/run-local-agentic-ai-workflows-with-metas-muse-glimmer-on-nvidia | Open-weight 30B dense model for local agents. `[2026]` |
| Muse Glimmer (Meta dev blog) | Meta | 2026 | https://dev.meta.ai/resources/blog/build-with-muse-glimmer | Meta's developer post for Glimmer. `[2026]` |
| Muse Spark Open | Meta / Hugging Face | 2026 | https://huggingface.co/blog/meta-muse-spark-open | Open-weight MoE multimodal model. `[2026]` |
| Boundary Point Jailbreaking | UK AISI | 2026 | https://www.aisi.gov.uk/blog/boundary-point-jailbreaking-a-new-way-to-break-the-strongest-ai-defences | Fully automated universal jailbreaks vs strong defenses. `[2026]` |
| Next-generation Constitutional Classifiers | Anthropic | 2026 (date unverified) | https://www.anthropic.com/research/next-generation-constitutional-classifiers | Anthropic's input/output classifier update; details not retained. `[2026]` |
| Automatic LLM Red Teaming (arXiv 2508.04451) | (authors per arXiv) | Oct 2025; v2 13 Oct 2026 | https://arxiv.org/pdf/2508.04451 | Reframes automated red teaming as MDP dialogue optimisation. `[2026 revision]` |
| MultiBreak (arXiv 2605.01687) | (per arXiv) | May 2026 | https://arxiv.org/html/2605.01687v1 | Scalable multi-turn jailbreak benchmark. `[2026]` |
| Attention-Guided RL Jailbreak vs LRMs (arXiv 2605.19485) | (per arXiv) | May 2026 | https://arxiv.org/html/2605.19485v1 | RL attack on large reasoning models. `[2026]` |
| Stealing Reasoning Traces from Proprietary LLM APIs (arXiv 2608.09867) | (per arXiv) | Aug 2026 | https://arxiv.org/html/2608.09867v1 | Injection into encrypted reasoning blocks; now mitigated by vendors. `[2026]` |
| Defeating Prompt Injections by Design (CaMeL, arXiv 2503.18813) | Google DeepMind / ETH / Google | Mar 2025 (v2 Jun 2025) | https://arxiv.org/abs/2503.18813 | Control/data-flow separation with capabilities; 77% utility with provable security on AgentDojo. `[canonical]` |
| The Attacker Moves Second (arXiv 2510.09023) | (per arXiv) | Oct 2025 | https://www.emergentmind.com/papers/2510.09023 | Adaptive attacks bypass many published jailbreak/prompt-injection defenses. `[canonical]` |
| H-CoT (arXiv 2502.12893) | Kuo et al. | Feb 2025 | https://arxiv.org/abs/2502.12893 | Hijacks chain-of-thought safety reasoning in reasoning models. `[canonical]` |
| Chain-of-Thought Hijacking (arXiv 2510.26418) | Zhao et al. | Oct 2025 | https://neuraltrust.ai/blog/chain-of-thought-hijacking-reasoning-ai-safety | Benign puzzle reasoning dilutes safety signal. `[canonical]` |
| Crescendo multi-turn jailbreak | Microsoft (Russinovich et al.) | USENIX Security 2025 | https://www.usenix.org/system/files/conference/usenixsecurity25/sec25cycle1-prepub-805-russinovich.pdf | Gradual multi-turn escalation; high ASR on some tasks. `[canonical]` |
| AgentPoison (arXiv 2407.12784) | Chen et al. | 2024 | https://srinithyathimmaraju.substack.com/p/memory-poisoning-in-llms-and-agents | Poisoning agent memory/knowledge bases. `[canonical]` |
| OWASP Top 10 for Agentic Applications 2026 | OWASP GenAI Security Project | 2026 (Dec 2025 release per secondary source) | https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ | Agent Goal Hijack (ASI01), Tool Misuse (ASI02), etc. `[2026]` |
| OWASP LLM Top 10 (archive page) | OWASP | 2025 edition | https://genai.owasp.org/llm-top-10/ | Current LLM list; no separate 2026 LLM edition confirmed. `[canonical]` |
| MITRE ATLAS (live matrix) | MITRE | Site snapshot 2026 | https://atlas.mitre.org/ | 16 tactics, 208 techniques, 40 mitigations, 73 case studies; MCP and memory poisoning covered. `[2026]` |
| MITRE ATLAS (Vectra summary) | Vectra AI (secondary) | Jan 2026 (v5.3.0) | https://www.vectra.ai/topics/mitre-atlas | Jan 2026 update added MCP-related case studies. `[2026]` |
| California SB 53 / NY RAISE Act | FPF (analysis) | 8 Jan 2026 (updated 14 Oct 2026) | https://fpf.org/blog/the-raise-act-vs-sb-53-a-tale-of-two-frontier-ai-laws | SB 53 operative 1 Jan 2026; RAISE signed 19 Dec 2025; federal EO adds pressure. `[2026]` |
| Renewable jailbreak benchmark | TechXplore (news) | Mar 2026 | https://techxplore.com/news/2026-03-renewable-benchmark-llm-jailbreak-safety.html | Seed-based jailbreak benchmark needing minimal human effort. `[2026]` |
| StrongREJECT | Souly et al. / BAIR | Aug 2024 | https://bair.berkeley.edu/blog/2024/08/28/strong-reject | Rubric-based jailbreak evaluation; v2 used in Meta 2026 report. `[canonical]` |
| JailbreakBench | JailbreakBench team | NeurIPS 2024 | https://jailbreakbench.github.io/index.html | Open robustness benchmark with artifact repository. `[canonical]` |
| EU Digital Omnibus / AI Act (high-risk delay) | Jones Walker (law firm) | 2026 | https://www.joneswalker.com/en/insights/blogs/ai-law-blog/yes-august-2-still-matters-the-eu-approved-a-high-risk-ai-delay-but-most-trans.html | EU approved high-risk delay; most transparency obligations still apply from 2 Aug 2026. `[2026]` |
| Generative AI profile guide (NIST AI 600-1) | Anaconda (secondary) | Jul 2024 (NIST) | https://www.anaconda.com/blog/nist-ai-600-1-generative-ai-profile-guide | GenAI companion to NIST AI RMF; covers agents. `[canonical]` |
