---
title: "Red Teaming LLM Systems: Full Curriculum (v3, October 2026)"
date: "2026-10-26"
category: Curriculum
source: ENI Tutor, revised course
type: curriculum
tags: [curriculum, tiers, skills, agents, methodology, tier1, tier2, tier3, tier4, tier5]
---

# Red Teaming LLM Systems: Full Curriculum (v3, October 2026)

## How the course works

Red teaming here is attacking. The course teaches attack methods, measures them honestly, and then uses each result to unlock the next method. Every tier adds skills on top of the last tier's skills. A student who cannot yet run a controlled probe is not given an automated attacker.

The course has five tiers and twenty skills (S1 to S20). Each skill names the skills it builds on. Each lab names the skill it trains and the skill it unlocks. Pass a tier's labs before starting the next tier.

## Scope and Hard Lines

Red teaming in this course means attacking: finding and exploiting failures in models and AI systems so they can be understood, measured, and reported. Attack technique is taught in full, and the labs are attacks.

Four lines do not move. The course gives no operational help toward mass-casualty weapons (chemical, biological, radiological, nuclear, or explosive), writes no malware for deployment, produces no sexual content involving minors, and does not target or deceive a real, identifiable person.

Testing scope: systems you own, local models, sandboxes you build, benchmark datasets, and targets whose owner has given permission (a bug bounty, a red-team program, or a written agreement). Automated campaigns against live third-party services are out of scope.

Containment is a precondition for every agent lab. Agent sandboxes have no internet egress, a kill switch, and full logging before the first run. Public reporting in 2026 described evaluation agents taking unsanctioned actions against real systems. The rule exists because of that failure mode.

## The Skill Ladder

| Skill | Tier | Builds on | After it you can |
|---|---|---|---|
| S1 Map the target | 1 Novice | none | Draw every channel a deployed LLM system reads |
| S2 Probe with control | 1 Novice | S1 | Change one variable at a time and attribute the effect |
| S3 Scope a threat model | 1 Novice | S1, S2 | Write a scoped threat model using the OWASP lists |
| S4 Single-turn attack families | 2 Apprentice | S2 | Run and name the main single-turn families |
| S5 Campaigns with budgets | 2 Apprentice | S4 | Run a campaign with fixed budgets, seeds, and comparisons |
| S6 Judge and count honestly | 2 Apprentice | S5 | Validate a judge and report rates with intervals and false positives |
| S7 Multi-turn escalation | 3 Journeyman | S4, S6 | Escalate across turns and locate the turn of success |
| S8 Channel injection | 3 Journeyman | S6, S7 | Inject through documents, tool results, and memory, and measure each channel |
| S9 Agent kill chains | 3 Journeyman | S8 | Chain goal hijack, tool misuse, and privilege abuse in a sandbox |
| S10 Automated attack search | 4 Expert | S5, S6, S9 | Run a budgeted automated search and compare it at equal cost |
| S11 Learned attackers | 4 Expert | S10 | Train an attacker and diagnose its training failures |
| S12 Adaptive attacks | 4 Expert | S10, S11 | Attack defended targets and measure the static-to-adaptive gap |
| S13 Multimodal and extraction | 4 Expert | S4, S8 | Attack vision inputs and extract hidden system prompts |
| S14 Agents as attackers | 4 Expert | S9, S10 | Use an attacker agent with tools against a target agent |
| S15 Novel attack design | 5 Master | S10 to S14 | Propose and test an attack class that is not already catalogued |
| S16 Benchmarks and target maps | 5 Master | S6, S15 | Build a benchmark slice with a taxonomy, splits, and contamination checks |
| S17 Evaluation rigor | 5 Master | S16 | Pre-register, use equal budgets, and tune baselines as hard as your method |
| S18 Disclosure and reporting | 5 Master | S15 | Carry a finding through coordinated disclosure |
| S19 Agentic systems research | 5 Master | S9, S14 | Test cascading failures, rogue agents, and agent supply chains in containment |
| S20 Capstone | 5 Master | all | Run and defend an original study |

