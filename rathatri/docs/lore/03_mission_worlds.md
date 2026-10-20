# 03 — Mission Worlds

DARK LEGACY: RATHATRI · Old Republic lore, c. 3951–3945 BBY · Research slice: the mission worlds

## 0. Sources and status

- Wookieepedia could not be fetched directly this session. `starwars.fandom.com` did not resolve, and the archivum and breezewiki mirrors failed too. Canon facts below come from search-result snippets quoting Legends mirrors and fan wikis. They are tagged **[S]**. Verify every [S] fact, especially dates, before it appears in game text.
- **[O]** marks original DARK LEGACY content: new locations, creatures, and characters the sources do not name.
- "Hutta" and "Nal Hutta" are the same planet. The build file uses both. Use "Nal Hutta" in the codex and "Hutta" in UI.

## 1. Corrections to the build file

1. **§5.3, `raxus: ruins: 'cis'`** must change. The Confederacy of Independent Systems formed around 24 BBY, and Count Dooku used Raxus Prime as a fortress from 24 to 22 BBY [S]. Both come roughly 3,900 years after this game. Replace with `ruins: 'war_mass'` (see section 5).
2. **Storyboard 3.3** says "CIS ruins." Change it to "Great Sith War foundry scrap."
3. **§5.3 comment** places Ambria in "Act II — Betrayal." Storyboard 3.1 places it in Act III. Recommend Act III, which matches the storyboard's pacing.
4. **Krayiss beast.** §5.3 lists `tukata`. Storyboard 4.1 says the Ritual of Binding tames a zakkeg. Recommend binding a tukata at Krayiss II and keeping the zakkeg for the Dxun base defense.
5. **Seeds.** Proposed seeds for the new worlds are ZX34 = 7310 and Nar Shaddaa = 4727. Neither collides with the existing list (Dxun 3951, Raxus 3960, Onderon 4000, Hutta 4260, Ambria 4400, Krayiss 5100, Lenico 6660).

## 2. Hutta: the Pit behind the cantina

**Canon anchor.** Nal Hutta is a muggy marsh that serves as the Hutt seat of government and a refuge for Hutt clans beyond galactic law [S]. The oldest families, the Clans of the Ancients, oversee the Hutt worlds [S]. The gladiatorial pit is original to this game. It draws on the arena culture Legends attaches to the Nar Shaddaa crime lord Grakkus, who forced captives to fight beasts [S].

**Era description.** A brass-brown overcast with no visible sun. Greasy drizzle falls on ochre mud. The cantina is prefab on stilts above the mire. Slave pens are stacked cages of iron bars. Hutt architecture is wide, low, and built for bulk, with tall doorways and ramps. The pit is a 24 m stone ring with a drainage sluice in the floor. Bettors crowd the upper tiers under lamp-rails.

**Force echo: OWNERSHIP [O].** The residue reads as hunger and spite. Lesson, Traya: *"A master who counts you as stock is afraid of the day you stop being counted."*

**Mission: SLAVE 426 (Act I, beats 1.2 to 1.4).**
1. **Cold open (LEVEL).** Enter through the cantina's back door during a cell transfer.
2. **Pen run (EXPLORE).** Sneak the pens for a shiv. Feign weakness to pass the guards.
3. **Pit one (COMBAT).** A shiv fight against two pit-hounds. This is the movement and attack tutorial.
4. **Scan (SCAN).** A hooded Force presence in the upper tier is Milian's watcher. This is the first echo.
5. **Losing fight (SET-PIECE).** Three opponents. The Tide Sluice opens. At 15% HP the Force surge flares.
6. **Milian's test (COMBAT).** A second staged fight in the flooded ring, doubling as the Force-push tutorial.
7. **Extraction (EXTRACT).** A freight lift under the cantina. Faceless guards take him out in the dark.

**Enemies [O].** Pit guards with shock-prods and visors. Hutt bodyguards with vibro-axes. Pit-hounds: blind, starved, fast. Fallen fighters flee at 20% HP.

**Hazard.** The Tide Sluice opens every 90 seconds and floods the ring knee-deep, slowing movement by 40%. Lamp-rails arc through standing water.

**Set-piece.** The Losing Fight. The lamps fail until one light is left. The surge staggers every enemy, and the camera flares red.

