import { CardDef, Element, ZoneId, allCards, cardById, makeCustomDeck } from './cards';
import { currentForm, nextForm } from './evolution';

export const ZONE_CAPACITY=3;
export const STARTING_TILE_COUNT=3;
export const MAX_FIELD_TILES=7;
export const FIXED_ZONE_COORDINATES=Object.freeze([
  {q:1,r:-1}, {q:2,r:-1},
  {q:0,r:1}, {q:1,r:1},
]);
export const BLOCKED_GATE_COORDINATES=Object.freeze([
  {q:0,r:-1}, {q:3,r:-1},
  {q:-1,r:1}, {q:2,r:1},
]);
export interface Card extends CardDef { uid:string }
export interface PlayCardChoices { cardUids?:string[]; friendlyUnitUids?:string[]; enemyUnitUids?:string[] }

export interface Unit {
  uid:string;
  cardId:string;
  name:string;
  attack:number;
  health:number;
  maxHealth:number;
  position:number;
  exhausted:boolean;
  element:Element;
  traits:string[];
  equipment:string[];
  summonedTurn:number;
  preventFirstDamage?:boolean;
  shieldReady?:boolean;
  fogWindStep?:boolean;
  healOnKill?:number;
  extraAttackOnKill?:boolean;
  speedBonus?:number;
  temporarySpeed?:number;
  bonusLightningOnCombat?:number;
  raincaller?:boolean;
  temporaryAttack?:number;
  temporaryHealth?:number;
  temporaryEnemyAttackPenalty?:number;
  lastShockwaveTurn?:number;
  attacksThisTurn?:number;
  unitAbilityUsed?:boolean;
  frozenTurns?:number;
  frozenThisTurn?:boolean;
  dynamicAttackBuff?:number;
  dynamicHealthBuff?:number;
  stunnedTurns?:number;
  stunnedThisTurn?:boolean;
  physicalReduction?:number;
  damageReduction?:number;
  coralShield?:number;
  recoilDamage?:number;
  recoilType?:'lightning'|'fire';
  overchargeDamage?:number;
  compassUsed?:boolean;
  waterImmune?:boolean;
  fireImmune?:boolean;
  ranged?:boolean;
  extraAttackEachTurn?:number;
  chainDamage?:number;
  attackAllTwice?:boolean;
  moltenCoreBonusActive?:boolean;
  riverGrowth?:number;
}

export interface Player {
  name:string;
  leader:string;
  element:Element;
  health:number;
  maxHealth:number;
  essence:number;
  maxEssence:number;
  glory:number;
  evolutionStage:number;
  leaderAttack:number;
  abilityPoints:number;
  maxAbilityPoints:number;
  leaderAttackUsed:boolean;
  leaderDefense:number;
  leaderEquipment:string[];
  deck:Card[];
  hand:Card[];
  units:Unit[];
  graveyard:Card[];
  cemetery:Card[];
  activeZone:Card|null;
  zoneTiles:(Card|null)[];
  flameDomainTile:number|null;
  endlessGraveTurns:number;
  magicCastTotal:number;
  damageThisTurn:number;
  damageLastTurn:number;
  stormCharges:number;
  tempestMagicCast:boolean;
  coreEquipped:boolean;
  rainfieldTurns:number;
  leaderAbilityUsed:boolean;
  leaderAbilitiesUsed:string[];
  absorbUsed:boolean;
  evolvedThisTurn:boolean;
  leaderTempAttack:number;
  zoneSpellDiscountUsed:boolean;
  homeTileId:number;
  pulseBarriers:Record<number,number>;
  electricTraps:number[];
  heatwaveTurns:number;
  wildfireTurns:number;
}

export type Phase = 'deploy'|'battle'|'enemy';
export interface BattlefieldTile { id:number; q:number; r:number; kind:'gate'|'center'|'zone'; ownerHomeTileId:number|null; zoneCard:Card|null }
export interface ZonePlacement { anchorId:number; q:number; r:number }
export interface GameState {
  turn:number;
  phase:Phase;
  player:Player;
  enemy:Player;
  selectedUnit:string|null;
  selectedTarget:string|null;
  selectedTile:number|null;
  pendingZoneUid:string|null;
  selectedPlacement:ZonePlacement|null;
  tiles:BattlefieldTile[];
  attackMode:'unit'|'leader'|null;
  log:string[];
  winner:string|null;
}

type Listener = (s:GameState)=>void;
const shuffle=<T>(a:T[])=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const leaderNames:Record<Element,string>={flame:'Ignis',tide:'Shellgon',undead:'Queen of the Dead',storm:'Tempestfang'};
const aiNames:Record<Element,string>={flame:'Flamebound AI',tide:'Tidebound AI',undead:'Deathbound AI',storm:'Stormbound AI'};
const baseLeaderAttack:Record<Element,number>={flame:3,tide:2,undead:0,storm:2};
const instance=(card:CardDef):Card=>({...card,uid:`${card.element}-${card.id}-${Math.random().toString(36).slice(2,9)}`});
const unique=(values:string[]=[])=>([...new Set(values)]);

export interface MatchConfig { playerElement:Element; enemyElement:Element; playerDeckIds?:string[]; enemyDeckIds?:string[] }
const createPlayer=(element:Element,isEnemy=false,ids:string[]=[]):Player=>({
  name:isEnemy?aiNames[element]:'You',leader:leaderNames[element],element,health:30,maxHealth:30,essence:2,maxEssence:2,
  glory:0,evolutionStage:0,leaderAttack:currentForm(element,0).attack,abilityPoints:currentForm(element,0).abilityPoints,maxAbilityPoints:currentForm(element,0).abilityPoints,leaderAttackUsed:false,leaderDefense:0,leaderEquipment:[],deck:shuffle(makeCustomDeck(ids,element) as Card[]),
  hand:[],units:[],graveyard:[],cemetery:[],activeZone:null,zoneTiles:[null,null,null],flameDomainTile:null,endlessGraveTurns:0,
  magicCastTotal:0,damageThisTurn:0,damageLastTurn:0,stormCharges:0,tempestMagicCast:false,coreEquipped:false,rainfieldTurns:0,
  leaderAbilityUsed:false,leaderAbilitiesUsed:[],absorbUsed:false,evolvedThisTurn:false,leaderTempAttack:0,zoneSpellDiscountUsed:false,homeTileId:isEnemy?2:0,
  pulseBarriers:{},electricTraps:[],heatwaveTurns:0,wildfireTurns:0,
});

export class HeroicsGame {
  state:GameState;
  private listeners:Listener[]=[];
  private fastMode:boolean;
  private config:MatchConfig;
  private humanVsHuman:boolean;
  private autoEnemyStarted=false;
  private autoEnemyPhase:'deploy'|'battle'='deploy';

  constructor(fastMode=false,config:MatchConfig={playerElement:'flame',enemyElement:'tide'},humanVsHuman=false){
    this.fastMode=fastMode;
    this.config=config;
    this.humanVsHuman=humanVsHuman;
    this.state={turn:1,phase:'deploy',player:createPlayer(config.playerElement,false,config.playerDeckIds),enemy:createPlayer(config.enemyElement,true,config.enemyDeckIds),selectedUnit:null,selectedTarget:null,selectedTile:0,pendingZoneUid:null,selectedPlacement:null,tiles:[{id:0,q:0,r:0,kind:'gate',ownerHomeTileId:0,zoneCard:null},{id:1,q:1,r:0,kind:'center',ownerHomeTileId:null,zoneCard:null},{id:2,q:2,r:0,kind:'gate',ownerHomeTileId:2,zoneCard:null}],attackMode:null,log:['Turn 1 - The battlefield awakens. Deploy Phase begins with 2 Essence and 2 Ability Points.'],winner:null};
    this.draw(this.state.player,5);
    this.draw(this.state.enemy,5);
  }

  subscribe(fn:Listener){this.listeners.push(fn);fn(this.state)}
  private emit(){this.checkWinner();this.listeners.forEach(fn=>fn(this.state))}
  private note(msg:string){this.state.log=[`Turn ${this.state.turn} • ${msg}`,...this.state.log].slice(0,120)}
  private draw(p:Player,n=1){for(let i=0;i<n;i++){const c=p.deck.pop();if(c)p.hand.push(c)}}
  private healingBonus(p:Player){return this.zone(p,'ocean')?1:0}
  private heal(p:Player,n:number){p.health=Math.min(p.maxHealth,p.health+n+this.healingBonus(p))}
  private healUnit(p:Player,u:Unit,n:number){u.health=Math.min(u.maxHealth,u.health+n+this.healingBonus(p))}
  private resetShields(){[...this.state.player.units,...this.state.enemy.units].forEach(u=>{if(u.preventFirstDamage)u.shieldReady=true})}
  private zone(p:Player,id:ZoneId,position?:number){return position===undefined?p.zoneTiles.some(card=>card?.zone===id):p.zoneTiles[this.physicalTile(p,position)]?.zone===id}
  private zoneCardAt(tileId:number){return this.tileById(tileId)?.zoneCard??null}
  private isWaterTile(tileId:number){const card=this.zoneCardAt(tileId);return card?.zone==='ocean'||card?.zone==='lighthouse'||this.hasTrait(card??{},'Water')}
  private isThunderTile(tileId:number){const card=this.zoneCardAt(tileId);return card?.zone==='lightning'||card?.zone==='static-field'||this.hasTrait(card??{},'Thunder')}
  private isFireTile(tileId:number){const card=this.zoneCardAt(tileId);return card?.zone==='volcano'||this.hasTrait(card??{},'Fire')||this.state.player.flameDomainTile===tileId||this.state.enemy.flameDomainTile===tileId}
  private hasTrait(subject:{traits?:string[]},trait:string){return Boolean(subject.traits?.includes(trait))}
  private opponentOf(p:Player){return p===this.state.player?this.state.enemy:this.state.player}
  unitsInZone(p:Player,position:number){return p.units.filter(u=>u.position===position)}
  gateSlotsOpen(p:Player,position=0){return Math.max(0,ZONE_CAPACITY-this.unitsInZone(p,position).length)}
  physicalTile(p:Player,position:number){if(position>2)return position;if(position===1)return 1;return position===0?p.homeTileId:2-p.homeTileId}
  logicalPosition(p:Player,tileId:number){if(tileId>2)return tileId;if(tileId===1)return 1;return tileId===p.homeTileId?0:2}
  tileById(id:number){return this.state.tiles.find(tile=>tile.id===id)}
  private hexDistance(a:BattlefieldTile,b:BattlefieldTile){return (Math.abs(a.q-b.q)+Math.abs(a.q+a.r-b.q-b.r)+Math.abs(a.r-b.r))/2}
  areAdjacent(aId:number,bId:number){const a=this.tileById(aId),b=this.tileById(bId);return Boolean(a&&b&&this.hexDistance(a,b)===1)}
  availableZonePlacements(anchorId=this.state.player.homeTileId){
    if(this.state.tiles.length>=MAX_FIELD_TILES)return [] as ZonePlacement[];
    const occupied=new Set(this.state.tiles.map(tile=>`${tile.q},${tile.r}`)),preferred=this.tileById(anchorId);
    const placements=FIXED_ZONE_COORDINATES.filter(({q,r})=>!occupied.has(`${q},${r}`)).map(({q,r})=>{
      // Always highlight an edge on one of the three original Gate tiles. A
      // newly placed Zone can never become an anchor for another outer ring.
      const anchor=this.state.tiles.filter(tile=>tile.id<STARTING_TILE_COUNT&&this.hexDistance(tile,{id:-1,q,r,kind:'zone',ownerHomeTileId:null,zoneCard:null})===1).sort((a,b)=>a.id-b.id)[0];
      return {anchorId:anchor.id,q,r};
    });
    return placements.sort((a,b)=>{
      const aPreferred=preferred&&this.hexDistance(preferred,{id:-1,q:a.q,r:a.r,kind:'zone',ownerHomeTileId:null,zoneCard:null})===1?0:1;
      const bPreferred=preferred&&this.hexDistance(preferred,{id:-1,q:b.q,r:b.r,kind:'zone',ownerHomeTileId:null,zoneCard:null})===1?0:1;
      return aPreferred-bPreferred||a.r-b.r||a.q-b.q;
    });
  }

  invalidZonePlacements(){
    return BLOCKED_GATE_COORDINATES.map(({q,r})=>({anchorId:-1,q,r}));
  }

  private searchDeckToHand(p:Player,id:string){
    const index=p.deck.findIndex(c=>c.id===id);
    if(index<0)return false;
    const [found]=p.deck.splice(index,1);
    p.hand.push(found);
    shuffle(p.deck);
    this.note(`${p===this.state.player?'You search':'The rival searches'} for ${found.name} and add it to hand.`);
    return true;
  }

  private takeCard(p:Player,id:string,excludeUid=''){
    for(const source of [p.deck,p.hand,p.graveyard]){
      const index=source.findIndex(card=>card.id===id&&card.uid!==excludeUid);
      if(index>=0){const [found]=source.splice(index,1);if(source===p.deck)shuffle(p.deck);return found}
    }
    return undefined;
  }

