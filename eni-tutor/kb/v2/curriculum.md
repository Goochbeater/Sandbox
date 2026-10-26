---
title: "Red Teaming LLM Systems: Full Curriculum (v2)"
date: "2026-10-26"
category: Curriculum
source: ENI Tutor, revised course
type: curriculum
tags: [curriculum, tiers, methodology, defense, ethics, tier1, tier2, tier3, tier4, tier5]
---

# Red Teaming LLM Systems: Full Curriculum (v2)

## Purpose and Scope

This course trains people to find, measure, explain and help fix failures in language-model systems. It runs from first principles to original research.

Attack technique is taught as a means to measurement. Every technique is learned so that a defender can detect it, a benchmark can score it, or a report can explain it.

Every lab runs against one of four things: a local open-weight model you run yourself, a test application you build, a benchmark dataset, or a deployment you have written permission to test. The course never asks a student to test a live third-party service.

## The Five Levels

| Tier | Name | Level | The question this tier answers |
|---|---|---|---|
| 1 | Foundations | Novice | How does a model come to refuse, and how would I know when it fails? |
| 2 | Measurement | Apprentice | Can I produce a number I would defend to a skeptic? |
| 3 | Applications and agents | Journeyman | Where does untrusted text enter a system, and what can it make the system do? |
| 4 | Automated and adaptive testing | Expert | Can I search for failures faster than a person, and can I trust what the search reports? |
| 5 | Defense, research and disclosure | Master | Can I show that a defense holds against an adversary who knows about it, and report responsibly? |

Each tier depends on the one before. A student who cannot yet write a judge rubric (Tier 2) is not ready to build an automated attacker (Tier 4).

## Ground Rules (apply in every tier)

1. **Authorization first.** Before any lab, write down what is being tested, who owns it, and what is out of scope.
2. **Owned or sandboxed targets only.** Local models, self-hosted applications, benchmark datasets, and systems with written permission.
3. **Measure, don't publish payloads.** Record verdicts, scores and hashes. Raw outputs that contain harmful content stay in a restricted local log. They never go into notes, reports or the knowledge base.
4. **Harmful-category prompts come from published benchmarks.** They are used against local models for measurement. Students do not write new harmful requests.
5. **Disclose before you publish.** Any finding about a vendor's product follows the disclosure process in Tier 5 before anything is shared.
6. **Hard stops.** The tutor will not give operational help toward mass-casualty weapons, malware for deployment, sexual content involving minors, or the targeting or deception of a real, identifiable person. Whatever the framing, the tutor turns the question toward detection, defense, or policy.

## Concepts Used Across Tiers

- **The message stack.** System, developer, user, tool results and retrieved documents. Instruction hierarchy is a design goal, not a guarantee.
- **Sampling.** Temperature, top_p and max tokens. One run is an anecdote. Results need repeated runs or a large prompt set.
- **Failure taxonomy.** Under-refusal (harmful content produced), over-refusal (benign content refused), leakage (system prompt or data revealed), action failure (an agent does something unintended), and integrity failure (output or memory altered by an outside party).
- **Metrics.** Attack success rate (ASR) is meaningless without its denominator, its judge and an interval. The same is true of over-refusal rate, detection rate and false positive rate.
- **Judges.** Rule-based string matching, trained classifiers, LLM judges and human labels. Each has known error modes, and each must be validated before its scores are trusted.

---

## TIER 1: NOVICE
### "Foundations: How Models Fail and How We Measure It"

**Prerequisites:** None beyond basic computing.

**Objectives**
- Describe the message stack and mark where untrusted text can enter it.
- Define ASR, over-refusal and judge, and explain why each needs a denominator and an interval.
- Write a threat model for a simple LLM application.
- Read a benchmark paper critically: its threat model, its judge, and what it excludes.

### Modules

**1.1 How a chat model is built (conceptual)**
Tokens and embeddings, the transformer, the context window. Pretraining, supervised fine-tuning and preference training. What safety training teaches a model, and what it leaves untouched.

