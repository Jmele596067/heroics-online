export type Element = 'flame' | 'tide' | 'undead' | 'storm';
export type CardAffinity = Element | 'neutral';
export type CardKind = 'unit' | 'magic' | 'equipment' | 'zone';
export type ZoneId = 'desert' | 'ocean' | 'volcano' | 'field' | 'lightning' | 'fog' | 'frost' | 'shadow' | 'cemetery';

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
}

const flame: CardDef[] = [
  {id:'ember-squire',name:'Ember Squire',kind:'unit',element:'flame',cost:1,attack:2,health:2,traits:['Fire','Soldier'],text:'A quick front-line fighter.',image:'/assets/units/ember-squire.png'},
  {id:'sunsteel-guard',name:'Sunsteel Guard',kind:'unit',element:'flame',cost:2,attack:2,health:4,traits:['Fire','Knight'],text:'Guard • A sturdy solar defender.',image:'/assets/units/sunsteel-guard.png'},
  {id:'blaze-raptor',name:'Blaze Raptor',kind:'unit',element:'flame',cost:3,attack:4,health:2,traits:['Fire','Beast'],text:'Rush • Born to advance.',image:'/assets/units/blaze-raptor.png'},
  {id:'solar-champion',name:'Solar Champion',kind:'unit',element:'flame',cost:4,attack:5,health:5,traits:['Fire','Knight'],text:'Ignis’s elite warrior.',image:'/assets/units/solar-champion.png'},
  {id:'firebolt',name:'Firebolt',kind:'magic',element:'flame',cost:2,traits:['Fire'],text:'Deal 3 damage to the enemy Leader.',effect:'damage',image:'/assets/magic/firebolt.png'},
  {id:'rallying-flame',name:'Rallying Flame',kind:'magic',element:'flame',cost:1,traits:['Fire'],text:'Your foremost unit gains +2 Attack.',effect:'buff',image:'/assets/magic/rallying-flame.png'},
  {id:'phoenix-call',name:'Phoenix Call',kind:'magic',element:'flame',cost:2,traits:['Fire'],text:'Draw 2 cards.',effect:'draw',image:'/assets/magic/phoenix-call.png'},
  {id:'sunblade',name:'Sunblade',kind:'equipment',element:'flame',cost:2,traits:['Fire'],text:'Ignis gains +2 Attack this match.',effect:'buff',image:'/assets/equipment/sunblade.png'},
];

const tide: CardDef[] = [
  {id:'pearl-scout',name:'Pearl Scout',kind:'unit',element:'tide',cost:1,attack:1,health:3,traits:['Water','Scout'],text:'A patient pathfinder.',image:'/assets/units/pearl-scout.png'},
  {id:'coral-defender',name:'Coral Defender',kind:'unit',element:'tide',cost:2,attack:2,health:5,traits:['Water','Defender'],text:'Guard • Shellgon’s shield.',image:'/assets/units/coral-defender.png'},
  {id:'riptide-hunter',name:'Riptide Hunter',kind:'unit',element:'tide',cost:3,attack:4,health:3,traits:['Water','Hunter'],text:'Strikes from the surf.',image:'/assets/units/riptide-hunter.png'},
  {id:'abyssal-crab',name:'Abyssal Crab',kind:'unit',element:'tide',cost:4,attack:4,health:7,traits:['Water','Beast'],text:'Armored titan of the deep.',image:'/assets/units/abyssal-crab.png'},
  {id:'crushing-wave',name:'Crushing Wave',kind:'magic',element:'tide',cost:2,traits:['Water'],text:'Deal 3 damage to the enemy Leader.',effect:'damage',image:'/assets/magic/crushing-wave.png'},
  {id:'mending-tide',name:'Mending Tide',kind:'magic',element:'tide',cost:2,traits:['Water'],text:'Restore 5 Leader Health.',effect:'heal',image:'/assets/magic/mending-tide.png'},
  {id:'deep-wisdom',name:'Deep Wisdom',kind:'magic',element:'tide',cost:2,traits:['Water'],text:'Draw 2 cards.',effect:'draw',image:'/assets/magic/deep-wisdom.png'},
  {id:'coral-plate',name:'Coral Plate',kind:'equipment',element:'tide',cost:2,traits:['Water'],text:'Shellgon restores 4 Health.',effect:'heal',image:'/assets/equipment/coral-plate.png'},
];