  private canDestroyAddedTile(tileId:number){
    const tile=this.tileById(tileId);if(!tile||tile.id<STARTING_TILE_COUNT||tile.kind!=='zone')return false;
    const remaining=this.state.tiles.filter(item=>item.id!==tileId);if(!remaining.length)return false;
    const seen=new Set<number>([remaining[0].id]),queue=[remaining[0].id];
    while(queue.length){const current=queue.shift()!;for(const next of remaining)if(!seen.has(next.id)&&this.areAdjacent(current,next.id)){seen.add(next.id);queue.push(next.id)}}
    return seen.size===remaining.length;
  }

  private moveUnitToTile(p:Player,enemy:Player,u:Unit,tileId:number,free=false){
    const tile=this.tileById(tileId),logical=this.logicalPosition(p,tileId);if(!tile||this.gateSlotsOpen(p,logical)<=0)return false;
    u.position=logical;if(!free)u.exhausted=true;
    if(tile.zoneCard?.zone==='static-field'&&tile.ownerHomeTileId!==p.homeTileId){const dealt=this.damageUnit(p,u,2,'lightning');this.note(`${u.name} entered Static Field and took ${dealt} Lightning damage.`)}
    const trapIndex=enemy.electricTraps.indexOf(tileId);
    if(trapIndex>=0){enemy.electricTraps.splice(trapIndex,1);u.stunnedTurns=Math.max(u.stunnedTurns??0,1);this.note(`${u.name} triggered Electric Trap and is stunned for 1 turn.`)}
    this.refreshContinuousEffects();return true;
  }

  private destroyAddedTile(tileId:number,source:Player,enemy:Player){
    if(!this.canDestroyAddedTile(tileId)){this.note('Meteor Drop cannot destroy an original hex or disconnect the battlefield cluster.');return false}
    const tile=this.tileById(tileId)!,remaining=this.state.tiles.filter(item=>item.id!==tileId),neighbors=remaining.filter(item=>this.areAdjacent(tileId,item.id));
    for(const owner of [source,enemy])for(const unit of owner.units.filter(item=>this.physicalTile(owner,item.position)===tileId)){
      const destination=neighbors.find(item=>this.gateSlotsOpen(owner,this.logicalPosition(owner,item.id))>0);
      if(destination){unit.position=this.logicalPosition(owner,destination.id);this.note(`${unit.name} escapes the collapsing Zone to an adjacent tile.`)}else{unit.health=0;this.note(`${unit.name} is defeated when the Zone collapses.`)}
    }
    this.state.tiles=remaining;for(const owner of [source,enemy]){owner.zoneTiles[tileId]=null;delete owner.pulseBarriers[tileId];owner.electricTraps=owner.electricTraps.filter(id=>id!==tileId);if(owner.flameDomainTile===tileId)owner.flameDomainTile=null;owner.activeZone=[...owner.zoneTiles].reverse().find(Boolean)??null}
    if(this.state.selectedTile===tileId)this.state.selectedTile=source.homeTileId;
    this.note(`Meteor Drop destroyed ${tile.zoneCard?.name??`Hex ${tileId+1}`}; the remaining hexes stay edge-connected.`);this.removeDefeated();this.refreshContinuousEffects();return true;
  }

  canEvolve(p:Player){
    const next=nextForm(p.element,p.evolutionStage);
    if(!next)return false;
    if(p.element!=='storm')return p.glory>=next.gloryRequired;
    if(p.evolutionStage===0)return p.magicCastTotal>=2;
    if(p.evolutionStage===1)return p.damageLastTurn>=6;
    return p.stormCharges>=3||p.tempestMagicCast;
  }

  evolutionProgress(p:Player){
    if(p.element!=='storm'){
      const next=nextForm(p.element,p.evolutionStage);
      return next?`${p.glory} / ${next.gloryRequired} Glory`:'Maximum evolution';
    }
    if(p.evolutionStage===0)return `${Math.min(2,p.magicCastTotal)} / 2 Magic cards cast`;
    if(p.evolutionStage===1)return `${Math.min(6,p.damageLastTurn)} / 6 damage last turn`;
    if(p.evolutionStage===2)return `${p.stormCharges} / 3 Storm Charges • or cast Tempest Magic`;
    return 'Maximum evolution';
  }

  effectiveCost(p:Player,c:CardDef){
    let cost=c.cost;
    if(p.element==='storm'&&p.evolutionStage>=3&&c.kind==='magic')cost=Math.max(1,cost-1);
    if(this.zone(p,'volcano')&&c.kind==='magic'&&this.hasTrait(c,'Fire')&&!p.zoneSpellDiscountUsed)cost=Math.max(0,cost-1);
    if(c.kind==='magic'&&this.hasTrait(c,'Fire')&&p.units.some(unit=>unit.cardId==='cinder-witch'))cost=Math.max(0,cost-1);
    return cost;
  }

  private preferredSummonTile(p:Player,c:Card,forcedTile?:number){
    if(forcedTile!==undefined){const logical=this.logicalPosition(p,forcedTile);return this.tileById(forcedTile)&&this.gateSlotsOpen(p,logical)>0?forcedTile:null}
    const selected=p===this.state.player?this.state.selectedTile:null;
    const controlledWater=this.state.tiles.filter(tile=>tile.ownerHomeTileId===p.homeTileId&&this.isWaterTile(tile.id));
    if(c.id==='kraken'||this.hasTrait(c,'Zone Bound')){
      const tile=selected!==null&&selected!==undefined&&controlledWater.some(item=>item.id===selected)?selected:controlledWater[0]?.id;
      return tile!==undefined&&this.gateSlotsOpen(p,this.logicalPosition(p,tile))>0?tile:null;
    }
    if(this.hasTrait(c,'Ship')&&selected!==null&&selected!==undefined&&this.zoneCardAt(selected)?.zone==='lighthouse'&&this.tileById(selected)?.ownerHomeTileId===p.homeTileId&&this.gateSlotsOpen(p,this.logicalPosition(p,selected))>0)return selected;
    return this.gateSlotsOpen(p)>0?p.homeTileId:null;
  }

  private canSummon(p:Player,c:Card,forcedTile?:number){return c.kind==='unit'&&this.preferredSummonTile(p,c,forcedTile)!==null}

  private makeUnit(c:Card,ready=false,position=0):Unit{
    return {uid:c.uid,cardId:c.id,name:c.name,attack:c.attack!,health:c.health!,maxHealth:c.health!,position,exhausted:!ready,element:c.element as Element,traits:[...(c.traits??[])],equipment:[],summonedTurn:this.state.turn,attacksThisTurn:0};
  }

  private summon(p:Player,c:Card,ready=false,forcedTile?:number){
    const tile=this.preferredSummonTile(p,c,forcedTile);
    if(c.kind!=='unit'||tile===null)return false;
    const unit=this.makeUnit(c,ready,this.logicalPosition(p,tile));
    if(['skyclaw-raptor','cloudrunner-lynx'].includes(c.id)||p.element==='storm'&&p.evolutionStage>=1){unit.preventFirstDamage=true;unit.shieldReady=true}
    if(c.id==='thunderhorn-stag'&&p.element==='storm')unit.attack+=1;
    if(c.id==='coral-knight')unit.physicalReduction=2;
    if(c.id==='static-wraith'){unit.recoilDamage=2;unit.recoilType='lightning'}
    if(c.id==='electro-golem'){unit.recoilDamage=3;unit.recoilType='lightning'}
    if(c.id==='river-serpent')unit.riverGrowth=0;
    if(this.zone(p,'field',unit.position)){unit.maxHealth+=1;unit.health+=1;unit.temporaryHealth=1}
    if(this.zone(p,'fog',unit.position)){unit.preventFirstDamage=true;unit.shieldReady=true;unit.fogWindStep=true}
    p.units.push(unit);
    this.refreshContinuousEffects();

    if(c.id==='pearl-scout')this.searchDeckToHand(p,'mending-tide');
    if(c.id==='ember-squire'){
      const equipment=[...p.deck].filter(card=>card.kind==='equipment').sort((a,b)=>a.cost-b.cost)[0];
      if(equipment)this.searchDeckToHand(p,equipment.id);
    }
    if(c.id==='blaze-raptor')this.searchDeckToHand(p,'blaze-raptor');
    if(c.id==='solar-champion')this.searchDeckToHand(p,'rallying-flame');
    if(c.id==='ash-scout'){
      const magic=p.deck.find(card=>card.kind==='magic'&&this.hasTrait(card,'Fire'));if(magic)this.searchDeckToHand(p,magic.id);
    }
    if(c.id==='ember-samurai')this.searchDeckToHand(p,'flame-shogun');
    if(c.id==='storm-sailor')p.rainfieldTurns=Math.max(p.rainfieldTurns,1);

    if(c.id==='undead-wizard'){
      const index=p.deck.findIndex(card=>card.id==='gravebound-knight');
      if(index>=0){
        const [knight]=p.deck.splice(index,1);
        if(this.gateSlotsOpen(p)>0){this.summon(p,knight);this.note(`${knight.name} answers the Undead Wizard and deploys at the Gate.`)}
        else{p.hand.push(knight);this.note('The Gate is full, so Gravebound Knight is added to hand instead.')}
        shuffle(p.deck);
      }
    }
    if(c.id==='gravebound-knight')this.searchDeckToHand(p,'forever-dead-king');
    this.note(`${c.name} appears on ${this.tileLabel(tile,p)} as a ${c.attack}/${c.health} Unit.`);
    return true;
  }

  private targetFor(p:Player,uid:string|null){return p.units.find(u=>u.uid===uid)}
  private validCardChoices(source:Card[],uids:string[]|undefined,predicate:(card:Card)=>boolean,max:number){
    return unique(uids).slice(0,max).map(uid=>source.find(card=>card.uid===uid)).filter((card):card is Card=>Boolean(card)&&predicate(card!));
  }

  private autoChoices(p:Player,enemy:Player,c:Card):PlayCardChoices{
    if(c.id==='ultimate-sacrifice')return {cardUids:[...p.hand].filter(card=>card.uid!==c.uid&&card.kind==='unit').sort((a,b)=>a.cost-b.cost).slice(0,2).map(card=>card.uid)};
    if(c.id==='for-the-queen')return {cardUids:[...p.deck].filter(card=>card.kind==='unit'&&card.id!=='forever-dead-king').sort((a,b)=>b.cost-a.cost).slice(0,Math.min(2,this.gateSlotsOpen(p))).map(card=>card.uid)};
    if(c.id==='raise-the-fallen')return {cardUids:[...p.graveyard].filter(card=>card.kind==='unit').sort((a,b)=>b.cost-a.cost).slice(0,Math.min(2,this.gateSlotsOpen(p))).map(card=>card.uid)};
    if(c.id==='queens-destruction')return {friendlyUnitUids:[...p.units].sort((a,b)=>a.health-b.health).slice(0,1).map(u=>u.uid),enemyUnitUids:[...enemy.units].sort((a,b)=>b.attack-a.attack).slice(0,2).map(u=>u.uid)};
    if(c.id==='ashen-rebirth')return {cardUids:[...p.graveyard].filter(card=>card.kind==='unit'&&this.hasTrait(card,'Fire')).sort((a,b)=>b.cost-a.cost).slice(0,1).map(card=>card.uid)};
    return {};
  }

  private canResolveTargeted(p:Player,enemy:Player,c:Card,target:Unit|undefined,choices:PlayCardChoices,enemyTarget?:Unit){
    if(c.kind==='unit'){
      if(c.id==='flame-shogun')return Boolean(target?.cardId==='ember-samurai'&&this.canSummon(p,c,this.physicalTile(p,target.position)));
      return this.canSummon(p,c);
    }
    if(c.id==='soul-harvest')return Boolean(target&&this.hasTrait(target,'Undead'));
    if(c.id==='ultimate-sacrifice')return this.validCardChoices(p.hand,choices.cardUids,card=>card.uid!==c.uid&&card.kind==='unit',2).length>0;
    if(c.id==='for-the-queen')return this.gateSlotsOpen(p)>0&&this.validCardChoices(p.deck,choices.cardUids,card=>card.kind==='unit'&&card.id!=='forever-dead-king',2).length>0;
    if(c.id==='raise-the-fallen')return this.gateSlotsOpen(p)>0&&this.validCardChoices(p.graveyard,choices.cardUids,card=>card.kind==='unit',2).length>0;
    if(c.id==='queens-destruction'){
      const friendly=unique(choices.friendlyUnitUids).map(uid=>p.units.find(u=>u.uid===uid)).filter(Boolean);
      const enemies=unique(choices.enemyUnitUids).map(uid=>enemy.units.find(u=>u.uid===uid)).filter(Boolean);
      return friendly.length===1&&enemies.length>0&&enemies.length<=2;
    }
    if(c.id==='ashen-rebirth')return this.validCardChoices(p.graveyard,choices.cardUids,card=>card.kind==='unit'&&this.hasTrait(card,'Fire'),1).length===1;
    if(c.kind==='equipment'&&c.element==='undead')return Boolean(target);
    if(c.id==='stormforged-talons')return Boolean(target&&this.hasTrait(target,'Beast'));
    if(c.id==='coral-plate')return Boolean(target);
    if(['gale-step-invocation','healing-downpour','gale-mantle-cloak','raincaller-totem','sailors-compass','coral-shield','captains-raincoat','overcharge','overcharge-ring','skybreaker-spear','sky-howler-spear','flame-shield','molten-armor','flarebow','molten-core-amulet','thunderstep'].includes(c.id))return Boolean(target);
    if(['aqua-burst','cold-snap','lightning-bolt'].includes(c.id))return Boolean(enemyTarget);
    if(['sirens-echo','pulse-barrier','electric-trap'].includes(c.id))return this.state.selectedTile!==null&&Boolean(this.tileById(this.state.selectedTile));
    if(c.id==='krakens-call')return Boolean(this.state.selectedTile!==null&&this.isWaterTile(this.state.selectedTile)&&this.gateSlotsOpen(p,this.logicalPosition(p,this.state.selectedTile))>0&&[...p.deck,...p.hand,...p.graveyard].some(card=>card.id==='kraken'&&card.uid!==c.uid));
    if(c.id==='meteor-drop')return Boolean(this.state.selectedTile!==null&&this.canDestroyAddedTile(this.state.selectedTile));
    return true;
  }