**Artifact.** None is listed here. The Pit Beast Bone Hilt (section 9) is the salvage reward. Traya, in the Act II command scene: *"Your first weapon was carved from the thing that tried to eat you."*

**Visual bible.**
- Palette: mire-black `#1d1a0c`, rot-green `#3b4a1e`, rust `#6b3d1c`, pit ochre `#8a6a3a`, lamp yellow `#d9b44a`, iron `#2c2c28`.
- Fog: `FogExp2`, color `#2a2410`, density 0.08 (about 30 m of visibility).
- Sky `hutta`: top `#14130a` to horizon `#4a3a18`. No sun disc. A dim sun-smear sprite at 10% opacity. Drizzle as sparse vertical particles.
- Ground: fBm heightfield, sea level 0.35. Where height is below 0.4, a mire mask blends triplanar mud noise (scale 0.8) from rot-green to mire-black. The pit floor is ochre sand with radial scratch decals.
- Props: cantina as a box with a sloped roof. Corrugated sheet as thin boxes. Pens as grids of thin cylinders. Sluice gate as a box with a rotating plate. Lamp-rails as cylinders with emissive spheres. Crowd as capsule silhouettes.

## 3. ZX34: the Silent Sanctum [O]

**Canon anchor.** None. The name is original. Two collisions to check before shipping: the X-34 Landspeeder (canon) and the Z-X3 droid [S]. Consider displaying the name as "ZX-34" in UI.

**Era description.** A small, airless-to-thin moon orbiting an unnamed gas giant the locals call the Veil. The air is thin and cold, about 0.3 atm and roughly -60 C in shade. The surface is grey-violet regolith pocked with craters, with black basalt cliffs. The Veil fills 40% of the sky in ochre and violet bands, with a faint ring arc. Milian's sanctum is cut into a cliff face. Inside are a round basalt hall, black cistern pools, shelves of data slates, a central dais, and dark mirror-glass walls that reflect nothing.

**Fauna.** Nothing larger than insects. Frost-mites scatter when the player approaches.

**Force echo: ABSENCE [O].** The sanctum is a Dead Zone that Milian made. The lorebook's Kreia lesson applies: *"Your presence, truly hidden, leaves an absence. A skilled Force user senses the gap."*

**Mission: THE SILENT SANCTUM (Act I, beats 1.6 to 1.7, playable tail).**
1. **Moraine landing (LEVEL).** The shuttle sets down. The seismic shut door is disguised as a moraine.
2. **Training halls (EXPLORE).** Memory replays of saber assembly, scroll study, and pain-channeling. The HUD shows "YEARS PASS."
3. **Stacks scan (SCAN).** Pulses reveal the outlines of missing books. The Legacy account is the last one on the shelf.
4. **The Stillness Trial (SET-PIECE).** Twelve pillars, each a Dead Zone. Apprentice wraiths try to pull you into the silence. Force powers are suppressed inside each zone.
5. **Breach (SCRIPTED BOSS).** Kyros and Celene break in. The fight is unwinnable by design, and the lesson is the dodge. Milian's death is a wide shot.
6. **Cistern flight (LEVEL).** Escape through the cistern tunnels with the account.
7. **Extraction (EXTRACT).** A frost-dark lift tube. The Veil fills the frame.

**Enemies [O].** Apprentice wraiths (echo ghosts of failed students). Frost-sentry droids (old, Sith-tuned). Kyros and Celene (scripted, from the lorebook).

**Hazard.** Dead Zone silence suppresses Force powers. Outside the sanctum, without a mask, frostbite builds after 120 seconds.

**Set-piece.** The Stillness Trial. Desaturate the screen and strip particles inside each zone. The game has no sound, so silence must be shown visually.

**Artifact.** Legacy of Betrayal (section 9). Traya: *"She kept it where she could read it each night. A teacher who reads of her students' betrayals is not a teacher. She is a hostage."*