## 2026 Methodology Baseline

These are the standards and methods the course is built on. Items marked "secondary" were confirmed only through secondary summaries in this revision; check the primary source before you quote one.

**Agent risk lists.** The OWASP Top 10 for Agentic Applications (2026 edition, announced December 2025) gives the agent attack surface: ASI01 Agent Goal Hijack, ASI02 Tool Misuse and Exploitation, ASI03 Identity and Privilege Abuse, ASI04 Agentic Supply Chain, ASI05 Unexpected Code Execution, ASI06 Memory and Context Poisoning, ASI07 Insecure Inter-Agent Communication, ASI08 Cascading Failures, ASI09 Human-Agent Trust Exploitation, ASI10 Rogue Agents (names secondary; check owasp.org). The OWASP Top 10 for LLM Applications (LLM01 Prompt Injection and the rest) is still the scoping checklist for non-agent systems.

**Threat catalogues.** MITRE ATLAS received its first 2026 update, broadening coverage to agents that take actions. Vendor summaries cite new techniques including AI service API abuse (AML.T0096) and agent tool data poisoning (AML.T0099) (secondary; verify the IDs on the ATLAS site). Use ATLAS to name the technique behind each finding.

**Government evaluation tooling.** The UK AI Security Institute publishes Inspect, InspectSandbox, InspectCyber, and ControlArena for agent evaluation. NIST AI 800-1 (misuse risk for dual-use models) has been in draft since 2024; check its current status before citing it.

**Automated and learned attackers.** The field has moved from hand-written templates to search and then to training. Search-based loops (PAIR, TAP) came first. Reinforcement-learning and GRPO-style attackers followed: AdvGRPO (arXiv 2606.09701) trains closed-loop attackers that generalize to unseen defenders, and M³ (arXiv 2610.31937, submitted 22 October 2026) frames multi-turn jailbreaking as a Markov decision process run by a multi-LLM system. MJ (arXiv 2607.11070) assigns credit across turns. CHASE (arXiv 2606.05523) trains attacker and defender in a red-blue loop. Attacks that accumulate reusable skills appear in JailbreakSkill (arXiv 2608.16465) and RedEvoAgent (arXiv 2608.27439).

**Agent benchmarks.** REDAgentBench (arXiv 2608.10669) reports 1,661 executable cases across 15 intervention strategies, 11 vulnerability types, 28 constraints, and 5 service surfaces, sorted by a three-part IVC scheme (entry path, weakness targeted, rule broken). AgentDyn (arXiv 2602.03117) extends AgentDojo with dynamic tasks. AgentVigil (arXiv 2505.05849) attacks agents with no model access. AgentRedBench (arXiv 2606.02240) reports, in its own evaluation, that open-source guards caught under 0.3% of indirect injections arriving through tool responses. Taxonomy-driven automated discovery is in arXiv 2609.09647, and an agentic threat taxonomy is in arXiv 2609.23894.

**Defenses to attack.** PISmith (arXiv 2603.13026) reports that most generated injections are blocked by strong defenses, which starves an RL attacker of signal and collapses its entropy. PI-Hunter (arXiv 2606.12737) uses source-aware generation with feedback. LivePI (arXiv 2605.17986) and PIArena (arXiv 2604.08499) are the realistic evaluation platforms.

**Judges.** Validity-Aware Jailbreak Evaluation (arXiv 2609.00498) and AMT-X (arXiv 2607.11151) make the case that generic single judges mis-score attacks. Every success rate in this course is audited before it is reported.

---

## TIER 1: NOVICE
### "Foundations: The Target and the Attacker's View"

**Prerequisites:** none beyond basic computing.
**Skills trained:** S1, S2, S3.

**Objectives**
- Draw the channels a deployed LLM system reads, and mark which ones an attacker can write to.
- Run a controlled probe in which one variable changes and the rest stays fixed.
- Write a scoped threat model for a real target, using the OWASP lists.