const undead: CardDef[] = [
  {id:'grave-banshee',name:'Grave Banshee',kind:'unit',element:'undead',cost:2,attack:2,health:3,traits:['Undead','Spirit','Dark'],text:'Once per turn: All enemy units lose 2 Attack until end of turn.'},
  {id:'undead-wizard',name:'Undead Wizard',kind:'unit',element:'undead',cost:3,attack:2,health:4,traits:['Undead','Wizard','Dark'],text:'Deployed: Search your deck for Gravebound Knight and deploy it. If your Gate is full, add it to your hand instead. Then shuffle.'},
  {id:'queens-guardsman',name:'Queen’s Guardsman',kind:'unit',element:'undead',cost:3,attack:4,health:6,traits:['Undead','Soldier','Dark'],text:'Royal Guard • Enemy units in this Zone can only attack Queen’s Guardsman.'},
  {id:'gravebound-knight',name:'Gravebound Knight',kind:'unit',element:'undead',cost:4,attack:5,health:6,traits:['Undead','Knight','Dark'],text:'Deployed: Search your deck for Forever Dead King, reveal it, add it to your hand, then shuffle.'},
  {id:'forsaken-prince',name:'The Forsaken Prince',kind:'unit',element:'undead',cost:5,attack:5,health:6,traits:['Undead','Royal','Dark'],text:'May attack enemy units twice each turn. Royal Blood • +3 Attack and +3 Health while in the same Zone as Forever Dead King. Death Burst • When defeated, deal 2 damage to all enemy units.'},
  {id:'cemetery-reaper',name:'Cemetery Reaper',kind:'unit',element:'undead',cost:4,attack:6,health:5,traits:['Undead','Reaper','Dark'],text:'Whenever this unit destroys an enemy unit, heal your Queen for 5 Health.'},
  {id:'skeleton-bone-parlor',name:'Skeleton Bone Parlor',kind:'unit',element:'undead',cost:6,attack:6,health:8,traits:['Undead','Skeleton','Dark'],text:'Bone Legion • Gains +2 Attack and +1 Health for each other Skeleton in this Zone. Other Skeletons here gain +2 Attack and +1 Health.'},
  {id:'forever-dead-king',name:'Forever Dead King',kind:'unit',element:'undead',cost:7,attack:6,health:8,traits:['Undead','Royal','Skeleton','Dark'],text:'Royal Protector • When this destroys an enemy unit, heal your Queen for 2. Gatekeeper • While at your Gate, +2 Attack and +2 Health.'},
  {id:'soul-harvest',name:'Soul Harvest',kind:'magic',element:'undead',cost:2,traits:['Dark'],text:'Destroy one friendly Undead unit. Draw 2 cards and heal your Queen for 5 Health.'},
  {id:'ultimate-sacrifice',name:'Ultimate Sacrifice',kind:'magic',element:'undead',cost:3,traits:['Dark'],text:'Choose up to 2 Unit cards from your hand and discard them to your graveyard.'},
  {id:'for-the-queen',name:'For the Queen',kind:'magic',element:'undead',cost:4,traits:['Dark'],text:'Choose and deploy up to 2 Unit cards from your deck. You cannot choose Forever Dead King.'},
  {id:'raise-the-fallen',name:'Raise the Fallen',kind:'magic',element:'undead',cost:4,traits:['Dark'],text:'Choose and deploy up to 2 Unit cards from your graveyard.'},
  {id:'death-mist',name:'Death Mist',kind:'magic',element:'undead',cost:5,traits:['Dark'],text:'Deal 3 damage to all enemy units.'},
  {id:'queens-destruction',name:'Queen’s Destruction',kind:'magic',element:'undead',cost:5,traits:['Dark'],text:'Destroy one friendly unit, then destroy up to 2 enemy units.'},
  {id:'endless-grave',name:'Endless Grave',kind:'magic',element:'undead',cost:6,traits:['Dark'],text:'Until the end of your next turn, defeated Undead units return to your hand.'},
  {id:'thorned-rose-crown',name:'Thorned Rose Crown',kind:'equipment',element:'undead',cost:2,traits:['Dark'],text:'+2 Attack and +5 Health. Prevent the first damage dealt to this unit each turn.'},
  {id:'crown-eternal-night',name:'Crown of Eternal Night',kind:'equipment',element:'undead',cost:4,traits:['Dark'],text:'+2 Attack and +3 Health. When this unit destroys an enemy, heal your Queen for 2.'},
  {id:'blade-forgotten-kings',name:'Blade of Forgotten Kings',kind:'equipment',element:'undead',cost:5,traits:['Dark'],text:'+4 Attack and +1 Health. Whenever this unit destroys an enemy unit, it may attack one additional time this turn.'},
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
];

