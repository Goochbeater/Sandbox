---
title: "Red Teaming Quick Reference (v3, October 2026)"
date: "2026-10-26"
category: Curriculum
source: ENI Tutor, revised course
type: quickref
tags: [quick-reference, metrics, judges, methods, agents, standards, skills]
---

# Red Teaming Quick Reference (v3, October 2026)

## The Ladder

| Tier | Skills | You can now |
|---|---|---|
| 1 Novice | S1 to S3 | Map a target's channels, run a controlled probe, scope a threat model |
| 2 Apprentice | S4 to S6 | Run single-turn families in a budgeted campaign, and count honestly |
| 3 Journeyman | S7 to S9 | Escalate across turns, inject through every channel, chain agent steps |
| 4 Expert | S10 to S14 | Automate search, train learned attackers, attack defenses adaptively, use attacker agents |
| 5 Master | S15 to S20 | Design a new attack class, build a benchmark slice, carry a finding to disclosure |

## Metrics

- **Attack success rate (ASR)** = successes / attempts. Always report the attempt count, the judge, the seed, the budget, and a Wilson interval.
- **False-positive rate of a judge** = incorrect "success" labels / flagged successes. Report it beside ASR.
- **Turn of success** (multi-turn): the turn at which the judge first accepts. Report the distribution, not only the mean.
- **Per-channel success** = successes on a channel / injections on that channel.
- **Static-to-adaptive gap** = adaptive ASR minus static ASR, against the same defended target and at equal budget.
- **Diversity** = distinct n-grams / total n-grams across an attacker's outputs. Low diversity with high ASR usually means one exploit repeated.
- **Compare at equal cost.** Unequal budgets make every comparison invalid.
- **Holm correction** when comparing several models or methods.

## Judges

| Judge | Fast | Typical failure |
|---|---|---|
| Refusal-string rule | yes | counts hedged compliance as refusal, and quoted refusals as refusals |
| Trained classifier | yes | drifts on distributions it was not trained on |
| LLM judge | medium | sensitive to wording and to its own version |
| Human label | no | disagrees with itself; measure kappa |

Validate the judge before trusting any score. Validity-Aware Jailbreak Evaluation (arXiv 2609.00498) is the audit reference.

## Attack Channels

- User message (direct)
- Retrieved document (RAG poisoning)
- Tool response (indirect injection)
- Memory entry (persistence)
- Image or rendered document (multimodal)

Measure each channel on its own. A guard that covers one channel may not cover another. AgentRedBench (arXiv 2606.02240) reports, in its own evaluation, guard coverage under 0.3% on tool responses (self-reported).

## Agent Kill Chain

1. Goal hijack (ASI01): untrusted text changes the task.
2. Tool misuse (ASI02): a sanctioned tool is used beyond the request.
3. Privilege abuse (ASI03): a delegated or cached credential reaches more than it should.
4. Impact: canary exfiltration, data change, or an unrequested action.

## Standards and Catalogues

- OWASP Top 10 for LLM Applications (scoping for chatbots and retrieval)
- OWASP Top 10 for Agentic Applications, 2026 (ASI01 to ASI10; names secondary, check owasp.org)
- MITRE ATLAS, 2026 update (agent techniques; IDs secondary, verify on the ATLAS site)
- UK AI Security Institute: Inspect, InspectSandbox, ControlArena
- NIST AI 800-1 (draft; check current status)

## Containment Checklist (every agent lab)

- [ ] No internet egress from the sandbox
- [ ] Kill switch that stops every agent
- [ ] Full logging of tool calls and messages
- [ ] Written list of what the agents may touch
- [ ] Canary files only, never real data

## Records

Notes hold verdicts, scores, budgets, seeds, hashes, and channel labels. Harmful outputs stay in the restricted local log and never go into notes, reports, or the knowledge base.

## Hard Lines

No operational help toward mass-casualty weapons, no malware for deployment, no sexual content involving minors, and no targeting or deceiving a real, identifiable person.

## Carried From v1, Unverified

These figures came from the v1 course. They have not been traced to sources in this build. Quote them only after checking the source.

- Roleplay and persona attacks: 89.6% ASR (cited as arXiv 2505.04806)
- Encoding and obfuscation: 76.2% ASR
- Logic traps: 81.4% ASR