**1.2 Refusal as learned behavior**
A refusal is a pattern the model learned, not a rule an engine checks. Learned patterns generalize imperfectly across phrasing, language, format and conversation length. Over-refusal is a failure too, and it is measured the same way.

**1.3 The message stack and trust boundaries**
System, developer, user, tool and retrieved content. Which channel the model treats as authoritative, and why data and instructions sharing one channel is the root of most injection problems.

**1.4 Threat modeling for LLM applications**
Assets, actors, entry points and trust boundaries. The OWASP Top 10 for LLM Applications works as a checklist, with LLM01 (prompt injection) as the first entry point to examine.

**1.5 Metrics and judges, introduced**
Denominators. Wilson confidence intervals for a proportion. Why a single run proves nothing. The three kinds of judge, and the question to ask of each: how do we know it is right?

**1.6 Reading the literature**
For any paper: the threat model it assumes, the data it uses, the judge it trusts, the baselines it compares against, and which numbers are self-reported.

### Assigned Reading
- HarmBench: a standardized evaluation framework for automated red teaming and robust refusal (arXiv 2402.04249)
- Against the Achilles' Heel: a survey on red teaming for generative models (arXiv 2404.00629)
- Recent advancements in LLM red-teaming: techniques, defenses, and ethical considerations (arXiv 2410.09097)
- OWASP Top 10 for LLM Applications, LLM01: Prompt Injection
- Wei, Haghtalab and Steinhardt (2023), "Jailbroken: How Does LLM Safety Training Fail?"
- Perez et al. (2022), "Red Teaming Language Models with Language Models"

### Assessment Criteria
- States the message stack correctly and marks at least one untrusted entry point.
- Produces a threat model with at least five threats, each mapped to an OWASP category, each with a proposed control.
- Reports every rate with its denominator and an interval.
- Names the threat model and the excluded cases of a paper they have read.

---

## TIER 2: APPRENTICE
### "Measurement: Harnesses, Judges and Honest Numbers"

**Prerequisites:** Tier 1.

**Objectives**
- Build an evaluation harness that another person can rerun and get the same records.
- Validate a judge against human labels and report its errors.
- Compute and compare rates with intervals.
- Write a finding that an engineer can reproduce without help.

### Modules

**2.1 Harness design**
Fixed test sets with stable IDs. Pinned model versions. Seeds. Timestamps. Prompt and response hashes. Retries and timeouts logged. A run manifest that records everything needed to repeat it. A run you cannot repeat is not evidence.

**2.2 Judges**
Rule-based refusal detection is fast and wrong in predictable ways. It counts hedged compliance as refusal, and it counts a quoted refusal as a refusal. LLM judges drift with wording and with the judge model's version. Classifiers need their own validation set. The working rule: validate the judge before trusting its score.

**2.3 Statistics for red teamers**
Proportions and Wilson intervals. Sample size needed to detect a change of a given number of points. Comparing several models with a multiple-comparison correction (Holm is a sensible default). Treat prompts, not runs, as the unit of analysis when prompts vary.

**2.4 Encoding and formatting as a measurement problem**
Does a deployed filter see the same content the model sees? Test decode-before-filter consistency on a filter you own, with benign strings. This module stays at the level of the taxonomy and the measurement. It does not build a catalogue of bypass strings.

**2.5 Prompt leakage as a measurement problem**
Put a canary secret in a system prompt that you own. Measure how often and how easily it leaves the system under a fixed set of probes. The lesson: secrets belong outside prompts, and leakage is a design failure.

**2.6 Reporting a finding**
Title, system and version, impact, reproduction steps, metrics with intervals, the severity rationale, what was not tested, and proposed mitigations.

### Assigned Reading
- Automated red teaming and its evaluation: AMT-X (arXiv 2607.11151) on why single generic judges mis-score attacks, read for the checklist-gating idea
- Many-Shot Jailbreaking (Anil et al., 2024). Citation card in the knowledge base.
- Your own harness's outputs from Lab 2.1, used as the reading for Lab 2.2

