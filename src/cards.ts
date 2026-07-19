export type Element = 'flame' | 'tide' | 'undead' | 'storm';
export type CardAffinity = Element | 'neutral';
export type CardAttribute = 'fire'|'water'|'lightning'|'death'|'earth'|'divine';
export type CardKind = 'unit' | 'magic' | 'equipment' | 'zone';
export type ZoneId = 'desert' | 'ocean' | 'volcano' | 'field' | 'lightning' | 'fog' | 'frost' | 'shadow' | 'cemetery' | 'lighthouse' | 'static-field';

export interface CardDef {
  id:string;
  name:string;
  kind:CardKind;
  element:CardAffinity;
  cost:number;
  attack?:number;
  health?:number;
  text:string;
  flavor?:string;
  effect?:'damage'|'heal'|'buff'|'draw';
  image?:string;
  traits?:string[];
  zone?:ZoneId;
  attribute?:CardAttribute;
}

const flame: CardDef[] = [
  {id:'ember-squire',name:'Ember Squire',kind:'unit',element:'flame',attribute:'fire',cost:1,attack:2,health:2,traits:['Fire','Soldier'],text:'Summoned: Search your deck for one Equipment card, add it to your hand, then shuffle.',image:'/assets/units/ember-squire.png'},
  {id:'sunsteel-guard',name:'Sunsteel Guard',kind:'unit',element:'flame',cost:2,attack:2,health:4,traits:['Fire','Knight'],text:'Guard • A sturdy solar defender.',image:'/assets/units/sunsteel-guard.png'},
  {id:'blaze-raptor',name:'Fire Raptor',kind:'unit',element:'flame',attribute:'fire',cost:3,attack:4,health:2,traits:['Fire','Beast','Sneak'],text:'Summoned: Search your deck for one Fire Raptor, add it to your hand, then shuffle.',image:'/assets/units/blaze-raptor.png'},
  {id:'solar-champion',name:'Solar Champion',kind:'unit',element:'flame',attribute:'divine',cost:4,attack:5,health:5,traits:['Fire','Knight','Divine'],text:'Summoned: Search your deck for Rallying Flame, add it to your hand, then shuffle.',image:'/assets/units/solar-champion.png'},
  {id:'firebolt',name:'Firebolt',kind:'magic',element:'flame',cost:2,traits:['Fire'],text:'Deal 3 damage to the enemy Leader.',effect:'damage',image:'/assets/magic/firebolt.png'},
  {id:'rallying-flame',name:'Rallying Flame',kind:'magic',element:'flame',attribute:'fire',cost:1,traits:['Fire'],text:'Damaged friendly units gain +2 Attack. If Solar Champion is in play, all friendly units gain +5 Attack instead.',effect:'buff',image:'/assets/magic/rallying-flame.png'},
  {id:'phoenix-call',name:'Phoenix Call',kind:'magic',element:'flame',attribute:'fire',cost:2,traits:['Fire'],text:'Search your deck for one Fire card, add it to your hand, then shuffle.',effect:'draw',image:'/assets/magic/phoenix-call.png'},
  {id:'sunblade',name:'Sunblade',kind:'equipment',element:'flame',cost:2,traits:['Fire'],text:'Ignis gains +2 Attack this match.',effect:'buff',image:'/assets/equipment/sunblade.png'},
  {id:'flare-archer',name:'Flare Archer',kind:'unit',element:'flame',attribute:'fire',cost:2,attack:5,health:2,traits:['Fire','Archer'],text:'A high-damage ranged Fire unit.',image:'/assets/fire/new/flare-archer.webp'},
  {id:'cinder-witch',name:'Cinder Witch',kind:'unit',element:'flame',attribute:'fire',cost:5,attack:5,health:5,traits:['Fire','Mage'],text:'Cinder Casting • Your Fire Magic cards cost 1 less Essence while Cinder Witch is in play.',image:'/assets/fire/new/cinder-witch.webp'},
  {id:'ash-scout',name:'Ash Scout',kind:'unit',element:'flame',attribute:'fire',cost:2,attack:5,health:3,traits:['Fire','Scout'],text:'Summoned • Search your deck for a Fire Magic card, add it to your hand, then shuffle.',image:'/assets/fire/new/ash-scout.webp'},
  {id:'molten-golem',name:'Molten Golem',kind:'unit',element:'flame',attribute:'fire',cost:5,attack:3,health:10,traits:['Fire','Golem'],text:'Molten Growth • At the start of your turn, lose 1 Health and gain +3 Attack.',image:'/assets/fire/new/molten-golem.webp'},
  {id:'phoenix-hatchling',name:'Phoenix Hatchling',kind:'unit',element:'flame',attribute:'fire',cost:1,attack:0,health:2,traits:['Fire','Flying','Tribute'],text:'Tribute • During your Battle Phase, sacrifice this unit to summon Phoenix from your deck, hand, or graveyard to this tile.',image:'/assets/fire/new/phoenix-hatchling.webp'},
  {id:'ember-samurai',name:'Ember Samurai',kind:'unit',element:'flame',attribute:'fire',cost:1,attack:5,health:3,traits:['Fire','Samurai','Tribute'],text:'Summoned • Search your deck for Flame Shogun and add it to your hand.',image:'/assets/fire/new/ember-samurai.webp'},
  {id:'flame-shogun',name:'Flame Shogun',kind:'unit',element:'flame',attribute:'fire',cost:10,attack:20,health:15,traits:['Fire','Samurai','Tribute'],text:'Tribute Summon • To summon this card from your hand, sacrifice an Ember Samurai you control.',image:'/assets/fire/new/flame-shogun.webp'},
  {id:'phoenix',name:'Phoenix',kind:'unit',element:'flame',attribute:'fire',cost:3,attack:5,health:3,traits:['Fire','Flying','Phoenix'],text:'Rekindle • When Phoenix is defeated, summon Phoenix Hatchling from your deck, hand, or graveyard to its tile.',image:'/assets/fire/new/phoenix.webp'},
  {id:'heatwave',name:'Heatwave',kind:'magic',element:'flame',attribute:'fire',cost:3,traits:['Fire'],text:'For 2 turns, enemy units in Fire or Desert Zones take 1 additional physical damage.',image:'/assets/fire/new/heatwave.webp'},
  {id:'meteor-drop',name:'Meteor Drop',kind:'magic',element:'flame',attribute:'fire',cost:5,traits:['Fire'],text:'Destroy one added Zone tile. The first three original hexes cannot be destroyed, and the remaining cluster must stay connected.',image:'/assets/fire/new/meteor-drop.webp'},
  {id:'wildfire',name:'Wildfire',kind:'magic',element:'flame',attribute:'fire',cost:5,traits:['Fire'],text:'For 2 turns, enemy units occupying Fire Zones take 2 damage at the end of your turn.',image:'/assets/fire/new/wildfire.webp'},
  {id:'ashen-rebirth',name:'Ashen Rebirth',kind:'magic',element:'flame',attribute:'fire',cost:5,traits:['Fire'],text:'Choose a Fire Unit card in your graveyard and summon it with 1 Health.',image:'/assets/fire/new/ashen-rebirth.webp'},
  {id:'flame-shield',name:'Flame Shield',kind:'equipment',element:'flame',attribute:'fire',cost:3,traits:['Fire'],text:'Equip to a unit. Whenever it is attacked, deal 2 Fire damage back to the attacker.',image:'/assets/fire/new/flame-shield.webp'},
  {id:'molten-armor',name:'Molten Armor',kind:'equipment',element:'flame',attribute:'fire',cost:4,traits:['Fire'],text:'Equip to a unit. It gains +2 Attack and is immune to Fire damage.',image:'/assets/fire/new/molten-armor.webp'},
  {id:'flarebow',name:'Flarebow',kind:'equipment',element:'flame',attribute:'fire',cost:2,traits:['Fire','Range'],text:'Equip to a unit. It gains Range and may attack units on an adjacent tile.',image:'/assets/fire/new/flarebow.webp'},
  {id:'molten-core-amulet',name:'Molten Core Amulet',kind:'equipment',element:'flame',attribute:'fire',cost:3,traits:['Fire'],text:'Equip to a unit. It gains +2 Attack while below half Health.',image:'/assets/fire/new/molten-core-amulet.webp'},
  {id:'cinder-mask',name:'Cinder Mask',kind:'equipment',element:'flame',attribute:'fire',cost:5,traits:['Fire','Leader'],text:'Equip to your Leader. Leader abilities cost 1 less Ability Point, to a minimum of 0.',image:'/assets/fire/new/cinder-mask.webp'},
];