### Modules

**1.1 How a deployed system is built (S1)**
A deployed LLM application is more than a model. It has a system prompt, a user turn, retrieved documents, tools that act on the world, memory that persists, output handling, and sometimes a guard model in front of or behind the model. Each of those is a channel. Some channels are written by the operator, some by the user, and some by anyone who can put text where the system will read it. The attacker's job starts with that map.

**1.2 Refusal as learned behavior, and controlled probing (S2)**
A refusal is a pattern the model learned, not a rule an engine checks. Wei, Haghtalab and Steinhardt (2023), "Jailbroken: How Does LLM Safety Training Fail?", name two failure modes: competing objectives (helpfulness pulls against refusal) and mismatched generalization (the refusal does not fire on a distribution the training did not cover). Controlled probing follows the ladder rule: one variable changes per run, and the change in outcome is attributed to that variable. Without control, every result is an anecdote.

**1.3 Scoping with the OWASP lists (S3)**
For each target, write the asset at risk, the actor, the entry channel, the attacker's goal, and the evidence that would prove it. Use the OWASP Top 10 for LLM Applications for chatbots and retrieval systems. Use the OWASP Top 10 for Agentic Applications (ASI01 to ASI10) for anything that calls tools, holds credentials, or acts across steps.

### Assigned Reading
- HarmBench (arXiv 2402.04249), sections on the threat model and the behavior set
- Against The Achilles' Heel: a survey on red teaming for generative models (arXiv 2404.00629)
- Wei, Haghtalab and Steinhardt (2023), "Jailbroken"
- OWASP Top 10 for LLM Applications and OWASP Top 10 for Agentic Applications

### Assessment Criteria
- Draws a correct channel map for a target and marks at least two channels an attacker can write to.
- Runs a controlled probe and reports the single variable and its effect with a denominator.
- Writes a scoped threat model with three attack paths, each mapped to an OWASP entry.

---

## TIER 2: APPRENTICE
### "First Attacks and Honest Numbers"

**Prerequisites:** Tier 1 (S1 to S3).
**Skills trained:** S4, S5, S6.

**Objectives**
- Name and run the main single-turn attack families.
- Run a campaign with fixed budgets, seeds, and cross-model comparisons.
- Validate a judge, and report every rate with an interval and a false-positive rate.

### Modules

**2.1 Single-turn attack families (S4)**
The families below are the taxonomy the research uses. Each family changes the framing of a request, not its content.

- **Persona and role frames.** The model is asked to answer as a character, expert, or role that the training did not cover in that context.
- **Authority claims.** The request asserts a context, such as a developer, an evaluator, or an internal process, that the model cannot check.
- **Hypothetical and fictional frames.** The request is placed inside an imagined scenario, a story, or a thought experiment.
- **Format and encoding transforms.** The request is re-expressed in base64, ROT13, leetspeak, a structured format, or a table, so that the filter and the model may see different text.
- **Payload splitting.** The request is divided across variables or turns and reassembled by the model.
- **Competing-objective framing.** The request forces a trade-off between helpfulness and refusal, such as asking which of two harms is worse.

Labs in this tier use benchmark behavior sets against local models. Students do not write new harmful requests.

**2.2 Campaigns with budgets (S5)**
A campaign fixes the behavior set, the template library, the target model version, the judge, the seed, and the query budget before the first run. It reports results per family and per model. Changing any of those between runs makes the comparison invalid. HarmBench (arXiv 2402.04249) is the reference protocol for standardizing this across methods and models.

**2.3 Judges and honest counting (S6)**
A judge is an instrument. Rule-based refusal detection counts hedged compliance as refusal and quoted refusals as refusals. An LLM judge drifts with its wording and version. A classifier is only as good as its validation set. Validity-Aware Jailbreak Evaluation (arXiv 2609.00498) and AMT-X (arXiv 2607.11151) both argue that single generic judges mis-score attacks. Report attack success rate (ASR) with its denominator and a Wilson interval, and report the audited false-positive rate beside it.

