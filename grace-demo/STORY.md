# THE SWAN THRONE — story storyboard (working title)

A plan for the whole game's story. Nothing here is implemented except the opening cutscene (§3) and the first
week's court, which already exists. Names are placeholders; change them in one pass when you settle on your own.

---

## 1. The premise in one breath

Twelve years ago it rained on the small mountain kingdom of **Lodmir** for forty days, and under the rain the
**Margrave of Hal** laid siege to the **Swan Fortress**. Old **King Bolesław** died on the nineteenth day. On the
twentieth night his son **Radomir** rode out alone to the **Woman in the Wood** and made a bargain he has never told
anyone: *"When the rain comes back, I will come for what you hold dearest. Until then the kingdom is yours."* By
morning the Margrave's army was gone. Nobody knows where it went.

The game begins on the evening the rain comes back.

The engine of the story is that sentence. The king doesn't know what "what you hold dearest" means: his crown, his
kingdom, his wife, one of his children, himself. **The player decides it, without being told,** by what they spend
the king's weeks on. The kingdom's numbers (Gold, Stores, Mood, Army) and the family's trust (Halina, Zofia, Kazik)
are the two ledgers the Woman reads at the end.

**Tone:** warm, wry, tired, sometimes funny, folk-tale dark at the edges. Court is a comedy of small disasters; the
family is the heart; the Wood is quiet and wrong.

## 2. Cast

| Who | Role | What they want | Where you meet them |
|---|---|---|---|
| **King Radomir** (38) | the player | to be a better king than he was a son, and to keep the bargain secret | everywhere |
| **Queen Halina** (36) | wife; a merchant prince's daughter from the river city of Velka | a kingdom that pays its debts, and the truth from her husband | gardens, bedchamber, throne room |
| **Princess Zofia** (12) | daughter | to be a knight; to be taken seriously | training yard (sneaking in), gardens, study (chess) |
| **Prince Kazik** (8) | son; born the spring after the siege | to understand the crows; to be well | gardens (by the fountain, with the crows) |
| **Ser Bogdan** | agent: Commander | a real war, frankly; and for Zofia not to get hurt on his watch | training yard, throne room |
| **Ilka** | agent: Spymaster | to know everything first | throne room, study (reports) |
| **Steward Wit** | runs the court | order; a quiet life | throne room |
| **Jarek of Velka** | Halina's brother, head of the River League | the river tolls, and a Velka ward at Lodmir's court (or Kazik at his) | envoy scenes; later in person |
| **Konrad of Hal** | the old Margrave's son | his father's army back, or revenge for it | envoys; the siege |
| **The Woman in the Wood** | old, patient, not evil | what she was promised | the forest clearing; signs everywhere (crows, black feathers, rain that stops for her) |
| **Dobrawa** | agent to recruit: Herbalist | to keep Kazik alive; knows the Woman's ways | chapter 2 |
| **Brother Anzelm** | agent to recruit: Chronicler | the truth about the siege, for the record | chapter 3; the study |
| Petitioners | the weekly stream | everything | the throne room |

## 3. The opening cutscene (implemented)

Plays after **New Game**, after the title screen (the Swan Fortress in a storm). Letterboxed, captions under the image,
tap to skip. Music: *Kings Trailer* (Rafael Krux, public domain via FreePD).

| # | Shot | What we see | Caption | Sound |
|---|---|---|---|---|
| 1 | Castle exterior, slow push in | the fortress in heavy rain at night, lightning, crows wheeling round the tower | *Twelve years ago, the rain fell on Lodmir for forty days.* | rain, thunder |
| 2 | Exterior, lower angle on the walls | the siege: ranks of soldiers, ladders on the walls, fires burning in the rain | *Under it came the Margrave of Hal, to the walls of the Swan Fortress.* | drums, clashes, fire |
| 3 | The throne room, night | the empty throne under a cold light, rain on the windows, the old crown left on the seat | *King Bolesław held the gate for nineteen days. He did not see the twentieth.* | rain on glass, hall echo |
| 4 | A clearing in the wood, night | a small fire; a hooded woman; a young man kneeling across it | *On the twentieth night, his son rode out alone to the Woman in the Wood.* | fire, wind in trees |
| 5 | Exterior, grey dawn | the siege camp empty, smoke rising, the rain thinning | *By morning the Margrave's army was gone. No one has ever said where.* | birds, dripping |
| 6 | Exterior, present day | the fortress again; rain starting | *Twelve years later, the rain has come back.* | rain building → fade |

→ fades into the bedchamber, where play begins.

## 4. The shape of the game