**Visual bible.**
- Palette: basalt `#2a2630`, regolith `#5a5366`, frost `#c9d3e0`, glyph red `#8a1a1a`, cold sanctum light `#7ab6ff`, dead glass `#0c0b10`.
- Fog: `FogExp2`, color `#1a1626`, density 0.03 (thin air).
- Sky `veil`: a banded giant with bands `#6b4a2a`, `#3a2a4a`, and `#8a6a4a`. A thin torus-segment ring at 30% alpha. A small white star `#fff4e0`.
- Ground: Voronoi crater cells for regolith, ridged fBm for cliffs. Basalt columns as hex prisms. Cistern pools as flat black discs at height -2.
- Props: data-slate shelves as boxes with emissive edges. The dais is a cylinder. The twelve pillars are cylinders with emissive rings.

## 4. Ambria: the Glass Wastes

**Canon anchor.** Ambria debuted in Legends in *Tales of the Jedi* #3 (1993). It is a desert world in the Inner Rim with a strong dark-side pull [S]. A Sith sorceress raised a dark-side obelisk and tried to dominate the planet through its ritual. The ritual killed her and wiped out the native life [S]. Jedi Master Thon later confined the Sith influence to one spot and trained apprentices there [S]. In 990 BBY, a Jedi team under Tho'natu hunted the last known Sith Lord and killed Darovit, a cousin of Darth Zannah, whom they mistook for the target [S]. A rumor says Zannah killed Darth Bane on Ambria [S].

**Reconciling the lorebook.** The lorebook's "brief, devastating conflict between two fallen Jedi turned Sith rivals" sits on top of the old obelisk. The rivals fought over the obelisk Thon had caged, and their duel fused the dunes into glass. That also answers "known for its mineral resources": the mineral is the volcanic glass the war produced. Rival names are placeholders [O]: Vaun Kessik and Ilse Rhoan.

**Era description.** Black sand dunes roll toward an ochre dust horizon. Obsidian flats hold mirror-smooth glass lakes about a meter thick. Daytime heat reaches about 50 C, with cold nights. Basalt-and-durasteel fortresses were built in a hurry, with arrow slits and collapsed walls. A Republic survey tower stands abandoned on a mesa. There are no large beasts. Glass-scarab swarms are the only fauna [O].

**Force echo: BETRAYAL** (lorebook). Lesson, Traya: the moment the rivals turned, the paranoia that follows a sudden rise, and terrain used as a weapon. Her hint for the scan: *"Look for the footprint that stepped on the other."*

**Mission: THE GLASS DUEL (Act III, beat 3.1).**
1. **Mesa landing (LEVEL).** The Harbinger sets down as a dust storm rolls in and fogs the scanners.
2. **Fortress ruins (EXPLORE).** Ghost dialogue replays the rivals' argument.
3. **Bootprint scan (SCAN).** Two sets of tracks in the glass, one stepping onto the other. This is the betrayal trail.
4. **Mirror Duel (SET-PIECE).** Two echo fighters. When one is struck, the other turns on the first. The player profits by baiting them into each other.
5. **Obelisk shard and Tainted Kyber (ARTIFACT).** The Tainted Kyber sits in the cracked base. Picking it up triggers a rage surge and a corruption tick.
6. **Ring ritual (LEVEL).** The ground splits and glass pools. Hold three ring circles for 30 seconds while scarabs swarm. The obelisk drops an Obelisk Shard as flavor, with no mechanic.
7. **Extraction (EXTRACT).** The storm closes. The Harbinger's tractor beam pulls through.

**Enemies [O].** Glass wraiths (echo ghosts). Sith-raiders, rival dune raiders with blade-staves. Glass-scarab swarms.

**Hazard.** Sand-glass storms deal 2 HP per second of abrasion and cut visibility to about 6 m, with lightning glints. Obsidian crusts break underfoot.

**Set-piece.** The Mirror Duel.

**Artifact.** Tainted Kyber Crystal (section 9). Traya: *"It remembers the duel. Each time you hold it, it asks which of them you would have stabbed in the back."*

**Visual bible.**
- Palette: dune ochre `#b07a3c`, bright sand `#c49a5a`, obsidian `#0d0b10`, glass sheen `#5a6a8a`, rust `#8a4a22`, bone `#d8c6a0`.
- Fog: `FogExp2`, color `#2b1f14`, density 0.03.
- Sky `ochre`: top `#3a2a1c`, horizon `#d89a52`. A large dimmed sun disc `#f0c070` at 50% alpha.
- Ground: ridged dune fBm with sin-warped ripples and a ripple normal map. Obsidian plates use flattened Voronoi cells at roughness 0.1. Lakes are planar reflectors at sea level 0.18, with cracks in emissive `#7a2a2a`.
- Props: obelisk as a 4-sided tapered box, 40 m tall, black glass, with glyph strips in emissive `#a02a2a`. Survey tower as a lattice of thin cylinders. Fortress as stacked boxes with dark quads for arrow slits. Scarabs as small ellipsoid instances.

