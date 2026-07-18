import { CardDef, Element, ZoneId, cardById, makeCustomDeck } from './cards';
import { currentForm, nextForm } from './evolution';

export const ZONE_CAPACITY=3;
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
  leaderDefense:number;
  leaderEquipment:string[];
  deck:Card[];
  hand:Card[];
  units:Unit[];
  graveyard:Card[];
  cemetery:Card[];
  activeZone:Card|null;
  endlessGraveTurns:number;
  magicCastTotal:number;
  damageThisTurn:number;
  damageLastTurn:number;
  stormCharges:number;
  tempestMagicCast:boolean;
  coreEquipped:boolean;
  rainfieldTurns:number;
  leaderAbilityUsed:boolean;
  absorbUsed:boolean;
  evolvedThisTurn:boolean;
  leaderTempAttack:number;
  zoneSpellDiscountUsed:boolean;
}

export type Phase = 'deploy'|'evolution'|'advance'|'battle'|'enemy';
export interface GameState {
  turn:number;
  phase:Phase;
  player:Player;
  enemy:Player;
  selectedUnit:string|null;
  selectedTarget:string|null;
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
  glory:0,evolutionStage:0,leaderAttack:baseLeaderAttack[element],leaderDefense:0,leaderEquipment:[],deck:shuffle(makeCustomDeck(ids,element) as Card[]),
  hand:[],units:[],graveyard:[],cemetery:[],activeZone:null,endlessGraveTurns:0,
  magicCastTotal:0,damageThisTurn:0,damageLastTurn:0,stormCharges:0,tempestMagicCast:false,coreEquipped:false,rainfieldTurns:0,
  leaderAbilityUsed:false,absorbUsed:false,evolvedThisTurn:false,leaderTempAttack:0,zoneSpellDiscountUsed:false,
});

export class HeroicsGame {
  state:GameState;
  private listeners:Listener[]=[];
  private fastMode:boolean;
  private config:MatchConfig;
  private humanVsHuman:boolean;

  constructor(fastMode=false,config:MatchConfig={playerElement:'flame',enemyElement:'tide'},humanVsHuman=false){
    this.fastMode=fastMode;
    this.config=config;
    this.humanVsHuman=humanVsHuman;
    this.state={turn:1,phase:'deploy',player:createPlayer(config.playerElement,false,config.playerDeckIds),enemy:createPlayer(config.enemyElement,true,config.enemyDeckIds),selectedUnit:null,selectedTarget:null,log:['The battlefield awakens. Your Deploy Phase begins.'],winner:null};
    this.draw(this.state.player,5);
    this.draw(this.state.enemy,5);
  }

  subscribe(fn:Listener){this.listeners.push(fn);fn(this.state)}
  private emit(){this.checkWinner();this.listeners.forEach(fn=>fn(this.state))}
  private note(msg:string){this.state.log=[msg,...this.state.log].slice(0,10)}
  private draw(p:Player,n=1){for(let i=0;i<n;i++){const c=p.deck.pop();if(c)p.hand.push(c)}}
  private healingBonus(p:Player){return p.activeZone?.zone==='ocean'?1:0}
  private heal(p:Player,n:number){p.health=Math.min(p.maxHealth,p.health+n+this.healingBonus(p))}
  private healUnit(p:Player,u:Unit,n:number){u.health=Math.min(u.maxHealth,u.health+n+this.healingBonus(p))}
  private resetShields(){[...this.state.player.units,...this.state.enemy.units].forEach(u=>{if(u.preventFirstDamage)u.shieldReady=true})}
  private zone(p:Player,id:ZoneId){return p.activeZone?.zone===id}
  private hasTrait(subject:{traits?:string[]},trait:string){return Boolean(subject.traits?.includes(trait))}
  private opponentOf(p:Player){return p===this.state.player?this.state.enemy:this.state.player}
  unitsInZone(p:Player,position:number){return p.units.filter(u=>u.position===position)}
  gateSlotsOpen(p:Player,position=0){return Math.max(0,ZONE_CAPACITY-this.unitsInZone(p,position).length)}

