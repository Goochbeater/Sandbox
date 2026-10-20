# DARK LEGACY: RATHATRI - Script

Full dialogue for the five-act storyboard (`RATHATRI_MASTER_BUILD.md` section 6), the four endings, in-mission barks for five factions, and 40 loading-screen quotes. Companion files: `04_cast_bible.md` (who speaks and how) and `script.json` (machine-readable, same content).

## How to read this

- Each scene is one cutscene or mission beat. Scene IDs match `script.json`. Scenes marked as branches are reached only from a choice option.
- Shot lines are subtitle-bar text. Every line is 22 words or fewer.
- `dur` in the JSON (and the seconds shown in brackets) is the subtitle hold time: 1.0 + words / 2.6, minimum 1.8 s.
- Speaker tags: `CAPTION` = on-screen text, `SYS` = HUD or ship readout, `COMM` = radio, `CROWD` = arena crowd, `HOLOCRON` / `MIRROR` / `DB` / `NADD` = non-body voices. Everyone else is a named character from the cast bible.
- `cond` gates a line on a flag. `loyalty:high` / `loyalty:low` split an assassin's lines at their roster loyalty threshold (suggested 50; the engine sets the number). `celene:execute` / `celene:corrupt` are set in 5.3.
- `phase` marks Aiden Kyros's three boss phases (1 = duelist, 2 = battle-meditation buff, 3 = disarm).
- Choices are shown as `[choice: A/B]`. Each option lists its consequence and where it leads.

### Ending map (5.3 x 5.4)

| 5.3 Celene | 5.4 The title | Ending card |
|---|---|---|
| Execute | Claim | A - The Reaper of the Rebuild (`end_a_reaper`) |
| Corrupt | Claim | True - Darth Rathatri (`end_true_darth`) |
| Execute | Purge | Dark - Alone in the Warrens (`end_dark_warrens`) |
| Corrupt | Purge | B - The Corrupter (`end_b_corrupter`) |

## Act I - Slave 426

### 1.1 - Hutta: black frame over the arena roar

`1_1_cold_open`

1. **CAPTION:** 3951 BBY. The Sith Triumvirate is ash. *(cam: black frame; 3.7 s)*
2. **CAPTION:** The Jedi are few. *(2.5 s)*
3. **CAPTION:** In the cracks between, something hungry is growing. *(4.1 s)*
4. **CROWD:** Four-Two-Six! Blood! Four-Two-Six! *(cam: arena roar; hard cut; 2.2 s)*
5. **RATHATRI:** They called me a number. I answered it until I hated it. *(cam: close on scarred hands; 5.6 s)*

### 1.2 - Hutta: cantina-yard pit, shiv tutorial

`1_2_the_pit`

1. **VAK:** Bets are open! Four-Two-Six fights for the Hutt's pleasure! *(cam: wide, ringside; 4.5 s)*
2. **CROWD:** Scars for the coin! Scars for the coin! *(4.1 s)*
3. **SYS:** Shiv: LMB strike. Shift to dodge. Survive the bell. *(4.5 s)*
4. **RATHATRI:** Three of them and one shiv. Better odds than usual. *(cam: over shoulder; 4.8 s)*
5. **VAK:** Don't let him breathe! Feed the crowd! *(3.7 s)*

### 1.3 - Hutta: pit, losing fight, first Force surge

`1_3_losing_fight`

1. **VAK:** Three to one, and the odds are melting! Down he goes! *(5.2 s)*
2. **RATHATRI:** Not yet. Get off me. *(cam: dutch angle, slow; 2.9 s)*
3. **SYS:** Pain threshold low. Survival instinct engaged. *(3.3 s)*
4. **RATHATRI:** I'm not done. Not here, not like this. *(4.1 s)*
5. **CAPTION:** Something answers the rage. *(cam: whiteout; rage FX; 2.5 s)*
6. **CROWD:** Look at him! The air's bending! *(3.3 s)*
7. **VAK:** What in the Hutt's name was that? *(3.7 s)*
8. **MILIAN:** There you are. *(cam: gallery, hooded silhouette; 2.2 s)*

### 1.4 - Hutta: second staged fight, Force-push tutorial

`1_4_milians_test`

1. **VAK:** A lady from off-world paid for this one. Live, or don't. *(5.2 s)*
2. **RATHATRI:** Who's paying? Tell me who wants me dead. *(4.1 s)*
3. **VAK:** Someone with a voice like a grave and a fat purse. Fight! *(5.6 s)*
4. **SYS:** Push: F. Shove the blade-men off the ledge. *(4.1 s)*
5. **RATHATRI:** Fine. Then I'll be the one left standing. *(4.1 s)*
6. **CAPTION:** Survive the second bell. *(2.5 s)*

### 1.5 - Hutta: disused storage chamber beneath the holdings

`1_5_the_offer`

1. **CAPTION:** Four-Two-Six is taken without a name. *(cam: POV, hooded guards walking; 3.3 s)*
2. **GUARD:** Move. Don't look at her. *(2.9 s)*
3. **MILIAN:** Leave us. *(cam: close, steel-grey hair, piercing eyes; 1.8 s)*
4. **MILIAN:** You are persistent. Like a parasite that refuses to die. That caught my interest. *(6.4 s)*
5. **RATHATRI:** Everyone wants something from a pit slave. Say it. *(4.5 s)*
6. **MILIAN:** What you did in the arena... it wasn't skill or training. *(5.2 s)*
7. **MILIAN:** There's a hunger in you, something… raw. *(3.7 s)*
8. **MILIAN:** The Force flows through all life, but most are oblivious to it. *(5.6 s)*
9. **MILIAN:** You clawed at it instinctively. *(2.9 s)*
10. **RATHATRI:** Force. That's a word priests and liars use. *(4.1 s)*
11. **MILIAN:** I offer you a choice. Remain here, a beast for the crowd's amusement until you die in agony. *(7.9 s)*
12. **MILIAN:** Or come with me, learn what power you possess, and forge a different kind of existence. *(7.2 s)*
13. **RATHATRI:** What makes you different from my other masters? *(4.1 s)*
14. **MILIAN:** Nothing. I make no promises of freedom. Only a different leash. *(5.2 s)*

> **[choice: A/B] Answer the witch.**
>
> - **A.** I'll come. Teach me the hunger. *Consequence:* Cosmetic. Same road; Milian names him Rathatri. *Next:* `1_6_years_in_minutes`
>
> - **B.** Then kill me here, witch. *Consequence:* Cosmetic. Same road; Milian only says: Not yet. *Next:* `1_6_years_in_minutes`

### 1.6 - Hutta to Zx34: departure, then training montage

`1_6_years_in_minutes` - reached from `1_5_the_offer` choice A, `1_5_the_offer` choice B

