import assert from 'node:assert/strict';
import { HeroicsGame, Unit } from '../src/game';
import { currentForm, EVOLUTIONS } from '../src/evolution';
import { cardById, starterDeckIds } from '../src/cards';

interface MatchResult { winner:string; turns:number; playerStage:number; enemyStage:number }

function playPlayerTurn(game:HeroicsGame) {
  const s=game.state;
  if(s.winner)return;

  if(s.phase!=='deploy')throw new Error(`Player turn must begin in Deploy Phase, received ${s.phase}`);
  let changed=true;
  while(changed){
    changed=false;
    const abilityReserve=s.player.element!=='storm'&&currentForm(s.player.element,s.player.evolutionStage).abilityDamage>0&&s.player.essence>=2?2:0;
    const playable=[...s.player.hand]
      .filter(c=>c.cost<=s.player.essence-abilityReserve&&(c.kind!=='unit'||s.player.units.length<3)
        &&(!['thorned-rose-crown','crown-eternal-night','blade-forgotten-kings','gale-step-invocation','healing-downpour','stormforged-talons','gale-mantle-cloak','raincaller-totem'].includes(c.id)||s.player.units.length>0)
        &&(c.id!=='soul-harvest'||s.player.units.some(u=>u.health<=2))
        &&(c.id!=='death-mist'||s.enemy.units.length>0)
        &&(c.id!=='raise-the-fallen'||s.player.graveyard.some(card=>card.kind==='unit'))
        &&(c.id!=='endless-grave'||s.player.units.length>0))
      .sort((a,b)=>b.cost-a.cost)[0];
    if(playable){
      if(playable.id==='soul-harvest')game.selectUnit(s.player.units.find(u=>u.health<=2)!.uid);
      else if(['thorned-rose-crown','crown-eternal-night','blade-forgotten-kings','gale-step-invocation','healing-downpour','stormforged-talons','gale-mantle-cloak','raincaller-totem'].includes(playable.id))game.selectUnit(s.player.units[0].uid);
      const before=s.player.hand.length;game.playCard(playable.uid);changed=s.player.hand.length!==before;
    }
  }

  game.nextPhase();
  while(game.canEvolve(s.player))game.evolveLeader();

  game.nextPhase();
  for(const unit of [...s.player.units]){
    if(!unit.exhausted&&unit.position<2&&!s.enemy.units.some(enemy=>game.sameZone(unit,enemy))){game.selectUnit(unit.uid);game.advance()}
  }

  game.nextPhase();
  for(const unit of [...s.player.units]){
    if(!unit.exhausted){game.selectUnit(unit.uid);game.attack()}
  }
  if(s.player.element==='undead'||(s.player.element==='storm'||s.player.essence>=2)&&currentForm(s.player.element,s.player.evolutionStage).abilityDamage>0)game.leaderAbility();
  game.endTurn();
}

function simulateMatch(maxTurns=80,playerElement:'flame'|'tide'|'undead'|'storm'='flame',enemyElement:'flame'|'tide'|'undead'|'storm'='tide'):MatchResult {
  const game=new HeroicsGame(true,{playerElement,enemyElement});
  while(!game.state.winner&&game.state.turn<=maxTurns)playPlayerTurn(game);
  return {
    winner:game.state.winner??'stall',
    turns:game.state.turn,
    playerStage:game.state.player.evolutionStage,
    enemyStage:game.state.enemy.evolutionStage,
  };
}