## 5. Raxus Prime: the Heap

**Canon anchor.** Raxus Prime is in the Raxus system of the Tion Hegemony in the Outer Rim [S]. It was once a prosperous world and one of three capitals of the Kingdom of Cron [S]. Around 1100 BBY, factory smog and waste buried its cities, and whole continents became junkyards for thousands of years [S]. In 3996 BBY, during the Great Sith War, Ulic Qel-Droma used the Dark Reaper superweapon on Raxus Prime and killed hundreds of Republic soldiers [S]. Wookieepedia marks that article title as conjectural. The Confederacy (24 BBY), the Clone Wars, and the Junk Temple (3 BBY) all come after this game [S].

**Proposed era-correct premise: the Reaper Ring [O].** The 3996 BBY battle happened 45 years before this game. Its crater is the Reaper Ring. Beneath the heap lies a sealed Sith war-droid foundry, built during the war to feed the Dark Reaper's armies. The war-mass echo is the residue of hundreds of dying soldiers, plus the foundry's marching orders.

**Era description.** Half-buried stone towers from the Kingdom of Cron stand beside 1100 BBY smokestacks. Republic cruiser hulls from the Great Sith War lie crushed under scrap. Acid brine pools steam in the hollows. Sulfur smog hangs over everything. The air is hot and wet. There is no flora.

**Fauna [O].** Scrap-ferals: rat-sized scavengers that swarm the heaps.

**Force echo: MASS MANIPULATION** (lorebook). Traya's lesson: fear is the engine of mass power. *"Shout at a thousand men and they march into the furnace. Shout at one, and he only runs."*

**Mission: THE REAPER RING (Act III, beat 3.3).**
1. **Crane landing (LEVEL).** The Harbinger sets down on a crane cradle. Smog-acid rain drifts the HUD sensors.
2. **Scrap wade (EXPLORE).** Climb hull-scrap and avoid heap-slides. Scavenger gangs contest the ground.
3. **War-mass scan (SCAN).** Pulses reveal phantom columns marching toward the crater's center.
4. **The Reaper Ring (SET-PIECE).** A phantom column marches. Break its formation by striking the command echo, which is the manipulation lesson. If the officer dies, the column turns on itself.
5. **Foundry breach (LEVEL).** Descend into the buried foundry past assembly-line crushers.
6. **Databank (ARTIFACT).** Pull the Foundry Databank from a Sith-tuned droid core.
7. **Extraction (EXTRACT).** Lift off the cradle as the heap slides away behind you.

**Enemies [O].** Dread Cores: Sith-tuned war-droids on six legs. Scavenger gangs. Phantom columns, echo soldiers immune to fear.

**Hazard.** Heap-slides are scrap avalanches that bury the lower routes. Acid brine pools deal damage over time.

**Set-piece.** The Reaper Ring.

**Artifact.** Foundry Databank, Pattern-Breaker (section 9). Traya: *"Give a thousand the same order, and they will all die the same way. Find the one who breaks the pattern."*

**Visual bible.**
- Palette: rust `#6b3a22`, slag `#3a3733`, faded Republic white `#b9b4a6`, brine green `#4b5a2a`, sulfur `#c8a93a`, Cron stone `#6f6a5e`.
- Fog: `FogExp2`, color `#24211c`, density 0.05.
- Sky `smog`: top `#1c1a16`, horizon `#5a4a20` (sulfur glow). Lightning arcs as emissive polylines.
- Ground: scrap heap as Voronoi plates with random rotations, layered over ridged fBm. Rust decals use noise. Brine pools are green-tinted planar reflectors at sea level 0.22.
- Props: hulls as boxes with cone prows. Crane cradles as lattice cylinders. Smokestacks as tapered cylinders with flared cones. Cron columns as 12-sided cylinders. The Reaper Ring as a dark torus mesh. Dread Cores as spheres with six cylinder legs.