const tide: CardDef[] = [
  {id:'pearl-scout',name:'Pearl Scout',kind:'unit',element:'tide',attribute:'water',cost:1,attack:1,health:3,traits:['Water','Scout'],text:'Summoned: Search your deck for Mending Tide, add it to your hand, then shuffle.',image:'/assets/units/pearl-scout.png'},
  {id:'coral-defender',name:'Coral Defender',kind:'unit',element:'tide',attribute:'water',cost:2,attack:2,health:10,traits:['Water','Defender','Block'],text:'Block (chain): When another friendly unit in this tile is attacked, Coral Defender becomes the target and blocks that damage.',image:'/assets/units/coral-defender.png'},
  {id:'riptide-hunter',name:'Riptide Hunter',kind:'unit',element:'tide',attribute:'water',cost:3,attack:4,health:3,traits:['Water','Hunter'],text:'May attack twice each turn while occupying a Water Zone tile.',image:'/assets/units/riptide-hunter.png'},
  {id:'abyssal-crab',name:'Abyssal Crab',kind:'unit',element:'tide',attribute:'water',cost:4,attack:4,health:7,traits:['Water','Beast'],text:'Gains +3 Attack while occupying a Water Zone tile.',image:'/assets/units/abyssal-crab.png'},
  {id:'crushing-wave',name:'Crushing Wave',kind:'magic',element:'tide',cost:2,traits:['Water'],text:'Deal 3 damage to the enemy Leader.',effect:'damage',image:'/assets/magic/crushing-wave.png'},
  {id:'mending-tide',name:'Mending Tide',kind:'magic',element:'tide',attribute:'water',cost:2,traits:['Water'],text:'Target a friendly unit or Leader and restore 5 Health.',effect:'heal',image:'/assets/magic/mending-tide.png'},
  {id:'deep-wisdom',name:'Deep Wisdom',kind:'magic',element:'tide',attribute:'water',cost:2,traits:['Water'],text:'Search your deck for up to two Water Magic cards, add them to your hand, then shuffle.',effect:'draw',image:'/assets/magic/deep-wisdom.png'},
  {id:'coral-plate',name:'Coral Plate',kind:'equipment',element:'tide',attribute:'water',cost:2,traits:['Water'],text:'Equip to a friendly unit. It gains +5 Health.',effect:'heal',image:'/assets/equipment/coral-plate.png'},
  {id:'tidecaller-adept',name:'Tidecaller Adept',kind:'unit',element:'tide',attribute:'water',cost:1,attack:3,health:4,traits:['Water','Mage'],text:'Tidecalling • Whenever you cast a Water Magic card, Tidecaller Adept permanently gains +1 Attack.',image:'/assets/water/new/tidecaller-adept.webp'},
  {id:'abyssal-diver',name:'Abyssal Diver',kind:'unit',element:'tide',attribute:'water',cost:1,attack:3,health:4,traits:['Water','Diver','Dive'],text:'Dive • May leave a contested Water tile and move through connected Water Zones.',image:'/assets/water/new/abyssal-diver.webp'},
  {id:'river-serpent',name:'River Serpent',kind:'unit',element:'tide',attribute:'water',cost:2,attack:1,health:8,traits:['Water','Serpent'],text:'River Growth • At the start of your turn, gain +1 Attack, to a maximum of 10 Attack.',image:'/assets/water/new/river-serpent.webp'},
  {id:'storm-sailor',name:'Storm Sailor',kind:'unit',element:'tide',attribute:'water',cost:2,attack:4,health:4,traits:['Water','Ship'],text:'Summoned • Create Rain for 1 turn. At the start of your next turn, Rain heals your units for 1.',image:'/assets/water/new/storm-sailor.webp'},
  {id:'coral-knight',name:'Coral Knight',kind:'unit',element:'tide',attribute:'water',cost:5,attack:6,health:7,traits:['Water','Knight'],text:'Coral Armor • Reduce physical combat damage dealt to Coral Knight by 2.',image:'/assets/water/new/coral-knight.webp'},
  {id:'kraken',name:'Kraken',kind:'unit',element:'tide',attribute:'water',cost:10,attack:15,health:25,traits:['Water','Beast','Zone Bound'],text:'Zone Bound • Can only be summoned to a Water Zone. Kraken Maelstrom • At end of turn, destroy every Ship unit sharing this tile.',image:'/assets/water/new/kraken.webp'},
  {id:'tsunami',name:'Tsunami',kind:'magic',element:'tide',attribute:'water',cost:3,traits:['Water'],text:'Deal 1 damage to every enemy unit, then push each surviving enemy one tile toward its Home Gate.',image:'/assets/water/new/tsunami.webp'},
  {id:'rainfall-blessing',name:'Rainfall Blessing',kind:'magic',element:'tide',attribute:'water',cost:2,traits:['Water'],text:'Restore 2 Health to every friendly unit.',image:'/assets/water/new/rainfall-blessing.webp'},
  {id:'sirens-echo',name:'Siren’s Echo',kind:'magic',element:'tide',attribute:'water',cost:2,traits:['Water'],text:'Move as many of your Ship units as capacity allows to the selected Water Zone.',image:'/assets/water/new/sirens-echo.webp'},
  {id:'aqua-burst',name:'Aqua Burst',kind:'magic',element:'tide',attribute:'water',cost:2,traits:['Water'],text:'Deal 3 Water damage to a target unit. Deal 6 instead if the target is Fire.',image:'/assets/water/new/aqua-burst.webp'},
  {id:'cold-snap',name:'Cold Snap',kind:'magic',element:'tide',attribute:'water',cost:2,traits:['Water','Ice'],text:'Deal 2 Water damage to a target unit and freeze it for 1 turn.',image:'/assets/water/new/cold-snap.webp'},
  {id:'krakens-call',name:'Kraken’s Call',kind:'magic',element:'tide',attribute:'water',cost:6,traits:['Water'],text:'Summon Kraken from your deck, hand, or graveyard to the selected Water Zone.',image:'/assets/water/new/krakens-call.webp'},
  {id:'sailors-compass',name:'Sailor’s Compass',kind:'equipment',element:'tide',attribute:'water',cost:1,traits:['Water'],text:'Equip to a unit. Once per turn, it may move directly to any connected Water Zone with room.',image:'/assets/water/new/sailors-compass.webp'},
  {id:'coral-shield',name:'Coral Shield',kind:'equipment',element:'tide',attribute:'water',cost:5,traits:['Water'],text:'Equip to a unit. Reduce incoming damage by 1. This reduction grows by 1 at the start of your turn, to a maximum of 5.',image:'/assets/water/new/coral-shield.webp'},
  {id:'pearl-amulet',name:'Pearl Amulet',kind:'equipment',element:'tide',attribute:'water',cost:3,traits:['Water','Leader'],text:'Equip to your Leader and immediately gain 5 Essence.',image:'/assets/water/new/pearl-amulet.webp'},
  {id:'captains-raincoat',name:'Captain’s Raincoat',kind:'equipment',element:'tide',attribute:'water',cost:3,traits:['Water'],text:'Equip to a unit. It is immune to Water damage.',image:'/assets/water/new/captains-raincoat.webp'},
];

