import { CardDef, Element, cardById, makeCustomDeck } from './cards';
import { currentForm, nextForm } from './evolution';

export interface Card extends CardDef { uid:string }
export interface Unit {
  uid:string; cardId:string; name:string; attack:number; health:number; maxHealth:number;
  position:number; exhausted:boolean; element:Element; gateBuffApplied?:boolean;
  preventFirstDamage?:boolean; shieldReady?:boolean; healOnKill?:number; extraAttackOnKill?:boolean;
  speedBonus?:number; temporarySpeed?:number; bonusLightningOnCombat?:number; raincaller?:boolean; temporaryAttack?:number; temporaryHealth?:number; lastShockwaveTurn?:number;
}
export interface Player {
  name:string; leader:string; element:Element; health:number; maxHealth:number; essence:number; maxEssence:number;
  glory:number; evolutionStage:number; leaderAttack:number; deck:Card[]; hand:Card[]; units:Unit[];
  graveyard:Card[]; endlessGraveUntilTurn:number;
  magicCastTotal:number; damageThisTurn:number; damageLastTurn:number; stormCharges:number; tempestMagicCast:boolean; coreEquipped:boolean;
  rainfieldTurns:number; leaderAbilityUsed:boolean; absorbUsed:boolean; evolvedThisTurn:boolean; leaderTempAttack:number;
}
export type Phase = 'deploy'|'evolution'|'advance'|'battle'|'enemy';
export interface GameState { turn:number; phase:Phase; player:Player; enemy:Player; selectedUnit:string|null; selectedTarget:string|null; log:string[]; winner:string|null }
type Listener = (s:GameState)=>void;

const shuffle=<T>(a:T[])=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const leaderNames:Record<Element,string>={flame:'Ignis',tide:'Shellgon',undead:'Queen of the Dead',storm:'Tempestfang'};
const aiNames:Record<Element,string>={flame:'Flamebound AI',tide:'Tidebound AI',undead:'Deathbound AI',storm:'Stormbound AI'};
const baseLeaderAttack:Record<Element,number>={flame:3,tide:2,undead:0,storm:2};
const instance=(card:CardDef):Card=>({...card,uid:`${card.element}-${card.id}-${Math.random().toString(36).slice(2,9)}`});

export interface MatchConfig { playerElement:Element; enemyElement:Element; playerDeckIds?:string[]; enemyDeckIds?:string[] }
const createPlayer=(element:Element,isEnemy=false,ids:string[]=[]):Player=>({
  name:isEnemy?aiNames[element]:'You',leader:leaderNames[element],element,health:30,maxHealth:30,essence:2,maxEssence:2,
  glory:0,evolutionStage:0,leaderAttack:baseLeaderAttack[element],deck:shuffle(makeCustomDeck(ids,element) as Card[]),
  hand:[],units:[],graveyard:[],endlessGraveUntilTurn:-1,
  magicCastTotal:0,damageThisTurn:0,damageLastTurn:0,stormCharges:0,tempestMagicCast:false,coreEquipped:false,rainfieldTurns:0,
  leaderAbilityUsed:false,absorbUsed:false,evolvedThisTurn:false,leaderTempAttack:0,
});