export const zoneCards: CardDef[] = [
  {id:'desert-gate',name:'Desert Gate',kind:'zone',element:'neutral',cost:2,zone:'desert',image:'/assets/zones/desert.svg',text:'Your Beast and Earth units gain +5 Health. At the start of your turn, gain 1 Essence if you control no Water units.',flavor:'Harsh sands reward those who endure.'},
  {id:'ocean-gate',name:'Ocean Gate',kind:'zone',element:'neutral',cost:2,zone:'ocean',image:'/assets/zones/ocean.svg',text:'Your Water units gain +1 Health. Healing effects you use restore 1 additional Health.',flavor:'The tides strengthen those who flow with them.'},
  {id:'volcano-gate',name:'Volcano Gate',kind:'zone',element:'neutral',cost:2,zone:'volcano',image:'/assets/zones/volcano.svg',text:'Your Fire units gain +1 Power. Your first Fire Magic card each turn costs 1 less Essence.',flavor:'The mountain’s fury fuels the brave.'},
  {id:'field-gate',name:'Field Gate',kind:'zone',element:'neutral',cost:2,zone:'field',image:'/assets/zones/field.svg',text:'Your units gain +1 Movement Range. Units you summon gain +1 temporary Health until end of turn.',flavor:'Open land favors swift action.'},
  {id:'lightning-plains-gate',name:'Lightning Plains Gate',kind:'zone',element:'neutral',cost:2,zone:'lightning',image:'/assets/zones/lightning.svg',text:'Your Lightning units gain +1 Power on their first attack each turn. When you cast Lightning Magic, deal 1 bonus damage to its target.',flavor:'Storms dance across the endless plains.'},
  {id:'fog-marsh-gate',name:'Fog Marsh Gate',kind:'zone',element:'neutral',cost:2,zone:'fog',image:'/assets/zones/fog.svg',text:'Enemy units lose 1 bonus Speed while moving toward your Leader. Units you summon gain Wind Step through the enemy’s next turn.',flavor:'The mist hides allies and confuses foes.'},
  {id:'frost-peaks-gate',name:'Frost Peaks Gate',kind:'zone',element:'neutral',cost:2,zone:'frost',image:'/assets/zones/frost.svg',text:'Your Ice and Water units reduce damage taken by 1. At the start of your turn, freeze a random enemy unit for 1 turn.',flavor:'Cold winds slow all who dare climb.'},
  {id:'shadow-ruins-gate',name:'Shadow Ruins Gate',kind:'zone',element:'neutral',cost:2,zone:'shadow',image:'/assets/zones/shadow.svg',text:'Your Dark units gain +1 Power while attacking Leaders. Whenever one of your units is defeated, draw 1 card.',flavor:'The ruins whisper secrets to those who listen.'},
  {id:'cemetery-gate',name:'Cemetery Gate',kind:'zone',element:'neutral',cost:3,zone:'cemetery',image:'/assets/zones/cemetery.svg',text:'Your Undead units gain +3 Attack and +3 Health. Defeated Undead cards enter your Cemetery instead of your graveyard.'},
];

const factionCards: Record<Element,CardDef[]> = {flame,tide,undead,storm};
export const cardPool: Record<Element,CardDef[]> = {
  flame:[...flame,...zoneCards],
  tide:[...tide,...zoneCards],
  undead:[...undead,...zoneCards],
  storm:[...storm,...zoneCards],
};
export const allCards = [...flame,...tide,...undead,...storm,...zoneCards];
export const cardById = (id:string) => allCards.find(card=>card.id===id);
export const cardAllowedForLeader = (card:CardDef,leader:Element) => card.element===leader||card.element==='neutral';

const withUid = (card:CardDef,index:number) => ({...card,uid:`${card.element}-${card.id}-${index}-${Math.random().toString(36).slice(2,7)}`});
const starterZone:Record<Element,string>={flame:'volcano-gate',tide:'ocean-gate',undead:'cemetery-gate',storm:'lightning-plains-gate'};

export const starterDeckIds = (element:Element) => {
  const cards=factionCards[element];
  const core=Array.from({length:18},(_,i)=>cards[i%cards.length].id);
  return [starterZone[element],starterZone[element],...core];
};
export const makeDeck = (element:Element) => starterDeckIds(element).map((id,i)=>withUid(cardById(id)!,i));
export const makeCustomDeck = (ids:string[],fallback:Element) => {
  const valid=ids.map(cardById).filter((card):card is CardDef=>Boolean(card)&&cardAllowedForLeader(card!,fallback));
  const source=valid.length?valid:starterDeckIds(fallback).map(id=>cardById(id)!);
  return source.map(withUid);
};