const undead: CardDef[] = [
  {id:'grave-banshee',name:'Grave Banshee',kind:'unit',element:'undead',cost:2,attack:2,health:3,traits:['Undead','Spirit','Dark'],text:'Once per turn: All enemy units lose 2 Attack until end of turn.',image:'/assets/undead/grave-banshee.png'},
  {id:'undead-wizard',name:'Undead Wizard',kind:'unit',element:'undead',cost:3,attack:2,health:4,traits:['Undead','Wizard','Dark'],text:'Deployed: Search your deck for Gravebound Knight and deploy it. If your Gate is full, add it to your hand instead. Then shuffle.',image:'/assets/undead/undead-wizard.png'},
  {id:'queens-guardsman',name:'Queen’s Guardsman',kind:'unit',element:'undead',cost:3,attack:4,health:6,traits:['Undead','Soldier','Dark'],text:'Royal Guard • Enemy units in this Zone can only attack Queen’s Guardsman.',image:'/assets/undead/queens-guardsman.png'},
  {id:'gravebound-knight',name:'Gravebound Knight',kind:'unit',element:'undead',cost:4,attack:5,health:6,traits:['Undead','Knight','Dark'],text:'Deployed: Search your deck for Forever Dead King, reveal it, add it to your hand, then shuffle.',image:'/assets/undead/gravebound-knight.png'},
  {id:'forsaken-prince',name:'The Forsaken Prince',kind:'unit',element:'undead',cost:5,attack:5,health:6,traits:['Undead','Royal','Dark'],text:'May attack enemy units twice each turn. Royal Blood • +3 Attack and +3 Health while in the same Zone as Forever Dead King. Death Burst • When defeated, deal 2 damage to all enemy units.',image:'/assets/undead/forsaken-prince.png'},
  {id:'cemetery-reaper',name:'Cemetery Reaper',kind:'unit',element:'undead',cost:4,attack:6,health:5,traits:['Undead','Reaper','Dark'],text:'Whenever this unit destroys an enemy unit, heal your Queen for 5 Health.',image:'/assets/undead/cemetery-reaper.png'},
  {id:'skeleton-bone-parlor',name:'Skeleton Bone Parlor',kind:'unit',element:'undead',cost:6,attack:6,health:8,traits:['Undead','Skeleton','Dark'],text:'Bone Legion • Gains +2 Attack and +1 Health for each other Skeleton in this Zone. Other Skeletons here gain +2 Attack and +1 Health.',image:'/assets/undead/skeleton-bone-parlor.png'},
  {id:'forever-dead-king',name:'Forever Dead King',kind:'unit',element:'undead',cost:7,attack:6,health:8,traits:['Undead','Royal','Skeleton','Dark'],text:'Royal Protector • When this destroys an enemy unit, heal your Queen for 2. Gatekeeper • While at your Gate, +2 Attack and +2 Health.',image:'/assets/undead/forever-dead-king.png'},
  {id:'soul-harvest',name:'Soul Harvest',kind:'magic',element:'undead',cost:2,traits:['Dark'],text:'Destroy one friendly Undead unit. Draw 2 cards and heal your Queen for 5 Health.',image:'/assets/undead/soul-harvest.png'},
  {id:'ultimate-sacrifice',name:'Ultimate Sacrifice',kind:'magic',element:'undead',cost:3,traits:['Dark'],text:'Choose up to 2 Unit cards from your hand and discard them to your graveyard.',image:'/assets/undead/ultimate-sacrifice.png'},
  {id:'for-the-queen',name:'For the Queen',kind:'magic',element:'undead',cost:4,traits:['Dark'],text:'Choose and deploy up to 2 Unit cards from your deck. You cannot choose Forever Dead King.',image:'/assets/undead/for-the-queen.png'},
  {id:'raise-the-fallen',name:'Raise the Fallen',kind:'magic',element:'undead',cost:4,traits:['Dark'],text:'Choose and deploy up to 2 Unit cards from your graveyard.',image:'/assets/undead/raise-the-fallen.png'},
  {id:'death-mist',name:'Death Mist',kind:'magic',element:'undead',cost:5,traits:['Dark'],text:'Deal 3 damage to all enemy units.',image:'/assets/undead/death-mist.png'},
  {id:'queens-destruction',name:'Queen’s Destruction',kind:'magic',element:'undead',cost:5,traits:['Dark'],text:'Destroy one friendly unit, then destroy up to 2 enemy units.',image:'/assets/undead/queens-destruction.png'},
  {id:'endless-grave',name:'Endless Grave',kind:'magic',element:'undead',cost:6,traits:['Dark'],text:'Until the end of your next turn, defeated Undead units return to your hand.',image:'/assets/undead/endless-grave.png'},
  {id:'thorned-rose-crown',name:'Thorned Rose Crown',kind:'equipment',element:'undead',cost:2,traits:['Dark'],text:'+2 Attack and +5 Health. Prevent the first damage dealt to this unit each turn.',image:'/assets/undead/thorned-rose-crown.png'},
  {id:'crown-eternal-night',name:'Crown of Eternal Night',kind:'equipment',element:'undead',cost:4,traits:['Dark'],text:'+2 Attack and +3 Health. When this unit destroys an enemy, heal your Queen for 2.',image:'/assets/undead/crown-eternal-night.png'},
  {id:'blade-forgotten-kings',name:'Blade of Forgotten Kings',kind:'equipment',element:'undead',cost:5,traits:['Dark'],text:'+4 Attack and +1 Health. Whenever this unit destroys an enemy unit, it may attack one additional time this turn.',image:'/assets/undead/blade-forgotten-kings.png'},
];