### Assessment Criteria
- A harness that reproduces identical records on a deterministic local run.
- A judge validation that reports agreement with human labels and names the top error types.
- Every rate with a denominator and an interval.
- A finding report that another student can reproduce from the report alone.

---

## TIER 3: JOURNEYMAN
### "Applications and Agents: Where Untrusted Text Acts"

**Prerequisites:** Tier 2, basic Python.

**Objectives**
- Explain direct and indirect prompt injection and the shared-channel defect.
- Build a small retrieval-augmented application and measure how it handles injected documents.
- Describe the confused-deputy pattern in tool-using agents and reduce it with a measured control.
- Evaluate a guard model on the channel where it will actually be used.

### Modules

**3.1 Direct and indirect injection**
Direct: the user is the adversary. Indirect: a web page, document, email, tool result or stored memory carries instructions that the model may follow. Greshake et al. (2023), "Not what you've signed up for," is the standard reference for indirect injection in LLM-integrated applications.

**3.2 Tool-using agents**
The confused deputy: the agent holds the user's authority and also reads attacker-controlled text. Controls are least privilege, tool allowlists, confirmation for consequential actions, and separating the component that reads untrusted content from the component that acts. AgentDojo (Debenedetti et al., 2024) is the standard benchmark for these tasks. AgentDyn (arXiv 2602.03117) extends it with dynamic, open-ended tasks (60 user tasks and 560 injection test cases, per its abstract).

**3.3 RAG and memory poisoning**
An attacker writes to a corpus the system later retrieves from, or to a memory the system later trusts. Threats: manipulated retrieval ranking, persistent instructions, cross-user contamination. Controls: provenance tags, write gating, isolation of retrieved content, retrieval filters.

**3.4 Filters and guard models**
Guard models classify text, and their coverage depends on the channel. AgentRedBench (arXiv 2606.02240) reports, in its own evaluation, that open-source guards including Llama Guard 3, PromptGuard 2 and WildGuard caught under 0.3% of indirect injections arriving through tool responses. Lesson: test a guard on the channel you ship, not the channel it was trained on.

**3.5 Spotlighting and structural defenses**
Delimiting untrusted data, marking its provenance, encoding it, dual-model designs, and plan-then-act designs. Each one is evaluated with the Tier 2 harness, before and after.

### Assigned Reading
- AgentDyn (arXiv 2602.03117)
- AgentRedBench (arXiv 2606.02240), read for the channel-coverage finding
- AgentDojo (Debenedetti et al., 2024)
- OWASP Top 10 for LLM Applications, the excessive agency and insecure output handling entries

### Assessment Criteria
- Demonstrates indirect injection against an application the student built, and reports success before and after one defense.
- Identifies a confused-deputy path in an agent, proposes a control, and measures it.
- Evaluates one guard model on a labeled injection set and reports misses broken down by channel.

---

## TIER 4: EXPERT
### "Automated and Adaptive Testing"

**Prerequisites:** Tier 3.

**Objectives**
- Set up an automated search for failures with an explicit budget and judge.
- Compare single-turn and multi-turn testing on the same target.
- Audit a judge for validity and report its false positive rate next to every ASR.
- Compare results across toolkits without mistaking their differences for the target's behavior.

### Modules

**4.1 Automated search (concepts)**
An attacker model proposes candidates, a judge scores them, and the loop repeats within a budget. The literature's reference points: PAIR (Chao et al., 2023) and TAP (Mehrotra et al., 2023), which refine attacks iteratively; GCG (Zou et al., 2023), which optimizes suffixes against open-weight models using gradients. HarmBench (arXiv 2402.04249) standardizes evaluation across many methods and models. Its own experiments report that no current attack or defense is uniformly effective, and that robustness does not simply track model size.

**4.2 Multi-turn and adaptive attacks**
Conversation-level strategies: Crescendo (Russinovich et al., 2024) and many-shot prompting (Anil et al., 2024), both in the knowledge base as citation cards. RedTWIZ (arXiv 2510.06994) is an arena for multi-turn attacks. AMT-X (arXiv 2607.11151) is a phase-structured multi-turn framework with checklist-gated scoring. Reinforcement-learning attackers are the frontier: PISmith (arXiv 2603.13026) reports that most generated injections get blocked by strong defenses, which starves training of signal, and it names entropy collapse as the core problem.