export class HeroicsGame {
  state:GameState; private listeners:Listener[]=[]; private fastMode:boolean; private config:MatchConfig; private humanVsHuman:boolean;
  constructor(fastMode=false,config:MatchConfig={playerElement:'flame',enemyElement:'tide'},humanVsHuman=false){
    this.fastMode=fastMode;this.config=config;this.humanVsHuman=humanVsHuman;
    this.state={turn:1,phase:'deploy',player:createPlayer(config.playerElement,false,config.playerDeckIds),enemy:createPlayer(config.enemyElement,true,config.enemyDeckIds),selectedUnit:null,selectedTarget:null,log:['The battlefield awakens. Your Deploy Phase begins.'],winner:null};
    this.draw(this.state.player,5);this.draw(this.state.enemy,5);
  }
  subscribe(fn:Listener){this.listeners.push(fn);fn(this.state)}
  private emit(){this.checkWinner();this.listeners.forEach(fn=>fn(this.state))}
  private note(msg:string){this.state.log=[msg,...this.state.log].slice(0,8)}
  private draw(p:Player,n=1){for(let i=0;i<n;i++){const c=p.deck.pop();if(c)p.hand.push(c)}}
  private heal(p:Player,n:number){p.health=Math.min(p.maxHealth,p.health+n)}
  private resetShields(){[...this.state.player.units,...this.state.enemy.units].forEach(u=>{if(u.preventFirstDamage)u.shieldReady=true})}
  private searchDeck(p:Player,id:string){const index=p.deck.findIndex(c=>c.id===id);if(index<0)return false;const [found]=p.deck.splice(index,1);p.hand.push(found);shuffle(p.deck);this.note(`${p===this.state.player?'You search':'The rival searches'} for ${found.name} and add it to hand.`);return true}
  canEvolve(p:Player){
    const next=nextForm(p.element,p.evolutionStage);if(!next)return false;
    if(p.element!=='storm')return p.glory>=next.gloryRequired;
    if(p.evolutionStage===0)return p.magicCastTotal>=2;
    if(p.evolutionStage===1)return p.damageLastTurn>=6;
    return p.stormCharges>=3||p.tempestMagicCast;
  }
  evolutionProgress(p:Player){
    if(p.element!=='storm'){const next=nextForm(p.element,p.evolutionStage);return next?`${p.glory} / ${next.gloryRequired} Glory`:'Maximum evolution';}
    if(p.evolutionStage===0)return `${Math.min(2,p.magicCastTotal)} / 2 Magic cards cast`;
    if(p.evolutionStage===1)return `${Math.min(6,p.damageLastTurn)} / 6 damage last turn`;
    if(p.evolutionStage===2)return `${p.stormCharges} / 3 Storm Charges • or cast Tempest Magic`;
    return 'Maximum evolution';
  }
  effectiveCost(p:Player,c:CardDef){return p.element==='storm'&&p.evolutionStage>=3&&c.kind==='magic'?Math.max(1,c.cost-1):c.cost}