  private deployFrom(p:Player,source:Card[],uids:string[]|undefined,max:number,predicate:(card:Card)=>boolean){
    const chosen=this.validCardChoices(source,uids,predicate,Math.min(max,this.gateSlotsOpen(p)));
    let deployed=0;
    for(const card of chosen){
      const index=source.findIndex(item=>item.uid===card.uid);
      if(index<0||!this.canSummon(p,card))continue;
      source.splice(index,1);
      if(this.summon(p,card))deployed++;
    }
    return deployed;
  }

  private equip(target:Unit,c:Card){target.equipment.push(c.name)}

  private playZone(p:Player,c:Card){
    if(this.state.tiles.length>=MAX_FIELD_TILES)return;
    const placements=this.availableZonePlacements();
    const chosen=p===this.state.player&&this.state.selectedPlacement&&placements.some(place=>place.q===this.state.selectedPlacement!.q&&place.r===this.state.selectedPlacement!.r)?this.state.selectedPlacement:placements[0];
    if(!chosen)return;
    const tileId=Math.max(...this.state.tiles.map(tile=>tile.id))+1;
    const tile:BattlefieldTile={id:tileId,q:chosen.q,r:chosen.r,kind:'zone',ownerHomeTileId:p.homeTileId,zoneCard:c};
    this.state.tiles.push(tile);p.zoneTiles[tileId]=c;p.activeZone=c;
    p.zoneSpellDiscountUsed=false;
    this.refreshContinuousEffects();
    this.note(`${c.name} created Hex ${tileId+1}, connected to ${this.tileLabel(chosen.anchorId,p)}. The field now has ${this.state.tiles.length}/${MAX_FIELD_TILES} tiles.`);
    this.state.pendingZoneUid=null;this.state.selectedPlacement=null;this.state.selectedTile=tileId;
  }

  tileLabel(tileId:number,p=this.state.player){const tile=this.tileById(tileId);if(!tile)return 'the field';if(tile.kind==='zone')return tile.zoneCard?.name??`Zone Hex ${tile.id+1}`;if(tile.kind==='center')return 'Center Zone';return tile.id===p.homeTileId?'Home Gate':'Enemy Gate'}

  beginZonePlacement(uid:string){
    const p=this.state.player,c=p.hand.find(card=>card.uid===uid);
    if(!this.isPlayerTurn()||this.state.phase!=='deploy'||!c||c.kind!=='zone')return;
    if(this.state.tiles.length>=MAX_FIELD_TILES){this.note('The battlefield already contains the maximum of 7 tiles.');return this.emit()}
    if(this.effectiveCost(p,c)>p.essence){this.note('Not enough Essence.');return this.emit()}
    this.state.pendingZoneUid=uid;this.state.selectedPlacement=null;
    this.note(`${c.name} is ready to place. Choose any highlighted full-edge connection on the cluster perimeter. Red X positions are isolated and illegal.`);this.emit();
  }
  placeZone(q:number,r:number,anchorId:number){
    if(!this.state.pendingZoneUid)return;
    const placement=this.availableZonePlacements().find(place=>place.q===q&&place.r===r);
    if(!placement){this.note('Illegal Zone placement rejected: every new tile must share a complete edge with the existing cluster.');return this.emit()}
    this.state.selectedPlacement={q,r,anchorId:placement.anchorId};const uid=this.state.pendingZoneUid;this.playCard(uid);
  }
  cancelZonePlacement(){if(!this.state.pendingZoneUid)return;this.state.pendingZoneUid=null;this.state.selectedPlacement=null;this.note('Zone placement canceled.');this.emit()}

  private resolveCard(p:Player,enemy:Player,c:Card,target?:Unit,enemyTarget?:Unit,rawChoices:PlayCardChoices={}){
    if(c.kind==='unit'){
      if(c.id==='flame-shogun'&&target?.cardId==='ember-samurai'){
        const tile=this.physicalTile(p,target.position);target.health=0;this.note(`${target.name} is tributed for Flame Shogun.`);this.removeDefeated();this.summon(p,c,false,tile);
      }else this.summon(p,c);
      return;
    }
    if(c.kind==='zone'){this.playZone(p,c);return}
    const choices=Object.keys(rawChoices).length?rawChoices:this.autoChoices(p,enemy,c);

    if(c.id==='ultimate-sacrifice'){
      const discarded=this.validCardChoices(p.hand,choices.cardUids,card=>card.kind==='unit',2);
      for(const card of discarded){const index=p.hand.findIndex(item=>item.uid===card.uid);if(index>=0)p.graveyard.push(...p.hand.splice(index,1))}
      this.note(`${discarded.length} Unit card${discarded.length===1?'':'s'} offered in the Ultimate Sacrifice.`);
    }else if(c.id==='for-the-queen'){
      const count=this.deployFrom(p,p.deck,choices.cardUids,2,card=>card.kind==='unit'&&card.id!=='forever-dead-king');
      shuffle(p.deck);this.note(`${count} Unit${count===1?'':'s'} deploy for the Queen.`);
    }else if(c.id==='raise-the-fallen'){
      const count=this.deployFrom(p,p.graveyard,choices.cardUids,2,card=>card.kind==='unit');
      this.note(`${count} fallen Unit${count===1?' returns':'s return'} directly to the Gate.`);
    }else if(c.id==='ashen-rebirth'){
      const revived=this.validCardChoices(p.graveyard,choices.cardUids,card=>card.kind==='unit'&&this.hasTrait(card,'Fire'),1)[0];
      if(revived){const index=p.graveyard.findIndex(card=>card.uid===revived.uid);p.graveyard.splice(index,1);if(this.summon(p,revived)){const unit=p.units.find(item=>item.uid===revived.uid)!;unit.health=1;this.note(`Ashen Rebirth returns ${unit.name} with 1 Health.`)}else p.graveyard.push(revived)}
    }else if(c.id==='queens-destruction'){
      const friendly=unique(choices.friendlyUnitUids).map(uid=>p.units.find(u=>u.uid===uid)).filter((u):u is Unit=>Boolean(u))[0];
      const enemies=unique(choices.enemyUnitUids).map(uid=>enemy.units.find(u=>u.uid===uid)).filter((u):u is Unit=>Boolean(u)).slice(0,2);
      if(friendly)friendly.health=0;enemies.forEach(u=>u.health=0);this.removeDefeated();
    }else if(c.id==='soul-harvest'&&target){
      target.health=0;this.removeDefeated();this.draw(p,2);this.heal(p,5);
    }else if(c.id==='death-mist'){
      enemy.units.forEach(u=>this.damageUnit(enemy,u,3,'magic'));this.removeDefeated();
    }else if(c.id==='endless-grave'){
      p.endlessGraveTurns=2;
    }else if(c.id==='thorned-rose-crown'&&target){
      target.attack+=2;target.maxHealth+=5;target.health+=5;target.preventFirstDamage=true;target.shieldReady=true;this.equip(target,c);
    }else if(c.id==='crown-eternal-night'&&target){
      target.attack+=2;target.maxHealth+=3;target.health+=3;target.healOnKill=(target.healOnKill??0)+2;this.equip(target,c);
    }else if(c.id==='blade-forgotten-kings'&&target){
      target.attack+=4;target.maxHealth+=1;target.health+=1;target.extraAttackOnKill=true;this.equip(target,c);
    }else if(c.id==='boltstrike-surge'){
      this.dealLightning(p,enemy,2,enemyTarget,true);
      if(p.evolutionStage>=2)enemy.units.forEach(u=>this.damageUnit(enemy,u,1,'lightning'));
    }else if(c.id==='gale-step-invocation'&&target){
      target.preventFirstDamage=true;target.shieldReady=true;target.speedBonus=(target.speedBonus??0)+1;target.temporarySpeed=(target.temporarySpeed??0)+1;target.exhausted=false;if(p.evolvedThisTurn)this.draw(p);
    }else if(c.id==='healing-downpour'&&target){
      this.healUnit(p,target,3);p.rainfieldTurns=Math.max(p.rainfieldTurns,2);
    }else if(c.id==='stormheart-cataclysm'){
      if(enemyTarget){this.dealLightning(p,enemy,3,enemyTarget,true);this.pushTowardHome(enemy,enemyTarget,2)}
      else{this.dealLightning(p,enemy,3,undefined,true);p.rainfieldTurns=Math.max(p.rainfieldTurns,1)}
      if(p.evolutionStage>=3){p.rainfieldTurns=Math.max(p.rainfieldTurns,1);if(enemyTarget)this.pushTowardHome(enemy,enemyTarget,2)}
      p.tempestMagicCast=true;
    }else if(c.id==='stormforged-talons'&&target){
      target.attack+=1;target.bonusLightningOnCombat=(target.bonusLightningOnCombat??0)+1;this.equip(target,c);
    }else if(c.id==='gale-mantle-cloak'&&target){
      target.preventFirstDamage=true;target.shieldReady=true;target.speedBonus=(target.speedBonus??0)+1;target.exhausted=false;this.equip(target,c);
    }else if(c.id==='thunderheart-core'){
      p.coreEquipped=true;p.leaderEquipment.push(c.name);
    }else if(c.id==='raincaller-totem'&&target){
      target.raincaller=true;this.equip(target,c);
    }else if(c.id==='coral-plate'&&target){
      target.maxHealth+=5;target.health+=5;this.equip(target,c);
    }else if(c.id==='tsunami'){
      for(const unit of [...enemy.units]){const dealt=this.damageUnit(enemy,unit,1,'water');p.damageThisTurn+=dealt;if(unit.health>0)this.pushTowardHome(enemy,unit,1)}
      this.note(`Tsunami dealt 1 Water damage to ${enemy.units.length} enemy unit${enemy.units.length===1?'':'s'} and pushed the survivors toward home.`);
    }else if(c.id==='rainfall-blessing'){
      p.units.forEach(unit=>this.healUnit(p,unit,2));this.note(`Rainfall Blessing restored 2 Health to ${p.units.length} friendly unit${p.units.length===1?'':'s'}.`);
    }else if(c.id==='sirens-echo'){
      const tile=this.state.selectedTile!;let moved=0;
      for(const unit of p.units.filter(item=>this.hasTrait(item,'Ship'))){if(this.gateSlotsOpen(p,this.logicalPosition(p,tile))<=0)break;if(this.moveUnitToTile(p,enemy,unit,tile,true))moved++}
      this.note(`Siren’s Echo called ${moved} Ship unit${moved===1?'':'s'} to ${this.tileLabel(tile,p)}.`);
    }else if(c.id==='aqua-burst'&&enemyTarget){
      const amount=this.hasTrait(enemyTarget,'Fire')?6:3,dealt=this.damageUnit(enemy,enemyTarget,amount,'water');p.damageThisTurn+=dealt;this.note(`Aqua Burst dealt ${dealt} Water damage to ${enemyTarget.name}${amount===6?' (Fire weakness)':''}.`);
    }else if(c.id==='cold-snap'&&enemyTarget){
      const dealt=this.damageUnit(enemy,enemyTarget,2,'water');enemyTarget.frozenTurns=Math.max(enemyTarget.frozenTurns??0,1);p.damageThisTurn+=dealt;this.note(`Cold Snap dealt ${dealt} damage to ${enemyTarget.name} and froze it for 1 turn.`);
    }else if(c.id==='krakens-call'){
      const summoned=this.takeCard(p,'kraken',c.uid);if(summoned&&this.summon(p,summoned,false,this.state.selectedTile!))this.note(`Kraken’s Call summons Kraken to ${this.tileLabel(this.state.selectedTile!,p)}.`);else if(summoned)p.graveyard.push(summoned);
    }else if(c.id==='sailors-compass'&&target){
      target.compassUsed=false;this.equip(target,c);
    }else if(c.id==='coral-shield'&&target){
      target.coralShield=Math.max(target.coralShield??0,1);this.equip(target,c);
    }else if(c.id==='pearl-amulet'){
      p.essence+=5;p.leaderEquipment.push(c.name);this.note('Pearl Amulet restores 5 Essence.');
    }else if(c.id==='captains-raincoat'&&target){
      target.waterImmune=true;this.equip(target,c);
    }else if(c.id==='lightning-bolt'&&enemyTarget){
      this.dealLightning(p,enemy,3,enemyTarget,true);enemyTarget.stunnedTurns=Math.max(enemyTarget.stunnedTurns??0,1);this.note(`Lightning Bolt strikes ${enemyTarget.name} and stuns it for 1 turn.`);
    }else if(c.id==='chain-spark'){
      const targets=[...(enemyTarget?[enemyTarget]:[]),...enemy.units.filter(unit=>unit.uid!==enemyTarget?.uid).sort((a,b)=>a.health-b.health)].slice(0,3);
      targets.forEach((unit,index)=>this.dealLightning(p,enemy,3-index,unit,true));this.note(`Chain Spark jumped through ${targets.length} target${targets.length===1?'':'s'} for ${targets.map((_,i)=>3-i).join(' / ')} base damage.`);
    }else if(c.id==='thunderstep'&&target){
      const origin=this.physicalTile(p,target.position),destination=this.state.selectedTile!;
      enemy.units.filter(unit=>[origin,destination].includes(this.physicalTile(enemy,unit.position))).forEach(unit=>this.dealLightning(p,enemy,1,unit));
      this.moveUnitToTile(p,enemy,target,destination,true);this.note(`${target.name} Thundersteps from ${this.tileLabel(origin,p)} to ${this.tileLabel(destination,p)}.`);
    }else if(c.id==='sky-crash'){
      const flying=enemy.units.filter(unit=>this.hasTrait(unit,'Flying')||this.hasTrait(unit,'Aerial'));flying.forEach(unit=>unit.health=0);this.note(`Sky Crash destroys ${flying.length} Flying unit${flying.length===1?'':'s'}.`);
    }else if(c.id==='overcharge'&&target){
      target.attack+=3;target.overchargeDamage=(target.overchargeDamage??0)+1;this.note(`${target.name} gains +3 Attack and becomes Overcharged.`);
    }else if(c.id==='stormcall'){
      this.searchDeckToHand(p,'static-field');
    }else if(c.id==='pulse-barrier'){
      const tile=this.state.selectedTile!;p.pulseBarriers[tile]=Math.max(p.pulseBarriers[tile]??0,2);this.note(`Pulse Barrier protects friendly units on ${this.tileLabel(tile,p)} for 2 turns.`);
    }else if(c.id==='electric-trap'){
      const tile=this.state.selectedTile!;if(!p.electricTraps.includes(tile))p.electricTraps.push(tile);this.note(`Electric Trap is armed on ${this.tileLabel(tile,p)}.`);
    }else if(c.id==='volt-surge'){
      p.essence+=2;if(enemyTarget)this.dealLightning(p,enemy,2,enemyTarget,true);else{const bonus=p.units.some(unit=>unit.cardId==='skybolt-mage')?1:0;enemy.health-=2+bonus;p.damageThisTurn+=2+bonus}this.note(`Volt Surge restored 2 Essence and dealt Lightning damage.`);
    }else if(c.id==='lightning-rod-staff'){
      p.leaderEquipment.push(c.name);
    }else if(c.id==='overcharge-ring'&&target){
      target.extraAttackEachTurn=(target.extraAttackEachTurn??0)+1;target.overchargeDamage=(target.overchargeDamage??0)+1;this.equip(target,c);
    }else if(c.id==='skybreaker-spear'&&target){
      target.chainDamage=(target.chainDamage??0)+1;this.equip(target,c);
    }else if(c.id==='sky-howler-spear'&&target){
      target.attackAllTwice=true;this.equip(target,c);
    }else if(c.id==='heatwave'){
      p.heatwaveTurns=Math.max(p.heatwaveTurns,2);this.note('Heatwave weakens enemy defense in Fire and Desert Zones for 2 turns.');
    }else if(c.id==='meteor-drop'){
      this.destroyAddedTile(this.state.selectedTile!,p,enemy);
    }else if(c.id==='wildfire'){
      p.wildfireTurns=Math.max(p.wildfireTurns,2);this.note('Wildfire burns enemy units in Fire Zones for 2 turns.');
    }else if(c.id==='flame-shield'&&target){
      target.recoilDamage=(target.recoilDamage??0)+2;target.recoilType='fire';this.equip(target,c);
    }else if(c.id==='molten-armor'&&target){
      target.attack+=2;target.fireImmune=true;this.equip(target,c);
    }else if(c.id==='flarebow'&&target){
      target.ranged=true;this.equip(target,c);
    }else if(c.id==='molten-core-amulet'&&target){
      this.equip(target,c);
    }else if(c.id==='cinder-mask'){
      p.leaderEquipment.push(c.name);
    }else if(c.id==='sunblade'){
      p.leaderAttack+=2;p.leaderEquipment.push(c.name);
    }else if(c.effect==='damage'){
      enemy.health-=3;this.gainGlory(p,1);
    }else if(c.id==='mending-tide'){
      if(target)this.healUnit(p,target,5);else this.heal(p,5);
    }else if(c.id==='deep-wisdom'){
      const found=[...p.deck].filter(card=>card.kind==='magic'&&this.hasTrait(card,'Water')).slice(0,2);
      found.forEach(card=>this.searchDeckToHand(p,card.id));
    }else if(c.id==='phoenix-call'){
      const found=p.deck.find(card=>this.hasTrait(card,'Fire'));if(found)this.searchDeckToHand(p,found.id);
    }else if(c.effect==='heal')this.heal(p,4);
    else if(c.effect==='draw')this.draw(p,2);
    else if(c.effect==='buff'){
      if(c.id==='rallying-flame'){
        const champion=p.units.some(u=>u.cardId==='solar-champion');
        const targets=champion?p.units:p.units.filter(u=>u.health<u.maxHealth);
        targets.forEach(u=>u.attack+=champion?5:2);
      }else{
        const u=[...p.units].sort((a,b)=>b.position-a.position)[0];if(u)u.attack+=2;else p.leaderAttack+=2;
      }
    }
    if(c.kind==='magic')p.graveyard.push(c);
  }

