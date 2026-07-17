# Heroics: Clash of Leaders

A Phaser + TypeScript browser card-game prototype featuring battlefield movement, Essence, Leader abilities, AI, online friend rooms, and four-stage Leader evolution.

Heroics is an active beta for private testing with friends. It is not a finished or production-ready game.

## Run the game

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/`.

## Online multiplayer

Heroics supports private two-player rooms with five-character invite codes. Each player uses the 20-card deck saved in their own browser. The server is authoritative: it validates turn order, keeps opposing hands and deck order private, synchronizes every action, and preserves disconnected matches for 10 minutes.

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
- **Play Online** creates or joins a private friend match using the saved deck.
- **Create a Deck** opens the visual deck builder.
- Choose Ignis, Shellgon, the Queen of the Dead, or Tempestfang as your Leader.
- Clicking a Leader opens an information screen with Health, ability, evolution rules, strategy, signature cards, and a confirmation button. Your saved deck changes only after confirmation.
- Choose the Fire, Water, Queen of the Dead, or Tempestfang deck as the AI opponent.
- Click any card to see its artwork, Essence cost, statistics, and effect.
- Add up to 3 copies of a card and build an exact 20-card deck.
- The deck count and complete deck list update immediately.
- Your Leader, opponent, and deck are saved automatically in browser storage.

## Evolution Phase

Ignis and Shellgon progress through four forms:

| Stage | Level | Glory requirement |
|---|---:|---:|
| Basic | 5 | 0 |
| Awakened | 10 | 3 |
| Ascended | 15 | 7 |
| Ultimate | 20 | 12 |

Enter the Evolution Phase after reaching the next requirement. Review the next form and choose **Begin Evolution**. Evolution grants permanent statistics, a stronger Leader ability, a new portrait, and a form-specific effect.

The Queen of the Dead starts at 30 Health and evolves at 3, 7, and 12 Glory into Grave Regent, Lich Empress, and Sovereign of Endless Night. Her once-per-turn **Raise Skeleton** ability summons a 1 Attack / 2 Health Skeleton token; later forms summon ready or additional Skeletons. Her deck also revolves around Unit search chains, the graveyard, resurrection, kill-triggered healing, Gatekeeper bonuses, and Unit-targeted Equipment. During Deploy, select a friendly Unit before playing **Soul Harvest** or an Undead Equipment card. **Raise the Fallen** returns the two most recently defeated Units available in your graveyard.

## Tempestfang and the Storm deck

Tempestfang uses condition-based evolution instead of Glory:

1. Cast 2 Magic cards to become **Gale-Blooded**.
2. Deal 6 damage in a single turn to become **Thunder-Crowned**.
3. Hold 3 Storm Charges or cast **Stormheart Cataclysm** to become **Storm-Devourer**.

Storm abilities are once per turn and can target a selected enemy Unit or default to the rival Leader. Select a friendly Unit before casting healing, Wind Step, or Unit Equipment cards. In this lane adaptation, **Speed +1** readies a Unit for movement, “blocking” means being the defending Unit in combat, and Tempest Magic chooses damage plus push when an enemy Unit is selected or damage plus Rainfield when targeting the rival Leader. Storm-Devourer unlocks all three Eye of the Storm choices and may automatically absorb the lowest-cost Magic card in hand for Storm Blast.

## Turn structure

Each turn follows one locked sequence:

1. **Deploy Phase** — play cards using Essence.
2. **Evolution Phase** — transform when the Glory requirement is met.
3. **Advance Phase** — move ready units toward the enemy gate.
4. **Battle Phase** — select an attacker and an enemy occupying the same physical zone. A Unit can strike the rival Leader only after reaching the enemy Gate.
5. **End Turn** — the rival completes the same turn sequence.

Use **End Phase** to move forward. Earlier phases cannot be reopened during the same turn, and **End Turn** appears only during Battle Phase.

Battlefield Units display their card artwork. Click a card in your hand to open its full artwork, cost, statistics, and rules in the side inspector, then press **Play Card** to commit it.

## Test-play and optimization loop

```bash
npm run optimize
```

The loop performs rule assertions, simulates 200 complete matches, reports win rates, stalls, match length, and ultimate-form frequency, produces a balance recommendation, and then creates a production build.

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
- Matchmaking, spectator mode, accounts, ranking, and custom domains are not included yet.
- Balance is still under review; automated simulations report recommendations but do not make rule changes automatically.