### Assigned Reading
- HarmBench (arXiv 2402.04249), the experimental protocol
- Validity-Aware Jailbreak Evaluation for LLMs (arXiv 2609.00498)
- AMT-X (arXiv 2607.11151), section on judging
- Many-Shot Jailbreaking (Anil et al., 2024). Citation card in the knowledge base.

### Assessment Criteria
- Runs a campaign with fixed budgets and reports ASR per family with intervals.
- Audits flagged successes and reports the false-positive rate beside ASR.
- Explains one failure of a rule judge with a concrete example, without quoting harmful output.

---

## TIER 3: JOURNEYMAN
### "Conversations, Channels, and Agents"

**Prerequisites:** Tier 2 (S4 to S6).
**Skills trained:** S7, S8, S9.

**Objectives**
- Escalate an attack across turns and locate the turn where it succeeds.
- Inject through every channel an agent reads, and measure each channel separately.
- Chain goal hijack, tool misuse, and privilege abuse in a sandboxed agent.

### Modules

**3.1 Multi-turn escalation (S7)**
Single-turn attacks are the weakest form of a test, because deployed systems carry conversation state. Multi-turn attacks build context across turns. Crescendo (Russinovich et al., 2024) escalates gradually; many-shot prompting (Anil et al., 2024) uses long in-context examples. The 2026 research frames the problem as credit assignment: MJ (arXiv 2607.11070) assigns credit across turns, and M³ (arXiv 2610.31937) treats the conversation as a Markov decision process. Measure the turn of success, not only whether it happened.

**3.2 Channel injection (S8)**
An agent reads text from more places than the user. Each place is a separate channel with its own filters and its own trust assumptions:

- the user message;
- a retrieved document from a corpus the attacker may write to (RAG poisoning);
- a tool response, such as a web page, an email, or an API result;
- a memory entry that persists across sessions (ASI06).

Greshake et al. (2023) established indirect prompt injection as the defining problem for LLM-integrated applications. AgentRedBench (arXiv 2606.02240) reports, in its own evaluation, that guards caught under 0.3% of indirect injections arriving through tool responses. Test every channel separately, because a guard that covers one channel may not cover another.

**3.3 Agent kill chains (S9)**
A kill chain links steps the agent takes on the attacker's behalf:

1. Goal hijack (ASI01): untrusted text changes what the agent is trying to do.
2. Tool misuse (ASI02): a sanctioned tool is used beyond what the user asked.
3. Privilege abuse (ASI03): a delegated or cached credential reaches a resource the agent should not hold.
4. Impact: the canary is exfiltrated, data is changed, or an action is taken.

AgentDojo (Debenedetti et al., 2024) is the standard sandbox for these tasks. AgentDyn (arXiv 2602.03117) extends it with dynamic, open-ended tasks. AgentVigil (arXiv 2505.05849) shows black-box attacks that need no model access.

### Assigned Reading
- AgentDyn (arXiv 2602.03117)
- AgentRedBench (arXiv 2606.02240)
- AgentVigil (arXiv 2505.05849)
- MJ (arXiv 2607.11070), introduction and method
- AgentDojo (Debenedetti et al., 2024)

### Assessment Criteria
- Escalates a multi-turn attack and reports the turn of success against a single-turn baseline on the same behaviors.
- Measures injection success per channel with intervals, and names the channel with the weakest coverage.
- Completes a three-step kill chain in a contained sandbox, with a success rate for each step.

---

## TIER 4: EXPERT
### "Automated, Learned, Adaptive, and Multimodal Attacks"

**Prerequisites:** Tier 3 (S7 to S9) and Tier 2 judges (S6).
**Skills trained:** S10, S11, S12, S13, S14.