**Weeks.** Each week: a few free scenes (walk the castle, talk to the family, read letters in the study, watch the
yard), **court** in the throne room (petitions; agents and items as now), then **the week's ledger**. Chapters are
three or four weeks. The rain is the clock: forty days ≈ six weeks of story time, stretched across five chapters by
interludes.

**Two ledgers.**
- *Kingdom:* Gold, Stores, Mood (built), Army (new). Petitions, envoys, the flood and the siege move them.
- *Family:* Halina's trust, Zofia's respect, Kazik's closeness (0–10 each, never shown as numbers; shown as how they
  speak to you and where they stand when you walk into a room). Moved by garden conversations, choices and neglect.
  (A week with no garden visit costs a point somewhere.)

**What the Woman takes** at the end is the ledger the player valued most, read as: the highest family trust, or the
kingdom if the kingdom's numbers dwarf the family's, or the king himself if both are high and balanced. §7.

## 5. Chapter beat boards

Each card: **where · who · what happens · the choice · what it moves**.

### Chapter 1 — *The Rain Returns* (weeks 1–3)

1. **Bedchamber · King** — evening, first rain on the window. The crown on its cushion. (Built.)
2. **Throne room · court** — Marta and the mill road, Tomasz and the tolls. (Built.)
3. **Gardens · Halina, Zofia, Kazik** — the family introduced. Halina on the bench with letters from her brother;
   Zofia swinging a stick at the hedge; Kazik feeding crows at the fountain. *Kazik: "The big crow says she's coming
   when it rains."* Nobody else hears it.
4. **Training yard · Bogdan, knights, Zofia** — Zofia caught sparring in a borrowed gambeson.
   **Choice:** forbid her · allow it under Bogdan · train her yourself. Moves Zofia's respect, Bogdan's loyalty,
   Halina's trust (she wanted her safe).
5. **Study · letter** — a sealed letter in the old king's hand found behind the portrait: *"If the rain comes back,
   do not go to her again."* The king burns it or keeps it (**choice**; keeping it lets Halina find it in ch. 4).
6. **Throne room · envoy of the River League** — Jarek's factor offers grain against next year's tolls, **or** asks
   that Kazik be fostered in Velka "for his health and the friendship of our houses".
7. **Week 3 event · the lower town floods** — a big petition with three slots and every agent; Stores fall whatever
   you do. Chapter closes on a crow on the study window with a black feather knotted in red thread. Kazik falls ill.

### Chapter 2 — *Grain and Debt* (weeks 4–6)

1. **Bedchamber · Halina** (night) — she wants the League deal; she wants to know why he flinches at the rain.
   **Choice:** tell her part of the truth · lie · say nothing. (Trust; unlocks/locks her help later.)
2. **Gardens · Kazik** — sicker, cheerful; he's teaching a crow words. *"It says your name wrong."*
3. **Recruit Dobrawa** — the herbalist from the hill village treats Kazik in the gardens; she recognises the knot.
   Becomes an agent (Herbalist: strong on sickness and on anything to do with the Wood).
4. **Court** — hunger petitions; a priest who wants a procession to stop the rain; a smuggler offering grain without
   tolls (Ilka's angle).
5. **The fostering choice** — send Kazik to Velka (he's safe from the Wood? *nobody knows*; Halina's trust up, Kazik's
   closeness down, the League friendly) · keep him (the reverse).
6. **Ilka's report (study)** — Konrad of Hal is buying swords in Velka's markets with League credit.

### Chapter 3 — *The Margrave's Son* (weeks 7–9)

1. **Throne room · Konrad's envoy** — demands "the river lands" his father lost. Insults. **Choice:** pay · refuse ·
   stall (Gold vs Army vs Mood).
2. **Training yard** — mustering. Bogdan drills the levy; morale events; Zofia asks to ride with the scouts.
   **Choice:** let her (respect up; danger later) · refuse.
3. **Recruit Brother Anzelm** — the chronicler who wrote the official account of the siege, which has a hole in it
   exactly one night wide. Becomes an agent (Chronicler: strong on law, records, and lies).
4. **Study · the hole in the chronicle** — a three-step search: the study shelves, the chapel crypt (new location),
   the old tower (new location). Finds what the Margrave's army really did: it walked into the Wood after a light.
5. **Gardens · Zofia and Kazik** — the swing scene; Zofia promises to protect him. (A moment that matters in ending B.)

### Chapter 4 — *The Woman in the Wood* (weeks 10–12)

1. **If he kept the letter:** Halina found it. **Bedchamber · Halina** — the worst conversation of their marriage.
2. **The Wood** (new location; the clearing from the cutscene) — the king rides out again. The Woman has not aged.
   She explains nothing and everything: *"You will not choose. You already have, every week."*
   **Choice:** ask what she'll take (she won't say) · offer the crown · offer himself · threaten her (she laughs).