function ruleTests(){
  const game=new HeroicsGame(true);
  const p=game.state.player;
  assert.equal(game.state.phase,'deploy','match starts in Deploy Phase');
  assert.equal(p.hand.length,5,'player draws five cards');
  assert.equal(game.state.enemy.hand.length,5,'AI draws five cards');
  assert.equal(EVOLUTIONS.flame.length,4,'Ignis has four forms');
  assert.equal(EVOLUTIONS.tide.length,4,'Shellgon has four forms');
  assert.equal(EVOLUTIONS.undead.length,4,'Queen of the Dead has four evolution forms');
  assert.equal(EVOLUTIONS.storm.length,4,'Tempestfang has four evolution forms');
  assert.equal(currentForm('undead',0).ability,'Raise Skeleton','Queen of the Dead can raise a Skeleton token');

  game.setPhase('battle');
  assert.equal(game.state.phase,'deploy','players cannot skip directly to Battle Phase');
  game.nextPhase();
  assert.equal(game.state.phase,'evolution','End Phase advances Deploy to Evolution');
  assert.equal(game.canEvolve(p),false,'evolution is locked before enough Glory');
  p.glory=3;
  assert.equal(game.canEvolve(p),true,'Level 10 unlocks at 3 Glory');
  const oldMax=p.maxHealth;
  game.evolveLeader();
  assert.equal(p.evolutionStage,1,'evolution advances one stage');
  assert.ok(p.maxHealth>oldMax,'evolution increases maximum health');
  assert.equal(currentForm(p.element,p.evolutionStage).level,10,'first evolution reaches Level 10');

  p.glory=12;
  game.evolveLeader();
  game.evolveLeader();
  assert.equal(p.evolutionStage,3,'Leader can reach the Level 20 ultimate form');
  assert.equal(game.canEvolve(p),false,'ultimate form cannot evolve again');

  const testUnit:Unit={uid:'test',cardId:'ember-squire',name:'Test Unit',attack:2,health:3,maxHealth:3,position:0,exhausted:false,element:'flame'};
  p.units=[testUnit];
  game.nextPhase();game.selectUnit('test');game.advance();
  assert.equal(testUnit.position,1,'Advance moves a unit one battlefield position');
  assert.equal(testUnit.exhausted,true,'moving exhausts a unit');

  const zoneGame=new HeroicsGame(true);
  const zoneAttacker:Unit={uid:'zone-attacker',cardId:'ember-squire',name:'Zone Attacker',attack:2,health:3,maxHealth:3,position:1,exhausted:false,element:'flame'};
  const wrongZone:Unit={uid:'wrong-zone',cardId:'pearl-scout',name:'Wrong Zone',attack:1,health:3,maxHealth:3,position:0,exhausted:false,element:'tide'};
  const localZone:Unit={uid:'local-zone',cardId:'pearl-scout',name:'Local Zone',attack:1,health:3,maxHealth:3,position:1,exhausted:false,element:'tide'};
  zoneGame.state.player.units=[zoneAttacker];zoneGame.state.enemy.units=[wrongZone,localZone];zoneGame.nextPhase();zoneGame.nextPhase();zoneGame.nextPhase();
  zoneGame.selectUnit(zoneAttacker.uid);zoneGame.selectTarget(wrongZone.uid);zoneGame.attack();
  assert.equal(wrongZone.health,3,'a unit cannot fight an enemy in another physical zone');
  zoneGame.selectTarget(wrongZone.uid);zoneGame.selectTarget(localZone.uid);zoneGame.attack();
  assert.equal(localZone.health,1,'a unit can fight an enemy occupying the same physical zone');

  const mirror=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame',playerDeckIds:['pearl-scout','coral-defender','crushing-wave','mending-tide','deep-wisdom']});
  assert.equal(mirror.state.player.element,'tide','deck builder can select Shellgon as the player Leader');
  assert.equal(mirror.state.enemy.element,'flame','deck builder can select the Fire AI opponent');
  assert.ok(mirror.state.player.hand.every(card=>card.element==='tide'),'custom player deck IDs are loaded into battle');

  const queen=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame',playerDeckIds:starterDeckIds('undead')});
  const q=queen.state.player;
  assert.equal(q.leader,'Queen of the Dead','Undead deck selects the Queen Leader');
  assert.equal(q.health,30,'Queen starts at 30 Health');
  queen.nextPhase();queen.nextPhase();queen.nextPhase();queen.leaderAbility();
  const skeleton=q.units.find(u=>u.cardId==='skeleton-token');
  assert.ok(skeleton,'Raise Skeleton summons a token');
  assert.equal(skeleton?.attack,1,'Skeleton token has 1 Attack');
  assert.equal(skeleton?.health,2,'Skeleton token has 2 Health');
  queen.leaderAbility();
  assert.equal(q.units.filter(u=>u.cardId==='skeleton-token').length,1,'Raise Skeleton is limited to once per turn');
  queen.state.phase='deploy';q.units=[];
  const card=(id:string,uid=id)=>({...cardById(id)!,uid});
  q.essence=20;
  q.hand=[card('undead-wizard','wizard')];
  q.deck=[card('gravebound-knight','knight'),card('death-mist','mist-in-deck')];
  queen.playCard('wizard');
  assert.ok(q.hand.some(c=>c.id==='gravebound-knight'),'Undead Wizard searches Gravebound Knight');
  const wizard=q.units[0];
  q.hand.push(card('thorned-rose-crown','rose'));
  queen.selectUnit(wizard.uid);queen.playCard('rose');
  assert.equal(wizard.attack,3,'Thorned Rose Crown grants +1 Attack');
  assert.equal(wizard.maxHealth,9,'Thorned Rose Crown grants +5 Health');
  assert.equal(wizard.shieldReady,true,'Thorned Rose Crown readies its damage prevention');

  queen.state.enemy.units=[{uid:'mist-target',cardId:'ember-squire',name:'Mist Target',attack:1,health:3,maxHealth:3,position:0,exhausted:false,element:'flame'}];
  q.hand.push(card('death-mist','mist'));queen.playCard('mist');
  assert.equal(queen.state.enemy.units.length,0,'Death Mist deals 3 to every enemy unit');

  q.health=20;q.deck=[card('raise-the-fallen','draw-a'),card('death-mist','draw-b')];
  q.hand.push(card('soul-harvest','harvest'));queen.selectUnit(wizard.uid);queen.playCard('harvest');
  assert.equal(q.health,24,'Soul Harvest heals the Queen for 4');
  assert.ok(q.graveyard.some(c=>c.id==='undead-wizard'),'Soul Harvest sends its chosen Unit to the graveyard');
  q.hand.push(card('raise-the-fallen','raise'));queen.playCard('raise');
  assert.ok(q.hand.some(c=>c.id==='undead-wizard'),'Raise the Fallen restores a Unit card');

  const gateGame=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'});
  const king:Unit={uid:'king',cardId:'forever-dead-king',name:'Forever Dead King',attack:6,health:8,maxHealth:8,position:1,exhausted:false,element:'undead'};
  gateGame.state.player.units=[king];gateGame.nextPhase();gateGame.nextPhase();gateGame.selectUnit('king');gateGame.advance();
  assert.equal(king.attack,8,'Forever Dead King gains +2 Attack at the enemy Gate');
  assert.equal(king.maxHealth,10,'Forever Dead King gains +2 Health at the enemy Gate');

  const tempest=new HeroicsGame(true,{playerElement:'storm',enemyElement:'flame',playerDeckIds:starterDeckIds('storm')});
  const t=tempest.state.player;t.essence=20;
  t.hand=[card('thunderheart-core','core'),card('boltstrike-surge','bolt'),card('gale-step-invocation','gale')];
  const raptor:Unit={uid:'raptor',cardId:'skyclaw-raptor',name:'Skyclaw Raptor',attack:2,health:1,maxHealth:1,position:0,exhausted:false,element:'storm',preventFirstDamage:true,shieldReady:true};
  t.units=[raptor];
  tempest.playCard('core');tempest.playCard('bolt');tempest.selectUnit('raptor');tempest.playCard('gale');
  assert.equal(t.magicCastTotal,2,'Tempestfang tracks total Magic cards cast');
  assert.equal(t.stormCharges,2,'Thunderheart Core gains one charge per Magic card');
  assert.equal(tempest.canEvolve(t),true,'Sky-Howler evolves after two Magic cards');
  tempest.nextPhase();tempest.evolveLeader();
  assert.equal(t.evolutionStage,1,'Tempestfang reaches Gale-Blooded');
  assert.equal(raptor.preventFirstDamage,true,'Gale-Blooded grants Wind Step to friendly units');
  t.damageLastTurn=6;
  assert.equal(tempest.canEvolve(t),true,'Gale-Blooded evolves after dealing six damage in one turn');
  tempest.evolveLeader();
  assert.equal(t.evolutionStage,2,'Tempestfang reaches Thunder-Crowned');
  t.stormCharges=3;
  assert.equal(tempest.canEvolve(t),true,'Thunder-Crowned evolves with three Storm Charges');
  tempest.evolveLeader();
  assert.equal(t.evolutionStage,3,'Tempestfang reaches Storm-Devourer');
  assert.equal(tempest.effectiveCost(t,cardById('healing-downpour')!),1,'Storm-Devourer reduces Magic costs to a minimum of one');
}