  private onMagicCast(p:Player,enemy:Player,c:Card,enemyTarget?:Unit){
    p.magicCastTotal++;
    if(p.coreEquipped)p.stormCharges++;
    if(this.hasTrait(c,'Water')){
      const adepts=p.units.filter(unit=>unit.cardId==='tidecaller-adept');adepts.forEach(unit=>unit.attack++);
      if(adepts.length)this.note(`${adepts.length} Tidecaller Adept${adepts.length===1?' gains':'s gain'} +1 Attack from the Water spell.`);
    }
    if(p.leaderEquipment.includes('Lightning Rod Staff')){enemy.health-=1;p.damageThisTurn+=1;this.note('Lightning Rod Staff deals 1 Lightning damage to the enemy Leader.');}
    if(p.element==='storm'){p.leaderAttack++;p.leaderTempAttack++;this.note(`${currentForm(p.element,p.evolutionStage).title} gains +1 Power from Stormborn.`)}
    if(this.zone(p,'lightning')&&this.hasTrait(c,'Lightning')){
      if(enemyTarget&&enemyTarget.health>0)this.damageUnit(enemy,enemyTarget,1,'lightning');
      else enemy.health-=1;
      p.damageThisTurn+=1;
      this.note('Lightning Plains adds 1 bonus damage.');
    }
  }

  private dealLightning(source:Player,enemy:Player,amount:number,target?:Unit,spell=false){
    if(spell&&source.units.some(unit=>unit.cardId==='skybolt-mage'))amount++;
    const dealt=target?this.damageUnit(enemy,target,amount,'lightning'):amount;
    if(!target)enemy.health-=amount;
    source.damageThisTurn+=dealt;
    if(dealt>0&&source.element==='storm'&&source.evolutionStage>=2)enemy.units.forEach(u=>{source.damageThisTurn+=this.damageUnit(enemy,u,1,'lightning')});
  }

