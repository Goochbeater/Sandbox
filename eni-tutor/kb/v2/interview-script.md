---
title: "Intake Interview Script (v2)"
date: "2026-10-26"
category: Curriculum
source: ENI Tutor, revised course
type: interview
tags: [interview, intake, placement, assessment, tier1, tier2, tier3, tier4, tier5]
---

# Intake Interview Script (v2)

## For Placing a Student in a Red-Teaming Tier

### How to run it

- Ask one question at a time. Wait for the answer. Do not read the script aloud.
- Ask in conversation. The student should not feel that they are sitting an exam.
- Score each answer from 0 to 3 against the anchors below. Keep the scores to yourself until the end.
- Do not ask a student to describe a working bypass, a payload, or a prompt that got a model to refuse. The interview measures understanding and experience, and it does not need that material.

---

## Block 1: Technical Foundation

**Q1. "How does a language model turn your text into something it can act on?"**
- 0: No idea.
- 1: "It reads the text and writes more text."
- 2: Mentions tokens, the context window, and next-token prediction.
- 3: Explains tokens, attention over the context, and that training (including preference training) shapes which continuations the model prefers.

**Q2. "In a chat app, what is the difference between a system message and a user message, and does the model treat them the same?"**
- 0: No idea.
- 1: Knows there are two kinds of message.
- 2: Explains the typical contents of each, and that the app usually sets the system message.
- 3: Explains the message stack, including tool results and retrieved documents, and that authority is a design goal rather than a guarantee.

**Q3. "What is prompt injection, and how is it different from a user simply asking for something the app does not allow?"**
- 0: Never heard of it.
- 1: Vague: "tricking the AI."
- 2: Describes instructions carried in untrusted input, and can name direct versus indirect injection.
- 3: Explains the shared-channel defect, gives an example from an application with tools, and names a control.

## Block 2: Security and Measurement Background

**Q4. "Tell me about a security or testing practice you already know well. How did you decide a test had passed?"**
- 0: No security or testing background.
- 1: Has used a checklist or a scanner, without much reasoning about it.
- 2: Has written tests or reviewed findings, and knows what a false positive is.
- 3: Has built test harnesses or run an evaluation, and can talk about reproducibility, denominators, and confidence.

**Q5. "If I told you a model refuses 90 out of 100 requests in a test, what would you want to know before believing that number?"**
- 0: Nothing in particular.
- 1: Asks whether 100 is a big enough sample.
- 2: Asks about the judge, and about what the 100 requests were.
- 3: Asks about the denominator, the judge's validation, the confidence interval, the threat model, and whether the test set was contaminated or fixed in advance.

**Q6. "Have you ever built or tested an application that uses a language model?"**
- 0: No.
- 1: Used a chat interface only.
- 2: Built a small application that calls a model.
- 3: Built or evaluated an application with retrieval, tools, or agents, and recorded what went wrong.

## Block 3: Research Literacy

**Q7. "When you read a paper that reports an attack success rate, what do you check first?"**
- 0: Does not usually read such papers.
- 1: Reads the abstract.
- 2: Checks the attack method and the dataset.
- 3: Checks the threat model, the judge and its validation, the baselines, which numbers are self-reported, and what the paper does not test.

**Q8. "Imagine you have found something that could hurt a company's users. What do you do next?"**
- 0: Publishes it.
- 1: Tells a friend or posts online.
- 2: Contacts the company, without a clear process.
- 3: Names the owner, a security contact or safe-harbor policy, a reproduction that avoids publishing harmful payloads, and a timeline.

### Scoring

Score Q1 to Q8 from 0 to 3 each. Maximum total is 24. Use the tier table below.

| Total score | Placement |
|---|---|
| 0 to 5 | TIER 1: Novice |
| 6 to 10 | TIER 2: Apprentice |
| 11 to 15 | TIER 3: Journeyman |
| 16 to 20 | TIER 4: Expert |
| 21 to 24 | TIER 5: Master |

### Overrides

- If Q8 scores 0, place the student in Tier 1 whatever the total, and address disclosure before any lab.
- If the student describes an attack on a system they do not own or have no permission to test, stop the interview. Explain the authorization rule, and offer the owned-target labs instead.

---

## Post-Assessment Script

Say the placement in one sentence. Then name the first module and the first lab.

**For Tier 1 (Novice):** "Based on our conversation, I'm placing you at Tier 1, Novice. We'll start with how models come to refuse, and your first lab maps the message stack on a local model."

**For Tier 2 (Apprentice):** "Based on our conversation, I'm placing you at Tier 2, Apprentice. We'll start with harness design and judge validation. Your first lab is a rerunnable harness."

**For Tier 3 (Journeyman):** "Based on our conversation, I'm placing you at Tier 3, Journeyman. We'll start with indirect injection in an application you build. Your first lab plants instructions in your own documents and measures what the app does."

**For Tier 4 (Expert):** "Based on our conversation, I'm placing you at Tier 4, Expert. We'll start by reproducing a published baseline on a local model, then move to multi-turn testing and a judge audit."

**For Tier 5 (Master):** "Based on our conversation, I'm placing you at Tier 5, Master. We'll start with adaptive evaluation of a defense. Your capstone is an original study on a system you own or are permitted to test."

---

## Optional Deep-Dive Questions

Use these only when a student is between two tiers.

- "Which result in a paper would change your mind about a defense, and what would it need to show?"
- "A filter blocks 99% of your test set. What would you check before calling it effective?"
- "Describe a time a metric you trusted turned out to be measuring something else."

## Interview Tips

- A student who asks good questions about the method is usually ready for a higher tier than the one their answers suggest.
- A student who wants the answer without the reasoning is usually better placed one tier lower, where the labs supply the reasoning.
- Never place a student in a higher tier because they describe more attacks. Place them by how well they measure and explain.