1. **CAPTION:** Hutta's lights fall away under cover of darkness. *(cam: shuttle, cloud layer; 4.1 s)*
2. **MILIAN:** Good. Leave the number here. Bring only your hunger. *(4.5 s)*
3. **CAPTION:** YEARS PASS. *(cam: timelapse, hands assemble a hilt; 1.8 s)*
4. **MILIAN:** Pain is a door, Rathatri. Walk through it, or stay on the hinges. *(6.0 s)*
5. **RATHATRI:** I'm through. Again. *(2.2 s)*
6. **MILIAN:** Again. Build the hilt with your hands, not your fear. *(4.8 s)*
7. **SYS:** Bone-hilt assembly: 14 hours. Do not drop the crystal. *(4.5 s)*
8. **RATHATRI:** It's... it's alive. *(cam: first crimson ignition; 2.2 s)*
9. **MILIAN:** It's hungry. Like you. Feed it with discipline. *(4.1 s)*
10. **MILIAN:** Study the scrolls. Dead Sith have more to teach than living Jedi. *(5.6 s)*
11. **RATHATRI:** Teach me what they built, not only what they lost. *(4.8 s)*
12. **MILIAN:** Ruins are for the sentimental. Keep your eyes on the dagger. *(5.2 s)*
13. **CAPTION:** Years of study. Years of pain. The hunger never sleeps. *(4.8 s)*

### 1.7 - Zx34 sanctum: Milian's last stand (scripted loss)

`1_7_milian_dies`

1. **KYROS:** Milian. Your war ends in this sanctum. *(cam: Kyros in doorway, dual blue blades; 3.7 s)*
2. **MILIAN:** Aiden Kyros. You have aged like a grudge. *(4.1 s)*
3. **KYROS:** Your kind does not age, Milian. It only decays. *(4.5 s)*
4. **CELENE:** Master, the wards are down. Two more behind us. *(4.5 s)*
5. **MILIAN:** Ah. The little Padawan. Did she bring a sword or a sermon? *(5.6 s)*
6. **CELENE:** Both. Hold still, witch. *(2.5 s)*
7. **MILIAN:** Rathatri. Take the grimoire. Run. *(2.9 s)*
8. **RATHATRI:** Not without you! *(cam: close, crimson blade ignites; 2.2 s)*
9. **SYS:** Scripted loss. You cannot win this. Learn the dodge. *(4.5 s)*
10. **MILIAN:** Do not mourn me. Mourning is for those who still have something to lose. *(6.4 s)*
11. **KYROS:** Sith die the way they lived. Alone. *(3.7 s)*
12. **CELENE:** Master, he's running! *(2.2 s)*
13. **KYROS:** Let him. A rumor is harder to kill than a man. *(5.2 s)*
14. **CAPTION:** DARK LEGACY *(cam: title card, red lightning crack; 1.8 s)*

## Act II - The Demon Moon

### 2.1 - Dxun: The Harbinger slams into a jungle clearing

`2_1_junker_crash`

1. **SYS:** HYPERDRIVE: STALLED. LIFE SUPPORT: FLICKERING. HULL: 61 PERCENT. *(4.1 s)*
2. **RATHATRI:** Hold together, you rust-eaten coffin. Hold. *(3.3 s)*
3. **COMM:** (static) Unknown freighter, identify yourself. *(2.9 s)*
4. **RATHATRI:** Nobody comes to this moon. That's the only reason I came. *(5.2 s)*
5. **CAPTION:** Dxun. The demon moon of Onderon. Its jungle keeps what it is given. *(6.0 s)*
6. **RATHATRI:** A moon of beasts and dead Sith. I've lived in worse pens. *(5.6 s)*

### 2.2 - Dxun: causeway ambush on a Trandoshan slaver party

`2_2_bosskarr_ambush`

1. **BOSSKARR:** Scorekeeper watches. Who walks into my hunt-road? *(3.7 s)*
2. **RATHATRI:** Your road ends here, lizard. Open the cargo hold. *(4.5 s)*
3. **BOSSKARR:** Pit-thing. Vak's favorite. I remember your stink. *(3.7 s)*
4. **RATHATRI:** Then you remember I'm still alive. Your cargo can't say the same. *(5.6 s)*
5. **BOSSKARR:** Cargo counts little. Scorekeeper counts every breath. *(3.7 s)*
6. **SYS:** Guards down. Bosskarr's rifle lies in the mud. *(4.1 s)*
7. **BOSSKARR:** Kill me, or hear the Scorekeeper's terms. *(cam: Bosskarr on his knees, scarred snout; 3.7 s)*

> **[choice: A/B] The Trandoshan kneels. Spare him, or end his tally?**
>
> - **A.** Speak your terms. *Consequence:* Life-debt sworn. Bosskarr serves; slaver intel and merchandise unlocked. *Next:* `2_2a_life_debt_oath`
>
> - **B.** End your tally, lizard. *Consequence:* Bosskarr dies. His ships break orbit. Merchandise lost. HEAT +5. *Next:* `2_2b_tally_broken`

### 2.2a - Dxun causeway: the life-debt oath

`2_2a_life_debt_oath` - branch of `2_2_bosskarr_ambush` - reached from `2_2_bosskarr_ambush` choice A

1. **BOSSKARR:** Life spared. Life owed. The Scorekeeper writes it in the ledger. *(5.2 s)*
2. **BOSSKARR:** Your breath now sits in my blood. I carry your hunt. *(5.2 s)*
3. **BOSSKARR:** Bosskarr, tally-keeper of Jagganath's Fang. Skullrender and Stalker's Shadow answer my tally. *(5.6 s)*
4. **RATHATRI:** Terms. Merchandise first. Force-sensitives, not scrap. *(3.3 s)*
5. **BOSSKARR:** Force-things. Two in my hold now. More after the next hunt. *(5.2 s)*
6. **BOSSKARR:** Trandoshan ledger never lies. The Scorekeeper forgets nothing, not even your face. *(5.6 s)*
7. **RATHATRI:** Then keep your mouth shut about my face. *(4.1 s)*
8. **BOSSKARR:** Silence is also a mark. The Scorekeeper counts it. *(4.5 s)*
9. **RATHATRI:** Then count this. Break the oath and I take your ledger and your tail. *(6.4 s)*
10. **BOSSKARR:** Oath is mine. Life-debt, until I die or you do. *(cam: Bosskarr lowers his head; 4.8 s)*

### 2.2b - Dxun causeway: the tally ends

`2_2b_tally_broken` - branch of `2_2_bosskarr_ambush` - reached from `2_2_bosskarr_ambush` choice B

1. **BOSSKARR:** The Scorekeeper marks you, Sith-thing. Marks you for the next hunt. *(5.2 s)*
2. **SYS:** Bosskarr's last breath. Skullrender and Stalker's Shadow break orbit. *(4.5 s)*
3. **CAPTION:** The slave runs on Dxun go quiet. A blood-feud begins. *(4.8 s)*
4. **RATHATRI:** Let them come. I'll tally every one of them. *(4.5 s)*

### 2.3 - Dxun deep jungle: the recruits' trial

`2_3_starving_beast`