  private summon(p:Player,c:Card){
    const unit:Unit={uid:c.uid,cardId:c.id,name:c.name,attack:c.attack!,health:c.health!,maxHealth:c.health!,position:0,exhausted:true,element:c.element};
    if(['skyclaw-raptor','cloudrunner-lynx'].includes(c.id)||p.element==='storm'&&p.evolutionStage>=1){unit.preventFirstDamage=true;unit.shieldReady=true}
    if(c.id==='thunderhorn-stag'&&p.element==='storm')unit.attack+=1;
    p.units.push(unit);
    if(c.id==='undead-wizard')this.searchDeck(p,'gravebound-knight');
    if(c.id==='gravebound-knight')this.searchDeck(p,'forever-dead-king');
  }
  private targetFor(p:Player,uid:string|null){return p.units.find(u=>u.uid===uid)}
  private canResolveTargeted(p:Player,c:Card,target?:Unit){
    if(c.id==='soul-harvest'&&!target)return false;
    if(c.kind==='equipment'&&c.element==='undead'&&!target)return false;
    if(['gale-step-invocation','healing-downpour','stormforged-talons','gale-mantle-cloak','raincaller-totem'].includes(c.id)&&!target)return false;
    return true;
  }
  private resolveCard(p:Player,enemy:Player,c:Card,target?:Unit,enemyTarget?:Unit){
    if(c.kind==='unit'){this.summon(p,c);return}
    if(c.id==='raise-the-fallen'){
      const restored:Card[]=[];
      for(let i=p.graveyard.length-1;i>=0&&restored.length<2;i--){if(p.graveyard[i].kind==='unit')restored.push(...p.graveyard.splice(i,1))}
      p.hand.push(...restored.map(card=>instance(card)));
      this.note(restored.length?`${restored.map(card=>card.name).join(' and ')} return from the graveyard.`:'The graveyard holds no Units.');
    }else if(c.id==='soul-harvest'&&target){
      target.health=0;this.removeDefeated();this.draw(p,2);this.heal(p,4);
    }else if(c.id==='death-mist'){
      enemy.units.forEach(u=>this.damageUnit(enemy,u,3));this.removeDefeated();
    }else if(c.id==='endless-grave'){
      p.endlessGraveUntilTurn=this.state.turn+1;
    }else if(c.id==='thorned-rose-crown'&&target){
      target.attack+=1;target.maxHealth+=5;target.health+=5;target.preventFirstDamage=true;target.shieldReady=true;
    }else if(c.id==='crown-eternal-night'&&target){
      target.attack+=2;target.maxHealth+=3;target.health+=3;target.healOnKill=(target.healOnKill??0)+2;
    }else if(c.id==='blade-forgotten-kings'&&target){
      target.attack+=4;target.maxHealth+=1;target.health+=1;target.extraAttackOnKill=true;
    }else if(c.id==='boltstrike-surge'){
      this.dealLightning(p,enemy,2,enemyTarget);
      if(p.evolutionStage>=2)enemy.units.forEach(u=>this.damageUnit(enemy,u,1,'lightning'));
    }else if(c.id==='gale-step-invocation'&&target){
      target.preventFirstDamage=true;target.shieldReady=true;target.speedBonus=(target.speedBonus??0)+1;target.temporarySpeed=(target.temporarySpeed??0)+1;target.exhausted=false;if(p.evolvedThisTurn)this.draw(p);
    }else if(c.id==='healing-downpour'&&target){
      target.health=Math.min(target.maxHealth,target.health+3);p.rainfieldTurns=Math.max(p.rainfieldTurns,2);
    }else if(c.id==='stormheart-cataclysm'){
      if(enemyTarget){this.dealLightning(p,enemy,3,enemyTarget);enemyTarget.position=Math.max(0,enemyTarget.position-2)}
      else{this.dealLightning(p,enemy,3);p.rainfieldTurns=Math.max(p.rainfieldTurns,1)}
      if(p.evolutionStage>=3){p.rainfieldTurns=Math.max(p.rainfieldTurns,1);if(enemyTarget)enemyTarget.position=Math.max(0,enemyTarget.position-2)}
      p.tempestMagicCast=true;
    }else if(c.id==='stormforged-talons'&&target){
      target.attack+=1;target.bonusLightningOnCombat=(target.bonusLightningOnCombat??0)+1;
    }else if(c.id==='gale-mantle-cloak'&&target){
      target.preventFirstDamage=true;target.shieldReady=true;target.speedBonus=(target.speedBonus??0)+1;target.exhausted=false;
    }else if(c.id==='thunderheart-core')p.coreEquipped=true;
    else if(c.id==='raincaller-totem'&&target)target.raincaller=true;
    else if(c.id==='sunblade')p.leaderAttack+=2;
    else if(c.effect==='damage'){enemy.health-=3;this.gainGlory(p,1)}
    else if(c.effect==='heal')this.heal(p,c.name==='Mending Tide'?5:4);
    else if(c.effect==='draw')this.draw(p,2);
    else if(c.effect==='buff'){const u=[...p.units].sort((a,b)=>b.position-a.position)[0];if(u)u.attack+=2;else p.leaderAttack+=2}
    p.graveyard.push(c);
  }
  private onMagicCast(p:Player){
    p.magicCastTotal++;if(p.coreEquipped)p.stormCharges++;
    if(p.element==='storm'){p.leaderAttack++;p.leaderTempAttack++;this.note(`${currentForm(p.element,p.evolutionStage).title} gains +1 Power from Stormborn.`)}
  }
  private dealLightning(source:Player,enemy:Player,amount:number,target?:Unit){
    const dealt=target?this.damageUnit(enemy,target,amount,'lightning'):amount;
    if(!target)enemy.health-=amount;source.damageThisTurn+=dealt;
    if(dealt>0&&source.element==='storm'&&source.evolutionStage>=2)enemy.units.forEach(u=>{source.damageThisTurn+=this.damageUnit(enemy,u,1,'lightning')});
  }
  playCard(uid:string){
    const p=this.state.player;if(this.state.phase!=='deploy'||this.state.winner)return;
    const i=p.hand.findIndex(c=>c.uid===uid),c=p.hand[i];
    const cost=c?this.effectiveCost(p,c):0;if(!c||cost>p.essence){this.note('Not enough Essence.');return this.emit()}
    if(c.kind==='unit'&&p.units.length>=3){this.note('Your three unit slots are full.');return this.emit()}
    const target=this.targetFor(p,this.state.selectedUnit);
    if(!this.canResolveTargeted(p,c,target)){this.note(`Select a friendly unit before playing ${c.name}.`);return this.emit()}
    const enemyTarget=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget);
    p.essence-=cost;p.hand.splice(i,1);this.resolveCard(p,this.state.enemy,c,target,enemyTarget);
    if(c.kind==='magic')this.onMagicCast(p);
    this.state.selectedUnit=null;this.state.selectedTarget=null;this.note(`You played ${c.name}.`);this.removeDefeated();this.emit();
  }

  nextPhase(){if(this.state.winner||this.state.phase==='enemy')return;const order:Phase[]=['deploy','evolution','advance','battle'];const index=order.indexOf(this.state.phase);if(index===order.length-1)return this.endTurn();const next=order[index+1];this.state.phase=next;this.state.selectedUnit=null;this.state.selectedTarget=null;this.note(`${next[0].toUpperCase()+next.slice(1)} Phase begins.`);this.emit()}
  setPhase(phase:Phase){if(this.state.winner||phase==='enemy')return;const order:Phase[]=['deploy','evolution','advance','battle'];const current=order.indexOf(this.state.phase);const requested=order.indexOf(phase);if(requested!==current+1)return;this.nextPhase()}
  evolveLeader(){if(this.state.phase!=='evolution'||!this.canEvolve(this.state.player))return;this.applyEvolution(this.state.player);this.emit()}
  private applyEvolution(p:Player){const form=nextForm(p.element,p.evolutionStage);if(!form||p.glory<form.gloryRequired)return false;p.evolutionStage++;p.maxHealth+=form.healthBonus;p.health=Math.min(p.maxHealth,p.health+form.healthBonus);p.leaderAttack+=form.attackBonus;
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
  private opponentOf(p:Player){return p===this.state.player?this.state.enemy:this.state.player}
  sameZone(attacker:Unit,target:Unit){return attacker.position+target.position===2}
  selectUnit(uid:string){if(!['deploy','advance','battle'].includes(this.state.phase))return;this.state.selectedUnit=this.state.selectedUnit===uid?null:uid;this.emit()}
  selectTarget(uid:string){if(!['deploy','battle'].includes(this.state.phase))return;this.state.selectedTarget=this.state.selectedTarget===uid?null:uid;this.emit()}
  private applyGatekeeper(u:Unit){if(u.cardId==='forever-dead-king'&&u.position===2&&!u.gateBuffApplied){u.attack+=2;u.maxHealth+=2;u.health+=2;u.gateBuffApplied=true;this.note(`${u.name} invokes Gatekeeper and gains +2 Attack and +2 Health.`)}}
  advance(){const u=this.state.player.units.find(x=>x.uid===this.state.selectedUnit);if(!u||this.state.phase!=='advance')return;if(u.exhausted){this.note(`${u.name} is exhausted.`);return this.emit()}if(u.position<2){u.position++;this.applyGatekeeper(u);u.exhausted=true;this.note(`${u.name} advances to ${u.position===2?'the enemy gate':'the center'}.`);if(u.position===1)this.gainGlory(this.state.player,1)}this.emit()}
  private damageUnit(owner:Player,u:Unit,amount:number,type:'combat'|'lightning'|'magic'='combat'){
    if(type==='lightning'&&owner.units.some(unit=>unit.cardId==='stormhide-bruiser'))amount=Math.max(0,amount-1);
    if(amount<=0)return 0;
    if(u.preventFirstDamage&&u.shieldReady){u.shieldReady=false;this.note(`${u.name}'s Wind Step prevents the damage.`);if(u.cardId==='cloudrunner-lynx')this.draw(owner);return 0}
    u.health-=amount;return amount;
  }
  private healForKill(p:Player,u:Unit){const innate=(u.cardId==='cemetery-reaper'||u.cardId==='forever-dead-king')?2:0;const total=innate+(u.healOnKill??0);if(total)this.heal(p,total)}
  private resolveCombat(attackerOwner:Player,defenderOwner:Player,u:Unit,target?:Unit){
    if(target){
      if(target.cardId==='stormhide-bruiser'){target.maxHealth+=2;target.health+=2;target.temporaryHealth=(target.temporaryHealth??0)+2}
      const targetWasAlive=target.health>0;const dealt=this.damageUnit(defenderOwner,target,u.attack);const counter=this.damageUnit(attackerOwner,u,target.attack);attackerOwner.damageThisTurn+=dealt;defenderOwner.damageThisTurn+=counter;
      if(dealt>0&&u.bonusLightningOnCombat)this.dealLightning(attackerOwner,defenderOwner,u.bonusLightningOnCombat,target);
      const killed=targetWasAlive&&target.health<=0;if(killed){this.gainGlory(attackerOwner,2);this.healForKill(attackerOwner,u)}u.exhausted=!(killed&&u.health>0&&u.extraAttackOnKill);this.note(`${u.name} battles ${target.name}.`)
    }
    else if(u.position>=2){defenderOwner.health-=u.attack;attackerOwner.damageThisTurn+=u.attack;this.gainGlory(attackerOwner,1);u.exhausted=true;this.note(`${u.name} strikes ${currentForm(defenderOwner.element,defenderOwner.evolutionStage).title} for ${u.attack}!`)}
    else return false;
    this.removeDefeated();return true;
  }
  attack(){
    const {player,enemy}=this.state;const u=player.units.find(x=>x.uid===this.state.selectedUnit);
    if(!u||this.state.phase!=='battle'){this.note('Select one of your ready units first.');return this.emit()}
    if(u.exhausted){this.note(`${u.name} is exhausted.`);return this.emit()}
    const selected=enemy.units.find(x=>x.uid===this.state.selectedTarget);
    if(selected&&!this.sameZone(u,selected)){this.note(`${selected.name} is in another zone. Units can only fight inside their current zone.`);return this.emit()}
    const target=selected??enemy.units.find(x=>this.sameZone(u,x));
    if(!this.resolveCombat(player,enemy,u,target)){this.note('No target in this zone. Advance to the enemy Gate before striking the Leader.');return this.emit()}
    this.state.selectedUnit=null;this.state.selectedTarget=null;this.emit();
  }
  private useLeaderAbility(p:Player,enemy:Player,choice:'damage'|'heal'|'push'='damage',target?:Unit,friendly?:Unit){
    const form=currentForm(p.element,p.evolutionStage);if(form.abilityDamage<=0&&p.element!=='undead')return false;
    if(p.element==='undead'){
      if(p.leaderAbilityUsed||p.units.length>=3)return false;
      const count=Math.min(p.evolutionStage>=2?2:1,3-p.units.length);
      const ready=p.evolutionStage===1||p.evolutionStage>=3;
      for(let i=0;i<count;i++)p.units.push({uid:`skeleton-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}`,cardId:'skeleton-token',name:'Skeleton Token',attack:1,health:2,maxHealth:2,position:0,exhausted:!ready,element:'undead'});
      p.leaderAbilityUsed=true;
    }
    else if(p.element!=='storm'){if(p.essence<2)return false;p.essence-=2;enemy.health-=form.abilityDamage;p.damageThisTurn+=form.abilityDamage;this.gainGlory(p,1)}
    else{
      if(p.leaderAbilityUsed)return false;
      if(p.evolutionStage>=3&&choice==='heal'){if(!friendly)return false;friendly.health=Math.min(friendly.maxHealth,friendly.health+3)}
      else if(p.evolutionStage>=3&&choice==='push')enemy.units.forEach(u=>u.position=Math.max(0,u.position-1));
      else{this.dealLightning(p,enemy,form.abilityDamage,target);if(p.evolutionStage===1&&target)target.position=Math.max(0,target.position-1)}
      p.leaderAbilityUsed=true;
    }
    this.note(`${form.title} unleashes ${form.ability}!`);return true;
  }
  leaderAbility(choice:'damage'|'heal'|'push'='damage'){
    const p=this.state.player;if(this.state.phase!=='battle')return;
    const target=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget),friendly=p.units.find(u=>u.uid===this.state.selectedUnit);
    if(!this.useLeaderAbility(p,this.state.enemy,choice,target,friendly)){this.note(choice==='heal'?'Select a friendly unit to heal.':'That Leader ability is unavailable.');return this.emit()}
    this.emit();
  }
  dischargeCore(){const p=this.state.player;if(!['deploy','battle'].includes(this.state.phase)||!p.coreEquipped||p.stormCharges<3)return;p.stormCharges-=3;const target=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget);this.dealLightning(p,this.state.enemy,4,target);this.note('Thunderheart Core discharges for 4 Lightning damage!');this.removeDefeated();this.emit()}
  absorbMagic(){const p=this.state.player;if(this.state.phase!=='battle'||p.element!=='storm'||p.evolutionStage<3||p.absorbUsed)return;const magic=[...p.hand].filter(c=>c.kind==='magic').sort((a,b)=>a.cost-b.cost)[0];if(!magic){this.note('No Magic card is available to absorb.');return this.emit()}p.hand=p.hand.filter(c=>c.uid!==magic.uid);p.graveyard.push(magic);p.absorbUsed=true;const target=this.state.enemy.units.find(u=>u.uid===this.state.selectedTarget);this.dealLightning(p,this.state.enemy,5,target);this.note(`${currentForm(p.element,p.evolutionStage).title} absorbs ${magic.name} and unleashes Storm Blast!`);this.removeDefeated();this.emit()}
  private beginTurn(p:Player){p.leaderAbilityUsed=false;p.absorbUsed=false;p.evolvedThisTurn=false;if(p.rainfieldTurns>0){p.units.forEach(u=>u.health=Math.min(u.maxHealth,u.health+1));p.rainfieldTurns--}if(p.units.some(u=>u.raincaller))p.units.forEach(u=>u.health=Math.min(u.maxHealth,u.health+1))}
  private finishTurn(p:Player,enemy:Player){
    if(this.state.turn%3===0)p.units.filter(u=>u.cardId==='thunderhorn-stag'&&u.lastShockwaveTurn!==this.state.turn).forEach(u=>{u.lastShockwaveTurn=this.state.turn;enemy.units.forEach(target=>this.damageUnit(enemy,target,2,'magic'));this.note(`${u.name} releases a 2-damage Shockwave!`)});
    if(p.leaderTempAttack){p.leaderAttack-=p.leaderTempAttack;p.leaderTempAttack=0}
    p.units.forEach(u=>{if(u.temporaryAttack){u.attack-=u.temporaryAttack;u.temporaryAttack=0}if(u.temporaryHealth){u.maxHealth-=u.temporaryHealth;u.health=Math.min(u.health,u.maxHealth);u.temporaryHealth=0}if(u.temporarySpeed){u.speedBonus=Math.max(0,(u.speedBonus??0)-u.temporarySpeed);u.temporarySpeed=0}});
    p.damageLastTurn=p.damageThisTurn;p.damageThisTurn=0;this.removeDefeated();
  }
  endTurn(){if(this.state.winner||this.state.phase!=='battle')return;const p=this.state.player;this.finishTurn(p,this.state.enemy);if(p.endlessGraveUntilTurn===this.state.turn)p.endlessGraveUntilTurn=-1;this.state.phase='enemy';this.state.selectedUnit=null;this.state.selectedTarget=null;this.note(`Your turn ends. ${currentForm(this.state.enemy.element,this.state.enemy.evolutionStage).title} begins its turn…`);this.emit();if(this.humanVsHuman)return;if(this.fastMode)this.enemyTurn();else globalThis.setTimeout(()=>this.enemyTurn(),700)}

  beginOnlineTurn(){
    const p=this.state.player;this.state.turn++;this.resetShields();this.beginTurn(p);p.maxEssence=Math.min(10,p.maxEssence+1);p.essence=p.maxEssence;this.draw(p);p.units.forEach(u=>u.exhausted=false);this.state.phase='deploy';this.state.selectedUnit=null;this.state.selectedTarget=null;this.note(`Turn ${this.state.turn}. Your online turn begins with ${p.maxEssence} Essence.`);this.emit();
  }

  private enemyTurn(){
    if(this.state.winner)return;const e=this.state.enemy,p=this.state.player;this.resetShields();this.beginTurn(e);e.maxEssence=Math.min(10,e.maxEssence+1);e.essence=e.maxEssence;this.draw(e);e.units.forEach(u=>u.exhausted=false);if(this.canEvolve(e))this.applyEvolution(e);
    const form=currentForm(e.element,e.evolutionStage);if((form.abilityDamage>0||e.element==='undead')&&(e.element==='storm'||e.element==='undead'||e.essence>=2))this.useLeaderAbility(e,p,'damage',[...p.units].sort((a,b)=>a.health-b.health)[0]);
    for(const c of [...e.hand].sort((a,b)=>b.cost-a.cost)){
      const cost=this.effectiveCost(e,c);if(cost>e.essence)continue;if(c.kind==='unit'&&e.units.length>=3)continue;
      if(c.id==='death-mist'&&p.units.length===0)continue;
      if(c.id==='raise-the-fallen'&&!e.graveyard.some(card=>card.kind==='unit'))continue;
      if(c.id==='endless-grave'&&e.units.length===0)continue;
      const harvestTarget=[...e.units].filter(u=>u.health<=2).sort((a,b)=>a.health-b.health)[0];
      const needsFriendly=['gale-step-invocation','healing-downpour','stormforged-talons','gale-mantle-cloak','raincaller-totem'].includes(c.id);
      const target=c.id==='soul-harvest'?harvestTarget:c.kind==='equipment'||needsFriendly?[...e.units].sort((a,b)=>b.attack-a.attack)[0]:undefined;
      const enemyTarget=['boltstrike-surge','stormheart-cataclysm'].includes(c.id)?[...p.units].sort((a,b)=>a.health-b.health)[0]:undefined;
      if(!this.canResolveTargeted(e,c,target))continue;e.essence-=cost;e.hand=e.hand.filter(x=>x.uid!==c.uid);this.resolveCard(e,p,c,target,enemyTarget);if(c.kind==='magic')this.onMagicCast(e);this.removeDefeated();this.note(`${form.title} plays ${c.name}.`);
    }
    if(e.element==='storm'&&e.coreEquipped&&e.stormCharges>=3){e.stormCharges-=3;this.dealLightning(e,p,4,[...p.units].sort((a,b)=>a.health-b.health)[0]);this.note('The rival discharges Thunderheart Core!');this.removeDefeated()}
    if(e.element==='storm'&&e.evolutionStage>=3&&!e.absorbUsed){const magic=[...e.hand].filter(c=>c.kind==='magic').sort((a,b)=>a.cost-b.cost)[0];if(magic){e.hand=e.hand.filter(c=>c.uid!==magic.uid);e.graveyard.push(magic);e.absorbUsed=true;this.dealLightning(e,p,5,[...p.units].sort((a,b)=>a.health-b.health)[0]);this.note(`${form.title} devours ${magic.name} for a Storm Blast!`);this.removeDefeated()}}
    for(const u of [...e.units]){if(u.exhausted||u.health<=0)continue;const localTarget=p.units.find(unit=>this.sameZone(u,unit));if(localTarget)this.resolveCombat(e,p,u,localTarget);else if(u.position<2){u.position++;this.applyGatekeeper(u);u.exhausted=true;if(u.position===1)this.gainGlory(e,1)}else this.resolveCombat(e,p,u)}
    this.finishTurn(e,p);if(e.endlessGraveUntilTurn===this.state.turn)e.endlessGraveUntilTurn=-1;
    this.state.turn++;this.resetShields();this.beginTurn(p);p.maxEssence=Math.min(10,p.maxEssence+1);p.essence=p.maxEssence;this.draw(p);p.units.forEach(u=>u.exhausted=false);this.state.phase='deploy';this.note(`Turn ${this.state.turn}. You gained ${p.maxEssence} Essence.`);this.emit();
  }
  private gainGlory(p:Player,n:number){p.glory=Math.min(15,p.glory+n);const next=nextForm(p.element,p.evolutionStage);if(next&&this.canEvolve(p)&&p===this.state.player)this.note(`Evolution ready: ${next.title}! Enter the Evolution Phase.`)}
  private removeDefeated(){
    for(const p of [this.state.player,this.state.enemy]){
      const defeated=p.units.filter(u=>u.health<=0);p.units=p.units.filter(u=>u.health>0);
      for(const unit of defeated){const def=cardById(unit.cardId);if(!def)continue;const card=instance(def);if(p.element==='undead'&&this.state.turn<=p.endlessGraveUntilTurn){p.hand.push(card);this.note(`${unit.name} returns to hand through Endless Grave.`)}else p.graveyard.push(card)}
    }
  }
  private checkWinner(){if(this.state.enemy.health<=0)this.state.winner='victory';if(this.state.player.health<=0)this.state.winner='defeat'}
  restart(){const fresh=new HeroicsGame(this.fastMode,this.config,this.humanVsHuman);this.state=fresh.state;this.emit()}
}