  private searchDeckToHand(p:Player,id:string){
    const index=p.deck.findIndex(c=>c.id===id);
    if(index<0)return false;
    const [found]=p.deck.splice(index,1);
    p.hand.push(found);
    shuffle(p.deck);
    this.note(`${p===this.state.player?'You search':'The rival searches'} for ${found.name} and add it to hand.`);
    return true;
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
    return cost;
  }

  private makeUnit(c:Card,ready=false):Unit{
    return {uid:c.uid,cardId:c.id,name:c.name,attack:c.attack!,health:c.health!,maxHealth:c.health!,position:0,exhausted:!ready,element:c.element as Element,traits:[...(c.traits??[])],equipment:[],summonedTurn:this.state.turn,attacksThisTurn:0};
  }

  private summon(p:Player,c:Card,ready=false){
    if(c.kind!=='unit'||this.gateSlotsOpen(p)<=0)return false;
    const unit=this.makeUnit(c,ready);
    if(['skyclaw-raptor','cloudrunner-lynx'].includes(c.id)||p.element==='storm'&&p.evolutionStage>=1){unit.preventFirstDamage=true;unit.shieldReady=true}
    if(c.id==='thunderhorn-stag'&&p.element==='storm')unit.attack+=1;
    if(this.zone(p,'field')){unit.maxHealth+=1;unit.health+=1;unit.temporaryHealth=1}
    if(this.zone(p,'fog')){unit.preventFirstDamage=true;unit.shieldReady=true;unit.fogWindStep=true}
    p.units.push(unit);
    this.refreshContinuousEffects();

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
    return {};
  }

  private canResolveTargeted(p:Player,enemy:Player,c:Card,target:Unit|undefined,choices:PlayCardChoices){
    if(c.id==='soul-harvest')return Boolean(target&&this.hasTrait(target,'Undead'));
    if(c.id==='ultimate-sacrifice')return this.validCardChoices(p.hand,choices.cardUids,card=>card.uid!==c.uid&&card.kind==='unit',2).length>0;
    if(c.id==='for-the-queen')return this.gateSlotsOpen(p)>0&&this.validCardChoices(p.deck,choices.cardUids,card=>card.kind==='unit'&&card.id!=='forever-dead-king',2).length>0;
    if(c.id==='raise-the-fallen')return this.gateSlotsOpen(p)>0&&this.validCardChoices(p.graveyard,choices.cardUids,card=>card.kind==='unit',2).length>0;
    if(c.id==='queens-destruction'){
      const friendly=unique(choices.friendlyUnitUids).map(uid=>p.units.find(u=>u.uid===uid)).filter(Boolean);
      const enemies=unique(choices.enemyUnitUids).map(uid=>enemy.units.find(u=>u.uid===uid)).filter(Boolean);
      return friendly.length===1&&enemies.length>0&&enemies.length<=2;
    }
    if(c.kind==='equipment'&&c.element==='undead')return Boolean(target);
    if(c.id==='stormforged-talons')return Boolean(target&&this.hasTrait(target,'Beast'));
    if(['gale-step-invocation','healing-downpour','gale-mantle-cloak','raincaller-totem'].includes(c.id))return Boolean(target);
    return true;
  }

  private deployFrom(p:Player,source:Card[],uids:string[]|undefined,max:number,predicate:(card:Card)=>boolean){
    const chosen=this.validCardChoices(source,uids,predicate,Math.min(max,this.gateSlotsOpen(p)));
    let deployed=0;
    for(const card of chosen){
      const index=source.findIndex(item=>item.uid===card.uid);
      if(index<0||this.gateSlotsOpen(p)<=0)continue;
      source.splice(index,1);
      if(this.summon(p,card))deployed++;
    }
    return deployed;
  }

  private equip(target:Unit,c:Card){target.equipment.push(c.name)}

  private playZone(p:Player,c:Card){
    if(p.activeZone){
      if(p.activeZone.zone==='cemetery'&&p.cemetery.length){p.graveyard.push(...p.cemetery);p.cemetery=[]}
      p.graveyard.push(p.activeZone);
    }
    p.activeZone=c;
    p.zoneSpellDiscountUsed=false;
    this.refreshContinuousEffects();
    this.note(`${c.name} becomes the active Zone. Its three Gates are now empowered.`);
  }

