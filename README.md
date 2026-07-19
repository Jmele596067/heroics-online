# Heroics: Clash of Leaders

A Phaser + TypeScript browser card-game prototype featuring a fixed seven-position hex battlefield, Gate summoning, Essence, Leader and Unit abilities, playable AI, AI-vs-AI spectating, online friend rooms, and four-stage Leader evolution.

Heroics is an active beta for private testing with friends. It is not a finished or production-ready game.

## Run the game

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/`.

## Online multiplayer

Heroics supports private two-player rooms with five-character invite codes. Each player uses the 40-card deck saved in their own browser. The server is authoritative: it validates turn order, keeps opposing hands and deck order private, synchronizes every action, and preserves disconnected matches for 10 minutes.

## Beta deployment

The Render beta service is named `heroics-online-beta` and uses Render's free plan. Do not configure a custom domain for the beta. The page includes `noindex,nofollow` metadata so search engines do not intentionally index the beta.

Run the test and build checks before every beta deployment:

```bash
npm run optimize
```

For local development, open two terminals:

```bash
npm run server
```

```bash
npm run dev
```

Open `http://localhost:5173`, choose **Play Online**, and create or join a room. Two browser windows can be used for testing.

For a single production server that hosts both the website and online matches:

```bash
npm run build
npm start
```

Open `http://localhost:8787`. Friends on the same network can use the computer's local IP address with port `8787`. Playing over the internet requires deploying this project to a public Node.js host that supports WebSockets. The host should run `npm run build` as its build command and `npm start` as its start command. It may provide the `PORT` environment variable automatically.

If the frontend and match server are hosted separately, build the frontend with `VITE_WS_URL=wss://your-match-server.example/ws`.

## Start screen and deck builder

- **Start Game** launches the last saved deck and opponent.
- **Watch AI vs AI** starts a spectated match between the selected Leader and opponent. Both CPUs act one step at a time; pause or resume while inspecting the board.
- **Play Online** creates or joins a private friend match using the saved deck.
- **Create a Deck** opens the visual deck builder.
- Choose Ignis, Shellgon, the Queen of the Dead, or Tempestfang as your Leader.
- Clicking a Leader opens an information screen with Health, ability, evolution rules, strategy, signature cards, and a confirmation button. Confirming changes the Leader while preserving the current deck.
- Choose the Fire, Water, Queen of the Dead, or Tempestfang deck as the AI opponent.
- Click any card to see its artwork, Essence cost, statistics, and effect.
- Every Leader can use every card in the complete Fire, Water, Thunder, Death, and Zone library. Zone cards keep names such as **Desert Gate** and **Ocean Gate**.
- Add up to 3 copies of a card and build an exact 40-card deck.
- The deck count and complete deck list update immediately.
- Your Leader, opponent, and deck are saved automatically in browser storage.

## Evolution

Ignis and Shellgon progress through four forms:

| Stage | Level | Glory requirement |
|---|---:|---:|
| Basic | 5 | 0 |
| Awakened | 10 | 3 |
| Ascended | 15 | 7 |
| Ultimate | 20 | 12 |

When the next requirement is met, choose **Evolve Now** at any point during your turn. Evolution may be activated only once per turn and grants the new form's total Health, Attack, Ability Points, portrait, and abilities.

The Queen of the Dead starts at 30 Health and evolves at 3, 7, and 12 Glory into Grave Regent, Lich Empress, and Sovereign of Endless Night. Her once-per-turn **Raise Skeleton** ability summons a 1 Attack / 2 Health Skeleton token; later forms summon ready or additional Skeletons.

Her expanded Undead deck includes Grave Banshee, Queen’s Guardsman, The Forsaken Prince, Skeleton Bone Parlor, the revised Cemetery Reaper, seven Magic cards, and three Equipment cards. Undead Wizard deploys Gravebound Knight directly when an open Gate is available; the Knight then searches Forever Dead King into hand. **Raise the Fallen** now deploys up to two chosen Units directly from the graveyard. **Cemetery Gate** gives Undead Units +3 Attack/+3 Health and stores defeated Undead cards in the public Cemetery pile instead of the graveyard.

## Tempestfang and the Storm deck

Tempestfang uses condition-based evolution instead of Glory:

1. Cast 2 Magic cards to become **Gale-Blooded**.
2. Deal 6 damage in a single turn to become **Thunder-Crowned**.
3. Hold 3 Storm Charges or cast **Stormheart Cataclysm** to become **Storm-Devourer**.

Storm abilities are once per turn and can target a selected enemy Unit or default to the rival Leader. Select a friendly Unit before casting healing, Wind Step, or Unit Equipment cards. On the hex map, **Speed +1** increases movement by one connected tile, “blocking” means becoming the defending Unit in that tile, and Tempest Magic chooses damage plus push when an enemy Unit is selected or damage plus Rainfield when targeting the rival Leader. Storm-Devourer unlocks all three Eye of the Storm choices and may automatically absorb the lowest-cost Magic card in hand for Storm Blast.

## Zone and Gate battlefield