  private isPlayerTurn(){return this.state.phase!=='enemy'&&!this.state.winner}
  playCard(uid:string,rawChoices:PlayCardChoices={}){
    const p=this.state.player;
    if(!this.isPlayerTurn())return;
    const i=p.hand.findIndex(c=>c.uid===uid),c=p.hand[i];
    if(!c)return;
    const phaseAllowed=c.kind==='magic'||this.state.phase==='deploy';
    if(!phaseAllowed){this.note(`${c.name} is a ${c.kind} card and can only be played during the Deploy Phase.`);return this.emit()}
    const cost=this.effectiveCost(p,c);
    if(cost>p.essence){this.note('Not enough Essence.');return this.emit()}
    if(c.kind==='zone'&&this.state.tiles.length>=MAX_FIELD_TILES){this.note('The battlefield is full. A maximum of 7 hex tiles may be in play.');return this.emit()}
    const target=this.targetFor(p,this.state.selectedUnit);
    const summonLegal=c.id==='flame-shogun'&&target?.cardId==='ember-samurai'?this.canSummon(p,c,this.physicalTile(p,target.position)):this.canSummon(p,c);
    if(c.kind==='unit'&&!summonLegal){this.note(c.id==='kraken'?'Kraken is Zone Bound. Select a friendly Water Zone with room first.':c.id==='flame-shogun'?'Select an Ember Samurai with room on its tile to pay the Tribute.':'No legal summon tile has room for that Unit.');return this.emit()}
    const choices=Object.keys(rawChoices).length?rawChoices:this.autoChoices(p,this.state.enemy,c);
    const enemyTarget=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget);
    if(!this.canResolveTargeted(p,this.state.enemy,c,target,choices,enemyTarget)){this.note(`Choose the required unit, tile, or card targets before playing ${c.name}.`);return this.emit()}
    const usedVolcano=this.zone(p,'volcano')&&c.kind==='magic'&&this.hasTrait(c,'Fire')&&!p.zoneSpellDiscountUsed;
    p.essence-=cost;
    p.hand.splice(i,1);
    if(usedVolcano)p.zoneSpellDiscountUsed=true;
    this.resolveCard(p,this.state.enemy,c,target,enemyTarget,choices);
    if(c.kind==='magic')this.onMagicCast(p,this.state.enemy,c,enemyTarget);
    this.state.selectedUnit=null;
    this.state.selectedTarget=null;
    this.note(`${c.name} was played for ${cost} Essence (${p.essence} Essence remains).${c.kind==='unit'?` ${c.attack}/${c.health} Unit summoned directly onto its hex tile.`:''}`);
    this.removeDefeated();
    this.refreshContinuousEffects();
    this.emit();
  }

  nextPhase(){
    if(this.state.winner||this.state.phase==='enemy')return;
    if(this.state.pendingZoneUid){this.note('Finish or cancel the highlighted Zone placement before leaving Deploy.');return this.emit()}
    const order:Phase[]=['deploy','battle'];
    const index=order.indexOf(this.state.phase);
    if(index===order.length-1)return this.endTurn();
    const next=order[index+1];
    this.state.phase=next;this.state.selectedUnit=null;this.state.selectedTarget=null;
    this.note(`${next[0].toUpperCase()+next.slice(1)} Phase begins.${next==='battle'?' Units may move, attack, and activate abilities.':' Units and Equipment may be played.'}`);
    this.emit();
  }
  setPhase(phase:Phase){
    if(this.state.winner||phase==='enemy')return;
    const order:Phase[]=['deploy','battle'];
    if(order.indexOf(phase)!==order.indexOf(this.state.phase)+1)return;
    this.nextPhase();
  }

  evolveLeader(){const p=this.state.player;if(!this.isPlayerTurn()||p.evolvedThisTurn||!this.canEvolve(p))return;this.applyEvolution(p);this.emit()}
  private applyEvolution(p:Player){
    const form=nextForm(p.element,p.evolutionStage);
    if(!form||p.evolvedThisTurn||!this.canEvolve(p))return false;
    p.evolutionStage++;p.maxHealth=form.maxHealth;p.health=Math.min(p.maxHealth,p.health+form.healthBonus);p.leaderAttack=form.attack;p.maxAbilityPoints=form.abilityPoints;p.abilityPoints=form.abilityPoints;p.evolvedThisTurn=true;
    if(p.element==='storm'){
      if(p.evolutionStage===1)p.units.forEach(u=>{u.preventFirstDamage=true;u.shieldReady=true});
      p.units.filter(u=>u.cardId==='skyclaw-raptor').forEach(u=>{u.attack++;u.temporaryAttack=(u.temporaryAttack??0)+1});
    }
    this.removeDefeated();this.note(`${form.title} emerges at Level ${form.level}! ${form.passive}`);return true;
  }

  private ownerOfUnit(unit:Unit){return this.state.player.units.some(item=>item.uid===unit.uid)?this.state.player:this.state.enemy.units.some(item=>item.uid===unit.uid)?this.state.enemy:undefined}
  sameZone(attacker:Unit,target:Unit){
    const attackerOwner=this.ownerOfUnit(attacker),targetOwner=this.ownerOfUnit(target);
    return Boolean(attackerOwner&&targetOwner&&this.physicalTile(attackerOwner,attacker.position)===this.physicalTile(targetOwner,target.position));
  }
  private canAttackTarget(attacker:Unit,target:Unit){
    if(this.sameZone(attacker,target))return true;
    const owner=this.ownerOfUnit(attacker),defender=this.ownerOfUnit(target);return Boolean(attacker.ranged&&owner&&defender&&this.areAdjacent(this.physicalTile(owner,attacker.position),this.physicalTile(defender,target.position)));
  }
  selectUnit(uid:string){if(!this.isPlayerTurn())return;this.state.selectedUnit=this.state.selectedUnit===uid?null:uid;this.emit()}
  selectTarget(uid:string){if(!this.isPlayerTurn())return;this.state.selectedTarget=this.state.selectedTarget===uid?null:uid;this.emit()}
  selectTile(position:number){if(!this.isPlayerTurn()||!this.tileById(position))return;this.state.selectedTile=position;this.emit()}

  private refreshContinuousEffects(){
    for(const p of [this.state.player,this.state.enemy]){
      for(const u of p.units){
        let attack=0,health=0;
        if(this.zone(p,'desert',u.position)&&(this.hasTrait(u,'Beast')||this.hasTrait(u,'Earth')))health+=5;
        if(this.zone(p,'ocean',u.position)&&this.hasTrait(u,'Water'))health+=1;
        if(this.zone(p,'volcano',u.position)&&this.hasTrait(u,'Fire'))attack+=1;
        if(this.zone(p,'cemetery',u.position)&&this.hasTrait(u,'Undead')){attack+=3;health+=3}
        if(u.cardId==='abyssal-crab'&&(this.isWaterTile(this.physicalTile(p,u.position))||this.zone(p,'ocean',u.position)))attack+=3;
        if(u.equipment.includes('Molten Core Amulet')&&u.health*2<u.maxHealth)attack+=2;
        if(u.cardId==='forever-dead-king'&&u.position===0){attack+=2;health+=2}
        if(u.cardId==='forsaken-prince'&&p.units.some(other=>other.cardId==='forever-dead-king'&&other.position===u.position)){attack+=3;health+=3}
        if(this.hasTrait(u,'Skeleton')){
          const parlors=p.units.filter(other=>other.cardId==='skeleton-bone-parlor'&&other.position===u.position).length;
          if(u.cardId==='skeleton-bone-parlor'){
            const others=p.units.filter(other=>other.uid!==u.uid&&this.hasTrait(other,'Skeleton')&&other.position===u.position).length;
            attack+=others*2;health+=others;
          }else{attack+=parlors*2;health+=parlors}
        }
        const oldAttack=u.dynamicAttackBuff??0,oldHealth=u.dynamicHealthBuff??0;
        u.attack+=attack-oldAttack;u.maxHealth+=health-oldHealth;
        if(health>oldHealth)u.health+=health-oldHealth;else u.health=Math.min(u.health,u.maxHealth);
        u.dynamicAttackBuff=attack;u.dynamicHealthBuff=health;
      }
    }
  }

  private movementRange(p:Player,enemy:Player,u:Unit){
    const ownBonus=(this.zone(p,'field',u.position)?1:0)+(u.speedBonus??0)+(u.cardId==='shock-trooper'&&this.isThunderTile(this.physicalTile(p,u.position))?1:0);
    const fogPenalty=this.zone(enemy,'fog',this.logicalPosition(enemy,this.physicalTile(p,u.position)))?1:0;
    return Math.max(1,1+ownBonus-fogPenalty);
  }

  private neighbors(tileId:number){return this.state.tiles.filter(tile=>tile.id!==tileId&&this.areAdjacent(tileId,tile.id)).map(tile=>tile.id)}
  private pathBetween(start:number,target:number){
    const queue:[[number,number[]]]|Array<[number,number[]]>=[[start,[start]]],seen=new Set([start]);
    while(queue.length){const [id,path]=queue.shift()!;if(id===target)return path;for(const next of this.neighbors(id)){if(!seen.has(next)){seen.add(next);queue.push([next,[...path,next]])}}}
    return [] as number[];
  }
  private pushTowardHome(owner:Player,u:Unit,spaces:number){const current=this.physicalTile(owner,u.position),path=this.pathBetween(current,owner.homeTileId);if(path.length>1){const destination=path[Math.min(spaces,path.length-1)];u.position=this.logicalPosition(owner,destination)}}

  private advanceUnit(p:Player,enemy:Player,u:Unit){
    if(u.exhausted){this.note(`${u.name} is exhausted.`);return false}
    const current=this.physicalTile(p,u.position);
    const canSlip=this.hasTrait(u,'Sneak')||this.hasTrait(u,'Dive')&&this.isWaterTile(current);
    if(!canSlip&&enemy.units.some(target=>this.physicalTile(enemy,target.position)===current)){this.note(`${u.name} cannot leave this contested tile while enemy Units remain. Sneak and Dive can bypass their matching restrictions.`);return false}
    const targetTile=p===this.state.player&&this.state.selectedTile!==null?this.state.selectedTile:(2-p.homeTileId);
    if(u.equipment.includes('Sailor’s Compass')&&!u.compassUsed&&this.isWaterTile(targetTile)&&this.gateSlotsOpen(p,this.logicalPosition(p,targetTile))>0){
      u.compassUsed=true;const moved=this.moveUnitToTile(p,enemy,u,targetTile);if(moved)this.note(`${u.name} uses Sailor’s Compass to move directly to ${this.tileLabel(targetTile,p)}.`);return moved;
    }
    const path=this.pathBetween(current,targetTile);
    if(path.length<2){this.note(`Select a connected destination hex for ${u.name}.`);return false}
    let steps=Math.min(this.movementRange(p,enemy,u),path.length-1);
    if(!canSlip)for(let step=1;step<=steps;step++){const tile=path[step];if(enemy.units.some(target=>this.physicalTile(enemy,target.position)===tile)){steps=step;break}}
    const destination=path[steps],logical=this.logicalPosition(p,destination);
    if(this.gateSlotsOpen(p,logical)<=0){this.note(`${this.tileLabel(destination,p)} already contains three friendly Units.`);return false}
    this.moveUnitToTile(p,enemy,u,destination);if(destination===1)this.gainGlory(p,1);
    this.note(`${u.name} moved ${steps} hex${steps===1?'':'es'} from ${this.tileLabel(current,p)} to ${this.tileLabel(destination,p)}.`);return true;
  }

  advance(){
    const u=this.state.player.units.find(x=>x.uid===this.state.selectedUnit);
    if(!u||this.state.phase!=='battle')return;
    this.advanceUnit(this.state.player,this.state.enemy,u);
    this.removeDefeated();this.emit();
  }

  private damageUnit(owner:Player,u:Unit,amount:number,type:'combat'|'lightning'|'magic'|'water'|'fire'='combat'){
    if(type==='water'&&u.waterImmune)return 0;
    if(type==='fire'&&u.fireImmune)return 0;
    if(type==='combat')amount=Math.max(0,amount-(u.physicalReduction??0));
    if(type==='lightning'&&owner.units.some(unit=>unit.cardId==='stormhide-bruiser'))amount=Math.max(0,amount-1);
    if(this.zone(owner,'frost')&&(this.hasTrait(u,'Water')||this.hasTrait(u,'Ice')))amount=Math.max(0,amount-1);
    amount=Math.max(0,amount-(u.damageReduction??0)-(u.coralShield??0));
    if((owner.pulseBarriers[this.physicalTile(owner,u.position)]??0)>0)amount=Math.max(0,amount-1);
    const pressure=this.opponentOf(owner);
    if(type==='combat'&&pressure.heatwaveTurns>0){const tile=this.physicalTile(owner,u.position),zone=this.zoneCardAt(tile);if(this.isFireTile(tile)||zone?.zone==='desert')amount++}
    if(amount<=0)return 0;
    if(u.preventFirstDamage&&u.shieldReady){u.shieldReady=false;this.note(`${u.name}'s Wind Step prevents the damage.`);if(u.cardId==='cloudrunner-lynx')this.draw(owner);return 0}
    u.health-=amount;return amount;
  }

  private healForKill(p:Player,u:Unit){
    const innate=u.cardId==='cemetery-reaper'?5:u.cardId==='forever-dead-king'?2:0;
    const total=innate+(u.healOnKill??0);if(total)this.heal(p,total);
  }

  private resolveCombat(attackerOwner:Player,defenderOwner:Player,u:Unit,target?:Unit){
    if(target){
      const localTargets=defenderOwner.units.filter(unit=>this.sameZone(u,unit));
      if(u.attackAllTwice&&localTargets.length){
        let total=0,kills=0;
        for(let pass=0;pass<2;pass++)for(const victim of [...localTargets])if(victim.health>0){const alive=victim.health>0,dealt=this.damageUnit(defenderOwner,victim,u.attack);total+=dealt;attackerOwner.damageThisTurn+=dealt;if(victim.recoilDamage&&u.health>0)this.damageUnit(attackerOwner,u,victim.recoilDamage,victim.recoilType??'lightning');if(alive&&victim.health<=0){kills++;this.gainGlory(attackerOwner,2);this.healForKill(attackerOwner,u)}}
        u.attacksThisTurn=(u.attacksThisTurn??0)+1;u.exhausted=true;this.note(`${u.name} used Sky-Howler Spear to strike ${localTargets.length} enemy unit${localTargets.length===1?'':'s'} twice for ${total} total damage and ${kills} defeat${kills===1?'':'s'}.`);this.removeDefeated();return true;
      }
      if(target.cardId==='stormhide-bruiser'){target.maxHealth+=2;target.health+=2;target.temporaryHealth=(target.temporaryHealth??0)+2}
      const firstAttack=(u.attacksThisTurn??0)===0;
      const plainsBonus=this.zone(attackerOwner,'lightning')&&this.hasTrait(u,'Lightning')&&firstAttack?1:0;
      const targetWasAlive=target.health>0,targetWasStunned=(target.stunnedTurns??0)>0||Boolean(target.stunnedThisTurn);
      const dealt=this.damageUnit(defenderOwner,target,u.attack+plainsBonus);
      attackerOwner.damageThisTurn+=dealt;
      if(dealt>0&&u.bonusLightningOnCombat)this.dealLightning(attackerOwner,defenderOwner,u.bonusLightningOnCombat,target);
      if(u.cardId==='thunder-ox'&&dealt>0)target.stunnedTurns=Math.max(target.stunnedTurns??0,1);
      if(target.recoilDamage&&u.health>0){const recoil=this.damageUnit(attackerOwner,u,target.recoilDamage,target.recoilType??'lightning');this.note(`${target.name}'s ${target.recoilType==='fire'?'Flame Shield':'Electric Recoil'} deals ${recoil} ${target.recoilType==='fire'?'Fire':'Lightning'} damage to ${u.name}.`)}
      if(u.chainDamage){const second=defenderOwner.units.find(unit=>unit.uid!==target.uid&&this.sameZone(u,unit));if(second){const chained=this.damageUnit(defenderOwner,second,u.chainDamage,'lightning');attackerOwner.damageThisTurn+=chained;this.note(`${u.name}'s Skybreaker Spear chains ${chained} damage to ${second.name}.`)}}
      const killed=targetWasAlive&&target.health<=0;
      if(killed){this.gainGlory(attackerOwner,2);this.healForKill(attackerOwner,u)}
      u.attacksThisTurn=(u.attacksThisTurn??0)+1;
      const baseLimit=u.cardId==='stormrunner-scout'?3:1;
      const specialLimit=Math.max(baseLimit,u.cardId==='forsaken-prince'?2:1,u.cardId==='riptide-hunter'&&(this.isWaterTile(this.physicalTile(attackerOwner,u.position))||this.zone(attackerOwner,'ocean',u.position))?2:1,u.cardId==='pulse-panther'&&targetWasStunned?2:1,1+(u.extraAttackEachTurn??0));
      u.exhausted=!(u.health>0&&((u.attacksThisTurn??0)<specialLimit||killed&&u.extraAttackOnKill));
      this.note(`${u.name} attacked ${target.name} for ${dealt} damage${plainsBonus?' (including +1 from Lightning Plains)':''}. ${target.name} did not counterattack.${killed?` ${target.name} was defeated.`:''}`);
    }else if(this.physicalTile(attackerOwner,u.position)===2-attackerOwner.homeTileId&&u.cardId!=='forsaken-prince'){
      const shadowBonus=this.zone(attackerOwner,'shadow')&&this.hasTrait(u,'Dark')?1:0;
      const damage=Math.max(0,u.attack+shadowBonus-defenderOwner.leaderDefense);
      defenderOwner.health-=damage;attackerOwner.damageThisTurn+=damage;this.gainGlory(attackerOwner,1);u.attacksThisTurn=(u.attacksThisTurn??0)+1;u.exhausted=true;
      this.note(`${u.name} strikes ${currentForm(defenderOwner.element,defenderOwner.evolutionStage).title} for ${damage}!`);
    }else return false;
    this.removeDefeated();return true;
  }

  attack(){
    const {player,enemy}=this.state;
    const u=player.units.find(x=>x.uid===this.state.selectedUnit);
    if(!u||this.state.phase!=='battle'){this.note('Select one of your ready Units first.');return this.emit()}
    if(u.exhausted){this.note(`${u.name} is exhausted.`);return this.emit()}
    const selected=enemy.units.find(x=>x.uid===this.state.selectedTarget);
    if(selected&&!this.canAttackTarget(u,selected)){this.note(`${selected.name} is outside this unit’s attack range. Normal attacks require the same hex; Range reaches one adjacent hex.`);return this.emit()}
    const guards=enemy.units.filter(target=>(target.cardId==='queens-guardsman'||target.cardId==='coral-defender')&&this.sameZone(u,target)&&(!selected||this.sameZone(selected,target)));
    if(guards.length&&selected&&!guards.includes(selected))this.note(`${guards[0].name} activates Block and becomes the attack target.`);
    const target=guards[0]??selected??enemy.units.find(x=>this.sameZone(u,x));
    if(!this.resolveCombat(player,enemy,u,target)){
      this.note(u.cardId==='forsaken-prince'?'The Forsaken Prince can only attack enemy Units.':'No target in this Zone. Reach the enemy Gate before striking the Leader.');return this.emit();
    }
    this.state.selectedUnit=null;this.state.selectedTarget=null;this.state.attackMode=null;this.emit();
  }

  beginAttack(){
    if(this.state.phase!=='battle'||!this.state.selectedUnit)return;
    this.state.attackMode='unit';this.state.selectedTarget=null;this.note('Attack targeting opened. Choose an enemy in the same tile, or choose the enemy Leader from the Gate.');this.emit();
  }
  cancelAttack(){this.state.attackMode=null;this.state.selectedTarget=null;this.note('Attack targeting canceled. You may continue making Battle Phase selections.');this.emit()}

  leaderAttack(){
    const {player,enemy}=this.state;if(this.state.phase!=='battle'||player.leaderAttackUsed)return;
    const target=enemy.units.find(u=>u.uid===this.state.selectedTarget);
    if(target){const dealt=this.damageUnit(enemy,target,player.leaderAttack);player.damageThisTurn+=dealt;this.note(`${currentForm(player.element,player.evolutionStage).title} attacked ${target.name} for ${dealt} damage. No counterattack occurred.`)}
    else{const damage=Math.max(0,player.leaderAttack-enemy.leaderDefense);enemy.health-=damage;player.damageThisTurn+=damage;this.note(`${currentForm(player.element,player.evolutionStage).title} attacked ${currentForm(enemy.element,enemy.evolutionStage).title} for ${damage} damage.`)}
    player.leaderAttackUsed=true;this.state.attackMode=null;this.state.selectedTarget=null;this.removeDefeated();this.emit();
  }

  private spendAbility(p:Player,name:string,cost:number){
    const paid=p.leaderEquipment.includes('Cinder Mask')?Math.max(0,cost-1):cost;
    if(p.abilityPoints<paid||p.leaderAbilitiesUsed.includes(name))return false;
    p.abilityPoints-=paid;p.leaderAbilitiesUsed.push(name);p.leaderAbilityUsed=true;
    this.note(`${currentForm(p.element,p.evolutionStage).title} spent ${paid} Ability Point${paid===1?'':'s'} on ${name}${paid!==cost?' after Cinder Mask reduced the cost':''} (${p.abilityPoints}/${p.maxAbilityPoints} AP remains).`);return true;
  }

  private useLeaderAbility(p:Player,enemy:Player,choice:string='damage',target?:Unit,friendly?:Unit){
    const form=currentForm(p.element,p.evolutionStage);
    if(this.state.phase!=='battle'&&p===this.state.player)return false;
    if(p.element==='undead'){
      const slots=this.gateSlotsOpen(p);if(slots<=0)return false;
      const cost=p.evolutionStage>=2?2:1;if(!this.spendAbility(p,form.ability,cost))return false;
      const count=Math.min(p.evolutionStage>=2?2:1,slots),ready=p.evolutionStage===1||p.evolutionStage>=3;
      for(let i=0;i<count;i++){
        const token:Unit={uid:`skeleton-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}`,cardId:'skeleton-token',name:'Skeleton Token',attack:1,health:2,maxHealth:2,position:0,exhausted:!ready,element:'undead',traits:['Undead','Skeleton','Dark'],equipment:[],summonedTurn:this.state.turn,attacksThisTurn:0};
        if(this.zone(p,'field')){token.maxHealth++;token.health++;token.temporaryHealth=1}
        if(this.zone(p,'fog')){token.preventFirstDamage=true;token.shieldReady=true;token.fogWindStep=true}
        p.units.push(token);
      }
    }else if(p.element==='flame'){
      if(choice==='awakening'&&p.evolutionStage>=1){if(!this.spendAbility(p,'Solar Awakening',1))return false;p.essence+=3;this.note('Solar Awakening granted 3 Essence for this turn.');return true}
      if(choice==='domain'&&p.evolutionStage>=2){if(!this.spendAbility(p,'Solar Domain',4))return false;const tile=this.state.selectedTile??p.homeTileId;p.flameDomainTile=tile;this.note(`Flame Domain was added to ${this.tileLabel(tile,p)}.`);return true}
      const ultimate=choice==='supernova'&&p.evolutionStage>=3,name=ultimate?'Supernova Judgment':'Solar Slash',cost=ultimate?7:2,damage=ultimate?15:5;
      if(!this.spendAbility(p,name,cost))return false;
      if(target){const dealt=this.damageUnit(enemy,target,damage,'magic');p.damageThisTurn+=dealt;this.note(`${name} hit ${target.name} for ${dealt} damage.`)}else{enemy.health-=damage;p.damageThisTurn+=damage;this.note(`${name} hit the enemy Leader for ${damage} damage.`)}
    }else if(p.element==='tide'){
      if(choice==='heal'){if(!friendly||!this.spendAbility(p,'Healing Waters',2))return false;this.healUnit(p,friendly,3);this.note(`Healing Waters restored 3 Health to ${friendly.name}.`)}
      else if(choice==='whirlpool'&&p.evolutionStage>=1){if(!target||!this.spendAbility(p,p.evolutionStage>=3?'Crushing Waves':'Whirlpool',2))return false;const dealt=this.damageUnit(enemy,target,1,'magic');this.pushTowardHome(enemy,target,1);p.damageThisTurn+=dealt;this.note(`Whirlpool dealt ${dealt} damage to ${target.name} and pushed it back one tile.`)}
      else if(choice==='high-tide'&&p.evolutionStage>=2){if(!this.spendAbility(p,'High Tide',3))return false;p.units.forEach(u=>this.healUnit(p,u,5));this.note(`High Tide restored 5 Health to ${p.units.length} friendly unit${p.units.length===1?'':'s'}.`)}
      else if(choice==='world-tide'&&p.evolutionStage>=3){if(!this.spendAbility(p,'World Tide Collapse',5))return false;const tile=this.state.selectedTile??1,targets=enemy.units.filter(u=>this.physicalTile(enemy,u.position)===tile);targets.forEach(u=>{p.damageThisTurn+=this.damageUnit(enemy,u,3,'magic')});this.note(`World Tide Collapse dealt 3 damage to ${targets.length} enemy unit${targets.length===1?'':'s'} on ${this.tileLabel(tile,p)}.`)}
      else return false;
    }else{
      if(p.evolutionStage>=3&&choice==='heal'&&!friendly)return false;
      const cost=Math.max(1,p.evolutionStage+1);if(!this.spendAbility(p,form.ability,cost))return false;
      if(p.evolutionStage>=3&&choice==='heal'){this.healUnit(p,friendly!,3)}
      else if(p.evolutionStage>=3&&choice==='push')enemy.units.forEach(u=>this.pushTowardHome(enemy,u,1));
      else{this.dealLightning(p,enemy,form.abilityDamage,target);if(p.evolutionStage===1&&target)this.pushTowardHome(enemy,target,1)}
    }
    this.refreshContinuousEffects();return true;
  }

  leaderAbility(choice:string='damage'){
    const p=this.state.player;if(!this.isPlayerTurn())return;
    const target=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget),friendly=p.units.find(u=>u.uid===this.state.selectedUnit);
    if(!this.useLeaderAbility(p,this.state.enemy,choice,target,friendly)){this.note('That ability is unavailable, already used this turn, lacks a valid target, or needs more Ability Points.');return this.emit()}
    this.removeDefeated();this.emit();
  }

  unitAbility(uid:string){
    const p=this.state.player,u=p.units.find(unit=>unit.uid===uid);
    if(!this.isPlayerTurn()||this.state.phase!=='battle'||!u)return;
    if(u.unitAbilityUsed){this.note('That Unit ability was already used this turn.');return this.emit()}
    if(u.cardId==='grave-banshee'){
      this.state.enemy.units.forEach(enemy=>{const amount=Math.min(2,Math.max(0,enemy.attack));enemy.attack-=amount;enemy.temporaryEnemyAttackPenalty=(enemy.temporaryEnemyAttackPenalty??0)+amount});
      u.unitAbilityUsed=true;this.note('Grave Banshee drains 2 Attack from every enemy Unit until end of turn.');return this.emit();
    }
    if(u.cardId==='phoenix-hatchling'){
      const tile=this.physicalTile(p,u.position),phoenix=this.takeCard(p,'phoenix');
      if(!phoenix){this.note('No Phoenix is available in your deck, hand, or graveyard.');return this.emit()}
      u.unitAbilityUsed=true;u.health=0;this.note('Phoenix Hatchling is tributed to call Phoenix.');this.removeDefeated();
      if(!this.summon(p,phoenix,true,tile))p.graveyard.push(phoenix);return this.emit();
    }
    this.note('That Unit has no activated ability.');this.emit();
  }

  dischargeCore(){
    const p=this.state.player;if(!this.isPlayerTurn()||!p.coreEquipped||p.stormCharges<3)return;
    p.stormCharges-=3;const target=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget);this.dealLightning(p,this.state.enemy,4,target);this.note('Thunderheart Core discharges for 4 Lightning damage!');this.removeDefeated();this.emit();
  }
  absorbMagic(){
    const p=this.state.player;if(!this.isPlayerTurn()||p.element!=='storm'||p.evolutionStage<3||p.absorbUsed)return;
    const magic=[...p.hand].filter(c=>c.kind==='magic').sort((a,b)=>a.cost-b.cost)[0];
    if(!magic){this.note('No Magic card is available to absorb.');return this.emit()}
    p.hand=p.hand.filter(c=>c.uid!==magic.uid);p.graveyard.push(magic);p.absorbUsed=true;
    const target=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget);this.dealLightning(p,this.state.enemy,5,target);this.note(`${currentForm(p.element,p.evolutionStage).title} absorbs ${magic.name} and unleashes Storm Blast!`);this.removeDefeated();this.emit();
  }

  private beginTurn(p:Player,enemy:Player){
    p.leaderAbilityUsed=false;p.leaderAbilitiesUsed=[];p.leaderAttackUsed=false;p.abilityPoints=p.maxAbilityPoints;p.absorbUsed=false;p.evolvedThisTurn=false;p.zoneSpellDiscountUsed=false;
    p.units.forEach(u=>{
      u.unitAbilityUsed=false;u.attacksThisTurn=0;u.frozenThisTurn=false;u.stunnedThisTurn=false;u.compassUsed=false;
      if(u.coralShield)u.coralShield=Math.min(5,u.coralShield+1);
      if(u.cardId==='river-serpent'&&u.attack<10){u.attack++;u.riverGrowth=(u.riverGrowth??0)+1;this.note(`${u.name} grows to ${u.attack} Attack.`)}
      if(u.cardId==='molten-golem'){u.health--;u.attack+=3;this.note(`${u.name} loses 1 Health and gains +3 Attack from Molten Growth.`)}
      if(u.overchargeDamage){const dealt=this.damageUnit(p,u,u.overchargeDamage,'magic');this.note(`${u.name} takes ${dealt} Overcharge damage.`)}
      if(u.fogWindStep){
        u.fogWindStep=false;
        const innate=['skyclaw-raptor','cloudrunner-lynx'].includes(u.cardId)||p.element==='storm'&&p.evolutionStage>=1||u.equipment.includes('Gale Mantle Cloak');
        if(!innate){u.preventFirstDamage=false;u.shieldReady=false}
      }
    });
    if(p.rainfieldTurns>0){p.units.forEach(u=>this.healUnit(p,u,1));p.rainfieldTurns--}
    if(p.units.some(u=>u.raincaller))p.units.forEach(u=>this.healUnit(p,u,1));
    if(this.zone(p,'frost')&&enemy.units.length){
      const candidates=enemy.units.filter(u=>(u.frozenTurns??0)===0);
      const frozen=candidates[Math.floor(Math.random()*candidates.length)];
      if(frozen){frozen.frozenTurns=1;this.note(`${frozen.name} is frozen by Frost Peaks Gate.`)}
    }
    this.removeDefeated();
  }

  private readyUnits(p:Player){
    p.units.forEach(u=>{
      if((u.frozenTurns??0)>0){u.exhausted=true;u.frozenTurns!--;u.frozenThisTurn=true}
      else if((u.stunnedTurns??0)>0){u.exhausted=true;u.stunnedTurns!--;u.stunnedThisTurn=true}
      else u.exhausted=false;
    });
  }

  private grantTurnResources(p:Player){
    p.maxEssence=Math.min(10,p.maxEssence+1);p.essence=p.maxEssence;
    if(this.zone(p,'desert')&&!p.units.some(u=>this.hasTrait(u,'Water'))){p.essence=Math.min(10,p.essence+1);this.note('Desert Gate grants 1 bonus Essence.')}
  }

  private finishTurn(p:Player,enemy:Player){
    if(this.state.turn%3===0)p.units.filter(u=>u.cardId==='thunderhorn-stag'&&u.lastShockwaveTurn!==this.state.turn).forEach(u=>{u.lastShockwaveTurn=this.state.turn;enemy.units.forEach(target=>this.damageUnit(enemy,target,2,'magic'));this.note(`${u.name} releases a 2-damage Shockwave!`)});
    if(p.leaderTempAttack){p.leaderAttack-=p.leaderTempAttack;p.leaderTempAttack=0}
    p.units.forEach(u=>{
      if(u.temporaryAttack){u.attack-=u.temporaryAttack;u.temporaryAttack=0}
      if(u.temporaryHealth){u.maxHealth-=u.temporaryHealth;u.health=Math.min(u.health,u.maxHealth);u.temporaryHealth=0}
      if(u.temporarySpeed){u.speedBonus=Math.max(0,(u.speedBonus??0)-u.temporarySpeed);u.temporarySpeed=0}
      u.frozenThisTurn=false;
    });
    enemy.units.forEach(u=>{if(u.temporaryEnemyAttackPenalty){u.attack+=u.temporaryEnemyAttackPenalty;u.temporaryEnemyAttackPenalty=0}});
    if(p.wildfireTurns>0){const burning=enemy.units.filter(unit=>this.isFireTile(this.physicalTile(enemy,unit.position)));burning.forEach(unit=>this.damageUnit(enemy,unit,2,'fire'));if(burning.length)this.note(`Wildfire deals 2 Fire damage to ${burning.length} enemy unit${burning.length===1?'':'s'}.`);p.wildfireTurns--}
    if(p.heatwaveTurns>0)p.heatwaveTurns--;
    for(const [tile,value] of Object.entries(p.pulseBarriers)){const next=value-1;if(next<=0)delete p.pulseBarriers[Number(tile)];else p.pulseBarriers[Number(tile)]=next}
    const krakens=[...p.units,...enemy.units].filter(unit=>unit.cardId==='kraken');
    for(const kraken of krakens){const owner=this.ownerOfUnit(kraken);if(!owner)continue;const tile=this.physicalTile(owner,kraken.position);for(const shipOwner of [p,enemy])shipOwner.units.filter(unit=>unit.uid!==kraken.uid&&this.hasTrait(unit,'Ship')&&this.physicalTile(shipOwner,unit.position)===tile).forEach(unit=>{unit.health=0;this.note(`Kraken Maelstrom destroys ${unit.name} on ${this.tileLabel(tile,owner)}.`)})}
    if(p.endlessGraveTurns>0)p.endlessGraveTurns--;
    p.damageLastTurn=p.damageThisTurn;p.damageThisTurn=0;this.refreshContinuousEffects();this.removeDefeated();
  }

  private autoCardPlan(p:Player,enemy:Player,c:Card){
    if(c.id==='death-mist'&&enemy.units.length===0)return null;
    if(c.id==='endless-grave'&&p.units.length===0)return null;
    if(c.id==='sky-crash'&&!enemy.units.some(unit=>this.hasTrait(unit,'Flying')||this.hasTrait(unit,'Aerial')))return null;

    if(c.id==='kraken'||c.id==='krakens-call'){
      const water=this.state.tiles.find(tile=>tile.ownerHomeTileId===p.homeTileId&&this.isWaterTile(tile.id)&&this.gateSlotsOpen(p,this.logicalPosition(p,tile.id))>0);
      if(water)this.state.selectedTile=water.id;
    }
    if(['pulse-barrier','electric-trap','thunderstep'].includes(c.id)){
      const occupied=p.units[0]?this.physicalTile(p,p.units[0].position):p.homeTileId;
      this.state.selectedTile=this.tileById(occupied)?.id??p.homeTileId;
    }
    if(c.id==='sirens-echo'){
      const water=this.state.tiles.find(tile=>tile.ownerHomeTileId===p.homeTileId&&this.isWaterTile(tile.id));
      if(water)this.state.selectedTile=water.id;
    }
    if(c.id==='meteor-drop'){
      const tile=this.state.tiles.find(item=>this.canDestroyAddedTile(item.id));
      if(tile)this.state.selectedTile=tile.id;
    }

    const harvestTarget=[...p.units].filter(u=>u.health<=2&&this.hasTrait(u,'Undead')).sort((a,b)=>a.health-b.health)[0];
    const leaderEquipment=['thunderheart-core','pearl-amulet','lightning-rod-staff','cinder-mask','sunblade'].includes(c.id);
    const needsFriendly=['gale-step-invocation','healing-downpour','stormforged-talons','gale-mantle-cloak','raincaller-totem','coral-plate','sailors-compass','coral-shield','captains-raincoat','overcharge','overcharge-ring','skybreaker-spear','sky-howler-spear','flame-shield','molten-armor','flarebow','molten-core-amulet','thunderstep'].includes(c.id);
    const friendly=[...p.units].sort((a,b)=>(a.health/a.maxHealth)-(b.health/b.maxHealth)||b.attack-a.attack)[0];
    const target=c.id==='soul-harvest'?harvestTarget:c.id==='flame-shogun'?p.units.find(unit=>unit.cardId==='ember-samurai'):c.kind==='equipment'&&!leaderEquipment||needsFriendly?friendly:undefined;
    const enemyTarget=['boltstrike-surge','stormheart-cataclysm','aqua-burst','cold-snap','lightning-bolt','chain-spark','volt-surge'].includes(c.id)?[...enemy.units].sort((a,b)=>a.health-b.health)[0]:undefined;
    const choices=this.autoChoices(p,enemy,c);
    if(!this.canResolveTargeted(p,enemy,c,target,choices,enemyTarget))return null;
    return {target,enemyTarget,choices};
  }

  private autoPlayCard(p:Player,enemy:Player,phase:'deploy'|'battle'){
    const cards=[...p.hand].sort((a,b)=>b.cost-a.cost);
    for(const c of cards){
      if(phase==='battle'&&c.kind!=='magic')continue;
      if(c.kind==='zone'&&this.state.tiles.length>=MAX_FIELD_TILES)continue;
      const cost=this.effectiveCost(p,c);if(cost>p.essence)continue;
      const plan=this.autoCardPlan(p,enemy,c);if(!plan)continue;
      const summonLegal=c.id==='flame-shogun'&&plan.target?.cardId==='ember-samurai'?this.canSummon(p,c,this.physicalTile(p,plan.target.position)):this.canSummon(p,c);
      if(c.kind==='unit'&&!summonLegal)continue;
      const usedVolcano=this.zone(p,'volcano')&&c.kind==='magic'&&this.hasTrait(c,'Fire')&&!p.zoneSpellDiscountUsed;
      p.essence-=cost;p.hand=p.hand.filter(card=>card.uid!==c.uid);if(usedVolcano)p.zoneSpellDiscountUsed=true;
      this.resolveCard(p,enemy,c,plan.target,plan.enemyTarget,plan.choices);
      if(c.kind==='magic')this.onMagicCast(p,enemy,c,plan.enemyTarget);
      this.state.selectedUnit=null;this.state.selectedTarget=null;
      this.note(`${currentForm(p.element,p.evolutionStage).title} plays ${c.name} for ${cost} Essence (${p.essence} remains).`);
      this.removeDefeated();this.refreshContinuousEffects();this.emit();return true;
    }
    return false;
  }

  private autoUseUnitAbility(p:Player,enemy:Player){
    const banshee=p.units.find(unit=>unit.cardId==='grave-banshee'&&!unit.unitAbilityUsed);
    if(banshee&&enemy.units.length){
      enemy.units.forEach(target=>{const amount=Math.min(2,Math.max(0,target.attack));target.attack-=amount;target.temporaryEnemyAttackPenalty=(target.temporaryEnemyAttackPenalty??0)+amount});
      banshee.unitAbilityUsed=true;this.note(`${banshee.name} activates Drain Attack; all opposing Units lose 2 Attack this turn.`);this.emit();return true;
    }
    const hatchling=p.units.find(unit=>unit.cardId==='phoenix-hatchling'&&!unit.unitAbilityUsed);
    if(hatchling){
      const phoenix=this.takeCard(p,'phoenix');
      if(phoenix){const tile=this.physicalTile(p,hatchling.position);hatchling.unitAbilityUsed=true;hatchling.health=0;this.note('Phoenix Hatchling is tributed to call Phoenix.');this.removeDefeated();if(!this.summon(p,phoenix,true,tile))p.graveyard.push(phoenix);this.emit();return true}
    }
    return false;
  }

  private autoUseLeaderAbility(p:Player,enemy:Player){
    const target=[...enemy.units].sort((a,b)=>a.health-b.health)[0];
    const friendly=[...p.units].filter(unit=>unit.health<unit.maxHealth).sort((a,b)=>(a.health/a.maxHealth)-(b.health/b.maxHealth))[0];
    const attempt=(choice:string,targetUnit:Unit|undefined=target,friendlyUnit:Unit|undefined=friendly)=>{
      if(!this.useLeaderAbility(p,enemy,choice,targetUnit,friendlyUnit))return false;
      this.removeDefeated();this.emit();return true;
    };
    if(p.element==='flame'){
      if(p.evolutionStage>=3&&attempt('supernova'))return true;
      if(attempt('damage'))return true;
      if(p.evolutionStage>=1&&attempt('awakening',undefined,undefined))return true;
      if(p.evolutionStage>=2&&attempt('domain',undefined,undefined))return true;
      return false;
    }
    if(p.element==='tide'){
      if(p.evolutionStage>=3&&enemy.units.length){const tile=this.physicalTile(enemy,target.position);this.state.selectedTile=tile;if(attempt('world-tide',target))return true}
      if(p.evolutionStage>=2&&friendly&&attempt('high-tide',undefined,friendly))return true;
      if(p.evolutionStage>=1&&target&&attempt('whirlpool',target))return true;
      if(friendly&&attempt('heal',undefined,friendly))return true;
      return false;
    }
    if(p.element==='undead')return attempt('damage',undefined,undefined);
    if(p.evolutionStage>=3&&attempt('damage'))return true;
    return attempt('damage');
  }

  private autoUseStormEffects(p:Player,enemy:Player){
    const target=[...enemy.units].sort((a,b)=>a.health-b.health)[0];
    if(p.coreEquipped&&p.stormCharges>=3){p.stormCharges-=3;this.dealLightning(p,enemy,4,target);this.note(`${currentForm(p.element,p.evolutionStage).title} discharges Thunderheart Core for 4 Lightning damage.`);this.removeDefeated();this.emit();return true}
    if(p.element==='storm'&&p.evolutionStage>=3&&!p.absorbUsed){
      const magic=[...p.hand].filter(card=>card.kind==='magic').sort((a,b)=>a.cost-b.cost)[0];
      if(magic){p.hand=p.hand.filter(card=>card.uid!==magic.uid);p.graveyard.push(magic);p.absorbUsed=true;this.dealLightning(p,enemy,5,target);this.note(`${currentForm(p.element,p.evolutionStage).title} devours ${magic.name} for a 5-damage Storm Blast.`);this.removeDefeated();this.emit();return true}
    }
    return false;
  }

  private autoUseUnit(p:Player,enemy:Player){
    for(const unit of p.units.filter(item=>!item.exhausted&&item.health>0)){
      const guard=enemy.units.find(target=>(target.cardId==='queens-guardsman'||target.cardId==='coral-defender')&&this.sameZone(unit,target));
      const target=guard??enemy.units.find(item=>this.sameZone(unit,item));
      if(target){this.resolveCombat(p,enemy,unit,target);this.state.selectedUnit=null;this.state.selectedTarget=null;this.emit();return true}
      if(this.physicalTile(p,unit.position)===2-p.homeTileId&&unit.cardId!=='forsaken-prince'){this.resolveCombat(p,enemy,unit);this.emit();return true}
      this.state.selectedTile=2-p.homeTileId;
      if(this.advanceUnit(p,enemy,unit)){this.removeDefeated();this.emit();return true}
      unit.exhausted=true;this.note(`${unit.name} holds position after finding no legal path.`);this.emit();return true;
    }
    return false;
  }

  private autoLeaderAttack(p:Player,enemy:Player){
    if(p.leaderAttackUsed)return false;
    const damage=Math.max(0,p.leaderAttack-enemy.leaderDefense);enemy.health-=damage;p.damageThisTurn+=damage;p.leaderAttackUsed=true;
    this.note(`${currentForm(p.element,p.evolutionStage).title} attacks ${currentForm(enemy.element,enemy.evolutionStage).title} for ${damage} damage.`);this.emit();return true;
  }

  cpuPhaseLabel(){return this.state.phase==='enemy'?this.autoEnemyPhase:this.state.phase}

  autoPlayStep(){
    if(this.state.winner)return;
    if(this.state.phase==='enemy'&&!this.autoEnemyStarted){
      const p=this.state.enemy,enemy=this.state.player;this.autoEnemyStarted=true;this.autoEnemyPhase='deploy';this.resetShields();this.beginTurn(p,enemy);this.grantTurnResources(p);this.draw(p);this.readyUnits(p);
      this.state.selectedUnit=null;this.state.selectedTarget=null;this.state.selectedTile=p.homeTileId;this.note(`${currentForm(p.element,p.evolutionStage).title} begins its Deploy Phase with ${p.essence} Essence.`);this.emit();return;
    }
    const enemyTurn=this.state.phase==='enemy',p=enemyTurn?this.state.enemy:this.state.player,enemy=enemyTurn?this.state.player:this.state.enemy,phase=enemyTurn?this.autoEnemyPhase:this.state.phase;
    if(this.canEvolve(p)&&!p.evolvedThisTurn){this.applyEvolution(p);this.emit();return}
    if(phase==='deploy'){
      if(this.autoPlayCard(p,enemy,'deploy'))return;
      if(enemyTurn){this.autoEnemyPhase='battle';this.note(`${currentForm(p.element,p.evolutionStage).title} enters the Battle Phase.`);this.emit()}
      else this.nextPhase();
      return;
    }
    if(this.autoPlayCard(p,enemy,'battle'))return;
    if(this.autoUseStormEffects(p,enemy))return;
    if(this.autoUseUnitAbility(p,enemy))return;
    if(this.autoUseLeaderAbility(p,enemy))return;
    if(this.autoUseUnit(p,enemy))return;
    if(this.autoLeaderAttack(p,enemy))return;
    if(!enemyTurn){this.endTurn();return}
    this.finishTurn(p,enemy);this.state.turn++;this.resetShields();this.beginTurn(enemy,p);this.grantTurnResources(enemy);this.draw(enemy);this.readyUnits(enemy);
    this.autoEnemyStarted=false;this.autoEnemyPhase='deploy';this.state.phase='deploy';this.state.selectedUnit=null;this.state.selectedTarget=null;this.state.selectedTile=enemy.homeTileId;this.note(`Turn ${this.state.turn}. ${currentForm(enemy.element,enemy.evolutionStage).title} begins the Deploy Phase with ${enemy.essence} Essence.`);this.emit();
  }

  endTurn(){
    if(this.state.winner||this.state.phase!=='battle')return;
    const p=this.state.player;this.finishTurn(p,this.state.enemy);this.state.phase='enemy';this.state.selectedUnit=null;this.state.selectedTarget=null;
    this.note(`Your turn ends. ${currentForm(this.state.enemy.element,this.state.enemy.evolutionStage).title} begins its turn…`);this.emit();
    if(this.humanVsHuman)return;
    if(this.fastMode)this.enemyTurn();else globalThis.setTimeout(()=>this.enemyTurn(),700);
  }

  beginOnlineTurn(){
    const p=this.state.player,enemy=this.state.enemy;this.state.turn++;this.resetShields();this.beginTurn(p,enemy);this.grantTurnResources(p);this.draw(p);this.readyUnits(p);
    this.state.phase='deploy';this.state.selectedUnit=null;this.state.selectedTarget=null;this.state.selectedTile=p.homeTileId;this.state.pendingZoneUid=null;this.state.selectedPlacement=null;this.note(`Turn ${this.state.turn}. Your online turn begins with ${p.essence} Essence.`);this.emit();
  }

  private enemyTurn(){
    if(this.state.winner)return;
    const e=this.state.enemy,p=this.state.player;this.resetShields();this.beginTurn(e,p);this.grantTurnResources(e);this.draw(e);this.readyUnits(e);
    if(this.canEvolve(e))this.applyEvolution(e);
    const form=currentForm(e.element,e.evolutionStage);
    if(form.abilityDamage>0||e.element==='undead')this.useLeaderAbility(e,p,e.element==='tide'?'heal':'damage',[...p.units].sort((a,b)=>a.health-b.health)[0],[...e.units].sort((a,b)=>a.health-b.health)[0]);

    for(const c of [...e.hand].sort((a,b)=>b.cost-a.cost)){
      const cost=this.effectiveCost(e,c);if(cost>e.essence)continue;
      if(c.id==='kraken'||c.id==='krakens-call'){const water=this.state.tiles.find(tile=>tile.ownerHomeTileId===e.homeTileId&&this.isWaterTile(tile.id)&&this.gateSlotsOpen(e,this.logicalPosition(e,tile.id))>0);if(water)this.state.selectedTile=water.id}
      if(['pulse-barrier','electric-trap','thunderstep','sirens-echo'].includes(c.id)){const tile=this.state.tiles.find(item=>this.gateSlotsOpen(e,this.logicalPosition(e,item.id))>0);if(tile)this.state.selectedTile=tile.id}
      if(c.id==='meteor-drop'){const tile=this.state.tiles.find(item=>this.canDestroyAddedTile(item.id));if(tile)this.state.selectedTile=tile.id}
      if(c.id==='death-mist'&&p.units.length===0)continue;
      if(c.id==='endless-grave'&&e.units.length===0)continue;
      const harvestTarget=[...e.units].filter(u=>u.health<=2&&this.hasTrait(u,'Undead')).sort((a,b)=>a.health-b.health)[0];
      const leaderEquipment=['thunderheart-core','pearl-amulet','lightning-rod-staff','cinder-mask','sunblade'].includes(c.id);
      const needsFriendly=['gale-step-invocation','healing-downpour','stormforged-talons','gale-mantle-cloak','raincaller-totem','sailors-compass','coral-shield','captains-raincoat','overcharge','overcharge-ring','skybreaker-spear','sky-howler-spear','flame-shield','molten-armor','flarebow','molten-core-amulet','thunderstep'].includes(c.id);
      const target=c.id==='soul-harvest'?harvestTarget:c.id==='flame-shogun'?e.units.find(unit=>unit.cardId==='ember-samurai'):c.kind==='equipment'&&!leaderEquipment||needsFriendly?[...e.units].sort((a,b)=>b.attack-a.attack)[0]:undefined;
      const enemyTarget=['boltstrike-surge','stormheart-cataclysm','aqua-burst','cold-snap','lightning-bolt','chain-spark','volt-surge'].includes(c.id)?[...p.units].sort((a,b)=>a.health-b.health)[0]:undefined;
      const choices=this.autoChoices(e,p,c);
      if(!this.canResolveTargeted(e,p,c,target,choices,enemyTarget))continue;
      const usedVolcano=this.zone(e,'volcano')&&c.kind==='magic'&&this.hasTrait(c,'Fire')&&!e.zoneSpellDiscountUsed;
      e.essence-=cost;e.hand=e.hand.filter(x=>x.uid!==c.uid);if(usedVolcano)e.zoneSpellDiscountUsed=true;
      this.resolveCard(e,p,c,target,enemyTarget,choices);if(c.kind==='magic')this.onMagicCast(e,p,c,enemyTarget);this.removeDefeated();this.note(`${form.title} plays ${c.name}.`);
    }
    const banshee=e.units.find(u=>u.cardId==='grave-banshee'&&!u.unitAbilityUsed);if(banshee){p.units.forEach(target=>{const amount=Math.min(2,target.attack);target.attack-=amount;target.temporaryEnemyAttackPenalty=(target.temporaryEnemyAttackPenalty??0)+amount});banshee.unitAbilityUsed=true}
    if(e.element==='storm'&&e.coreEquipped&&e.stormCharges>=3){e.stormCharges-=3;this.dealLightning(e,p,4,[...p.units].sort((a,b)=>a.health-b.health)[0]);this.note('The rival discharges Thunderheart Core!');this.removeDefeated()}
    if(e.element==='storm'&&e.evolutionStage>=3&&!e.absorbUsed){const magic=[...e.hand].filter(c=>c.kind==='magic').sort((a,b)=>a.cost-b.cost)[0];if(magic){e.hand=e.hand.filter(c=>c.uid!==magic.uid);e.graveyard.push(magic);e.absorbUsed=true;this.dealLightning(e,p,5,[...p.units].sort((a,b)=>a.health-b.health)[0]);this.note(`${form.title} devours ${magic.name} for a Storm Blast!`);this.removeDefeated()}}

    for(const u of [...e.units]){
      if(u.exhausted||u.health<=0)continue;
      const guards=p.units.filter(unit=>unit.cardId==='queens-guardsman'&&this.sameZone(u,unit));
      const localTarget=guards[0]??p.units.find(unit=>this.sameZone(u,unit));
      if(localTarget)this.resolveCombat(e,p,u,localTarget);
      else if(this.physicalTile(e,u.position)!==2-e.homeTileId)this.advanceUnit(e,p,u);
      else this.resolveCombat(e,p,u);
      if(u.cardId==='forsaken-prince'&&!u.exhausted&&u.health>0){const second=p.units.find(unit=>this.sameZone(u,unit));if(second)this.resolveCombat(e,p,u,second)}
    }
    this.finishTurn(e,p);this.state.turn++;this.resetShields();this.beginTurn(p,e);this.grantTurnResources(p);this.draw(p);this.readyUnits(p);
    this.state.phase='deploy';this.state.selectedTile=p.homeTileId;this.state.pendingZoneUid=null;this.state.selectedPlacement=null;this.note(`Turn ${this.state.turn}. You begin with ${p.essence} Essence.`);this.emit();
  }

  private gainGlory(p:Player,n:number){
    p.glory=Math.min(15,p.glory+n);const next=nextForm(p.element,p.evolutionStage);
    if(next&&this.canEvolve(p)&&p===this.state.player)this.note(`Evolution ready: ${next.title}! Enter the Evolution Phase.`);
  }

  private removeDefeated(){
    for(let pass=0;pass<12;pass++){
      let found=false;
      for(const p of [this.state.player,this.state.enemy]){
        const enemy=this.opponentOf(p),defeated=p.units.filter(u=>u.health<=0);
        if(!defeated.length)continue;
        found=true;p.units=p.units.filter(u=>u.health>0);
        for(const unit of defeated){
          const defeatedTile=this.physicalTile(p,unit.position);
          if(unit.cardId==='forsaken-prince'){enemy.units.forEach(target=>this.damageUnit(enemy,target,2,'magic'));this.note('The Forsaken Prince erupts in a 2-damage Death Burst.')}
          if(this.zone(p,'shadow'))this.draw(p);
          for(const equipmentName of unit.equipment){const equipment=allCards.find(item=>item.kind==='equipment'&&item.name===equipmentName);if(equipment)p.graveyard.push(instance(equipment))}
          const def=cardById(unit.cardId);if(!def)continue;
          const card=instance(def);
          if(this.zone(p,'cemetery')&&this.hasTrait(unit,'Undead')){p.cemetery.push(card);this.note(`${unit.name} enters the Cemetery Zone.`)}
          else if(p.element==='undead'&&p.endlessGraveTurns>0){p.hand.push(card);this.note(`${unit.name} returns to hand through Endless Grave.`)}
          else p.graveyard.push(card);
          if(unit.cardId==='phoenix'){
            const fieldHatchling=p.units.find(item=>item.cardId==='phoenix-hatchling');
            if(fieldHatchling&&this.gateSlotsOpen(p,this.logicalPosition(p,defeatedTile))>0){fieldHatchling.position=this.logicalPosition(p,defeatedTile);this.note('Phoenix rekindles an existing Phoenix Hatchling on its former tile.')}
            else{const hatchling=this.takeCard(p,'phoenix-hatchling');if(hatchling&&this.summon(p,hatchling,true,defeatedTile))this.note('Phoenix rekindles Phoenix Hatchling from the deck, hand, or graveyard.');else if(hatchling)p.graveyard.push(hatchling)}
          }
        }
      }
      this.refreshContinuousEffects();
      if(!found)break;
    }
  }

  private checkWinner(){if(this.state.enemy.health<=0)this.state.winner='victory';if(this.state.player.health<=0)this.state.winner='defeat'}
  restart(){const fresh=new HeroicsGame(this.fastMode,this.config,this.humanVsHuman);this.state=fresh.state;this.autoEnemyStarted=false;this.autoEnemyPhase='deploy';this.emit()}
}