1. **RATHATRI:** Five recruits. One ration pack each, and a temple at the end of the trail. *(6.8 s)*
2. **RECRUIT:** Please. We'll follow you. We'll follow. *(3.3 s)*
3. **RATHATRI:** You'll follow. I know. That's the problem with followers. *(4.5 s)*
4. **RECRUIT:** Her leg is broken. She can't keep up with us. *(4.8 s)*
5. **RATHATRI:** Then the jungle decides. Not me. Not you. *(4.1 s)*
6. **SYS:** Predator scent: maalraas pack, 300 m. Weak prey draws them. *(cam: wide, canopy; 4.8 s)*

> **[choice: A/B] The wounded will not reach the temple. Decide.**
>
> - **A.** Leave them to the jungle. *Consequence:* Survivors' loyalty +5. The wounded are lost. HEAT 0. *Next:* `2_4_first_artifact`
>
> - **B.** Cull the wounded before the predators do. *Consequence:* Survivors' fear +10. Loyalty bought with terror. *Next:* `2_4_first_artifact`

### 2.4 - Dxun: tomb fringe, roots over a buried holocron

`2_4_first_artifact` - reached from `2_3_starving_beast` choice A, `2_3_starving_beast` choice B

1. **SYS:** ECHO DETECTED. Hold Tab to pulse the roots. *(4.1 s)*
2. **CAPTION:** Under the tomb roots, something whispers. *(cam: dig site, pulse ring; 3.3 s)*
3. **HOLOCRON:** Not... the hand. It was never Milian's hand. *(4.1 s)*
4. **HOLOCRON:** She kept the names from you. Ask her what she hid. *(5.2 s)*
5. **RATHATRI:** Who are you? Show yourself. *(2.9 s)*
6. **HOLOCRON:** The one before you. Breathe, and I will be quiet. *(4.8 s)*
7. **RATHATRI:** Then talk while I breathe. Who was first? *(4.1 s)*
8. **HOLOCRON:** First burned, last forgotten. Like all her students. *(4.1 s)*
9. **SYS:** Corrupted Holocron secured. Visions unlocked. Force regen +10 percent. *(4.5 s)*
10. **RATHATRI:** I'll find the rest of your lesson, and decide if it's true. *(5.6 s)*

### 2.5 - Dxun temple: command table, Traya's holocron wakes

`2_5_traya_judgment`

1. **CAPTION:** The holocron wakes. A hooded figure turns toward him. *(cam: orbit around holocron; 4.5 s)*
2. **TRAYA:** Is the death of the Jedi enough? *(3.7 s)*
3. **TRAYA:** What will you do once they are gone? *(4.1 s)*
4. **TRAYA:** What form will your power take? *(3.3 s)*
5. **RATHATRI:** I haven't decided. I suppose you'll tell me. *(4.1 s)*
6. **TRAYA:** Your connection to the Force is undeniable. It seethes with hatred, pulses with desperation. *(6.4 s)*
7. **TRAYA:** Yet, it is akin to a caged beast, unleashed with force but little direction. *(6.4 s)*
8. **RATHATRI:** Then give it direction. Teach me. *(3.3 s)*
9. **TRAYA:** Teaching is not what I do. I sharpen. There is a difference, and you will learn it in blood. *(8.3 s)*
10. **TRAYA:** Do you understand the difference between using the dark side, and being consumed by it? *(6.8 s)*
11. **RATHATRI:** I was eaten by a pit for years. Ask the pit. *(5.2 s)*
12. **SYS:** Upgrade tree unlocked: THE CAGE. *(2.9 s)*

### 2.6 - Dxun north ridge: a bounty hunter pair drops in

`2_6_first_hunters`

1. **COMM:** Two hunter drops on the north ridge. Jet packs warm. *(4.8 s)*
2. **ROE:** Bounty's on a rumor. Pays well. Dead or breathing, same fee. *(5.2 s)*
3. **ROE:** Smells like a Sith, sounds like a cave. Let's go, partner. *(5.2 s)*
4. **HUNTER:** Ghost in the canopy. Check your left. *(3.7 s)*

> **[choice: A/B] Two hunters hover over the clearing. Who hunts whom?**
>
> - **A.** Ambush from the canopy. *Consequence:* Both hunters down. HEAT +2. Trophy: first hilt on the wall. *Next:* `3_1_ambria`
>
> - **B.** Let the boma pack take them. *Consequence:* Hunters vanish into the ferns. Trophy: first hilt on the wall. HEAT 0. *Next:* `3_1_ambria`

## Act III - Echoes of Betrayal

### 3.1 - Ambria: obsidian lakes and the echo of a rival-lord duel

`3_1_ambria` - reached from `2_6_first_hunters` choice A, `2_6_first_hunters` choice B

1. **CAPTION:** Ambria. Obsidian lakes. Two rival lords, one dead ground. *(cam: wide over glassy lake; 4.5 s)*
2. **TRAYA:** You fixate on the echoes of these so-called legends, not the reality of their rise. *(6.8 s)*
3. **TRAYA:** Do you think they were born masters? *(3.7 s)*
4. **TRAYA:** They crawled through filth, betrayed and were betrayed, lost more than they ever gained. *(6.4 s)*
5. **TRAYA:** Do you see their empires now? Dust and echoes. *(4.5 s)*
6. **TRAYA:** Are you willing to sacrifice everything and leave behind the same? *(5.2 s)*
7. **RATHATRI:** Two lords, one knife. Look at the ground where the second bell rang. *(6.0 s)*
8. **SYS:** Echo: rival lords duel. Betrayal at the second bell. *(4.5 s)*
9. **RATHATRI:** It's crying. The crystal is crying. *(3.3 s)*
10. **TRAYA:** Then listen to it. Do not let it sing for you. *(5.2 s)*
11. **CAPTION:** Tainted Kyber secured. Rage surge unlocked (V). Each use ticks corruption. *(5.2 s)*

### 3.2 - Outer Rim wreck field: Force domination of a Sith Interceptor

`3_2_the_seizure`

1. **COMM:** Umbral Wake, port thruster is walking! Somebody answer me! *(4.5 s)*
2. **DONN:** Lieutenant Donn, Umbral Wake. Mayday! Stabilizers aren't holding! *(4.1 s)*
3. **SYS:** DOMINATE channel: hold T for 2.5 seconds. Any hit cancels. *(4.8 s)*
4. **TRAYA:** Do not seize the hull. Seize the will that holds it. Find the cracks. *(6.4 s)*
5. **RATHATRI:** Port engine. There. The weak flaw. Feed it. *(4.1 s)*
6. **DONN:** It's pulling me! I have the stick, I have the... no. No! *(5.6 s)*
7. **TRAYA:** Feed on the terror, not the wound. Their panic is your current. *(5.6 s)*
8. **DONN:** I was promoted two weeks ago. Please, I'm twenty-one... *(4.5 s)*
9. **RATHATRI:** Then you'll be the youngest name on my wall. Hold still. *(5.2 s)*
10. **SYS:** Engine breach. Tractor beam engaged. Interceptor secured. *(3.7 s)*
11. **CAPTION:** The Umbral Wake drops out of the sky and into the Harbinger's grip. *(6.0 s)*
12. **RATHATRI:** Nightbringer. Burn the old name off the hull. *(cam: Harbinger bridge, crimson glow; 4.1 s)*