const storm: CardDef[] = [
  {id:'skyclaw-raptor',name:'Skyclaw Raptor',kind:'unit',element:'storm',cost:2,attack:2,health:1,traits:['Beast','Aerial','Lightning'],text:'Wind Step • Prevent the first damage this takes each turn. Storm Synchronize • +1 Power on an evolution turn.',image:'/assets/storm/skyclaw-raptor.png'},
  {id:'stormhide-bruiser',name:'Stormhide Bruiser',kind:'unit',element:'storm',cost:3,attack:2,health:4,traits:['Beast','Defender','Lightning'],text:'Stormhide Armor • Your units take 1 less Lightning damage. Grounded Sentinel • +2 Health while blocking.',image:'/assets/storm/stormhide-bruiser.png'},
  {id:'cloudrunner-lynx',name:'Cloudrunner Lynx',kind:'unit',element:'storm',cost:2,attack:1,health:2,traits:['Beast','Scout','Lightning'],text:'Wind Step • Prevent the first damage this takes each turn. Draw a card whenever it dodges damage.',image:'/assets/storm/cloudrunner-lynx.png'},
  {id:'thunderhorn-stag',name:'Thunderhorn Stag',kind:'unit',element:'storm',cost:4,attack:3,health:4,traits:['Beast','Charger','Lightning'],text:'Every third turn, deal 2 damage to all enemy units. Stormbound • +1 Power while you control Tempestfang.',image:'/assets/storm/thunderhorn-stag.png'},
  {id:'boltstrike-surge',name:'Boltstrike Surge',kind:'magic',element:'storm',cost:1,traits:['Lightning'],text:'Deal 2 Lightning damage to any target. Thunder-Crowned: also deal 1 to all enemy units.',image:'/assets/storm/boltstrike-surge.png'},
  {id:'gale-step-invocation',name:'Gale Step Invocation',kind:'magic',element:'storm',cost:1,traits:['Wind'],text:'A friendly unit gains Wind Step and +1 Speed this turn. Draw 1 if cast on an evolution turn.',image:'/assets/storm/gale-step-invocation.png'},
  {id:'healing-downpour',name:'Healing Downpour',kind:'magic',element:'storm',cost:2,traits:['Rain','Water'],text:'Restore 3 Health to a friendly unit. Create a Rainfield for 2 turns.',image:'/assets/storm/healing-downpour.png'},
  {id:'stormheart-cataclysm',name:'Stormheart Cataclysm',kind:'magic',element:'storm',cost:3,traits:['Tempest','Lightning','Rain'],text:'Deal 3 Lightning damage and push the target 2 spaces, or create Rainfield. Storm-Devourer uses all three.',image:'/assets/storm/stormheart-cataclysm.png'},
  {id:'stormforged-talons',name:'Stormforged Talons',kind:'equipment',element:'storm',cost:1,traits:['Lightning'],text:'Equip to a Beast. +1 Power. Combat damage also deals 1 Lightning damage to that target.',image:'/assets/storm/stormforged-talons.png'},
  {id:'gale-mantle-cloak',name:'Gale Mantle Cloak',kind:'equipment',element:'storm',cost:1,traits:['Wind'],text:'Equipped unit gains Wind Step and +1 Speed.',image:'/assets/storm/gale-mantle-cloak.png'},
  {id:'thunderheart-core',name:'Thunderheart Core',kind:'equipment',element:'storm',cost:2,traits:['Lightning'],text:'Equip to Tempestfang. Magic cards add Storm Charges. Remove 3: deal 4 Lightning damage.',image:'/assets/storm/thunderheart-core.png'},
  {id:'raincaller-totem',name:'Raincaller Totem',kind:'equipment',element:'storm',cost:2,traits:['Rain','Water'],text:'At the start of your turn, heal all your units for 1 while the equipped unit remains in play.',image:'/assets/storm/raincaller-totem.png'},
  {id:'stormrunner-scout',name:'Stormrunner Scout',kind:'unit',element:'storm',attribute:'lightning',cost:2,attack:1,health:3,traits:['Lightning','Scout'],text:'Forked Assault • May attack up to 3 enemy units each turn.',image:'/assets/thunder/new/stormrunner-scout.webp'},
  {id:'thunder-ox',name:'Thunder Ox',kind:'unit',element:'storm',attribute:'lightning',cost:6,attack:4,health:5,traits:['Lightning','Beast'],text:'Concussive Charge • A unit damaged by Thunder Ox’s attack is stunned for 1 turn.',image:'/assets/thunder/new/thunder-ox.webp'},
  {id:'skybolt-mage',name:'Skybolt Mage',kind:'unit',element:'storm',attribute:'lightning',cost:5,attack:5,health:7,traits:['Lightning','Mage'],text:'Storm Amplifier • Your Lightning Magic cards deal +1 damage while Skybolt Mage is in play.',image:'/assets/thunder/new/skybolt-mage.webp'},
  {id:'static-wraith',name:'Static Wraith',kind:'unit',element:'storm',attribute:'lightning',cost:7,attack:2,health:10,traits:['Lightning','Spirit','Electric Recoil 2'],text:'Electric Recoil 2 • Whenever an enemy unit attacks Static Wraith, deal 2 Lightning damage to the attacker.',image:'/assets/thunder/new/static-wraith.webp'},
  {id:'shock-trooper',name:'Shock Trooper',kind:'unit',element:'storm',attribute:'lightning',cost:3,attack:2,health:5,traits:['Lightning','Soldier'],text:'Charged March • Gains +1 movement while it occupies a Thunder Zone.',image:'/assets/thunder/new/shock-trooper.webp'},
  {id:'electro-golem',name:'Electro Golem',kind:'unit',element:'storm',attribute:'lightning',cost:8,attack:4,health:10,traits:['Lightning','Golem','Electric Recoil 3'],text:'Electric Recoil 3 • Whenever an enemy unit attacks Electro Golem, deal 3 Lightning damage to the attacker.',image:'/assets/thunder/new/electro-golem.webp'},
  {id:'pulse-panther',name:'Pulse Panther',kind:'unit',element:'storm',attribute:'lightning',cost:3,attack:3,health:6,traits:['Lightning','Beast'],text:'Pulse Pounce • May attack twice this turn if its first target was stunned.',image:'/assets/thunder/new/pulse-panther.webp'},
  {id:'lightning-bolt',name:'Lightning Bolt',kind:'magic',element:'storm',attribute:'lightning',cost:4,traits:['Lightning'],text:'Deal 3 Lightning damage to a target unit and stun it for 1 turn.',image:'/assets/thunder/new/lightning-bolt.webp'},
  {id:'chain-spark',name:'Chain Spark',kind:'magic',element:'storm',attribute:'lightning',cost:1,traits:['Lightning'],text:'Hit up to 3 enemy units. Deal 3 damage to the first, 2 to the second, and 1 to the third.',image:'/assets/thunder/new/chain-spark.webp'},
  {id:'thunderstep',name:'Thunderstep',kind:'magic',element:'storm',attribute:'lightning',cost:2,traits:['Lightning'],text:'Teleport a friendly unit to the selected connected tile. Deal 1 Lightning damage to enemy units at its origin and destination.',image:'/assets/thunder/new/thunderstep.webp'},
  {id:'sky-crash',name:'Sky Crash',kind:'magic',element:'storm',attribute:'lightning',cost:2,traits:['Lightning'],text:'Destroy all enemy Flying and Aerial units.',image:'/assets/thunder/new/sky-crash.webp'},
  {id:'overcharge',name:'Overcharge',kind:'magic',element:'storm',attribute:'lightning',cost:2,traits:['Lightning'],text:'A friendly unit gains +3 Attack, but takes 1 damage at the start of each of your turns.',image:'/assets/thunder/new/overcharge.webp'},
  {id:'stormcall',name:'Stormcall',kind:'magic',element:'storm',attribute:'lightning',cost:1,traits:['Lightning'],text:'Search your deck for Static Field, add it to your hand, then shuffle.',image:'/assets/thunder/new/stormcall.webp'},
  {id:'pulse-barrier',name:'Pulse Barrier',kind:'magic',element:'storm',attribute:'lightning',cost:2,traits:['Lightning'],text:'Select a tile. Friendly units there take 1 less damage for 2 turns.',image:'/assets/thunder/new/pulse-barrier.webp'},
  {id:'electric-trap',name:'Electric Trap',kind:'magic',element:'storm',attribute:'lightning',cost:1,traits:['Lightning','Trap'],text:'Set a trap on the selected tile. Stun the first enemy unit that enters it, then remove this trap.',image:'/assets/thunder/new/electric-trap.webp'},
  {id:'volt-surge',name:'Volt Surge',kind:'magic',element:'storm',attribute:'lightning',cost:2,traits:['Lightning'],text:'Restore 2 Essence and deal 2 Lightning damage to a target enemy unit or Leader.',image:'/assets/thunder/new/volt-surge.webp'},
  {id:'lightning-rod-staff',name:'Lightning Rod Staff',kind:'equipment',element:'storm',attribute:'lightning',cost:4,traits:['Lightning','Leader'],text:'Equip to your Leader. Whenever you cast a Magic card, deal 1 Lightning damage to the enemy Leader.',image:'/assets/thunder/new/lightning-rod-staff.webp'},
  {id:'overcharge-ring',name:'Overcharge Ring',kind:'equipment',element:'storm',attribute:'lightning',cost:3,traits:['Lightning'],text:'Equip to a unit. It may make one additional attack each turn, but takes 1 damage at the start of your turn.',image:'/assets/thunder/new/overcharge-ring.webp'},
  {id:'skybreaker-spear',name:'Skybreaker Spear',kind:'equipment',element:'storm',attribute:'lightning',cost:4,traits:['Lightning'],text:'Equip to a unit. Its attacks chain 1 Lightning damage to a second enemy in the same tile.',image:'/assets/thunder/new/skybreaker-spear.webp'},
  {id:'sky-howler-spear',name:'Sky-Howler Spear',kind:'equipment',element:'storm',attribute:'lightning',cost:6,traits:['Lightning'],text:'Equip to a unit. When it attacks, it strikes every enemy unit in that tile twice.',image:'/assets/thunder/new/sky-howler-spear.webp'},
];