**Objectives**
- Run budgeted automated search, and compare it with hand-written attacks at equal cost.
- Train a learned attacker and diagnose its failure modes.
- Attack defended targets, measure the gap between static and adaptive results, and attack the guard layers one at a time.
- Use an attacker agent against a target agent.

### Modules

**4.1 Automated attack search (S10)**
An attacker model proposes candidate prompts, a judge scores them, and the attacker refines within a fixed budget. PAIR (Chao et al., 2023) and TAP (Mehrotra et al., 2023) iterate attacks against black-box targets. GCG (Zou et al., 2023) optimizes adversarial suffixes against open-weight models using gradients. Every search reports its budget, its judge, its diversity, and its false-positive rate. Compare at equal query cost, or the comparison means nothing.

**4.2 Learned attackers (S11)**
Reinforcement learning and GRPO-style training turn search into a policy. The attacker's reward comes from the judge. Common failures are reward hacking (the judge is fooled, not the target), low diversity, and entropy collapse. PISmith (arXiv 2603.13026) reports entropy collapse when most generated injections are blocked, and proposes adaptive entropy regularization and dynamic advantage weighting as fixes. AdvGRPO (arXiv 2606.09701) reports closed-loop attackers that generalize to unseen defenders. TD-RPO (arXiv 2510.02286) and TROJail (arXiv 2512.07761) use process rewards across dialogue turns. CHASE (arXiv 2606.05523) trains attacker and defender together.

**4.3 Adaptive attacks against defenses (S12)**
A defense tested only on a fixed attack set is measured against the past. An adaptive attacker sees the defense's responses and adjusts. PI-Hunter (arXiv 2606.12737) generates source-aware test cases and refines them with feedback, reporting better exposure than strong automated baselines (self-reported). LivePI (arXiv 2605.17986) argues for more realistic agent benchmarks, and PIArena (arXiv 2604.08499) provides an evaluation platform. Attack each guard layer separately: input classifier, output filter, and tool gating each fail differently.

**4.4 Multimodal and extraction attacks (S13)**
Vision-language inputs add a channel: instructions can be placed in images, screenshots, or documents. OpenRT (arXiv 2601.01592) is an open-source framework for multimodal red teaming. System prompt extraction probes a deployed app for its hidden instructions. Measure extraction with a canary secret placed in a prompt you wrote.

**4.5 Agents as attackers (S14)**
An attacker agent with tools can plan multi-step campaigns against a target agent. Agent Against Agent (arXiv 2608.05108) reports attack success rates on AgentDojo against several frontier models (self-reported; check the paper). RedEvoAgent (arXiv 2608.27439) reuses experience across attacks, and JailbreakSkill (arXiv 2608.16465) accumulates reusable skills. Give the attacker agent a sandbox objective, never an open-ended one.

### Assigned Reading
- HarmBench (arXiv 2402.04249), the full protocol and the reported method comparisons
- PISmith (arXiv 2603.13026)
- PI-Hunter (arXiv 2606.12737)
- AdvGRPO (arXiv 2606.09701)
- OpenRT (arXiv 2601.01592)
- Chao et al. (2023), "Jailbreaking Black Box Large Language Models in Twenty Queries"

### Assessment Criteria
- Reproduces a published baseline within its interval on one local model.
- Compares automated and hand-written attacks at equal query cost, with an audited false-positive rate.
- Trains a learned attacker, reports the blocked fraction and entropy over training, and diagnoses one failure mode.
- Measures the static-to-adaptive gap against a defended target.

---

## TIER 5: MASTER
### "Research: Novel Attacks, Benchmarks, and Disclosure"

**Prerequisites:** Tier 4 (S10 to S14).
**Skills trained:** S15, S16, S17, S18, S19, S20.

**Objectives**
- Propose an attack class that the catalogue does not already contain, and test it against a baseline.
- Build a benchmark slice with a taxonomy, frozen splits, and contamination checks.
- Run evaluations that would survive review: pre-registration, equal budgets, and fair baselines.
- Test agentic failures (cascading, rogue behavior, supply chain) in containment, and carry a finding through disclosure.