## 6. Krayiss II: the Library-Temple

**Canon anchor.** Krayiss II (Krayiss Two) is a remote Outer Rim world in the Sith Worlds region, inside the Stygian Caldera nebula. It was one of five sacred Sith planets [S]. Sith colonists settled it before 14,000 BBY. Its ancient library-temple was a place of meditation and study for Sith sorcerers. After 14,000 BBY the world was buried and forgotten, leaving only a large obelisk above ground. In 4000 BBY, the Jedi Vara Nreem was rejected by the temple's Sith spirits and killed. In 34 ABY, One Sith elements set up a base camp to dig into the temple [S].

**Source discrepancies [S].** One fan wiki names the guardian spirit as Jev Sunrider, and another names it Lord Malignous. One source names the moons Hakagram and Nakgru. The grid square is R-4 in the map and R-5 in the appendix. One fan source notes it is not official canon. Treat these as open questions.

**Reconciling the lorebook.** The lorebook's "rumored training ground for ancient Sith seeking isolation" fits the library-temple. Its "focused power" becomes the temple's test of worth.

**Era description.** Basalt crags, high wind, and petrified lichen-trees. The nebula fills the sky in violet and teal. Glyph halls sit below the surface. The obelisk is the only tall structure. The air is cold, and sulfur drifts up from vents.

**Fauna.** Tukata, per the build file [O]. No canon description was located this session, so treat it as a placeholder.

**Force echo: FOCUSED POWER** (lorebook). The temple's spirits test whether a visitor is worthy. Lesson, Traya: *"Bind the beast, then find the worth in what you bound."*

**Mission: THE TEST OF WORTH (Act IV, beat 4.1).**
1. **Saddle landing (LEVEL).** The Harbinger sets down in a crag saddle as a nebula storm rolls in. The obelisk is visible on the horizon.
2. **Crag climb (EXPLORE).** Wind gusts push you off ledges during the ascent.
3. **Ritual scan (SCAN).** Concentric rings are etched into the ground. The echo shows focus held for centuries.
4. **Vara Nreem's Test (SET-PIECE).** Stand in the ring and do not attack for 45 seconds while spirit guardians whisper. A failed focus check knocks you down and marks you unworthy.
5. **Glyph hall (LEVEL).** Spirit-knights and cultist acolytes defend the halls. Tukata nests line the exits.
6. **Binding circle (ARTIFACT).** Use the carved circle to bind a tukata. The bound beast becomes a ward for the base.
7. **Extraction (EXTRACT).** A signal flare. The Harbinger lowers a ladder through a vent.

**Enemies [O].** Temple spirit-knights (guardian echoes). Krayiss cultists (unaffiliated acolytes).

**Hazard.** Caldera vents: sulfur fumes damage you in low hollows. Wind gusts knock you off ledges.

**Set-piece.** Vara Nreem's Test.

**Artifact.** Ritual of Binding (section 9). Traya: quoted above.

**Visual bible.**
- Palette: basalt `#1b1f26`, lichen grey `#7b8088`, nebula violet `#4a2f6b`, nebula teal `#2a6b74`, obelisk `#0a0c10` with cool glyph glow `#7aa7c7`, temple stone `#3a3a44`.
- Fog: `FogExp2`, color `#141820`, density 0.06.
- Sky `storm`: top `#0b0a1a`, mid `#4a2f6b`, teal `#2a6b74` at the horizon. Lightning arcs.
- Ground: multifractal ridged noise for steep crags. Petrified lichen uses a bark-like noise texture. The temple floor has a radial glyph decal.
- Props: obelisk as a 5-sided prism, 30 m tall. Library columns as fluted cylinders. Dead trees as twisted cylinders with cone tips. The glyph ring as a flat torus.

## 7. Lenico IV: the Ash Plains

**Canon anchor.** Lenico IV is in the Lenico system of the Outer Rim. Its surface is desolate and ruin-strewn, with an area called the Ash Plains [S]. Lenico Colony Blue is an orbital station, and the Cairn Installation sits on an asteroid in the same system [S]. Around 3678 BBY, early in the Great Galactic War, the Sith apprentice Exal Kressh destroyed a small Ortolan tribe on the Ash Plains. Her master sent her there to learn the tribe's Force rituals, which the Emperor wanted in order to move his consciousness into new bodies. After the massacre she turned against him [S]. These Ortolans were noticeably thinner than those of Orto and count as a distinct subspecies [S]. Teneb Kel and Jerbhen Hulis also visited the plains [S].