  private resolveCard(p:Player,enemy:Player,c:Card,target?:Unit,enemyTarget?:Unit,rawChoices:PlayCardChoices={}){
    if(c.kind==='unit'){this.summon(p,c);return}
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
      this.dealLightning(p,enemy,2,enemyTarget);
      if(p.evolutionStage>=2)enemy.units.forEach(u=>this.damageUnit(enemy,u,1,'lightning'));
    }else if(c.id==='gale-step-invocation'&&target){
      target.preventFirstDamage=true;target.shieldReady=true;target.speedBonus=(target.speedBonus??0)+1;target.temporarySpeed=(target.temporarySpeed??0)+1;target.exhausted=false;if(p.evolvedThisTurn)this.draw(p);
    }else if(c.id==='healing-downpour'&&target){
      this.healUnit(p,target,3);p.rainfieldTurns=Math.max(p.rainfieldTurns,2);
    }else if(c.id==='stormheart-cataclysm'){
      if(enemyTarget){this.dealLightning(p,enemy,3,enemyTarget);enemyTarget.position=Math.max(0,enemyTarget.position-2)}
      else{this.dealLightning(p,enemy,3);p.rainfieldTurns=Math.max(p.rainfieldTurns,1)}
      if(p.evolutionStage>=3){p.rainfieldTurns=Math.max(p.rainfieldTurns,1);if(enemyTarget)enemyTarget.position=Math.max(0,enemyTarget.position-2)}
      p.tempestMagicCast=true;
    }else if(c.id==='stormforged-talons'&&target){
      target.attack+=1;target.bonusLightningOnCombat=(target.bonusLightningOnCombat??0)+1;this.equip(target,c);
    }else if(c.id==='gale-mantle-cloak'&&target){
      target.preventFirstDamage=true;target.shieldReady=true;target.speedBonus=(target.speedBonus??0)+1;target.exhausted=false;this.equip(target,c);
    }else if(c.id==='thunderheart-core'){
      p.coreEquipped=true;p.leaderEquipment.push(c.name);
    }else if(c.id==='raincaller-totem'&&target){
      target.raincaller=true;this.equip(target,c);
    }else if(c.id==='sunblade'){
      p.leaderAttack+=2;p.leaderEquipment.push(c.name);
    }else if(c.effect==='damage'){
      enemy.health-=3;this.gainGlory(p,1);
    }else if(c.effect==='heal')this.heal(p,c.name==='Mending Tide'?5:4);
    else if(c.effect==='draw')this.draw(p,2);
    else if(c.effect==='buff'){
      const u=[...p.units].sort((a,b)=>b.position-a.position)[0];if(u)u.attack+=2;else p.leaderAttack+=2;
    }
    p.graveyard.push(c);
  }

  private onMagicCast(p:Player,enemy:Player,c:Card,enemyTarget?:Unit){
    p.magicCastTotal++;
    if(p.coreEquipped)p.stormCharges++;
    if(p.element==='storm'){p.leaderAttack++;p.leaderTempAttack++;this.note(`${currentForm(p.element,p.evolutionStage).title} gains +1 Power from Stormborn.`)}
    if(this.zone(p,'lightning')&&this.hasTrait(c,'Lightning')){
      if(enemyTarget&&enemyTarget.health>0)this.damageUnit(enemy,enemyTarget,1,'lightning');
      else enemy.health-=1;
      p.damageThisTurn+=1;
      this.note('Lightning Plains adds 1 bonus damage.');
    }
  }

  private dealLightning(source:Player,enemy:Player,amount:number,target?:Unit){
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
    if(!phaseAllowed){this.note(`${c.name} can only be played during the Deploy Phase.`);return this.emit()}
    const cost=this.effectiveCost(p,c);
    if(cost>p.essence){this.note('Not enough Essence.');return this.emit()}
    if(c.kind==='unit'&&this.gateSlotsOpen(p)<=0){this.note('Your three home Gate slots are full. Advance a Unit before summoning another.');return this.emit()}
    const target=this.targetFor(p,this.state.selectedUnit);
    const choices=Object.keys(rawChoices).length?rawChoices:this.autoChoices(p,this.state.enemy,c);
    if(!this.canResolveTargeted(p,this.state.enemy,c,target,choices)){this.note(`Choose the required targets before playing ${c.name}.`);return this.emit()}
    const enemyTarget=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget);
    const usedVolcano=this.zone(p,'volcano')&&c.kind==='magic'&&this.hasTrait(c,'Fire')&&!p.zoneSpellDiscountUsed;
    p.essence-=cost;
    p.hand.splice(i,1);
    if(usedVolcano)p.zoneSpellDiscountUsed=true;
    this.resolveCard(p,this.state.enemy,c,target,enemyTarget,choices);
    if(c.kind==='magic')this.onMagicCast(p,this.state.enemy,c,enemyTarget);
    this.state.selectedUnit=null;
    this.state.selectedTarget=null;
    this.note(`You played ${c.name}.`);
    this.removeDefeated();
    this.refreshContinuousEffects();
    this.emit();
  }

  nextPhase(){
    if(this.state.winner||this.state.phase==='enemy')return;
    const order:Phase[]=['deploy','evolution','advance','battle'];
    const index=order.indexOf(this.state.phase);
    if(index===order.length-1)return this.endTurn();
    const next=order[index+1];
    this.state.phase=next;this.state.selectedUnit=null;this.state.selectedTarget=null;
    this.note(`${next[0].toUpperCase()+next.slice(1)} Phase begins. Magic and abilities remain available.`);
    this.emit();
  }
  setPhase(phase:Phase){
    if(this.state.winner||phase==='enemy')return;
    const order:Phase[]=['deploy','evolution','advance','battle'];
    if(order.indexOf(phase)!==order.indexOf(this.state.phase)+1)return;
    this.nextPhase();
  }

  evolveLeader(){if(this.state.phase!=='evolution'||!this.canEvolve(this.state.player))return;this.applyEvolution(this.state.player);this.emit()}
  private applyEvolution(p:Player){
    const form=nextForm(p.element,p.evolutionStage);
    if(!form||!this.canEvolve(p))return false;
    p.evolutionStage++;p.maxHealth+=form.healthBonus;p.health=Math.min(p.maxHealth,p.health+form.healthBonus);p.leaderAttack+=form.attackBonus;
    if(p.element==='flame'&&p.evolutionStage===2)p.units.forEach(u=>u.attack++);
    if(p.element==='flame'&&p.evolutionStage===3){const enemy=this.opponentOf(p);enemy.units.forEach(u=>this.damageUnit(enemy,u,2))}
    if(p.element==='tide'&&p.evolutionStage===2)p.units.forEach(u=>{u.maxHealth+=2;u.health+=2});
    if(p.element==='storm'){
      p.evolvedThisTurn=true;
      if(p.evolutionStage===1)p.units.forEach(u=>{u.preventFirstDamage=true;u.shieldReady=true});
      p.units.filter(u=>u.cardId==='skyclaw-raptor').forEach(u=>{u.attack++;u.temporaryAttack=(u.temporaryAttack??0)+1});
    }
    this.removeDefeated();this.note(`${form.title} emerges at Level ${form.level}! ${form.passive}`);return true;
  }

  sameZone(attacker:Unit,target:Unit){return attacker.position+target.position===2}
  selectUnit(uid:string){if(!this.isPlayerTurn())return;this.state.selectedUnit=this.state.selectedUnit===uid?null:uid;this.emit()}
  selectTarget(uid:string){if(!this.isPlayerTurn())return;this.state.selectedTarget=this.state.selectedTarget===uid?null:uid;this.emit()}

  private refreshContinuousEffects(){
    for(const p of [this.state.player,this.state.enemy]){
      for(const u of p.units){
        let attack=0,health=0;
        if(this.zone(p,'desert')&&(this.hasTrait(u,'Beast')||this.hasTrait(u,'Earth')))health+=5;
        if(this.zone(p,'ocean')&&this.hasTrait(u,'Water'))health+=1;
        if(this.zone(p,'volcano')&&this.hasTrait(u,'Fire'))attack+=1;
        if(this.zone(p,'cemetery')&&this.hasTrait(u,'Undead')){attack+=3;health+=3}
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
    const ownBonus=(this.zone(p,'field')?1:0)+(u.speedBonus??0);
    const fogPenalty=this.zone(enemy,'fog')?1:0;
    return Math.max(1,1+ownBonus-fogPenalty);
  }

  private advanceUnit(p:Player,enemy:Player,u:Unit){
    if(u.exhausted){this.note(`${u.name} is exhausted.`);return false}
    let moved=0;
    for(let step=0;step<this.movementRange(p,enemy,u)&&u.position<2;step++){
      if(enemy.units.some(target=>this.sameZone(u,target))){this.note(`${u.name} cannot leave this Zone while enemy Units remain.`);break}
      if(this.gateSlotsOpen(p,u.position+1)<=0){this.note(`The next Zone already has three friendly Units.`);break}
      u.position++;moved++;
      if(u.position===1)this.gainGlory(p,1);
      this.refreshContinuousEffects();
      if(enemy.units.some(target=>this.sameZone(u,target)))break;
    }
    if(moved){u.exhausted=true;this.note(`${u.name} advances ${moved} Zone${moved===1?'':'s'} to ${u.position===2?'the enemy Gate':u.position===1?'the center Gate':'your Gate'}.`)}
    return moved>0;
  }

  advance(){
    const u=this.state.player.units.find(x=>x.uid===this.state.selectedUnit);
    if(!u||this.state.phase!=='advance')return;
    this.advanceUnit(this.state.player,this.state.enemy,u);
    this.removeDefeated();this.emit();
  }

  private damageUnit(owner:Player,u:Unit,amount:number,type:'combat'|'lightning'|'magic'='combat'){
    if(type==='lightning'&&owner.units.some(unit=>unit.cardId==='stormhide-bruiser'))amount=Math.max(0,amount-1);
    if(this.zone(owner,'frost')&&(this.hasTrait(u,'Water')||this.hasTrait(u,'Ice')))amount=Math.max(0,amount-1);
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
      if(target.cardId==='stormhide-bruiser'){target.maxHealth+=2;target.health+=2;target.temporaryHealth=(target.temporaryHealth??0)+2}
      const firstAttack=(u.attacksThisTurn??0)===0;
      const plainsBonus=this.zone(attackerOwner,'lightning')&&this.hasTrait(u,'Lightning')&&firstAttack?1:0;
      const targetWasAlive=target.health>0;
      const dealt=this.damageUnit(defenderOwner,target,u.attack+plainsBonus);
      const counter=this.damageUnit(attackerOwner,u,target.attack);
      attackerOwner.damageThisTurn+=dealt;defenderOwner.damageThisTurn+=counter;
      if(dealt>0&&u.bonusLightningOnCombat)this.dealLightning(attackerOwner,defenderOwner,u.bonusLightningOnCombat,target);
      const killed=targetWasAlive&&target.health<=0;
      if(killed){this.gainGlory(attackerOwner,2);this.healForKill(attackerOwner,u)}
      u.attacksThisTurn=(u.attacksThisTurn??0)+1;
      const princeAttack=u.cardId==='forsaken-prince'&&u.attacksThisTurn<2;
      u.exhausted=!(u.health>0&&(princeAttack||killed&&u.extraAttackOnKill));
      this.note(`${u.name} battles ${target.name}${plainsBonus?' with Lightning Plains power':''}.`);
    }else if(u.position>=2&&u.cardId!=='forsaken-prince'){
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
    if(selected&&!this.sameZone(u,selected)){this.note(`${selected.name} is in another Zone. Units can only fight inside their current Zone.`);return this.emit()}
    const guards=enemy.units.filter(target=>target.cardId==='queens-guardsman'&&this.sameZone(u,target));
    if(guards.length&&selected&&!guards.includes(selected)){this.note('Royal Guard protects every other enemy in this Zone.');return this.emit()}
    const target=selected??guards[0]??enemy.units.find(x=>this.sameZone(u,x));
    if(!this.resolveCombat(player,enemy,u,target)){
      this.note(u.cardId==='forsaken-prince'?'The Forsaken Prince can only attack enemy Units.':'No target in this Zone. Reach the enemy Gate before striking the Leader.');return this.emit();
    }
    this.state.selectedUnit=null;this.state.selectedTarget=null;this.emit();
  }

  private useLeaderAbility(p:Player,enemy:Player,choice:'damage'|'heal'|'push'='damage',target?:Unit,friendly?:Unit){
    const form=currentForm(p.element,p.evolutionStage);
    if(p.leaderAbilityUsed||form.abilityDamage<=0&&p.element!=='undead')return false;
    if(p.element==='undead'){
      const slots=this.gateSlotsOpen(p);if(slots<=0)return false;
      const count=Math.min(p.evolutionStage>=2?2:1,slots),ready=p.evolutionStage===1||p.evolutionStage>=3;
      for(let i=0;i<count;i++){
        const token:Unit={uid:`skeleton-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}`,cardId:'skeleton-token',name:'Skeleton Token',attack:1,health:2,maxHealth:2,position:0,exhausted:!ready,element:'undead',traits:['Undead','Skeleton','Dark'],equipment:[],summonedTurn:this.state.turn,attacksThisTurn:0};
        if(this.zone(p,'field')){token.maxHealth++;token.health++;token.temporaryHealth=1}
        if(this.zone(p,'fog')){token.preventFirstDamage=true;token.shieldReady=true;token.fogWindStep=true}
        p.units.push(token);
      }
    }else if(p.element!=='storm'){
      if(p.essence<2)return false;
      p.essence-=2;enemy.health-=form.abilityDamage;p.damageThisTurn+=form.abilityDamage;this.gainGlory(p,1);
    }else{
      if(p.evolutionStage>=3&&choice==='heal'){if(!friendly)return false;this.healUnit(p,friendly,3)}
      else if(p.evolutionStage>=3&&choice==='push')enemy.units.forEach(u=>u.position=Math.max(0,u.position-1));
      else{this.dealLightning(p,enemy,form.abilityDamage,target);if(p.evolutionStage===1&&target)target.position=Math.max(0,target.position-1)}
    }
    p.leaderAbilityUsed=true;this.refreshContinuousEffects();this.note(`${form.title} unleashes ${form.ability}!`);return true;
  }

  leaderAbility(choice:'damage'|'heal'|'push'='damage'){
    const p=this.state.player;if(!this.isPlayerTurn())return;
    const target=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget),friendly=p.units.find(u=>u.uid===this.state.selectedUnit);
    if(!this.useLeaderAbility(p,this.state.enemy,choice,target,friendly)){this.note(choice==='heal'?'Select a friendly Unit to heal.':'That once-per-turn Leader ability is unavailable.');return this.emit()}
    this.removeDefeated();this.emit();
  }

  unitAbility(uid:string){
    const p=this.state.player,u=p.units.find(unit=>unit.uid===uid);
    if(!this.isPlayerTurn()||!u)return;
    if(u.cardId!=='grave-banshee'||u.unitAbilityUsed){this.note('That Unit ability is unavailable.');return this.emit()}
    this.state.enemy.units.forEach(enemy=>{const amount=Math.min(2,Math.max(0,enemy.attack));enemy.attack-=amount;enemy.temporaryEnemyAttackPenalty=(enemy.temporaryEnemyAttackPenalty??0)+amount});
    u.unitAbilityUsed=true;this.note('Grave Banshee drains 2 Attack from every enemy Unit until end of turn.');this.emit();
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
    p.leaderAbilityUsed=false;p.absorbUsed=false;p.evolvedThisTurn=false;p.zoneSpellDiscountUsed=false;
    p.units.forEach(u=>{
      u.unitAbilityUsed=false;u.attacksThisTurn=0;u.frozenThisTurn=false;
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
  }

  private readyUnits(p:Player){
    p.units.forEach(u=>{
      if((u.frozenTurns??0)>0){u.exhausted=true;u.frozenTurns!--;u.frozenThisTurn=true}
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
    if(p.endlessGraveTurns>0)p.endlessGraveTurns--;
    p.damageLastTurn=p.damageThisTurn;p.damageThisTurn=0;this.refreshContinuousEffects();this.removeDefeated();
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
    this.state.phase='deploy';this.state.selectedUnit=null;this.state.selectedTarget=null;this.note(`Turn ${this.state.turn}. Your online turn begins with ${p.essence} Essence.`);this.emit();
  }

  private enemyTurn(){
    if(this.state.winner)return;
    const e=this.state.enemy,p=this.state.player;this.resetShields();this.beginTurn(e,p);this.grantTurnResources(e);this.draw(e);this.readyUnits(e);
    while(this.canEvolve(e))this.applyEvolution(e);
    const form=currentForm(e.element,e.evolutionStage);
    if((form.abilityDamage>0||e.element==='undead')&&(e.element==='storm'||e.element==='undead'||e.essence>=2))this.useLeaderAbility(e,p,'damage',[...p.units].sort((a,b)=>a.health-b.health)[0]);

    for(const c of [...e.hand].sort((a,b)=>b.cost-a.cost)){
      const cost=this.effectiveCost(e,c);if(cost>e.essence)continue;
      if(c.kind==='unit'&&this.gateSlotsOpen(e)<=0)continue;
      if(c.id==='death-mist'&&p.units.length===0)continue;
      if(c.id==='endless-grave'&&e.units.length===0)continue;
      const harvestTarget=[...e.units].filter(u=>u.health<=2&&this.hasTrait(u,'Undead')).sort((a,b)=>a.health-b.health)[0];
      const needsFriendly=['gale-step-invocation','healing-downpour','stormforged-talons','gale-mantle-cloak','raincaller-totem'].includes(c.id);
      const target=c.id==='soul-harvest'?harvestTarget:c.kind==='equipment'&&c.id!=='thunderheart-core'||needsFriendly?[...e.units].sort((a,b)=>b.attack-a.attack)[0]:undefined;
      const enemyTarget=['boltstrike-surge','stormheart-cataclysm'].includes(c.id)?[...p.units].sort((a,b)=>a.health-b.health)[0]:undefined;
      const choices=this.autoChoices(e,p,c);
      if(!this.canResolveTargeted(e,p,c,target,choices))continue;
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
      else if(u.position<2)this.advanceUnit(e,p,u);
      else this.resolveCombat(e,p,u);
      if(u.cardId==='forsaken-prince'&&!u.exhausted&&u.health>0){const second=p.units.find(unit=>this.sameZone(u,unit));if(second)this.resolveCombat(e,p,u,second)}
    }
    this.finishTurn(e,p);this.state.turn++;this.resetShields();this.beginTurn(p,e);this.grantTurnResources(p);this.draw(p);this.readyUnits(p);
    this.state.phase='deploy';this.note(`Turn ${this.state.turn}. You begin with ${p.essence} Essence.`);this.emit();
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
          if(unit.cardId==='forsaken-prince'){enemy.units.forEach(target=>this.damageUnit(enemy,target,2,'magic'));this.note('The Forsaken Prince erupts in a 2-damage Death Burst.')}
          if(this.zone(p,'shadow'))this.draw(p);
          const def=cardById(unit.cardId);if(!def)continue;
          const card=instance(def);
          if(this.zone(p,'cemetery')&&this.hasTrait(unit,'Undead')){p.cemetery.push(card);this.note(`${unit.name} enters the Cemetery Zone.`)}
          else if(p.element==='undead'&&p.endlessGraveTurns>0){p.hand.push(card);this.note(`${unit.name} returns to hand through Endless Grave.`)}
          else p.graveyard.push(card);
        }
      }
      this.refreshContinuousEffects();
      if(!found)break;
    }
  }

  private checkWinner(){if(this.state.enemy.health<=0)this.state.winner='victory';if(this.state.player.health<=0)this.state.winner='defeat'}
  restart(){const fresh=new HeroicsGame(this.fastMode,this.config,this.humanVsHuman);this.state=fresh.state;this.emit()}
}