- The old Field-card classification is now **Zone**.
- Card names still use **Gate**, such as Desert Gate, Ocean Gate, and Volcano Gate.
- The shared battlefield starts as three connected hex tiles: your Gate, the center tile, and the enemy Gate.
- Tiles use point-top hexagons matching the field reference: every legal neighbour shares one complete edge, never only a corner.
- Each physical tile can contain up to three Units from each team. The UI never draws empty slots, slot frames, or monster-slot labels.
- Summoned Units appear as their card artwork directly on the hex itself. Standard Units enter the player’s starting Gate hex; Zone Bound, Ship, and other card rules can change that destination.
- A Unit cannot leave a contested tile while an enemy Unit remains there, and multi-tile movement stops on the first contested tile. Sneak and matching rules such as Dive can override this restriction.
- Units can only battle enemy Units occupying the same physical Zone.
- The match starts with exactly three edge-connected hexes and each player draws five cards. Both Leader portraits are visible from the opening battle state.
- Playing a Zone card fills one of exactly four fixed positions: the two upper and two lower hexes between the three original Gate tiles. Together they form the reference 2–3–2 honeycomb.
- Legal placement is shown only on those four shared edges. The four outer cells behind the Home and Enemy Gates are permanent red-X locations and are rejected without spending the card or Essence.
- The shared battlefield can never exceed the fixed seven-tile footprint, and a placed Zone never unlocks another outer ring.
- Units may move into a newly created Zone during that same turn.
- The battlefield surface contains only hex art, summoned Unit art, and active Zone-placement indicators. Click a selected Zone hex again to inspect its image and effect.

The neutral Zone set contains Desert Gate, Ocean Gate, Volcano Gate, Field Gate, Lightning Plains Gate, Fog Marsh Gate, Frost Peaks Gate, Shadow Ruins Gate, and Cemetery Gate. Water adds **Lighthouse**, and Thunder adds **Static Field**. Standard Zones cost 2 Essence; Cemetery Gate costs 3 because its +3/+3 Undead bonus and Cemetery replacement effect are substantially stronger.

Every Death card, Zone card, and card introduced in the expanded Water, Fire, and Thunder sets has unique illustrated artwork. The Home Gate, Center Gate, and Enemy Gate also have dedicated battlefield scenes. Ignis and Shellgon have identity-matched portraits for their Awakened, Ascended, and Ultimate forms, and in-battle Leader panels show uncropped portrait art.

## Turn structure

Each turn follows one locked sequence:

1. **Deploy Phase** — summon Units, play Equipment, and activate a Zone using Essence.
2. **Battle Phase** — move ready Units, activate abilities, and attack enemies in the same hex. A Unit can strike the rival Leader only after reaching the enemy Gate.
3. **End Turn** — the rival completes the same turn sequence.

Magic cards may be played during Deploy or Battle. Leader and activated Unit abilities are used during Battle. Leader abilities spend Ability Points instead of Essence; AP refreshes to the current form maximum at the start of each turn. Unit attacks never cause counterattacks. Select a Unit, press **Attack**, choose a target, then confirm or cancel without ending the rest of the turn.

The title screen includes a seven-step tutorial. Battle Chronicle is now a click-open full match record showing card costs, remaining resources, summons, movement, ability spending, damage sources and targets, healing, and defeats. Zone information closes with its X button or Escape.

AI-vs-AI mode uses the selected Leader and saved custom deck for the bottom CPU and the selected opponent's starter deck for the top CPU. Both sides visibly take Deploy and Battle actions. The spectator can pause, resume, exit, open the Chronicle, and inspect either Leader, any Unit, any played Zone, and both public piles without taking control of the match.

Battlefield Units display their card artwork. Click a card in your hand to open its full artwork, cost, statistics, and rules in the side inspector, then press **Play Card** to commit it. Choice-based Queen cards open a server-validated target picker.

Click either Leader during a match to view current Health, Attack, Defense, evolution stage, ability, passive, Equipment, statuses, and the complete evolution ability list. Click the Grave count to open the public Graveyard/Cemetery viewer; cards are sorted by type and individually inspectable. Connected Zone hexes and battlefield Units are also clickable for full rules and status details.

## Test-play and optimization loop

```bash
npm run optimize
```

The loop performs connected-cluster, illegal-placement, Zone-capacity, contested movement, same-hex combat, all-turn Magic, once-per-turn ability, universal deck legality, AI-vs-AI phase progression, Zone Bound, Recoil, Tribute, Static Field, new set, Queen-card, and evolution assertions. It then simulates 200 complete matches, checks for stalls and match length, and creates a production build.

It also starts a temporary two-player server and verifies room creation, hidden opponent information, synchronized turns, out-of-turn rejection, disconnect/reconnect, and surrender outcomes.

Run only the simulations with:

```bash
npm run test:play
```

Run only the online room-code checks with:

```bash
npm run test:online
```

## Known beta limitations

- This beta is intended for testing with friends, not public launch traffic.
- Online rooms use five-character invite codes and are not password-protected.
- Disconnected matches are preserved for 10 minutes, then may expire.
- Player progress and deck choices are saved locally in each browser.
- The free Render plan may sleep after inactivity, so the first connection can be slow.
- Public matchmaking, accounts, ranking, and custom domains are not included yet. AI-vs-AI spectating is local to the viewer and does not create an online room.
- Balance is still under review; automated simulations report recommendations but do not make rule changes automatically.