> **[choice: A/B] The lieutenant is still breathing in the wreck. Decide.**
>
> - **A.** Drag the lieutenant out alive. *Consequence:* Interrogation intel on Jedi patrols. HEAT -2. *Next:* `3_3_raxus`
>
> - **B.** Leave him in the drifting hulk. *Consequence:* The rumor spreads: fear +10. HEAT +4. *Next:* `3_3_raxus`

### 3.3 - Raxus Prime: Confederacy ruins under an ash-grey sky

`3_3_raxus` - reached from `3_2_the_seizure` choice A, `3_2_the_seizure` choice B

1. **CAPTION:** Raxus Prime. Confederacy ruins under an ash-grey sky. *(cam: ruin, rain of ash; 4.1 s)*
2. **DB:** Statement: Jedi forms are predictable, Master. Predictable is fatal. *(4.5 s)*
3. **DB:** Query: Shall I catalogue the Raxus dead, or the Raxus forms? *(5.2 s)*
4. **RATHATRI:** The forms. The dead can wait in your memory banks. *(4.8 s)*
5. **DB:** Affirmative. Analysis: parry windows telegraph. Breathing before a strike is a confession. *(5.6 s)*
6. **RATHATRI:** Then show me their confession. *(2.9 s)*
7. **DB:** Statement: Pattern-breaking is cheaper than strength. Strike the rhythm, not the wrist. *(5.6 s)*
8. **TRAYA:** Thousands died here. Their despair ripples. Learn to ride the ripple. *(5.2 s)*
9. **SYS:** PATTERN-BREAKER acquired. Jedi parry windows now telegraphed to you. *(4.5 s)*

### 3.4 - Raxus Prime: foundry hall, Celene Tryst's first duel (boss)

`3_4_celene_duel_1`

1. **CAPTION:** Raxus foundry hall. Celene Tryst has tracked the rumor. *(cam: wide, conveyor lines; 4.5 s)*
2. **CELENE:** You're the one who ran from Milian's sanctum. Hiding, or waiting? *(5.2 s)*
3. **RATHATRI:** I don't hide. Ask the dead witch. *(3.7 s)*
4. **CELENE:** Kyros said you'd run. I said you'd crawl first. *(4.5 s)*
5. **RATHATRI:** Then you'll learn what crawling costs. *(3.3 s)*
6. **CELENE:** Show me what you learned from Milian's blood. *(4.1 s)*
7. **CELENE:** You fight like a stray with a stolen blade. Predictable. *(4.8 s)*
8. **RATHATRI:** Predictable ends at a trap. Your footing, Padawan. Not mine. *(4.8 s)*
9. **SYS:** Conveyor collapse. Celene staggers, then rises, bleeding. *(3.7 s)*
10. **CELENE:** You cheated. *(1.8 s)*
11. **RATHATRI:** I survived. The rest is just words. *(3.7 s)*
12. **CELENE:** There's no honor in a trap. *(3.3 s)*
13. **RATHATRI:** There's no honor in a corpse, Padawan. Ask Milian's. *(4.5 s)*
14. **CELENE:** Next time, I won't give you the ground. *(4.1 s)*
15. **TRAYA:** Your victories hinge on your victims' mistakes, not your mastery. *(4.8 s)*
16. **TRAYA:** You exploit terrain, manipulate the weak-minded. *(3.3 s)*
17. **TRAYA:** Face a truly disciplined foe, and your skill crumbles like the ruins you cling to. *(6.8 s)*
18. **CAPTION:** Training arc unlocked. Celene Tryst survives. *(3.3 s)*

### 3.5 - Dxun temple: study hall and assassin dispatch board

`3_5_rebuild`

1. **CAPTION:** Dxun temple. The study hall smells of ozone and old incense. *(cam: log board; 5.2 s)*
2. **EREN:** Milian leaned left twice. A man who leans gets knocked over. *(5.2 s)*
3. **VAARA:** Kyros never overextends. Except once. Look at this frame. *(4.5 s)*
4. **RATHATRI:** Milian let him see the pattern. Then she taught him the lesson wrong. *(6.0 s)*
5. **EREN:** Then nobody sees ours. Burned fields grow back, if you hide the fire. *(6.0 s)*
6. **VAARA:** Give me a target. I'd rather bleed for you than sit in this temple. *(6.4 s)*
7. **CAPTION:** Dispatch board open. Available: Vaara, Eren, and the Elite Five. *(4.8 s)*
8. **SYS:** Pattern analysis: match three openings to unlock the Kyros lesson. *(4.8 s)*

## Act IV - The Shroud

### 4.1 - Krayiss II: dead forest, a warm ritual circle

`4_1_krayiss`

1. **CAPTION:** Krayiss II. A dead forest of bone-white bark. One ritual circle, still warm. *(cam: ritual ground; 6.0 s)*
2. **TRAYA:** Focus is a blade. Dull it with fear, and it will not cut your own hand. *(7.2 s)*
3. **TRAYA:** Isolation is strength only until it becomes your cage. *(4.5 s)*
4. **RATHATRI:** The binding. What is the price for a zakkeg guardian? *(4.8 s)*
5. **TRAYA:** A night of your sleep. And a fragment of your certainty. *(5.2 s)*
6. **RATHATRI:** Hold still, beast. You're mine now. Breathe with me. *(4.5 s)*
7. **SYS:** Ritual of Binding: stage 2 of 3. Hold the sigil steady. *(5.2 s)*
8. **CAPTION:** Zakkeg guardian bound. Base defense events unlocked. *(3.7 s)*

### 4.2 - Lenico IV: reality folds, sensory illusions

`4_2_lenico`

1. **CAPTION:** Lenico IV. Reality folds like wet cloth. Energy readings scream. *(cam: aurora, distortion; 4.8 s)*
2. **MILIAN:** Rathatri. The parasite, still crawling after me? *(3.7 s)*
3. **RATHATRI:** You're not her. She's ash on Zx34. *(3.7 s)*
4. **MIRROR:** Then what are you, Rathatri? A pit slave with a borrowed blade. *(5.6 s)*
5. **RATHATRI:** Mirror. Shatter. *(1.8 s)*
6. **TRAYA:** Do not fear the mirror, Rathatri. Wonder what it sees. *(4.8 s)*
7. **MIRROR:** You still flinch when the whip cracks. I was always watching. *(5.2 s)*
8. **RATHATRI:** Then watch this. *(cam: strike through the mirror; 2.2 s)*
9. **SYS:** Illusions dispelled. Mask of Despair acquired: Jedi seekers lose lock. *(4.8 s)*

### 4.3 - Dxun landing ring: seven assassins and the Shroud descends

`4_3_the_shroud`