ruleTests();
const runs=200;
const results=Array.from({length:runs},()=>simulateMatch());
const victories=results.filter(r=>r.winner==='victory').length;
const defeats=results.filter(r=>r.winner==='defeat').length;
const stalls=results.filter(r=>r.winner==='stall').length;
const averageTurns=results.reduce((sum,r)=>sum+r.turns,0)/runs;
const ultimateRate=results.filter(r=>r.playerStage===3||r.enemyStage===3).length/runs;

assert.equal(stalls,0,`no simulated match should exceed 80 turns (stalls: ${stalls})`);
assert.ok(averageTurns>=4&&averageTurns<=35,`average match length should stay within 4–35 turns (actual: ${averageTurns.toFixed(1)})`);

console.log('\nHEROICS AUTOMATED PLAYTEST');
console.log('──────────────────────────');
console.log(`Matches simulated: ${runs}`);
console.log(`Ignis wins:       ${victories} (${(victories/runs*100).toFixed(1)}%)`);
console.log(`Shellgon wins:    ${defeats} (${(defeats/runs*100).toFixed(1)}%)`);
console.log(`Stalled matches:  ${stalls}`);
console.log(`Average turns:    ${averageTurns.toFixed(1)}`);
console.log(`Ultimate seen:    ${(ultimateRate*100).toFixed(1)}%`);
console.log('Rule checks:      PASS');

const winRate=victories/runs;
if(winRate>0.65)console.log('Balance note: Ignis is overperforming; reduce Solar ability damage or Glory gain.');
else if(winRate<0.35)console.log('Balance note: Shellgon is overperforming; reduce Tide unit durability or evolution healing.');
else console.log('Balance note: Win rates are inside the initial 35–65% target band.');

const matchupRuns=1;
for(const [player,enemy] of [['storm','flame'],['storm','tide'],['flame','storm'],['tide','storm']] as const){
  const matchup=Array.from({length:matchupRuns},()=>simulateMatch(80,player,enemy));
  const matchupStalls=matchup.filter(r=>r.winner==='stall').length;
  assert.equal(matchupStalls,0,`${player} vs ${enemy} should not stall`);
  console.log(`${player} vs ${enemy}: ${matchup.filter(r=>r.winner==='victory').length}/${matchupRuns} player wins, 0 stalls`);
}