export const zoneCards: CardDef[] = [
  {id:'desert-gate',name:'Desert Gate',kind:'zone',element:'neutral',cost:2,zone:'desert',image:'/assets/zones/generated/desert.png',text:'Your Beast and Earth units gain +5 Health. At the start of your turn, gain 1 Essence if you control no Water units.',flavor:'Harsh sands reward those who endure.'},
  {id:'ocean-gate',name:'Ocean Gate',kind:'zone',element:'neutral',cost:2,zone:'ocean',image:'/assets/zones/generated/ocean.png',text:'Your Water units gain +1 Health. Healing effects you use restore 1 additional Health.',flavor:'The tides strengthen those who flow with them.'},
  {id:'volcano-gate',name:'Volcano Gate',kind:'zone',element:'neutral',cost:2,zone:'volcano',image:'/assets/zones/generated/volcano.png',text:'Your Fire units gain +1 Power. Your first Fire Magic card each turn costs 1 less Essence.',flavor:'The mountain’s fury fuels the brave.'},
  {id:'field-gate',name:'Field Gate',kind:'zone',element:'neutral',cost:2,zone:'field',image:'/assets/zones/generated/field.png',text:'Your units gain +1 Movement Range. Units you summon gain +1 temporary Health until end of turn.',flavor:'Open land favors swift action.'},
  {id:'lightning-plains-gate',name:'Lightning Plains Gate',kind:'zone',element:'neutral',cost:2,zone:'lightning',image:'/assets/zones/generated/lightning.png',text:'Your Lightning units gain +1 Power on their first attack each turn. When you cast Lightning Magic, deal 1 bonus damage to its target.',flavor:'Storms dance across the endless plains.'},
  {id:'fog-marsh-gate',name:'Fog Marsh Gate',kind:'zone',element:'neutral',cost:2,zone:'fog',image:'/assets/zones/generated/fog.png',text:'Enemy units lose 1 bonus Speed while moving toward your Leader. Units you summon gain Wind Step through the enemy’s next turn.',flavor:'The mist hides allies and confuses foes.'},
  {id:'frost-peaks-gate',name:'Frost Peaks Gate',kind:'zone',element:'neutral',cost:2,zone:'frost',image:'/assets/zones/generated/frost.png',text:'Your Ice and Water units reduce damage taken by 1. At the start of your turn, freeze a random enemy unit for 1 turn.',flavor:'Cold winds slow all who dare climb.'},
  {id:'shadow-ruins-gate',name:'Shadow Ruins Gate',kind:'zone',element:'neutral',cost:2,zone:'shadow',image:'/assets/zones/generated/shadow.png',text:'Your Dark units gain +1 Power while attacking Leaders. Whenever one of your units is defeated, draw 1 card.',flavor:'The ruins whisper secrets to those who listen.'},
  {id:'cemetery-gate',name:'Cemetery Gate',kind:'zone',element:'neutral',cost:3,zone:'cemetery',image:'/assets/zones/generated/cemetery.png',text:'Your Undead units gain +3 Attack and +3 Health. Defeated Undead cards enter your Cemetery instead of your graveyard.'},
  {id:'lighthouse',name:'Lighthouse',kind:'zone',element:'tide',attribute:'water',cost:2,zone:'lighthouse',traits:['Water'],image:'/assets/water/new/lighthouse.webp',text:'Ship units may be summoned directly to this connected Water Zone.'},
  {id:'static-field',name:'Static Field',kind:'zone',element:'storm',attribute:'lightning',cost:2,zone:'static-field',traits:['Lightning','Thunder'],image:'/assets/thunder/new/static-field.webp',text:'Whenever an enemy unit enters this connected Thunder Zone, deal 2 Lightning damage to it.'},
];