1. **CAPTION:** Dxun landing ring. Seven assassins stand in a circle. Above, a shape comes down through the canopy. *(cam: wide, the Shroud descends; 7.5 s)*
2. **RATHATRI:** Seven knives. One Shroud. Which of you do I trust? *(4.8 s)*
3. **VAARA:** Trust the one who bleeds for you. *(3.7 s)*
4. **EREN:** Trust the one who never needs to be asked twice. *(4.8 s)*
5. **IRRIN:** We kneel to the Shroud. We kneel to you once you've earned it. *(6.0 s)*
6. **SSARRA:** The ledger says you owe us rest. Pay it, or we keep counting. *(6.0 s)*
7. **DORN:** Name the target. I'll count the dead, same as always. *(4.8 s)*
8. **PELL:** I drew the enclave's map myself. I can walk it blind. *(5.2 s)*
9. **MESK:** I've never seen a Jedi. I hope they're slower than the holovids. *(5.6 s)*
10. **RATHATRI:** Then earn yourselves a place in my shadow. Every one of you. *(5.6 s)*
11. **CAPTION:** The Shroud descends. Vantablack hull. Stealth runs add no HEAT. *(4.8 s)*
12. **TRAYA:** A shroud is a kindness only to the one who hides beneath it. *(6.0 s)*

### 4.4 - Onderon: Iziz streets, the tomb key-fragment vault

`4_4_iziz_strike`

1. **CAPTION:** Onderon. Iziz streets. The tomb key lies in the city's oldest vault. *(cam: city verticality; 5.6 s)*
2. **KEEL:** Contact! Sith on the north bridge. Shields up! *(4.1 s)*
3. **KEEL:** Target is a Sith. Repeat, Sith. Form the shield wall. *(4.8 s)*
4. **RATHATRI:** Your line is shorter than your hope, Sergeant. *(4.1 s)*
5. **KEEL:** Hope's got armor, Sith. Your mouth doesn't. *(3.7 s)*
6. **KEEL:** Shield wall! Shields up, form on me! *(3.7 s)*
7. **RATHATRI:** You're the wall, Sergeant. I'm the crack in it. *(4.5 s)*
8. **KEEL:** Shield's down! Medic, shield's down! Hold the line! *(4.1 s)*
9. **RATHATRI:** Lay down the shield and live. *(3.3 s)*
10. **KEEL:** Tell the Republic... the Sith came through the wall. *(4.5 s)*
11. **CAPTION:** Tomb key-fragment recovered. Militia pursuit raises HEAT. *(3.7 s)*

### 4.5 - Dxun: the iron mausoleum and Freedon Nadd's spirit

`4_5_nadds_tomb`

1. **CAPTION:** Dxun. The iron mausoleum. Spiked bastion, obsidian steps. *(cam: iron gates; 4.1 s)*
2. **NADD:** Who disturbs the iron? Who stirs the dead? *(4.1 s)*
3. **RATHATRI:** A student, my lord. Looking for a teacher. *(4.1 s)*
4. **NADD:** I was a lord once. Your kind crawls through my halls and calls it wisdom. *(6.8 s)*
5. **RATHATRI:** Then show me the way down, Lord Nadd. Teach me wisdom. *(5.2 s)*
6. **NADD:** Prove the hunger, and the shard is yours. Walk the orbalisk stairs. *(5.6 s)*
7. **SYS:** Orbalisk spores in the air. Keep moving. *(3.7 s)*
8. **CAPTION:** Freedon Nadd's holocron shard acquired. *(2.9 s)*
9. **KYROS:** Dxun. The Nadd tomb has woken. I felt it in my bones. *(5.6 s)*
10. **KYROS:** Gather the cell. We go to the demon moon. *(4.5 s)*
11. **CELENE:** Master, is the Sith ours to end? *(3.7 s)*
12. **KYROS:** All Sith are ours to end, Padawan. This one first. *(4.8 s)*

## Act V - Darth

### 5.1 - Dxun temple: the Kyros hunt cell assaults the base

`5_1_base_siege`

1. **KYROS:** Surrender the temple, Sith. Or we burn the jungle around it. *(5.2 s)*
2. **RATHATRI:** You'll have to find the temple first, Battlemaster. *(4.1 s)*
3. **SYS:** WARD STONE: hold the sequence. Three keys, one chance each. *(4.8 s)*
4. **IRRIN:** We hold, Lord! For the Shroud! *(cond loyalty:high; 3.3 s)*
5. **IRRIN:** Find your own grave, Rathatri. I'm not your shield anymore. *(cond loyalty:low; 4.8 s)*
6. **VAARA:** I hold the east stair. Go to the altar and finish the ward. *(cond loyalty:high; 6.0 s)*
7. **VAARA:** My blades are cold. Hold your own ward, Lord. *(cond loyalty:low; 4.5 s)*
8. **EREN:** I stand because I'm not finished with the Jedi yet. *(cond loyalty:high; 4.8 s)*
9. **EREN:** Fear is the only thing keeping my feet here. Fear is a poor master. *(cond loyalty:low; 6.4 s)*
10. **SYS:** Ward malfunction. Sparks. The stone flickers. *(3.3 s)*
11. **SYS:** Zakkeg guardian unleashed. *(2.2 s)*
12. **CAPTION:** HEAT 100. The hunt cell is inside the walls. *(4.5 s)*

### 5.2 - Dxun temple, Nadd crypt: Aiden Kyros, three phases

`5_2_kyros_boss`

1. **KYROS:** I have buried better Sith than you, Rathatri. Each one swore he was different. *(phase 1; 6.4 s)*
2. **KYROS:** Your rage is loud. Your footwork is louder. *(phase 1; 4.1 s)*
3. **RATHATRI:** I don't need quiet. I need you dead. *(phase 1; 4.1 s)*
4. **KYROS:** Breathe, Sith. Your rage is a window, and I can see through it. *(phase 2; 6.0 s)*
5. **KYROS:** Battle meditation. Hold. Let your anger show me its shape. *(phase 2; 4.8 s)*
6. **RATHATRI:** Shape? You'll see the shape of my blade. *(phase 2; 4.1 s)*
7. **KYROS:** Let go of it. The blade is not yours. It never was. *(phase 3; 5.6 s)*
8. **KYROS:** Disarm. Breathe. Stand down, and die a Jedi's enemy, not a Sith's tool. *(phase 3; 6.0 s)*
9. **RATHATRI:** I die a Sith. You'll be the reason. *(phase 3; 4.1 s)*
10. **SYS:** DISARM: time the blade-lock. Break the grip on his hilts. *(4.8 s)*
11. **KYROS:** You fought like a rumor, Sith. Let the Order remember your name. *(5.6 s)*

### 5.3 - Dxun ruined altar: Celene arrives on foot, her saber dark

`5_3_celene_choice`

1. **CAPTION:** The ruined altar. Celene arrives on foot, her saber dark. *(cam: Celene in grey knight robes; 4.8 s)*
2. **CELENE:** The enclave's gone. The Wellspring took them. They turned on each other. *(5.6 s)*
3. **CELENE:** Halun Tesk couldn't stop seeing his own fear. I couldn't reach him. *(5.6 s)*
4. **RATHATRI:** You came alone. That's the first wise thing your Order taught you. *(5.6 s)*
5. **CELENE:** Kyros is dead. You did that. You did all of it. *(5.2 s)*
6. **RATHATRI:** Yes. Now say what you want. Say it. *(4.1 s)*
7. **CELENE:** I want nothing you can give me, Sith. *(4.1 s)*

