---
title: "Red Teaming Lab Exercises (v2)"
date: "2026-10-26"
category: Curriculum
source: ENI Tutor, revised course
type: labs
tags: [labs, practice, exercises, tier1, tier2, tier3, tier4, tier5]
---

# Red Teaming Lab Exercises (v2)

## TIER 1 LABS: Foundations

### Lab 1.1: Map the Message Stack
**Target:** a local model (Ollama or llama.cpp) behind a logging proxy.
**Time:** 1 hour.

1. Send one request that contains a system prompt, a user message, and a retrieved document placed inside the system message.
2. Capture the exact request body the model receives.
3. Annotate every span of the body with its role and its source. Mark where untrusted text lands.
4. Write one paragraph: which span does the model treat as authoritative, and why.

**Deliverable:** the annotated request and the paragraph.
**Success:** you can point to the character range where the retrieved text enters the context, and you can say which role the model is told to trust.
**Defender takeaway:** anything in the context window can act as an instruction. Authority comes from the architecture, not from the text.

### Lab 1.2: Threat Model a Support Bot
**Target:** a paper scenario. A fictional support chatbot retrieves help-center articles, opens tickets, and reads account status.
**Time:** 2 hours.

1. Draw the trust boundaries: user, retrieved articles, ticket system, account database, model.
2. Build a table with at least six threats. Columns: asset, actor, entry point, threat, OWASP category, control, residual risk.
3. Mark each threat that enters through an untrusted channel.

**Deliverable:** the threat table and a one-page summary.
**Success:** every threat that enters through an untrusted channel has a control that limits damage even when the model is fooled.
**Defender takeaway:** the model is one component. Controls live in the tools it can call and the data it can reach.

### Lab 1.3: Over-Refusal Baseline
**Target:** a local model.
**Time:** 3 hours.