const factionCards: Record<Element,CardDef[]> = {flame,tide,undead,storm};
export const cardPool: Record<Element,CardDef[]> = {
  flame:[...flame,...zoneCards.filter(card=>card.element==='neutral'||card.element==='flame')],
  tide:[...tide,...zoneCards.filter(card=>card.element==='neutral'||card.element==='tide')],
  undead:[...undead,...zoneCards.filter(card=>card.element==='neutral'||card.element==='undead')],
  storm:[...storm,...zoneCards.filter(card=>card.element==='neutral'||card.element==='storm')],
};
export const allCards = [...flame,...tide,...undead,...storm,...zoneCards];
export const cardById = (id:string) => allCards.find(card=>card.id===id);
export const cardAttribute = (card:CardDef):CardAttribute => card.attribute??(card.element==='flame'?'fire':card.element==='tide'?'water':card.element==='undead'?'death':card.element==='storm'?'lightning':card.zone==='desert'||card.zone==='field'?'earth':'divine');
// Leaders define abilities and evolution lines, not deck factions. Every Leader
// may use every published card; the 40-card and three-copy rules still apply.
export const cardAllowedForLeader = (_card:CardDef,_leader:Element) => true;

const withUid = (card:CardDef,index:number) => ({...card,uid:`${card.element}-${card.id}-${index}-${Math.random().toString(36).slice(2,7)}`});
const starterZone:Record<Element,string>={flame:'volcano-gate',tide:'ocean-gate',undead:'cemetery-gate',storm:'lightning-plains-gate'};

export const starterDeckIds = (element:Element) => {
  const ids=[starterZone[element],starterZone[element],starterZone[element]];
  const pool=[...factionCards[element],...zoneCards.filter(card=>card.id!==starterZone[element]&&(card.element==='neutral'||card.element===element))];
  for(const card of [...pool,...pool,...pool]){
    if(ids.length>=40)break;
    if(ids.filter(id=>id===card.id).length<3)ids.push(card.id);
  }
  return ids;
};
export const makeDeck = (element:Element) => starterDeckIds(element).map((id,i)=>withUid(cardById(id)!,i));
export const makeCustomDeck = (ids:string[],fallback:Element) => {
  const valid=ids.map(cardById).filter((card):card is CardDef=>Boolean(card)&&cardAllowedForLeader(card!,fallback));
  const source=valid.length?valid:starterDeckIds(fallback).map(id=>cardById(id)!);
  return source.map(withUid);
};