**Reconciling the lorebook.** The lorebook asks "Echoes… of what?" The answer is stolen minds. The Ortolan rites were used to take a consciousness, and the echo has stayed raw for roughly 273 years. The lorebook's three options are all present: a Sith's ritual imprint, pirates scavenging the wreck, and the unsettling part, copies of people.

**Era description.** Ash-grey plains. Fused-glass pans reflect a thin sky. Twisted petrified trees lean over the ash. Ortolan reed-and-bone huts have collapsed, among cairns and burnt pyres. Blue Dome Outpost is a collapsed colony prefab on the surface [O]. The aurora curtains come from ionized ash, not a planetary sky effect.

**Fauna [O].** Ash-crawler herds, all dead. A few pale ghost-birds circle the pyres.

**Force echo: STOLEN MINDS.** Lesson, Traya: *"Echoes of what? Of a mind taken. Whoever takes a mind keeps it at the bottom of their own."*

**Mission: THE MASSACRE LOOP (Act IV, beat 4.2).**
1. **Shuttle descent (LEVEL).** Drop from Colony Blue through an ash storm, flying blind on instruments.
2. **Blue Dome Outpost (EXPLORE).** Pirate scavengers have set up camp in the ruins.
3. **Anomaly scan (SCAN).** The pulse reveals a ghost layer of the Ortolan village.
4. **Massacre Loop (SET-PIECE).** The village burns on a loop. Illusion copies of you, Milian, and the shaman walk through the fire. The real shaman is the only one whose Force signature has no hunger. Striking a copy resets the loop.
5. **Mask recovery (ARTIFACT).** Take the mask from the shaman's hut. Picking it up triggers a fear aura and more copies.
6. **Pirate ambush (COMBAT).** An ash whiteout. Scavengers hit as you climb.
7. **Extraction (EXTRACT).** Lift to the station hangar. The anomaly tugs at the mask.

**Enemies [O].** Illusion copies: Rathatri clones and a false Milian, from storyboard 4.2. Pirate scavengers. Shell-ghosts, echo entities.

**Hazard.** Ash Blind is a 10-second whiteout that disables targeting and drifts the scanner.

**Set-piece.** The Massacre Loop.

**Artifact.** Mask of Despair (section 9). Traya: quoted above.

**Visual bible.**
- Palette: ash `#5d5a5c`, bone `#cfc6b4`, ember `#c2552a`, aurora green `#4fd1a0`, aurora violet `#8a5ad6`, fused glass `#3e4a52`.
- Fog: `FogExp2`, color `#1c1424`, density 0.07.
- Sky `aurora`: top `#0a0a18`. Ribbons of aurora green and violet are additive planes with noise-driven alpha.
- Ground: low-amplitude fBm with ash noise. Glass pans are flat Voronoi cells at low roughness, at sea level 0.28. Twisted trees are cylinders with a sine-offset helix.
- Props: huts as bone-colored cylinders with cone roofs. Cairns as stacked spheres. Pyres as emissive cones. Blue Dome Outpost as a clipped half-sphere dome. Derelict cranes as lattice cylinders.

## 8. Nar Shaddaa: the Smugglers' Moon (optional hub)

**Canon anchor.** Nar Shaddaa is the Smugglers' Moon. The Hutts drove the Evocii there around 15,000 BBY, then enslaved them to build its docks and spaceports [S]. Hutt clans oversee it, and crime lords divide its territory [S]. The Exchange was run through a hologram by the droid Goto around 3951 BBY [S]. Meetra Surik's campaign in KOTOR II cut down two of its crime lords and destroyed a Visionary, so the Exchange is weakened when Rathatri arrives [S]. The brief names Vulkar, but this session's searches did not confirm a Vulkar presence in this period. Treat Vulkar as an unverified rival syndicate [O].

**Source discrepancy [S].** One Legends-era wiki places Hutta Town, the palace of Grakkus, on Nar Shaddaa. A roleplay wiki names Huttila and Ku'gan as the dominant lords. Verify before using either in game.