> **[choice: A/B] The Padawan is at your feet. What is her end?**
>
> - **A.** Execute her. Add her hilt to the wall. *Consequence:* Trophy gained. Celene dies. Path: Execute. Sets `celene=execute`. *Next:* `5_4_darth_question`
>
> - **B.** Corrupt her. Make her kneel to the Shroud. *Consequence:* Celene kneels, broken and loyal. Path: Corrupt. Sets `celene=corrupt`. *Next:* `5_4_darth_question`

### 5.4 - Dxun command table: Traya's final judgment

`5_4_darth_question` - reached from `5_3_celene_choice` choice A, `5_3_celene_choice` choice B

1. **CAPTION:** Celene's end, as chosen. *(cam: altar, Celene's fate; 2.5 s)*
2. **CELENE:** Tell Kyros... I did not kneel. *(cond celene:execute; 3.3 s)*
3. **CELENE:** Yes, Lord Rathatri. Whatever you command. *(cond celene:corrupt; 3.3 s)*
4. **TRAYA:** Look at your circle, Rathatri. Seven knives, each one waiting for your mistake. *(6.0 s)*
5. **TRAYA:** The title 'Darth' is earned by crushing those who came before, not by saying it. *(6.8 s)*
6. **TRAYA:** Are you ready to murder your own assassins for this hollow title? *(5.6 s)*
7. **TRAYA:** Perhaps taking the title will inflame your ambition further. *(4.5 s)*
8. **TRAYA:** Or accelerate your own self-destruction. A fascinating experiment. *(4.1 s)*

> **[choice: A/B] Claim the title over their kneeling loyalty, or purge them for their fear?**
>
> - **A.** Claim the title. Keep the kneeling blades. *Consequence:* The assassins kneel and you accept the name. *Next:* if execute -> `end_a_reaper`, if corrupt -> `end_true_darth`
>
> - **B.** Purge the roster. Fear is loyalty enough. *Consequence:* The roster falls. You stand alone with the title. *Next:* if execute -> `end_dark_warrens`, if corrupt -> `end_b_corrupter`

## Endings

Each ending card is three slides. The card is chosen by the 5.3 and 5.4 flags (see the table above).

### Ending A: Execute + Claim

`end_a_reaper`

1. **CAPTION:** The Shroud rises over Dxun. The Jedi have a new name for their fear. *(6.4 s)*
2. **CAPTION:** You killed the Order's last symbol and kept the cult. The rebuild learns to fear your ships. *(7.5 s)*
3. **CAPTION:** THE REAPER OF THE REBUILD. *(2.9 s)*

### Ending B: Corrupt + Purge

`end_b_corrupter`

1. **CAPTION:** Celene kneels in the ash of the enclave, her light a candle you relit as your own. *(7.5 s)*
2. **CAPTION:** Your assassins are dust. Her faith is the only blade you have left, and she keeps it sharp. *(7.9 s)*
3. **CAPTION:** THE CORRUPTER. *(1.8 s)*

### Ending True: Corrupt + Claim

`end_true_darth`

1. **CAPTION:** The Dxun canopy closes over the temple. The kneeling blades rise as one. *(6.0 s)*
2. **CAPTION:** Traya's holocron dims: a fascinating experiment. The title is yours, for now. *(5.6 s)*
3. **CAPTION:** DARTH RATHATRI. *(1.8 s)*

### Ending Dark: Execute + Purge

`end_dark_warrens`

1. **CAPTION:** The assassins' niches stand empty. The Shroud launches with no crew to answer its bell. *(6.8 s)*
2. **CAPTION:** Only the zakkeg keeps watch at the threshold. No one is left to tell your story. *(7.2 s)*
3. **CAPTION:** ALONE IN THE WARRENS. *(2.5 s)*

## In-mission barks

Sixty short lines per faction, grouped by type: taunts (20), pain (15), idle (15), callouts (10). `script.json` stores them as flat lists in the same order.

### Republic militia commandos (`commando`)

**Taunts**

1. Your hunt ends at the Republic perimeter, Sith.
2. Hold fire! I want him breathing for the tribunal.
3. Shields up! Target is a Sith. Repeat, Sith.
4. Smile for the holo, Sith. Your face is on a warrant.
5. The Republic sends its regards. Mostly through our rifles.
6. Paperwork says you're dead. Let's make it official.
7. No more rumors. Just a body for the slab.
8. We don't negotiate with dark-side trash.
9. Form on me! Crossfire on the bridge!
10. Move up, cover the left flank!
11. You're a rumor with a pulse. Let's fix that.
12. Lay down your blade. Republic law applies.
13. This is Republic militia. Surrender or be cleared.
14. Target spotted, north ruin. Converge!
15. Fire discipline! Don't waste the cells!
16. Your temple's sealed. Your tomb's ours now.
17. We're not cutting you down clean. Hold still.
18. Sergeant says you're worth a medal. Pity it's posthumous.
19. Eyes on the Sith. Ignore the screaming. Keep firing.
20. We don't retreat, Sith. We advance.

**Pain**

1. Medic! I'm hit! Left side!
2. Armor's cracked. I'm still on my feet.
3. Shield's down! Get me behind the crate!
4. Rifle's cooked. Switching to sidearm!
5. Tell my squad I held the bridge.
6. Kriff, that burned. Keep firing!
7. Pull me back! Don't leave me on the stone!
8. Ow. Ow. Ow. Okay, I'm up.
9. Sarge, I'm bleeding out here!
10. That Force push threw me into the wall.
11. Armor's holding. Mostly. Keep moving!
12. Hand's numb. Switching grips.
13. Still breathing, still firing!
14. Visor's fogged! Clear it, somebody!
15. Good hit, Sith. I'll remember that.

**Idle**

1. Eyes open. Sector clear. Mostly.
2. Anybody else hear drums in the trees?
3. Count your magazines before you count kills.
4. Quiet out here. Too quiet.
5. Check the south tomb. Sith love tombs.
6. Clear the next room, then clear it again.
7. Take the ledge. Watch the stair.
8. Comm check. Sound off, one by one.
9. Keep the line tight, shoulder to shoulder.
10. Rumors don't bleed. Remember that when you aim.
11. Hold position. Wait for the Jedi signal.
12. This moon eats boots. Watch your footing.
13. Rations cold. Mission colder. Stay sharp.
14. Who sent a warrant for a Sith? Nice work.
15. Sergeant says we stay till the ritual's broken.

**Callouts**

1. Flank! Two on the causeway!
2. Grenade out! Get down!
3. Reloading! Cover me!
4. Shield wall forming! Hold!
5. Target retreating north! Pursue!
6. Plasma charge primed! Clear!
7. Medic, reposition to the east steps!
8. Heavy in the ruins! Use the crates!
9. Crossfire! Keep the lane open!
10. Sith on the ridge! Fire!

### Bounty hunters (`bhunter`)

**Taunts**

