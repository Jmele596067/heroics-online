# Heroics TCG — Rules Baseline

This document is the implementation baseline for future Heroics revisions. Gameplay code, online validation, AI behavior, UI, tutorials, and player documentation must remain consistent with it unless a later approved update explicitly replaces a rule.

## Battlefield cluster

- A battle opens with exactly three point-top hex tiles sharing full edges in one horizontal cluster.
- Each player draws five cards and both Leader portraits are visible when the battle opens.
- A Zone card can fill only one of four fixed cells: two above and two below the gaps between the three original Gate tiles. The completed footprint is a 2–3–2 seven-tile honeycomb.
- Each legal Zone shares complete edges with the original Gate row. Corner contact is never adjacency, and a placed Zone never unlocks an outer ring.
- The four outer cells behind the Home and Enemy Gates are permanently illegal. They appear as red-X markers during placement and spend neither the card nor Essence when rejected.
- Legal placement controls appear only on the four approved shared edges; the battlefield does not show detached legal ghost tiles.
- Seven tiles is an absolute field limit, including the three original tiles.
- A removable Zone may be destroyed only if it is not one of the first three tiles and removing it leaves the rest of the cluster connected.

## Clean tile UI

- A tile is the visual container for Units.
- A summoned Unit appears as its card artwork directly on the hex.
- Do not render empty monster slots, slot frames, slot diamonds, Gate numbers, “Starting Zone,” “Homegate Zone,” tile coordinates, or open/contested text on the battlefield surface.
- A tile may contain up to three friendly Units and three enemy Units at the same time.
- The battlefield surface displays only hex art, Unit art, and Zone-placement indicators. Details belong in click-open inspectors.
- Home Gate, Center Gate, and Enemy Gate use dedicated illustrated tile scenes. Both Leader HUD cards show full rectangular portraits rather than cropped circular icons.
- Clicking a Unit opens its card, stats, equipment, and status inspector. Clicking an already-selected Zone opens its Zone inspector.

## Turn and combat rules

1. **Deploy Phase:** summon Units and play Equipment or Zone cards.
2. **Battle Phase:** move Units, attack, and activate Leader or Unit abilities.
3. **End Turn:** resolve end-of-turn effects and pass priority.

- Magic cards can be played during either Deploy or Battle.
- Evolution can be activated at will during your turn when its requirement is met, no more than once per turn.
- Leader abilities spend Ability Points, not Essence. Ability Points refresh at the start of the Leader’s turn.
- Units attack only in Battle. Select a Unit, choose **Attack**, select a legal target, then confirm or cancel.
- Attacks never cause counterattacks. Recoil and reflection are triggered effects, not counterattacks.
- A normal Unit attack can target an enemy on the same physical tile. Range can reach one adjacent tile.
- A Unit can damage the enemy Leader only from the enemy’s original Gate tile.
- A contested tile contains Units from both teams. A Unit cannot leave it while an enemy remains unless Sneak, Dive, or another card rule allows it.
- Multi-tile movement stops on the first contested tile and cannot skip past it.
- Every move follows edge-connected paths. Corner contact never permits movement.

## Deck and attributes

- A legal deck contains exactly 40 cards, with no more than three copies of one card.
- The six card attributes are Fire, Water, Lightning, Death, Earth, and Divine.
- Faction Zone cards are legal only for their matching Leader; neutral Gate Zones are legal for every Leader.

## Keyword definitions

| Keyword | Implemented rule |
|---|---|
| Zone Bound | The Unit can be summoned only onto a matching Zone tile with room. Kraken requires a friendly Water Zone. |
| Dive | The Unit may leave a contested Water tile and continue along connected Water movement. |
| Electric Recoil N | After this Unit is attacked, deal N Lightning damage to the attacking Unit. This is not a counterattack. |
| Tribute | Sacrifice the named friendly Unit as an additional summon or activated-ability requirement. |
| Ship | May be summoned directly to a friendly Lighthouse and can be moved by Siren’s Echo. |
| Range | The equipped Unit may attack an enemy on a tile sharing one edge with its current tile. |
| Stun / Freeze | The affected Unit is exhausted during its next ready step and cannot act that turn. |
| Rain | At the start of the controller’s turn, restore 1 Health to each friendly Unit, then reduce Rain duration. |

## Water set update

### Units

| Card | Essence | ATK / HP | Rules |
|---|---:|---:|---|
| Tidecaller Adept | 1 | 3 / 4 | Gains +1 Attack whenever its controller casts Water Magic. |
| Abyssal Diver | 1 | 3 / 4 | Dive. |
| River Serpent | 2 | 1 / 8 | Gains +1 Attack at the start of its controller’s turn, maximum 10 Attack. |
| Storm Sailor | 2 | 4 / 4 | Ship. Summoned: create Rain for 1 turn. |
| Coral Knight | 5 | 6 / 7 | Reduces incoming physical combat damage by 2. |
| Kraken | 10 | 15 / 25 | Zone Bound — Water. End of turn: destroy Ship Units sharing its tile. |

### Magic, Equipment, and Zone