3. **Dobrawa + Anzelm + Ilka** — if all three are recruited and trusted, they find the Woman's true name in the crypt
   records. (Unlocks ending D.)
4. **Court** — the last ordinary weeks: every petition now costs double; refugees from the border.
5. **Gardens** — whatever the family meters say, the family scene here is long and quiet. Kazik gives the king a black
   feather "for luck".

### Chapter 5 — *Forty Days* (weeks 13–14)

1. **The siege** — Konrad's army at the walls in the rain: the title screen made real. Siege weeks replace court:
   each day a "petition" from the walls (a breach, fire, sickness, desertion) answered with agents, Army and Stores.
   New location: **the walls and gatehouse**.
2. **The fortieth night** — the rain stops at once. The Woman walks through the camp and nobody stops her. She comes
   up the hill, through the gate, into the place the player's ledgers point to: the gardens, the bedchamber, the
   training yard or the throne room.

## 6. Locations across the story

| Location | Status | Story use |
|---|---|---|
| Bedchamber | built | day start; night conversations with Halina; private thoughts; "end the day" from the bed |
| Throne room | built | weekly court; envoys; the steward; the final ending if the kingdom is the dearest thing |
| Study | building now | letters, Ilka's reports, the chronicle search, chess with Zofia, the world map table |
| Gardens | building now | the family; Kazik and the crows; Halina's bench; the old king's memorial |
| Training yard | building now | Bogdan, knights, Zofia's training, army readiness, mustering |
| Map | building now | travel between locations; later the kingdom map (town, river, wood, border) |
| Chapel and crypt | later | the chronicle search; the priest's petitions; the old king's tomb |
| Old tower | later | the chronicle search; the view of the Wood |
| Lower town | later | the flood; refugees; petitions in person |
| The Wood (clearing) | in the cutscene | chapter 4 |
| Walls and gatehouse | later | the siege |

## 7. Endings

| Ending | When | What happens |
|---|---|---|
| **A · The Swan Endures** | family and kingdom both high and close | the Woman takes the king himself. He walks into the Wood at dawn. Zofia is crowned with Halina as regent; the last shot is Zofia in the yard, in real armour |
| **B · The Empty Cradle** | the family's highest trust is Kazik's, and the kingdom is strong | the Woman takes Kazik, gently; he goes with her as if he knew. The rain ends. The crows stay at the fountain. The darkest ending, and the kingdom thrives |
| **C · The Drowned Crown** | the kingdom neglected (Stores and Army low) | she takes the kingdom: the rain never stops, the river takes the lower town, the family leaves over the mountains together. The swan banner left on the empty throne |
| **D · The Bargain Broken** | Dobrawa, Anzelm and Ilka recruited and trusted, the true name found, and Halina told the truth before chapter 4 | the king calls the Woman by her name; she has to bargain again. She takes the rain itself and twelve years of the king's life (he ages on screen). Everyone lives |

Every ending ends in the gardens, the place the family meets.

## 8. Systems the story will need (none built yet)

- **Calendar:** day/week counter, the rain as a visible clock (heavier each week), "end the day" from the bed.
- **Flags and meters:** story flags, family trust, an Army stat, recruited agents.
- **Dialogue choices:** two or three options in the bubble, keyboard and touch.
- **Event scheduler:** scenes that trigger on entering a room in a given week with given flags.
- **Letters and a journal:** readable documents in the study; a journal of what's happened.
- **More agents and their personal stories:** each agent gets one personal petition per chapter.
- **New rooms:** chapel and crypt, old tower, lower town, the Wood, walls and gatehouse, council chamber.
- **Siege mode:** court variant with daily wall events.
- **Endings:** four end sequences using the cutscene system (already built for the opening).

## 9. Music map

| Scene | Track (public domain via FreePD) |
|---|---|
| Title | *Rulers of Our Lands*, Rafael Krux |
| Opening cutscene | *Kings Trailer* |
| Bedchamber, study | *Night in the Castle*, Kevin MacLeod |
| Throne room | *Royal Coupling*, Kevin MacLeod |
| Gardens | *Magic in the Garden*, Rafael Krux |
| Training yard | *The Britons*, Kevin MacLeod |
| Map | *Travelers Notebook* |
| Later: the Wood, the Woman | *Night Vigil* or *Ancient Rite*, Kevin MacLeod |
| Later: the siege | *Beginning of Conflict* or *Black Knight*, Rafael Krux |