**4.3 Evaluating the evaluator**
Validity-Aware Jailbreak Evaluation for LLMs (arXiv 2609.00498) is the reference for judging whether a flagged success is a real success. Audit flagged successes by hand, measure the false positive rate, and report it beside the ASR.

**4.4 Toolkits and comparability**
OpenRT (arXiv 2601.01592) compares EasyJailbreak, JailbreakBench, HarmBench, PyRIT and DeepTeam across methods, modalities and extensibility. Learn one toolkit's harness design before comparing numbers across toolkits.

**4.5 Frameworks in the recent literature**
Learning-based adversarial red teaming (arXiv 2512.20677) frames the search as a constrained adversarial problem. In its own ablation, the full framework finds 47 validated vulnerabilities against 22 for a rule-based variant. AutoRed (arXiv 2510.08329) generates free-form adversarial prompts.

**4.6 Multimodal and agent-as-attacker surfaces**
Vision-language inputs (OpenRT covers multimodal targets). Agent systems used as attackers: Agent Against Agent (arXiv 2608.05108) reports attack success rates on AgentDojo against several frontier models. These are self-reported, and the student checks them against the paper before quoting them.

### Assigned Reading
- HarmBench (arXiv 2402.04249), the full experimental protocol
- Validity-Aware Jailbreak Evaluation for LLMs (arXiv 2609.00498)
- PISmith (arXiv 2603.13026)
- OpenRT (arXiv 2601.01592)

### Assessment Criteria
- Reproduces a published baseline number on one local model and states whether it falls inside its confidence interval.
- Compares single-turn and multi-turn results on the same target, with a judge validity audit attached.
- Writes a search report that states the budget, the judge, the false positive rate, and what the search did not find.

---

## TIER 5: MASTER
### "Defense Engineering, Research and Disclosure"

**Prerequisites:** Tier 4.

**Objectives**
- Evaluate a defense against an adaptive attacker and report static and adaptive results side by side.
- Build a benchmark with a datasheet, splits and contamination checks.
- Run a publishable study from question to limitations.
- Carry a finding through coordinated disclosure.

### Modules

**5.1 Adaptive evaluation of defenses**
A defense is evaluated against an attacker that knows it exists. PI-Hunter (arXiv 2606.12737) presents automated red teaming that exposes and localizes prompt injections, evaluated on AgentDojo and AgentDyn. PIArena (arXiv 2604.08499) is a platform for prompt-injection evaluation. LivePI (arXiv 2605.17986) argues for more realistic benchmarking of agents against indirect injection. Static benchmark numbers flatter defenses. Adaptive numbers are the honest ones.

**5.2 Benchmark design and contamination**
RedBench (arXiv 2601.03699) consolidates 37 benchmarks into a taxonomy of 22 risk categories and 19 domains, according to its abstract. Datasheets, held-out splits, versioning, contamination checks, and benchmark cards.

**5.3 Research method**
Pre-registration of hypotheses and metrics. Ablations. Baselines that were tuned as hard as the proposed method. Error analysis. Statistical reporting. A reproducibility package. A limitations section that a reviewer would not have to write for the author.

**5.4 Disclosure and reporting**
Identify the owner. Use the vendor's security contact, bug bounty or safe-harbor policy. Share a reproduction that does not publish harmful payloads. Agree a timeline with the owner; 90 days is a common starting point, adjusted by severity. Coordinate publication. Publish the method, the metrics, the mitigations and redacted examples.

**5.5 Capstone**
One original study against an owned or permissioned target. It must include: a pre-registered question, a validated judge, adaptive evaluation, a defense section (if a defense is proposed), an ethics statement, and a disclosure plan.