**Era description.** A vertical lattice city stacked thousands of levels high. Neon bleeds through the smog. Cargo hangs from cranes. Landing spires and sewer grates fill the levels between. The sky is the underside of the lattice, lit by neon. It is perpetual night.

**Fauna [O].** Lattice-rats and sewer ferals.

**Force echo: DEBT [O].** Lesson, Traya: *"The coin is a leash, and the Hutts hold the other end."* This builds on Kreia's manipulation lessons: fear as a baseline, rivalries as levers, and the illusion of choice.

**Mission: THE COIN ROOM (optional hub, six beats).**
1. **Spire dock (LEVEL).** Pay the fee. Security scans the Harbinger.
2. **Market walk (EXPLORE).** Fences sell goods. Haggle through dialogue.
3. **Debt scan (SCAN).** Enforcers carry ledger slates that glow with debt marks.
4. **Goto's auction (CHOICE).** Goto's hologram auctions a Sith Amulet. Bid or steal.
5. **Promenade ambush (SET-PIECE).** Exchange enforcers and bounty hunters. Drop through the lattice to escape.
6. **Cargo lift (EXTRACT).** Ride the lift up to the spire.

**Enemies [O].** Exchange enforcers with shock-batons and rifles. Bounty hunters with jetpacks. Hutt bodyguards. Fixers, who do not fight.

**Hazard.** Smog rain and neon glare cut visibility. Lattice drops cause fall damage.

**Set-piece.** The Promenade ambush and lattice drop.

**Artifact.** Sith Amulet (section 9).

**Visual bible.**
- Palette: neon magenta `#c2308a`, cyan `#2ac9d6`, amber `#d99a2a`, steel `#3a3f47`, grime `#4a4a3a`, smog `#1f2226`.
- Fog: `FogExp2`, color `#1d1a22`, density 0.05.
- Sky `lattice`: top `#07060c`, horizon `#3b2a46` (neon underglow).
- Ground: plate and grating textures with a checker-grate normal map. Puddles are reflective planes.
- Props: hanging cargo boxes with stripes. Neon signs as emissive planes with glyph textures. Lattice scaffolds as thin box grids. Spires as tapered boxes. Landing rings as tori. Balconies as thin boxes.

## 9. Artifacts across the worlds

| World | Artifact | Source in play | Traya's line (short) |
|---|---|---|---|
| Hutta | Pit Beast Bone Hilt | Salvage from the pit | Carved from the thing that tried to eat you |
| ZX34 | Legacy of Betrayal | Milian's stacks | She kept it where she could read it |
| Ambria | Tainted Kyber Crystal | Obelisk base | It asks which rival you would stab |
| Raxus Prime | Foundry Databank (Pattern-Breaker) | Sith-tuned droid core | Find the one who breaks the pattern |
| Krayiss II | Ritual of Binding (fragment) | Binding circle | Find the worth in what you bind |
| Lenico IV | Mask of Despair | Shaman's hut | A mind taken |
| Nar Shaddaa | Sith Amulet | Black market | The coin is a leash |

The Obelisk Shard (Ambria, lore-only) has no mechanic. Lorebook artifacts used here are the Tainted Kyber Crystal, the Legacy of Betrayal, the Fragment of the Ritual of Binding, and the Mask of Despair. The Corrupted Holocron and the Nadd items belong to Dxun and Onderon and are outside this slice.

## 10. Open issues for the user

1. Pick one name for the planet in UI: "Hutta" or "Nal Hutta."
2. Ambria's act placement: Act II (build file) or Act III (storyboard). Recommend Act III.
3. Krayiss II beast: tukata or zakkeg. Recommend tukata here, with zakkeg kept for Dxun.
4. Confirm the ZX34 name. Consider "ZX-34" to avoid the X-34 Landspeeder.
5. Verify the [S] dates and locations (especially Goto, Hutta Town, and the Stygian Caldera details) against KOTOR II and Wookieepedia in a browser. This sandbox cannot reach them.
6. Krayiss II guardian identity (Jev Sunrider or Lord Malignous). Pick one, or leave it ambiguous in game.
7. Vulkar: find a source or drop the name.