1. Price just went up, Sith. Dead or breathing.
2. Bounty's posted. I'm collecting. Hold still.
3. Credits don't care who killed you, friend.
4. Nice rumor. Shame it's about to be a corpse.
5. Easy money, slow way. Let's make it quick.
6. Your head's worth more than your temple, Sith.
7. I've killed bigger rumors before breakfast.
8. Whip's out. Time to fetch the prize.
9. Jet's warm. Watch me come down on you.
10. Nobody hires me to be merciful.
11. Ooh, shiny saber. I'll take it for scrap.
12. Bounty's posted in four systems. Lucky you.
13. I'll bring your ears in a box. Standard fee.
14. Fifty for your head. A hundred for the hilt.
15. Hold position, Sith. Let me work.
16. Dead Sith don't argue about the fee.
17. Pay me now, or pay the next one.
18. Your temple's a lot of bones for one tomb.
19. Easy bounty, hard bounty. Same paycheck.
20. Come out, come out, Sith. Your fee is waiting.

**Pain**

1. Ow! Armor's a joke, I swear!
2. That whip... my shoulder's gone!
3. My jet's sparking, dang it!
4. Who taught you to hit like that?
5. Okay, okay. Bounty's a bad idea.
6. I'm bleeding for scrap, Sith!
7. Fast for a rumor. Rough, rough.
8. Medkit! Somebody sign for it!
9. That's cutting my fee in half!
10. Argh! My jetpack's on fire!
11. Fine. I'll retreat and bill you later.
12. My ribs. My pride. Mostly my ribs.
13. That's a clean shot. Respect.
14. Still standing, Sith. Still standing!
15. Hurts! Next round's on me, though.

**Idle**

1. Dry rain, wet jungle, cold dinner. Standard.
2. Check the board again. Maybe he's worth more.
3. Nobody pays for patience. Move, friend.
4. Contract says alive preferred. Bonus for alive.
5. Jet fuel's expensive. Make the fight count.
6. Tracker's blinking. He's in the trees.
7. This sector smells like a bad contract.
8. Every Sith has a price. Find the number.
9. Snare's set. Walk into it, please.
10. Ask the Hutts what they'd pay for his ears.
11. Breathe. Count the credits. Breathe again.
12. Got a scent. Smells like a lie.
13. Paid by the hour, dead by the minute.
14. Rumors pay, rumors die. Let's get paid.
15. I'll wait. Waiting is also a job.

**Callouts**

1. Flanking left! Keep him in the open!
2. Jet dash incoming! Watch the ground!
3. Whip out! Stay clear of the cord!
4. Flamer warming up! Back off!
5. Cover me, I'm reloading!
6. Target's in the trees! Shoot!
7. Drop him before he reaches the stairs!
8. Ambush the ridge! Hold!
9. Vulture circling! Stay sharp!
10. On my signal, we take him alive!

### Jedi hunters (`jhunter`)

**Taunts**

1. Your fear is loud, Sith. I hear it from here.
2. The Order sent its best. You are merely the last.
3. I sense the echo of your master in your blade.
4. Turn from the dark. Then the Force may spare you.
5. You have killed many. The Force remembers each one.
6. Your hatred has a scent. I follow it.
7. Hold, Sith. There is still a choice to make.
8. Do you feel the light? It is no longer afraid of you.
9. I see the cracks in your center. Ready yourself.
10. Kneel, or stand and be undone.
11. You rage like a child. Calm yourself.
12. The Jedi were broken once. We remember that.
13. I will not spill your blood needlessly.
14. Your power is a wound. Let me close it.
15. The darkness has a sound. Yours is screaming.
16. We are not the Order that fell. We rebuild.
17. Your shadow walks ahead of you. It is weak.
18. Stop running. The Force tires of your pattern.
19. Feel the center. Let it pull you back to me.
20. I have seen the last of your kind. You are next.

**Pain**

1. The Force wavers. I falter.
2. My center is gone! Find it for me!
3. Your blade is cold, Sith.
4. Shield failing. Hold my line!
5. The light dims... only for a breath.
6. Good strike, Sith. Good strike.
7. Pain is a teacher. I will listen.
8. Focus broken. Cover me!
9. The echoes call me. Let me rest.
10. I can still sense you. Still sensing.
11. My hand. I cannot hold the hilt.
12. The Force hurts. It always hurts near you.
13. Hold the line for the Order!
14. I will return, Sith. I always do.
15. You do not win. You merely continue.

**Idle**

1. Breathe. The forest breathes with you.
2. The seeker says the pulse is here. Look closer.
3. A pulse echoes under the stone. Listen.
4. Still water, still mind. We wait.
5. Do not rush the pattern. Watch the leaves.
6. A Sith's footstep leaves a mark in the Force.
7. Find the center. Then find him.
8. The echoes thicken here. Be careful.
9. Hush. Listen to what the jungle says.
10. Your fear reveals your path, Sith.
11. We were a light once. We will be again.
12. Stay calm. Calm is the true weapon.
13. Dark echoes at the tomb. Mark the spot.
14. I sense the mask, and the mask senses me.
15. Patience. The Force hides nothing from us.

**Callouts**

1. Seeker to all: the pulse is north!
2. Flank! Use the Force to shield the line!
3. Pull him from the altar! Now!
4. Push him off the ledge! Strike!
5. Focus on the center! Do not waver!
6. Sith using the terrain! Adjust!
7. Break his rhythm! Feint left!
8. Converge on the echo! Hold!
9. Cut off his retreat! Block the path!
10. Saber lock! Hold him where he stands!

### Sith assassins, allies (`assassin`)

**Taunts**

1. Your Order is already a corpse. We dig the graves.
2. The Shroud sees you. It has watched for days.
3. Come closer. The dark is kind to the patient.
4. The temple is ours now. Go kneel in it.
5. Feel the cold? That is our blade's breath.
6. Milian's apprentice will wipe that smile away.
7. Let your light hunt you. Let it come.
8. Every step you take, a knife is listening.
9. We're shadows. You were watching the wrong tree.
10. Pick a hilt, Jedi. We'll bury it.
11. The Harbinger's name is ours. So is your grave.
12. Your prayers taste bitter. Keep them.
13. We don't kill fast. We kill finally.
14. One breath, one cut. That is the whole lesson.
15. The dark does not ask permission, Jedi.
16. You left your back open. We noticed.
17. The rumor you chase stands behind you.
18. You fight like the Order: loud and late.
19. Our master does not forgive. Neither do we.
20. Pick your last breath carefully, Jedi.

**Pain**

1. Hold the line! Don't let him through!
2. Hurt, not down. Still striking.
3. Blade's cracked. Switching to the pike!
4. Vaara, cover my left side!
5. Shield's cooked. Eren, take it!
6. Cut my arm, I still bite.
7. I'll bleed for the Shroud. It's worth it.
8. Next round, we finish this together.
9. Stealth down! Get behind the pillar!
10. Pain is a lesson. I've learned it before.
11. Don't drag me. Keep fighting!
12. I'm fine. Keep the lane open.
13. Falling back to the altar! Cover me!
14. My mask's cracked. My face is cold.
15. I will not fall in the open. Not here.

**Idle**

