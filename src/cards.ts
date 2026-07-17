export type Element = 'flame' | 'tide' | 'undead' | 'storm';
export type CardKind = 'unit' | 'magic' | 'equipment';
export interface CardDef { id:string; name:string; kind:CardKind; element:Element; cost:number; attack?:number; health?:number; text:string; effect?:'damage'|'heal'|'buff'|'draw'; image?:string }

const flame: CardDef[] = [
  {id:'ember-squire',name:'Ember Squire',kind:'unit',element:'flame',cost:1,attack:2,health:2,text:'A quick front-line fighter.',image:'/assets/units/ember-squire.png'},
  {id:'sunsteel-guard',name:'Sunsteel Guard',kind:'unit',element:'flame',cost:2,attack:2,health:4,text:'Guard • A sturdy solar defender.',image:'/assets/units/sunsteel-guard.png'},
  {id:'blaze-raptor',name:'Blaze Raptor',kind:'unit',element:'flame',cost:3,attack:4,health:2,text:'Rush • Born to advance.',image:'/assets/units/blaze-raptor.png'},
  {id:'solar-champion',name:'Solar Champion',kind:'unit',element:'flame',cost:4,attack:5,health:5,text:'Ignis’s elite warrior.',image:'/assets/units/solar-champion.png'},
  {id:'firebolt',name:'Firebolt',kind:'magic',element:'flame',cost:2,text:'Deal 3 damage to the enemy Leader.',effect:'damage',image:'/assets/magic/firebolt.png'},
  {id:'rallying-flame',name:'Rallying Flame',kind:'magic',element:'flame',cost:1,text:'Your foremost unit gains +2 Attack.',effect:'buff',image:'/assets/magic/rallying-flame.png'},
  {id:'phoenix-call',name:'Phoenix Call',kind:'magic',element:'flame',cost:2,text:'Draw 2 cards.',effect:'draw',image:'/assets/magic/phoenix-call.png'},
  {id:'sunblade',name:'Sunblade',kind:'equipment',element:'flame',cost:2,text:'Ignis gains +2 attack this match.',effect:'buff',image:'/assets/equipment/sunblade.png'},
];
const tide: CardDef[] = [
  {id:'pearl-scout',name:'Pearl Scout',kind:'unit',element:'tide',cost:1,attack:1,health:3,text:'A patient pathfinder.',image:'/assets/units/pearl-scout.png'},
  {id:'coral-defender',name:'Coral Defender',kind:'unit',element:'tide',cost:2,attack:2,health:5,text:'Guard • Shellgon’s shield.',image:'/assets/units/coral-defender.png'},
  {id:'riptide-hunter',name:'Riptide Hunter',kind:'unit',element:'tide',cost:3,attack:4,health:3,text:'Strikes from the surf.',image:'/assets/units/riptide-hunter.png'},
  {id:'abyssal-crab',name:'Abyssal Crab',kind:'unit',element:'tide',cost:4,attack:4,health:7,text:'Armored titan of the deep.',image:'/assets/units/abyssal-crab.png'},
  {id:'crushing-wave',name:'Crushing Wave',kind:'magic',element:'tide',cost:2,text:'Deal 3 damage to the enemy Leader.',effect:'damage',image:'/assets/magic/crushing-wave.png'},
  {id:'mending-tide',name:'Mending Tide',kind:'magic',element:'tide',cost:2,text:'Restore 5 Leader Health.',effect:'heal',image:'/assets/magic/mending-tide.png'},
  {id:'deep-wisdom',name:'Deep Wisdom',kind:'magic',element:'tide',cost:2,text:'Draw 2 cards.',effect:'draw',image:'/assets/magic/deep-wisdom.png'},
  {id:'coral-plate',name:'Coral Plate',kind:'equipment',element:'tide',cost:2,text:'Shellgon restores 4 Health.',effect:'heal',image:'/assets/equipment/coral-plate.png'},
];
const undead: CardDef[] = [
  {id:'undead-wizard',name:'Undead Wizard',kind:'unit',element:'undead',cost:3,attack:2,health:4,text:'Deployed: Search your deck for Gravebound Knight and add it to your hand.'},
  {id:'gravebound-knight',name:'Gravebound Knight',kind:'unit',element:'undead',cost:4,attack:5,health:6,text:'Deployed: Search your deck for Forever Dead King and add it to your hand.'},
  {id:'cemetery-reaper',name:'Cemetery Reaper',kind:'unit',element:'undead',cost:6,attack:6,health:5,text:'Whenever this destroys an enemy unit, heal your Queen for 2 Health.'},
  {id:'forever-dead-king',name:'Forever Dead King',kind:'unit',element:'undead',cost:7,attack:6,health:8,text:'Royal Protector • Heal your Queen for 2 when this destroys a unit. Gatekeeper • +2 Attack and +2 Health at the enemy Gate.'},
  {id:'raise-the-fallen',name:'Raise the Fallen',kind:'magic',element:'undead',cost:4,text:'Return up to 2 Unit cards from your graveyard to your hand.'},
  {id:'soul-harvest',name:'Soul Harvest',kind:'magic',element:'undead',cost:2,text:'Destroy one friendly Undead unit. Draw 2 cards and heal your Queen for 4 Health.'},
  {id:'death-mist',name:'Death Mist',kind:'magic',element:'undead',cost:5,text:'Deal 3 damage to all enemy units.'},
  {id:'endless-grave',name:'Endless Grave',kind:'magic',element:'undead',cost:6,text:'Until the end of your next turn, defeated Undead units return to your hand.'},
  {id:'thorned-rose-crown',name:'Thorned Rose Crown',kind:'equipment',element:'undead',cost:2,text:'+1 Attack and +5 Health. Prevent the first damage dealt to this unit each turn.'},
  {id:'crown-eternal-night',name:'Crown of Eternal Night',kind:'equipment',element:'undead',cost:4,text:'+2 Attack and +3 Health. When this unit destroys an enemy, heal your Queen for 2.'},
  {id:'blade-forgotten-kings',name:'Blade of Forgotten Kings',kind:'equipment',element:'undead',cost:5,text:'+4 Attack and +1 Health. When this unit destroys an enemy, it may attack one additional time.'},
];
const storm: CardDef[] = [
  {id:'skyclaw-raptor',name:'Skyclaw Raptor',kind:'unit',element:'storm',cost:2,attack:2,health:1,text:'Wind Step • Prevent the first damage this takes each turn. Storm Synchronize • +1 Power on an evolution turn.',image:'/assets/storm/skyclaw-raptor.png'},
  {id:'stormhide-bruiser',name:'Stormhide Bruiser',kind:'unit',element:'storm',cost:3,attack:2,health:4,text:'Stormhide Armor • Your units take 1 less Lightning damage. Grounded Sentinel • +2 Health while blocking.',image:'/assets/storm/stormhide-bruiser.png'},
  {id:'cloudrunner-lynx',name:'Cloudrunner Lynx',kind:'unit',element:'storm',cost:2,attack:1,health:2,text:'Wind Step • Prevent the first damage this takes each turn. Draw a card whenever it dodges damage.',image:'/assets/storm/cloudrunner-lynx.png'},
  {id:'thunderhorn-stag',name:'Thunderhorn Stag',kind:'unit',element:'storm',cost:4,attack:3,health:4,text:'Every third turn, deal 2 damage to all enemy units. Stormbound • +1 Power while you control Tempestfang.',image:'/assets/storm/thunderhorn-stag.png'},
  {id:'boltstrike-surge',name:'Boltstrike Surge',kind:'magic',element:'storm',cost:1,text:'Deal 2 Lightning damage to any target. Thunder-Crowned: also deal 1 to all enemy units.',image:'/assets/storm/boltstrike-surge.png'},
  {id:'gale-step-invocation',name:'Gale Step Invocation',kind:'magic',element:'storm',cost:1,text:'A friendly unit gains Wind Step and +1 Speed this turn. Draw 1 if cast on an evolution turn.',image:'/assets/storm/gale-step-invocation.png'},
  {id:'healing-downpour',name:'Healing Downpour',kind:'magic',element:'storm',cost:2,text:'Restore 3 Health to a friendly unit. Create a Rainfield for 2 turns.',image:'/assets/storm/healing-downpour.png'},
  {id:'stormheart-cataclysm',name:'Stormheart Cataclysm',kind:'magic',element:'storm',cost:3,text:'Deal 3 Lightning damage and push the target 2 spaces, or create Rainfield. Storm-Devourer uses all three.',image:'/assets/storm/stormheart-cataclysm.png'},
  {id:'stormforged-talons',name:'Stormforged Talons',kind:'equipment',element:'storm',cost:1,text:'Equip to a Beast. +1 Power. Combat damage also deals 1 Lightning damage to that target.',image:'/assets/storm/stormforged-talons.png'},
  {id:'gale-mantle-cloak',name:'Gale Mantle Cloak',kind:'equipment',element:'storm',cost:1,text:'Equipped unit gains Wind Step and +1 Speed.',image:'/assets/storm/gale-mantle-cloak.png'},
  {id:'thunderheart-core',name:'Thunderheart Core',kind:'equipment',element:'storm',cost:2,text:'Equip to Tempestfang. Magic cards add Storm Charges. Remove 3: deal 4 Lightning damage.',image:'/assets/storm/thunderheart-core.png'},
  {id:'raincaller-totem',name:'Raincaller Totem',kind:'equipment',element:'storm',cost:2,text:'At the start of your turn, heal all your units for 1 while the equipped unit remains in play.',image:'/assets/storm/raincaller-totem.png'},
];
export const cardPool = {flame,tide,undead,storm};
export const allCards = [...flame,...tide,...undead,...storm];
export const cardById = (id:string) => allCards.find(card=>card.id===id);
const withUid = (card:CardDef,index:number) => ({...card,uid:`${card.element}-${card.id}-${index}-${Math.random().toString(36).slice(2,7)}`});
export const starterDeckIds = (element:Element) => Array.from({length:20},(_,i)=>cardPool[element][i%cardPool[element].length].id);
export const makeDeck = (element:Element) => starterDeckIds(element).map((id,i)=>withUid(cardById(id)!,i));
export const makeCustomDeck = (ids:string[],fallback:Element) => {
  const valid=ids.map(cardById).filter((card):card is CardDef=>Boolean(card));
  const source=valid.length?valid:starterDeckIds(fallback).map(id=>cardById(id)!);
  return source.map(withUid);
};