| Card | Type | Essence | Rules |
|---|---|---:|---|
| Tsunami | Magic | 3 | Deal 1 damage to every enemy Unit, then push survivors one tile toward home. |
| Rainfall Blessing | Magic | 2 | Heal every friendly Unit for 2. |
| Siren’s Echo | Magic | 2 | Move friendly Ship Units, up to capacity, to the selected Water Zone. |
| Aqua Burst | Magic | 2 | Deal 3 Water damage to a Unit, or 6 if it is Fire. |
| Cold Snap | Magic | 2 | Deal 2 Water damage and Freeze the target for 1 turn. |
| Kraken’s Call | Magic | 6 | Summon Kraken from deck, hand, or graveyard to a selected Water Zone. |
| Sailor’s Compass | Equipment | 1 | Once per turn, equipped Unit may move directly to any connected Water Zone with room. |
| Coral Shield | Equipment | 5 | Reduce incoming damage by 1; increase the reduction each turn to a maximum of 5. |
| Pearl Amulet | Leader Equipment | 3 | Immediately gain 5 Essence. |
| Captain’s Raincoat | Equipment | 3 | Equipped Unit is immune to Water damage. |
| Lighthouse | Zone | 2 | Ship Units may be summoned directly to this Water Zone. |

## Thunder set update

### Units

| Card | Essence | ATK / HP | Rules |
|---|---:|---:|---|
| Stormrunner Scout | 2 | 1 / 3 | May attack up to three enemy Units per turn. |
| Thunder Ox | 6 | 4 / 5 | A Unit damaged by its attack is Stunned for 1 turn. |
| Skybolt Mage | 5 | 5 / 7 | Lightning Magic deals +1 damage while at least one Skybolt Mage is in play. |
| Static Wraith | 7 | 2 / 10 | Electric Recoil 2. |
| Shock Trooper | 3 | 2 / 5 | Gains +1 movement while occupying a Thunder Zone. |
| Electro Golem | 8 | 4 / 10 | Electric Recoil 3. |
| Pulse Panther | 3 | 3 / 6 | May attack twice if its first target was Stunned. |

### Magic, Equipment, and Zone

| Card | Type | Essence | Rules |
|---|---|---:|---|
| Lightning Bolt | Magic | 4 | Deal 3 Lightning damage and Stun the Unit for 1 turn. |
| Chain Spark | Magic | 1 | Hit up to three enemies for 3, 2, then 1 damage. |
| Thunderstep | Magic | 2 | Teleport a friendly Unit and deal 1 Lightning damage to enemies at origin and destination. |
| Sky Crash | Magic | 2 | Destroy enemy Flying and Aerial Units. |
| Overcharge | Magic | 2 | Give a Unit +3 Attack; it takes 1 damage at the start of each controller turn. |
| Stormcall | Magic | 1 | Search for Static Field and add it to hand. |
| Pulse Barrier | Magic | 2 | Friendly Units on the selected tile take 1 less damage for 2 turns. |
| Electric Trap | Magic | 1 | Stun the first enemy Unit entering the selected tile, then remove the trap. |
| Volt Surge | Magic | 2 | Restore 2 Essence and deal 2 Lightning damage to an enemy Unit or Leader. |
| Lightning Rod Staff | Leader Equipment | 4 | Casting Magic deals 1 Lightning damage to the enemy Leader. |
| Overcharge Ring | Equipment | 3 | One additional attack each turn; take 1 damage at the start of each controller turn. |
| Skybreaker Spear | Equipment | 4 | Attacks chain 1 Lightning damage to a second enemy in the same tile. |
| Sky-Howler Spear | Equipment | 6 | An attack strikes every enemy Unit in the tile twice. |
| Static Field | Zone | 2 | An enemy entering this Thunder Zone takes 2 Lightning damage. |

## Fire set update

### Units

| Card | Essence | ATK / HP | Rules |
|---|---:|---:|---|
| Flare Archer | 2 | 5 / 2 | Fire Archer. |
| Cinder Witch | 5 | 5 / 5 | Fire Magic costs 1 less while alive. |
| Ash Scout | 2 | 5 / 3 | Summoned: add one Fire Magic from deck to hand. |
| Molten Golem | 5 | 3 / 10 | At the start of its controller’s turn, lose 1 Health and gain +3 Attack. |
| Phoenix Hatchling | 1 | 0 / 2 | Tribute this Unit during Battle to summon Phoenix from deck, hand, or graveyard. |
| Ember Samurai | 1 | 5 / 3 | Summoned: add Flame Shogun from deck to hand. |
| Flame Shogun | 10 | 20 / 15 | Tribute an Ember Samurai to summon from hand. |
| Phoenix | 3 | 5 / 3 | Defeated: summon Phoenix Hatchling from deck, field, or graveyard. |

### Magic and Equipment

| Card | Type | Essence | Rules |
|---|---|---:|---|
| Heatwave | Magic | 3 | For 2 turns, enemies in Fire or Desert Zones take 1 additional physical damage. |
| Meteor Drop | Magic | 5 | Destroy one added Zone without disconnecting the cluster; original tiles are protected. |
| Wildfire | Magic | 5 | Enemies in Fire Zones take 2 Fire damage for 2 turns. |
| Ashen Rebirth | Magic | 5 | Summon a chosen Fire Unit from graveyard with 1 Health. |
| Flame Shield | Equipment | 3 | An attacker takes 2 reflected Fire damage. |
| Molten Armor | Equipment | 4 | +2 Attack and Fire immunity. |
| Flarebow | Equipment | 2 | Grants Range. |
| Molten Core Amulet | Equipment | 3 | +2 Attack while below half Health. |
| Cinder Mask | Leader Equipment | 5 | Leader abilities cost 1 less AP, minimum 0. |

## Beta cost rulings

The supplied update did not specify costs for Siren’s Echo, Aqua Burst, Cold Snap, Kraken’s Call, Pearl Amulet, Pulse Barrier, or Heatwave. Their values in the tables above are explicit beta implementation rulings so the cards can be played and tested. They may be changed in a later balance update without changing the underlying mechanics.