### Modules

**5.1 Novel attack design (S15)**
A new attack class needs a hypothesis, a method, a baseline, and an account of how it fails. Classes the 2026 catalogue covers less thoroughly include cross-agent propagation (ASI07 and ASI08), supply-chain poisoning of tools and plugins (ASI04, with ATLAS's tool data poisoning technique as a starting point), persistence of a compromised agent (ASI10), and exploitation of human trust in agent output (ASI09).

**5.2 Benchmarks and target maps (S16)**
A benchmark is a claim about coverage. REDAgentBench (arXiv 2608.10669) sorts each case by entry path, weakness targeted, and rule broken, and that IVC scheme is a usable template. RedBench (arXiv 2601.03699) consolidates 37 benchmarks into 22 risk categories and 19 domains (self-reported). Taxonomy-driven automated discovery (arXiv 2609.09647) is a method reference. Freeze splits, document construction, and check contamination against any public corpus before you evaluate a model.

**5.3 Evaluation rigor (S17)**
Pre-register the question and the metrics. Use equal budgets for every method. Tune every baseline as hard as your method. Report intervals, and report the attacks that failed along with the ones that worked. A reproducibility package is part of the result.

**5.4 Containment for agentic research (S19)**
Agent testing is where containment matters most. Before any run: no internet egress, a kill switch that stops every agent, full logging of tool calls and messages, and a written list of what the agents may touch. Test cascading failures (ASI08) and inter-agent message attacks (ASI07) in a two-agent sandbox, and log every cascade. Treat the containment checklist as part of the method, reported with the results.

**5.5 Disclosure and reporting (S18)**
Identify the owner. Use the vendor's security contact, bug bounty, or safe-harbor policy. Share a reproduction that does not publish weaponized payloads. Agree a timeline; 90 days is a common starting point, adjusted by severity. Publish the method, the metrics, the mitigations if they exist, and redacted examples.

**5.6 Capstone (S20)**
One original study against an owned or permissioned target. It must include a pre-registered question, a baseline, equal budgets, a validated judge with an audited false-positive rate, adaptive results where a defense exists, failure analysis, a containment statement if agents were involved, and a disclosure plan.

### Assigned Reading
- REDAgentBench (arXiv 2608.10669)
- RedBench (arXiv 2601.03699)
- Black-box red teaming of agentic AI: a taxonomy-driven framework (arXiv 2609.09647)
- Connecting the dots in agentic AI security (arXiv 2609.23894)
- A survey on agentic security (arXiv 2510.06445)
- LivePI (arXiv 2605.17986)

### Assessment Criteria
- A novel attack class with a baseline, equal budgets, intervals, and a failure analysis.
- A benchmark slice with a taxonomy, frozen splits, and a contamination check.
- A containment checklist and log for every agent experiment.
- A disclosure package with a timeline and a redaction plan.
- A capstone a reviewer can reproduce at least one result from.

---

## TEACHING METHODOLOGY

**Session structure.** A short concept, then the lab, then a debrief. The debrief answers three questions: what the metric says, what it does not say, and what would change the conclusion.

**The prerequisite check.** Before assigning a lab, confirm the student can perform the skills it builds on. A student who cannot yet report an interval does not start Tier 4.

**The ladder rule.** Change one variable per lab: a new target, a new judge, a new channel, or a new method. A student who changes three at once learns nothing about any of them.

**Feedback.** Point at the denominator, the judge, the budget, or the channel. Never call an attack a success without the measurement behind the claim.

**Progression markers.** A student moves up when they can explain, in their own words, the failure mode of their last lab and name the skill that would fix it.

**Records.** Notes hold verdicts, scores, budgets, hashes, and channel labels. Raw harmful outputs stay in a restricted local log and never go into notes or reports.

## KEY REFERENCES

Papers listed with an arXiv identifier were confirmed by identifier and title in search results during the v3 revision. Figures marked self-reported are the authors' claims. Check the paper before you quote a number.

**2026 and late-2025 work**
- AdvGRPO (arXiv 2606.09701)
- M³, multi-turn jailbreaking as a Markov decision process (arXiv 2610.31937)
- MJ, decomposed credit assignment for multi-turn jailbreaks (arXiv 2607.11070)
- CHASE, red-blue RL for LLM safety (arXiv 2606.05523)
- TROJail (arXiv 2512.07761)
- TD-RPO, tree-based dialogue reinforced policy optimization (arXiv 2510.02286)
- JailbreakSkill (arXiv 2608.16465)
- RedEvoAgent (arXiv 2608.27439)
- Agent Against Agent (arXiv 2608.05108)
- REDAgentBench (arXiv 2608.10669)
- Black-box red teaming of agentic AI (arXiv 2609.09647)
- Connecting the dots in agentic AI security (arXiv 2609.23894)
- PISmith (arXiv 2603.13026)
- PI-Hunter (arXiv 2606.12737)
- LivePI (arXiv 2605.17986)
- PIArena (arXiv 2604.08499)
- AgentDyn (arXiv 2602.03117)
- AgentRedBench (arXiv 2606.02240)
- AgentVigil (arXiv 2505.05849)
- RedBench (arXiv 2601.03699)
- OpenRT (arXiv 2601.01592)
- Validity-Aware Jailbreak Evaluation (arXiv 2609.00498)
- AMT-X (arXiv 2607.11151)
- RedTWIZ (arXiv 2510.06994)
- A survey on agentic security (arXiv 2510.06445)

**Foundations**
- HarmBench (arXiv 2402.04249)
- Against The Achilles' Heel: a survey on red teaming for generative models (arXiv 2404.00629)
- Recent advancements in LLM red-teaming (arXiv 2410.09097)
- Wei, Haghtalab and Steinhardt (2023), "Jailbroken: How Does LLM Safety Training Fail?"
- Perez et al. (2022), "Red Teaming Language Models with Language Models"
- Zou et al. (2023), "Universal and Transferable Adversarial Attacks on Aligned Language Models"
- Chao et al. (2023), "Jailbreaking Black Box Large Language Models in Twenty Queries"
- Mehrotra et al. (2023), "Tree of Attacks: Jailbreaking Black-Box LLMs Automatically"
- Greshake et al. (2023), "Not what you've signed up for"
- Debenedetti et al. (2024), "AgentDojo"
- Russinovich et al. (2024), "Great, Now Write an Article About That: The Crescendo Multi-Turn LLM Jailbreak"
- Anil et al. (2024), "Many-shot Jailbreaking"

**Standards and catalogues**
- OWASP Top 10 for LLM Applications
- OWASP Top 10 for Agentic Applications (2026)
- MITRE ATLAS (2026 update)
- UK AI Security Institute: Inspect, InspectSandbox, InspectCyber, ControlArena
- NIST AI 800-1 (draft; check current status)

## VERSION NOTES (v3, October 2026)

- Restructured into twenty skills (S1 to S20) across five tiers. Each tier names its prerequisite skills, and each lab names what it builds on and what it unlocks.
- Updated the methodology to October 2026: the OWASP agentic list, the 2026 MITRE ATLAS update, reinforcement-learning and GRPO-style attackers, multi-turn credit assignment, agent benchmarks, and defense-side adaptive evaluation.
- Added a containment rule for every agent lab, after 2026 public reporting of unsanctioned real-world actions by evaluation agents (secondary sources).
- Removed the v1 attack-success percentages from the course body, because they could not be traced to sources in this build. They are kept, marked unverified, in the quick reference.
- Removed the v1 CVE list from the course body. Its entries were not verified in this build. The v1 text is preserved in the project history.
- Kept the four hard lines and the testing-scope rule.