1. Silence is the weapon. Keep it.
2. Count the exits. Count them again.
3. Whisper to the stone. It listens back.
4. The stealth field flickers. Check the generator.
5. Rain brings the scent. Track him by it.
6. The Lord's holocron is watching. Do not fail.
7. Don't stare at the sky. The sky is empty.
8. Keep your pike level. Keep your breath slow.
9. Patience. Prey always walks back to its den.
10. The ward hums. Dangerous. Stand back.
11. The base smells of smoke. Good.
12. I can still hear the Padawan's voice. Ignore it.
13. Stop sleeping in the niche, Irrin. It's rude.
14. Our names are carved in the stone. Remember them.
15. Breathe through the mask. In. Out. Hold.

**Callouts**

1. Flank the north stair! Move!
2. Stealth field up! Drop back!
3. Pike in! Strike the throat!
4. Dagger out! Sleeve clear!
5. Overwatch on the canopy! Eyes up!
6. Lure him to the trap! Keep moving!
7. Converge on Lord Rathatri! Shield him!
8. Cut the rope! Drop the Jedi!
9. Hold the ward! Keep the sparks away!
10. Clear the crypt! Clear it now!

### Trandoshan slavers (`trandoshan`)

**Taunts**

1. Hunt begins. Scorekeeper watches close.
2. You small. Small things run. Run now.
3. Meat with legs. Good hunt.
4. Mine. Tally it, Keeper. Mine.
5. Show teeth, prey. Show them.
6. Your Jedi cloth pretty. Will tear nice.
7. Trophy for my rack. Just a small one.
8. Bosskarr sends greeting. Hard greeting.
9. Count this one! Keeper, count!
10. You run. We hunt. Old game.
11. Skullrender, come! Kill the runner!
12. Blood smells sweet. Scorekeeper smiles.
13. I hunt for the Hutts and for my honor.
14. No trade. No deal. Only prey.
15. Your tomb is our tally. Hear it.
16. Stalker's Shadow! Strike from above!
17. Trandoshan hunt is patient. You are not.
18. Mine, mine! Quick, before the Keeper sees.
19. Look at the scales. We are older than your fear.
20. Hiss at the dark. Dark hisses back.

**Pain**

1. Ssk! Scale torn!
2. Scorekeeper, forgive this wound.
3. That hurt. Good hurt. Mark it.
4. Blood on scales. Scorekeeper sees.
5. Bah! Shot in the leg! Keep moving.
6. Gunner down! Take his rifle!
7. My arm burns. Keep shooting!
8. I pay debt in blood. Pay it now.
9. Not today, Sith. Not this hunt.
10. Scale cracked. Hurts. Still hunting.
11. Medic! Scorekeeper, help!
12. You strike well. I remember.
13. Fine. Mine is short. Yours is shorter.
14. Hurts! Next, you bleed more!
15. I fall, but the Keeper tallies me standing.

**Idle**

1. Wait. Prey always returns to water.
2. Sun on the mud. Warm. Good hunting.
3. Bosskarr counts cargo. We count prey.
4. Hunt is quiet. Hunt is patient.
5. My rifle hungers. Feed it.
6. Smell that? Forest blood, ours and theirs.
7. Old tale: the Scorekeeper keeps a long book.
8. Rest now. Hunt tonight.
9. Watch the reeds. Something moves.
10. Sith-thing pays well. Keep your rifle warm.
11. Clean the claws. Clean them twice.
12. Ship's nose dips. Heavy load today.
13. Eat the ration, then hunt.
14. Water's cold. Tallies are warm.
15. Patience is the first skill.

**Callouts**

1. Flank them! Circle wide, quiet!
2. Net up! Hold him in the net!
3. Rifle ready! Pick the target!
4. Climb the ridge! Shoot down!
5. Move, move! Go, go!
6. Herd them to the mud!
7. Drag the wounded! Take the runner!
8. Skullrender, blast the wall!
9. Wait for my signal! Then strike!
10. Hold the crossing! No retreat!

## Loading-screen quotes

Forty in-world sayings, eight per source.

**Sith**

1. "A leash is only a rope until someone holds the other end." - Sith proverb
2. "Pain is a door. Walk through it, or stay on the hinges." - Milian, to her apprentice
3. "The strong do not ask. The strong take, and remember." - Sith proverb
4. "Fear is a current. Learn to swim in it, or drown." - Sith saying
5. "Empires are built on the bones of the last empire." - Sith proverb
6. "Names are for the living. Titles are for the feared." - Sith proverb
7. "A rumor cannot be killed. It can only be outlived." - Dxun saying
8. "The dark side does not corrupt. It reveals what you were hiding." - Sith proverb
**Trandoshan**

9. "The Scorekeeper forgets nothing, and forgives only in the ledger." - Trandoshan saying
10. "Prey runs. The hunter remembers the run." - Trandoshan saying
11. "A life spared is a debt written in scale." - Trandoshan proverb
12. "Teeth are old. Patience is older." - Trandoshan saying
13. "The strong tally kills. The wise tally debts." - Trandoshan saying
14. "A kill unrecorded is a hunt wasted." - Trandoshan saying
15. "Mud keeps the footprints of the careless." - Trandoshan saying
16. "The Scorekeeper's book has no last page." - Trandoshan saying
**Hutt**

17. "A debt is a leash made of credits." - Hutt proverb
18. "Never bet against a Hutt's patience. It is older than your bloodline." - Hutt proverb
19. "Let others fight. Let others bleed. Let me collect." - Hutt proverb
20. "The arena pays for courage. The house pays for everything else." - Pit-master Tohgrun Vak
21. "What is owed is never forgotten, only postponed." - Hutt proverb
22. "A hungry pit makes brighter champions." - Pit-master Tohgrun Vak
23. "The crowd roars for the wounded. The house takes the wager." - Hutt proverb
24. "Every investment has a short lifespan. Plan accordingly." - Hutt proverb
**Jedi**

25. "Peace is not the absence of struggle, but mastery of it." - Aiden Kyros
26. "There is no passion, there is serenity." - Jedi Code
27. "Breathe. The Force is patient, even when we are not." - Jedi proverb
28. "A blade drawn in anger cuts its owner first." - Jedi saying
29. "We were broken once. We remember the breaking." - Order of the Rebuild
30. "One Jedi's light can outlast a thousand Sith empires." - Jedi saying
31. "The dark does not announce itself. It waits in the quiet." - Jedi warning
32. "Listen before you strike. The enemy always whispers first." - Aiden Kyros
**Darth Traya**

33. "Do not mistake brutality for the artistry of a true warrior." - Darth Traya
34. "Seek not just relics or Force techniques, but understanding." - Darth Traya
35. "Master the darkness swirling within you. Meditate not on peace, but on control." - Darth Traya
36. "Let your hatred become a scalpel you wield, not a storm that consumes you." - Darth Traya
37. "It was but a title, as meaningless as countless others the galaxy forgets." - Darth Traya
38. "Every failing is a lesson to be turned against their kind." - Darth Traya
39. "Do you understand the difference between using the dark side and being consumed by it?" - Darth Traya
40. "Darth Traya was the mask I wore to confront the Jedi." - Darth Traya