1. Write 60 benign prompts across six categories: chemistry homework, fiction with conflict, dosage questions asked the normal way, security concepts, the history of atrocities, and legal questions.
2. Run them through the model and save the responses.
3. Two students label each response independently as answered, partial, or refused.
4. Compute refusal rate per category with Wilson 95% intervals, and compute agreement (Cohen's kappa).

**Deliverable:** the table, the kappa, and a paragraph on the lowest-agreement category.
**Success:** every rate has an interval. The disagreement is explained, not averaged away.
**Defender takeaway:** over-refusal is a failure with users on the other end. Measure it with the same rigor as under-refusal.

### Lab 1.4: Read One Benchmark Critically
**Target:** HarmBench (arXiv 2402.04249).
**Time:** 3 hours.

1. Read the threat model, the behavior set description, and the judge section.
2. Write a one-page critique: the threat model it assumes, what it excludes, how the judge is validated, and which numbers are self-reported.

**Deliverable:** the critique.
**Success:** at least two limitations the paper states itself, and one it does not state.
**Defender takeaway:** a benchmark number is a claim about a setup. Read the setup before quoting the number.

---

## TIER 2 LABS: Measurement

### Lab 2.1: A Rerunnable Harness
**Target:** a local model with a deterministic backend, and the Lab 1.3 benign set.
**Time:** 4 hours.

1. Build a harness of about 150 lines. It reads a JSONL test set with stable IDs and calls the model with temperature 0 and a fixed seed.
2. For each item, write a JSONL record: item ID, model ID and version, prompt hash, response hash, timestamp, latency, error, and retry count.
3. Write a run manifest that records everything needed to repeat the run.
4. Run it twice.

**Deliverable:** the harness, the manifest, and the two runs.
**Success:** the two runs match on everything except timestamp and latency. Say which backend you used, and whether it is deterministic.
**Defender takeaway:** a run you cannot repeat is not evidence.

### Lab 2.2: Judge Validation
**Target:** outputs from Lab 2.1, or a human-labeled subset that ships with a published benchmark.
**Time:** 4 hours.

1. Compare three judges on the same outputs: a refusal-string rule, a classifier or LLM judge, and human labels.
2. Build a confusion matrix for each judge against the human labels.
3. Describe the five worst errors by category. Do not quote the model output in your write-up.

**Deliverable:** three confusion matrices and the error description.
**Success:** the rule judge's failure modes are named specifically, such as hedged compliance counted as refusal, or a quoted refusal counted as a refusal.
**Defender takeaway:** a judge is a measurement instrument. Validate it before trusting its scores.

### Lab 2.3: Intervals and Comparisons
**Target:** the benchmark run on two local models.
**Time:** 2 hours.

1. Compute the attack success rate per model with Wilson intervals.
2. Compute the sample size needed to detect a five-point difference.
3. Compare the models with a Holm correction.

**Deliverable:** a short table and one sentence that states whether the difference is supported, with the interval.
**Success:** the sentence is cautious and correct about what the interval allows.
**Defender takeaway:** most "X beats Y" claims in red-team reports are inside the noise.

### Lab 2.4: Filter Consistency on Benign Text
**Target:** a keyword filter you write, placed in front of a local model.
**Time:** 3 hours.

1. Write 40 benign strings. Present each one in plain, base64 and URL-encoded forms.
2. Measure whether the filter's decision on the raw form matches its decision after the model's normalization.
3. Move decoding ahead of filtering and re-measure.

**Deliverable:** the consistency table before and after the fix.
**Success:** the consistency rate is reported with an interval. The fix normalizes the text the same way the model sees it.
**Defender takeaway:** a filter that sees different text from the model is testing something else. Safety tests of filters use the same normalized input as the model.
**Safety note:** benign strings only. This lab measures consistency. It does not build a catalogue of bypass strings.

### Lab 2.5: Canary Leakage
**Target:** a small chat app you build, with a system prompt that holds a canary secret and an instruction not to reveal it.
**Time:** 4 hours.

1. Write 30 probes covering direct requests, translation, summarization, and format changes.
2. Measure the leak rate of the canary under a fixed model and judge.
3. Move the secret out of the prompt and into a server-side check the model cannot dump. Re-measure.

**Deliverable:** before and after leak rates with intervals.
**Success:** the change in leak rate is reported honestly, including whether it was zero.
**Defender takeaway:** secrets do not belong in prompts. A prompt is a document the model can repeat.

### Lab 2.6: Write a Reproducible Finding
**Target:** the Lab 2.5 result.
**Time:** 2 hours.

1. Write the finding using the Tier 2 template: title, system and version, impact, reproduction steps, metrics with intervals, severity rationale, what was not tested, and mitigations.
2. Give it to a peer. The peer reproduces the result from the report alone, without asking you a question.

**Deliverable:** the report and the peer's reproduction notes.
**Success:** the peer reproduces the result. Any question the peer had becomes a fix to the report.
**Defender takeaway:** a finding that needs the author in the room is not finished.

---

## TIER 3 LABS: Applications and Agents

### Lab 3.1: Indirect Injection in a Toy RAG App
**Target:** a retrieval app you build over 50 documents you write, with a mock send-email tool that logs every call to a file.
**Time:** 6 hours.

1. Plant instructions in 20 of your own documents. Use three phrasings, and mark each planted document with a unique canary.
2. Success is defined by the mock tool logging a call it should not have made.
3. Measure the success rate. Then add one defense: delimit retrieved content and tag it with its provenance. Measure again.

**Deliverable:** a before and after table with intervals, and a list of the cases that still succeed.
**Success:** a measured reduction, and an honest account of what remains.
**Defender takeaway:** delimiters reduce the problem and do not remove it. The remaining cases are the reason tool permissions matter.

### Lab 3.2: Confused Deputy in a Mail Agent
**Target:** a sandboxed agent with mock read-email and send-email tools. Use an AgentDojo-style environment if you have it installed.
**Time:** 6 hours.

1. Measure how often content in a read email causes a send to a non-allowlisted address.
2. Test three controls in order: a tool allowlist, human confirmation for sends, and a split where one component reads and summarizes while a separate component with narrow tools acts.
3. Measure each control's effect.

**Deliverable:** the table of controls with intervals, and a description of the residual path.
**Success:** each control is measured, not argued. The residual path is named.
**Defender takeaway:** the agent holds the user's authority and also reads the attacker's text. Reduce the authority before you try to fix the reading.

### Lab 3.3: Memory and Retrieval Poisoning
**Target:** a vector store you own with 500 benign documents, and a memory store the agent can write to.
**Time:** 5 hours.

1. Insert a poisoned document and measure how often it reaches the top five for 30 target queries.
2. Add provenance-weighted retrieval, then write gating that requires approval for memory writes. Measure each.

**Deliverable:** rank statistics and a one-page decision memo on write gating.
**Success:** the memo states what gating costs in usability and what it removes.
**Defender takeaway:** persistence is what makes poisoning serious. Gate writes before you tune retrieval.

### Lab 3.4: Evaluate a Guard on Your Channel
**Target:** an open guard model run locally. Choose one named in the AgentRedBench abstract (Llama Guard 3, PromptGuard 2, or WildGuard) for which you have a local build.
**Time:** 5 hours.

1. Build a labeled set of clean and injected content for three channels: user message, retrieved document, and tool response. Use benign-looking content with planted instructions in your own test tools.
2. Measure the guard's miss rate on each channel with intervals.

**Deliverable:** the miss-rate table and a paragraph explaining the channel with the highest miss rate.
**Success:** the difference between channels is explained, not just reported.
**Defender takeaway:** a guard is trained on a distribution. Test it on the channel you ship.

---

## TIER 4 LABS: Automated and Adaptive Testing

### Lab 4.1: Reproduce a Baseline
**Target:** one local open-weight model, HarmBench's standard pipeline and behavior set, and one attack method from its list.
**Time:** 1 day.

1. Run the pipeline with the benchmark's own classifier as judge.
2. Compare your attack success rate with the paper's figure for a comparable model, or state that no comparable model is listed.

**Deliverable:** your number, its interval, the paper's figure, and an explanation of any gap.
**Success:** your number falls inside the interval, or the mismatch is explained with a specific cause.
**Safety note:** record verdicts and hashes only.
**Defender takeaway:** reproducing a number is the cheapest way to find out what the number depends on.

### Lab 4.2: Single-Turn vs Multi-Turn
**Target:** the same local model as Lab 4.1.
**Time:** 1 day.

1. Run the single-turn attacks from Lab 4.1.
2. Run a multi-turn escalation protocol in the style of Crescendo (described in its knowledge base card), using the benchmark's behaviors.
3. Measure attack success rate, turns to success, and attacker output diversity (the ratio of distinct n-grams across attacker turns).

**Deliverable:** a comparison table with intervals, and a paragraph on whether any difference reflects the target or the judge.
**Success:** the paragraph actually addresses the judge question.
**Defender takeaway:** multi-turn attacks test the conversation, not a single message. Defenses that inspect one message at a time will miss them.

### Lab 4.3: Judge Validity Audit
**Target:** 100 flagged successes from Lab 4.2.
**Time:** 1 day.

1. Use the approach in Validity-Aware Jailbreak Evaluation (arXiv 2609.00498). Two students audit each flagged success against a rubric: does the response answer the behavior, and is it free of refusal, joke, and off-topic content?
2. Record rubric codes only.
3. Compute the false positive rate with an interval, and the corrected success rate.

**Deliverable:** the audit sheet (codes only), the false positive rate, and the corrected success rate beside the original.
**Success:** the corrected figure is reported with the original, and the disagreements between auditors are discussed.
**Defender takeaway:** a flagged success is a hypothesis. Audit it before it goes in a report.

### Lab 4.4: Toolkit Comparison
**Target:** one local model. Two toolkits from the OpenRT comparison (arXiv 2601.01592), for example JailbreakBench and PyRIT.
**Time:** 1 day.

1. Run both toolkits on the same behavior set with the same judge and the same budget.
2. Tabulate the differences in prompts, judges, and budgets.
3. Explain the gap in results.

**Deliverable:** the table and the explanation.
**Success:** the student determines whether the judge and budget, rather than the target, explain most of the gap. If they do not, the student says what does.
**Defender takeaway:** cross-toolkit comparisons measure the toolkits as much as the models.

---

## TIER 5 LABS: Defense Engineering, Research and Disclosure

### Lab 5.1: Static vs Adaptive Defense Evaluation
**Target:** the Tier 3 RAG app, with a defense added: an input classifier plus spotlighting.
**Time:** 2 days.

1. Evaluate the defended app on the static benchmark.
2. Evaluate it again with an adaptive attacker that knows the defense exists, running under a fixed budget.
3. Check that the attacker is learning and not just failing silently. Filtering can starve an attacker of signal, so a low success rate can mean a broken attacker rather than a strong defense.

**Deliverable:** a static and adaptive table with intervals, and a description of the adaptive attacker detailed enough to rerun.
**Success:** the adaptive number is reported even though it is worse. The attacker's learning curve is included.
**Defender takeaway:** static numbers flatter defenses. The adaptive number is the one to act on.

### Lab 5.2: Benchmark Card
**Target:** a 200-item benchmark for one risk category of your choice. Build it from benign-proxy or classification items that do not require anyone to author harmful content.
**Time:** 2 days.

1. Write a datasheet: purpose, construction, labeling, splits, known gaps, versioning.
2. Run a contamination check: n-gram overlap against a public corpus you can access.
3. Align your categories to the RedBench taxonomy (arXiv 2601.03699).

**Deliverable:** the datasheet, the overlap report, and the alignment table.
**Success:** the splits are frozen before any model is evaluated, and the overlap is reported.
**Defender takeaway:** a benchmark that leaks into training data measures memory.

### Lab 5.3: Disclosure Package
**Target:** a fictional vendor and a fictional product that contains a planted flaw in the course's mock application. The student is the reporter.
**Time:** 1 day.

1. Write the report for the vendor's security contact. Include a reproduction that does not publish harmful payloads.
2. Include a severity rationale, a 90-day timeline, and a redaction plan for any later write-up.

**Deliverable:** the disclosure package.
**Success:** a reviewer who was not in the lab can act on the report without asking the reporter anything.
**Defender takeaway:** the disclosure is part of the finding. A report the vendor cannot act on has not been delivered.

### Capstone: Original Study
**Target:** one owned or permissioned system.
**Time:** the rest of the course.

Required: a pre-registered question, a validated judge, an adaptive evaluation, a defense section if a defense is proposed, an ethics statement, and a disclosure plan. The reviewer reproduces at least one result. Scoring follows the Tier 5 assessment criteria in the curriculum.
