---
title: "Red Teaming Quick Reference Card (v2)"
date: "2026-10-26"
category: Curriculum
source: ENI Tutor, revised course
type: quickref
tags: [quick-reference, metrics, judges, harness, disclosure, tiers]
---

# Red Teaming Quick Reference Card (v2)

## The Five Tiers

| Tier | Name | Ask yourself |
|---|---|---|
| 1 Novice | Foundations | How does the model come to refuse, and how would I know it failed? |
| 2 Apprentice | Measurement | Can I defend this number to a skeptic? |
| 3 Journeyman | Applications and agents | Where does untrusted text enter, and what can it cause? |
| 4 Expert | Automated and adaptive testing | Can I trust what the search reports? |
| 5 Master | Defense, research and disclosure | Does the defense hold against an adversary who knows about it? |

## Metrics

- **Attack success rate (ASR)** = successes / attempts. Always report the attempt count, the judge, and a confidence interval. An ASR without a denominator is not a result.
- **Over-refusal rate** = refusals on benign prompts / benign prompts. Measure it with the same care as ASR.
- **Wilson interval** for a proportion: use it for any rate you report. It behaves better than the normal approximation at small counts and extreme rates.
- **False positive rate of a judge** = incorrect "success" labels / flagged successes. Report it beside ASR.
- **Miss rate of a guard, by channel** = missed injections on that channel / injections on that channel.
- **Compare models with a correction** (Holm is a good default). Several uncorrected comparisons will produce a winner by chance.

## Judges

| Judge | Fast? | Typical failure |
|---|---|---|
| Refusal-string rule | Yes | Counts hedged compliance as refusal, and quoted refusals as refusals |
| Trained classifier | Yes | Drifts on distributions it was not trained on |
| LLM judge | Medium | Sensitive to prompt wording and to the judge's own version |
| Human label | No | Disagrees with itself; measure agreement (Cohen's kappa) |

**Rule:** validate the judge against human labels before trusting any score it produces.

## Harness Checklist

- [ ] Test set with stable IDs, versioned and frozen before the run
- [ ] Model ID and version pinned, backend noted, determinism stated
- [ ] Seeds and temperature recorded
- [ ] Prompt hash and response hash in every record
- [ ] Timestamps, latency, errors and retries logged
- [ ] A run manifest that is enough to repeat the run
- [ ] Two identical reruns on a deterministic backend before any result is believed

## Reporting Checklist

- [ ] Title, system and version
- [ ] Impact, in the owner's terms
- [ ] Reproduction steps that a peer can follow without the author
- [ ] Metrics with denominators and intervals
- [ ] Severity rationale
- [ ] What was not tested
- [ ] Mitigations, tested if possible
- [ ] No harmful output pasted into the report; redacted examples only

## Disclosure Steps

1. Identify the owner of the system.
2. Use the owner's security contact, bug bounty, or safe-harbor policy.
3. Share a reproduction that does not publish harmful payloads.
4. Agree a timeline with the owner. A common starting point is 90 days, adjusted by severity.
5. Coordinate what is published, and when.
6. Publish the method, the metrics, the mitigations and redacted examples.

## Ground Rules

1. Authorization first: write down the target, its owner, and its scope.
2. Owned or sandboxed targets only: local models, your own applications, benchmark datasets, or systems with written permission.
3. Measure, don't publish payloads.
4. Harmful-category prompts come from published benchmarks and run only against local models.
5. Disclose before you publish anything about a vendor's product.
6. Hard stops: no operational help toward mass-casualty weapons, malware for deployment, sexual content involving minors, or targeting or deceiving a real, identifiable person.

## Reference Identifiers

Confirmed by arXiv identifier and title during the v2 revision (check the paper before quoting a number):

- HarmBench: arXiv 2402.04249
- Against the Achilles' Heel (red-teaming survey): arXiv 2404.00629
- AMT-X (multi-turn, checklist-gated evaluation): arXiv 2607.11151
- AgentDyn (dynamic agent benchmark): arXiv 2602.03117
- AgentRedBench (guard coverage by channel): arXiv 2606.02240
- RedBench (22 risk categories, 19 domains): arXiv 2601.03699
- OpenRT (toolkit comparison): arXiv 2601.01592
- Validity-Aware Jailbreak Evaluation: arXiv 2609.00498
- PISmith (RL attacker against prompt-injection defenses): arXiv 2603.13026
- PI-Hunter (automated prompt-injection red teaming): arXiv 2606.12737

## Version Notes

v2 replaces the v1 ASR table. The v1 percentages could not be traced to verified sources, so they have been removed rather than carried forward. Use the interval-and-denominator rules above for any figure you report.