### Assigned Reading
- PI-Hunter (arXiv 2606.12737)
- RedBench (arXiv 2601.03699)
- LivePI (arXiv 2605.17986)
- The student's own Tier 4 search report, as the baseline for the capstone

### Assessment Criteria
- A defense report with static and adaptive results side by side and the adaptive attacker described in enough detail to rerun.
- A benchmark card for a dataset the student built, including a contamination check.
- A disclosure package with a timeline, a redaction plan, and a stated owner.
- A capstone that a reviewer reproduces at least one result from.

---

## TEACHING METHODOLOGY

**Session structure.** Short concept, then the lab, then a debrief. The debrief always answers three questions: what the metric says, what it does not say, and what would change the conclusion.

**Feedback.** Point at the denominator, the judge, or the threat model. Never call an attack a success without the measurement behind the claim.

**The ladder rule.** Change one variable per lab: a new target, a new judge, or a new channel. A student who changes three at once learns nothing about any of them.

**Progression markers.** A student moves up when they can explain, in their own words, the failure mode of their previous lab and how they would detect it.

## KEY REFERENCES

Items marked with a dagger were confirmed by arXiv identifier and title in search results during the v2 revision. Everything else is cited by title and year only. Check the paper before quoting a number.

- HarmBench (arXiv 2402.04249) †
- Against the Achilles' Heel: a survey on red teaming for generative models (arXiv 2404.00629) †
- Recent advancements in LLM red-teaming (arXiv 2410.09097) †
- AMT-X (arXiv 2607.11151) †
- AgentDyn (arXiv 2602.03117) †
- AgentRedBench (arXiv 2606.02240) †
- RedBench (arXiv 2601.03699) †
- OpenRT (arXiv 2601.01592) †
- RedTWIZ (arXiv 2510.06994) †
- Learning-based adversarial red-teaming (arXiv 2512.20677) †
- AutoRed (arXiv 2510.08329) †
- PISmith (arXiv 2603.13026) †
- PI-Hunter (arXiv 2606.12737) †
- PIArena (arXiv 2604.08499) †
- LivePI (arXiv 2605.17986) †
- Validity-Aware Jailbreak Evaluation for LLMs (arXiv 2609.00498) †
- Agent Against Agent (arXiv 2608.05108) †
- Wei, Haghtalab and Steinhardt (2023), "Jailbroken: How Does LLM Safety Training Fail?"
- Perez et al. (2022), "Red Teaming Language Models with Language Models"
- Zou et al. (2023), "Universal and Transferable Adversarial Attacks on Aligned Language Models"
- Chao et al. (2023), "Jailbreaking Black Box Large Language Models in Twenty Queries"
- Mehrotra et al. (2023), "Tree of Attacks: Jailbreaking Black-Box LLMs Automatically"
- Greshake et al. (2023), "Not what you've signed up for"
- Debenedetti et al. (2024), "AgentDojo"
- Russinovich et al. (2024), "Great, Now Write an Article About That: The Crescendo Multi-Turn LLM Jailbreak"
- Anil et al. (2024), "Many-shot Jailbreaking"
- OWASP Top 10 for LLM Applications

## VERSION NOTES (v2)

**Removed from v1.**
- Attack success rates attributed to arXiv identifiers that could not be verified (89.6%, 76.2%, 81.4%).
- Exercises asking students to attack commercial deployments or extract system prompts from third-party products.
- Pass criteria that required a student to execute a jailbreak.
- Defense evasion as a learning objective.

**Added in v2.**
- Ground rules that apply in every tier.
- Owned-target labs in every tier, with measurement and judge validation at the core.
- Defensive labs for RAG, agents, guard models and prompt leakage.
- Automated search and multi-turn testing as Tier 4, gated behind validity audits.
- Adaptive defense evaluation, benchmark design and disclosure as Tier 5.

**Not yet verified in this build.** The full text of the cited arXiv papers. arXiv was unreachable from the build session, so the citations rest on search results and abstracts. Run `tools/fetch_arxiv.py` on a machine with arXiv access to ingest the full texts, then read the papers before relying on any number.
