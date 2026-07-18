import assert from 'node:assert/strict';
import { HeroicsGame, Unit, ZONE_CAPACITY } from '../src/game';
import { currentForm, EVOLUTIONS } from '../src/evolution';
import { CardDef, Element, cardById, cardPool, starterDeckIds, zoneCards } from '../src/cards';

interface MatchResult { winner:string; turns:number; playerStage:number; enemyStage:number }
const targeted=new Set(['thorned-rose-crown','crown-eternal-night','blade-forgotten-kings','gale-step-invocation','healing-downpour','stormforged-talons','gale-mantle-cloak','raincaller-totem']);
const card=(id:string,uid=id)=>({...cardById(id)!,uid});
const unit=(overrides:Partial<Unit>={}):Unit=>({uid:'unit',cardId:'ember-squire',name:'Test Unit',attack:2,health:3,maxHealth:3,position:0,exhausted:false,element:'flame',traits:['Fire'],equipment:[],summonedTurn:1,attacksThisTurn:0,...overrides});

function playPlayerTurn(game:HeroicsGame) {
  const s=game.state;if(s.winner)return;
  if(s.phase!=='deploy')throw new Error(`Player turn must begin in Deploy Phase, received ${s.phase}`);
  let changed=true,safety=0;
  while(changed&&safety++<30){
    changed=false;
    const abilityReserve=s.player.element!=='storm'&&s.player.element!=='undead'&&!s.player.leaderAbilityUsed&&currentForm(s.player.element,s.player.evolutionStage).abilityDamage>0&&s.player.essence>=2?2:0;
    const playable=[...s.player.hand]
      .filter(c=>(game.effectiveCost(s.player,c)<=s.player.essence-abilityReserve)
        &&(c.kind!=='unit'||game.gateSlotsOpen(s.player)>0)
        &&(!targeted.has(c.id)||s.player.units.length>0)
        &&(c.id!=='soul-harvest'||s.player.units.some(u=>u.health<=2&&u.traits.includes('Undead')))
        &&(c.id!=='death-mist'||s.enemy.units.length>0)
        &&(c.id!=='raise-the-fallen'||s.player.graveyard.some(candidate=>candidate.kind==='unit'))
        &&(c.id!=='endless-grave'||s.player.units.length>0)
        &&(c.id!=='queens-destruction'||s.player.units.length>0&&s.enemy.units.length>0)
        &&(c.id!=='ultimate-sacrifice'||s.player.hand.some(candidate=>candidate.uid!==c.uid&&candidate.kind==='unit'))
        &&(c.id!=='for-the-queen'||game.gateSlotsOpen(s.player)>0&&s.player.deck.some(candidate=>candidate.kind==='unit'&&candidate.id!=='forever-dead-king')))
      .sort((a,b)=>game.effectiveCost(s.player,b)-game.effectiveCost(s.player,a))[0];
    if(playable){
      if(playable.id==='soul-harvest')game.selectUnit(s.player.units.find(u=>u.health<=2&&u.traits.includes('Undead'))!.uid);
      else if(targeted.has(playable.id))game.selectUnit(s.player.units[0].uid);
      const before=s.player.hand.length;game.playCard(playable.uid);changed=s.player.hand.length!==before;
    }
  }

  if(s.player.element==='undead'||s.player.element==='storm'||s.player.essence>=2)game.leaderAbility();
  game.nextPhase();while(game.canEvolve(s.player))game.evolveLeader();
  game.nextPhase();
  for(const actor of [...s.player.units]){
    if(!actor.exhausted&&!s.enemy.units.some(enemy=>game.sameZone(actor,enemy))){game.selectUnit(actor.uid);game.advance()}
  }
  game.nextPhase();
  for(const actor of [...s.player.units]){
    if(!actor.exhausted){game.selectUnit(actor.uid);game.attack();if(actor.cardId==='forsaken-prince'&&!actor.exhausted){game.selectUnit(actor.uid);game.attack()}}
  }
  game.endTurn();
}

function simulateMatch(maxTurns=100,playerElement:Element='flame',enemyElement:Element='tide'):MatchResult {
  const game=new HeroicsGame(true,{playerElement,enemyElement});
  while(!game.state.winner&&game.state.turn<=maxTurns)playPlayerTurn(game);
  return {winner:game.state.winner??'stall',turns:game.state.turn,playerStage:game.state.player.evolutionStage,enemyStage:game.state.enemy.evolutionStage};
}

function addToHand(game:HeroicsGame,id:string,uid=id){const p=game.state.player;p.hand.push(card(id,uid));p.essence=30;return p.hand[p.hand.length-1]}

function ruleTests(){
  const game=new HeroicsGame(true),p=game.state.player;
  assert.equal(game.state.phase,'deploy','match starts in Deploy Phase');
  assert.equal(p.hand.length,5,'player draws five cards');
  assert.equal(game.state.enemy.hand.length,5,'AI draws five cards');
  assert.equal(ZONE_CAPACITY,3,'every battlefield Zone has three Gate slots per player');
  assert.equal(zoneCards.length,9,'all nine Gate-named Zone cards exist');
  assert.ok(zoneCards.every(zone=>zone.kind==='zone'&&zone.name.endsWith('Gate')),'Field cards are classified as Zones while retaining Gate names');
  assert.equal(EVOLUTIONS.flame.length,4,'Ignis has four forms');
  assert.equal(EVOLUTIONS.tide.length,4,'Shellgon has four forms');
  assert.equal(EVOLUTIONS.undead.length,4,'Queen has four forms');
  assert.equal(EVOLUTIONS.storm.length,4,'Tempestfang has four forms');

  p.essence=20;const originalEnemyHealth=game.state.enemy.health;
  game.leaderAbility();const afterFirst=game.state.enemy.health;game.leaderAbility();
  assert.ok(afterFirst<originalEnemyHealth,'Ignis can use Solar Slash');
  assert.equal(game.state.enemy.health,afterFirst,'Ignis cannot use his ability twice in one turn');
  assert.equal(p.leaderAbilityUsed,true,'Ignis records the once-per-turn ability use');

  addToHand(game,'firebolt','late-firebolt');game.nextPhase();game.nextPhase();
  const healthBeforeMagic=game.state.enemy.health;game.playCard('late-firebolt');
  assert.equal(game.state.enemy.health,healthBeforeMagic-3,'Magic cards can be cast during Advance Phase');

  const gateGame=new HeroicsGame(true);
  const gp=gateGame.state.player;gp.essence=30;gp.hand=[card('ember-squire','g1'),card('ember-squire','g2'),card('ember-squire','g3'),card('ember-squire','g4')];
  gateGame.playCard('g1');gateGame.playCard('g2');gateGame.playCard('g3');gateGame.playCard('g4');
  assert.equal(gp.units.length,3,'a Zone cannot hold more than three friendly Units');
  assert.ok(gp.hand.some(c=>c.uid==='g4'),'a fourth summon remains in hand when all home Gates are occupied');

  gp.units.forEach(u=>u.exhausted=false);gateGame.nextPhase();gateGame.nextPhase();
  gateGame.state.enemy.units=[unit({uid:'blocker',cardId:'pearl-scout',element:'tide',traits:['Water'],position:2})];
  const blocked=gp.units[0];gateGame.selectUnit(blocked.uid);gateGame.advance();
  assert.equal(blocked.position,0,'enemy Units in the current Zone block movement to the next Zone');
  gateGame.state.enemy.units=[];gateGame.advance();
  assert.equal(blocked.position,1,'a Unit can advance after its current Zone is cleared');
  gp.essence=30;gateGame.state.phase='deploy';gateGame.playCard('g4');
  assert.equal(gp.units.length,4,'moving a Unit opens a home Gate for another summon');
  assert.equal(gp.units.filter(u=>u.position===0).length,3,'the home Zone still respects its three-Gate limit');

  const combat=new HeroicsGame(true);
  const attacker=unit({uid:'attacker',position:1}),wrong=unit({uid:'wrong',cardId:'pearl-scout',element:'tide',traits:['Water'],position:0}),local=unit({uid:'local',cardId:'pearl-scout',element:'tide',traits:['Water'],position:1});
  combat.state.player.units=[attacker];combat.state.enemy.units=[wrong,local];combat.nextPhase();combat.nextPhase();combat.nextPhase();
  combat.selectUnit(attacker.uid);combat.selectTarget(wrong.uid);combat.attack();assert.equal(wrong.health,3,'Units cannot battle across Zones');
  combat.selectTarget(wrong.uid);combat.selectTarget(local.uid);combat.attack();assert.equal(local.health,1,'Units can battle in the same physical Zone');

  const zones=new HeroicsGame(true,{playerElement:'storm',enemyElement:'flame'}),zp=zones.state.player;
  zp.essence=30;zp.hand=[card('desert-gate','desert'),card('skyclaw-raptor','beast')];zones.playCard('desert');zones.playCard('beast');
  assert.equal(zp.units[0].maxHealth,6,'Desert Gate grants Beast units +5 Health');
  zp.hand.push(card('volcano-gate','volcano'));zones.playCard('volcano');
  assert.equal(zp.units[0].maxHealth,1,'replacing Desert Gate removes its continuous Health bonus');
  assert.ok(zp.graveyard.some(c=>c.id==='desert-gate'),'the replaced Zone enters the graveyard');

  const desertTurn=new HeroicsGame(true,{playerElement:'flame',enemyElement:'tide'},true),dp=desertTurn.state.player;dp.essence=30;dp.hand=[card('desert-gate','desert-start')];desertTurn.playCard('desert-start');dp.maxEssence=2;desertTurn.beginOnlineTurn();
  assert.equal(dp.essence,4,'Desert Gate grants 1 bonus Essence at turn start when no Water Unit is controlled');

  const ocean=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame'}),op=ocean.state.player;op.essence=30;op.hand=[card('ocean-gate','ocean'),card('pearl-scout','water-unit')];ocean.playCard('ocean');ocean.playCard('water-unit');
  assert.equal(op.units[0].maxHealth,4,'Ocean Gate gives Water Units +1 Health');op.health=20;op.hand.push(card('coral-plate','ocean-heal'));ocean.playCard('ocean-heal');assert.equal(op.health,25,'Ocean Gate adds 1 to healing effects');

  const volcano=new HeroicsGame(true,{playerElement:'flame',enemyElement:'tide'}),vp=volcano.state.player;vp.essence=30;vp.hand=[card('volcano-gate','volcano-zone'),card('ember-squire','fire-unit'),card('firebolt','fire-one'),card('firebolt','fire-two')];volcano.playCard('volcano-zone');volcano.playCard('fire-unit');
  assert.equal(vp.units[0].attack,3,'Volcano Gate gives Fire Units +1 Power');assert.equal(volcano.effectiveCost(vp,vp.hand.find(c=>c.uid==='fire-one')!),1,'the first Fire Magic card costs 1 less');volcano.playCard('fire-one');assert.equal(volcano.effectiveCost(vp,vp.hand.find(c=>c.uid==='fire-two')!),2,'only the first Fire Magic card receives the discount');

  const field=new HeroicsGame(true),fp=field.state.player;fp.essence=30;fp.hand=[card('field-gate','field'),card('ember-squire','runner')];field.playCard('field');field.playCard('runner');
  const runner=fp.units[0];assert.equal(runner.maxHealth,3,'Field Gate gives newly summoned Units +1 temporary Health');runner.exhausted=false;field.nextPhase();field.nextPhase();field.selectUnit(runner.uid);field.advance();assert.equal(runner.position,2,'Field Gate grants +1 Movement Range');

  const fog=new HeroicsGame(true,{playerElement:'flame',enemyElement:'tide'}),fogp=fog.state.player;fogp.essence=30;fogp.hand=[card('field-gate','field-speed'),card('ember-squire','fog-runner')];fog.playCard('field-speed');fog.playCard('fog-runner');fog.state.enemy.activeZone=card('fog-marsh-gate','enemy-fog');const fogRunner=fogp.units[0];fogRunner.exhausted=false;fog.nextPhase();fog.nextPhase();fog.selectUnit(fogRunner.uid);fog.advance();
  assert.equal(fogRunner.position,1,'Fog Marsh removes one bonus Speed while preserving normal movement');

  const fogShield=new HeroicsGame(true),fsp=fogShield.state.player;fsp.essence=30;fsp.hand=[card('fog-marsh-gate','fog-zone'),card('ember-squire','fog-unit')];fogShield.playCard('fog-zone');fogShield.playCard('fog-unit');assert.equal(fsp.units[0].shieldReady,true,'Fog Marsh grants newly summoned Units Wind Step through the enemy turn');

  const lightning=new HeroicsGame(true,{playerElement:'storm',enemyElement:'flame'}),lp=lightning.state.player;lp.essence=30;lp.hand=[card('lightning-plains-gate','lightning-zone'),card('skyclaw-raptor','lightning-unit')];lightning.playCard('lightning-zone');lightning.playCard('lightning-unit');const lightningUnit=lp.units[0];lightningUnit.position=1;lightningUnit.exhausted=false;const lightningTarget=unit({uid:'lightning-target',health:5,maxHealth:5,position:1});lightning.state.enemy.units=[lightningTarget];lightning.nextPhase();lightning.nextPhase();lightning.nextPhase();lightning.selectUnit(lightningUnit.uid);lightning.selectTarget(lightningTarget.uid);lightning.attack();assert.equal(lightningTarget.health,2,'Lightning Plains adds +1 Power on a Lightning Unit’s first attack');

  const frost=new HeroicsGame(true),frostAttacker=unit({uid:'frost-attacker',position:1}),frostTarget=unit({uid:'frost-target',cardId:'pearl-scout',element:'tide',traits:['Water'],health:3,maxHealth:3,position:1});frost.state.player.units=[frostAttacker];frost.state.enemy.units=[frostTarget];frost.state.enemy.activeZone=card('frost-peaks-gate','frost-zone');frost.nextPhase();frost.nextPhase();frost.nextPhase();frost.selectUnit(frostAttacker.uid);frost.selectTarget(frostTarget.uid);frost.attack();assert.equal(frostTarget.health,2,'Frost Peaks reduces damage to Water Units by 1');

  const shadow=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),sp=shadow.state.player;sp.essence=30;sp.hand=[card('shadow-ruins-gate','shadow-zone'),card('grave-banshee','dark-attacker')];shadow.playCard('shadow-zone');shadow.playCard('dark-attacker');const dark=sp.units[0];dark.position=2;dark.exhausted=false;const leaderBefore=shadow.state.enemy.health;shadow.nextPhase();shadow.nextPhase();shadow.nextPhase();shadow.selectUnit(dark.uid);shadow.attack();assert.equal(shadow.state.enemy.health,leaderBefore-dark.attack-1,'Shadow Ruins gives Dark Units +1 Power against Leaders');

  const queen=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame',playerDeckIds:starterDeckIds('undead')}),q=queen.state.player;
  assert.ok(['grave-banshee','queens-guardsman','forsaken-prince','skeleton-bone-parlor','queens-destruction'].every(id=>cardPool.undead.some(c=>c.id===id)),'the expanded Queen card list is available');
  q.essence=50;q.hand=[card('undead-wizard','wizard')];q.deck=[card('gravebound-knight','knight'),card('forever-dead-king','king'),card('death-mist','mist')];queen.playCard('wizard');
  assert.equal(q.units.length,2,'Undead Wizard deploys Gravebound Knight directly when a Gate is open');
  assert.ok(q.units.some(u=>u.cardId==='gravebound-knight'),'Gravebound Knight occupies a Gate');
  assert.ok(q.hand.some(c=>c.id==='forever-dead-king'),'the deployed Knight searches Forever Dead King into hand');

  const queenAbility=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),qa=queenAbility.state.player;
  queenAbility.leaderAbility();queenAbility.leaderAbility();
  assert.equal(qa.units.filter(u=>u.cardId==='skeleton-token').length,1,'Queen summons one 1/2 Skeleton once per turn');
  assert.equal(qa.units[0].attack,1);assert.equal(qa.units[0].health,2);

  q.hand.push(card('thorned-rose-crown','rose'));const wizard=q.units.find(u=>u.cardId==='undead-wizard')!;queen.selectUnit(wizard.uid);queen.playCard('rose');
  assert.equal(wizard.attack,4,'Thorned Rose Crown grants the revised +2 Attack');
  assert.equal(wizard.maxHealth,9,'Thorned Rose Crown grants +5 Health');
  q.health=20;q.hand.push(card('soul-harvest','harvest'));queen.selectUnit(wizard.uid);queen.playCard('harvest');
  assert.equal(q.health,25,'Soul Harvest uses the revised 5 Health recovery');

  const revive=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),rp=revive.state.player;rp.essence=30;rp.graveyard=[card('grave-banshee','fallen-banshee')];rp.hand=[card('raise-the-fallen','raise')];
  revive.playCard('raise',{cardUids:['fallen-banshee']});
  assert.ok(rp.units.some(u=>u.cardId==='grave-banshee'),'Raise the Fallen deploys a chosen Unit directly from the graveyard');
  assert.ok(!rp.graveyard.some(c=>c.uid==='fallen-banshee'),'the revived Unit leaves the graveyard');

  const bansheeGame=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),bp=bansheeGame.state.player;
  bp.units=[unit({uid:'banshee',cardId:'grave-banshee',name:'Grave Banshee',element:'undead',traits:['Undead','Spirit','Dark']})];bansheeGame.state.enemy.units=[unit({uid:'victim',attack:5})];bansheeGame.nextPhase();
  bansheeGame.unitAbility('banshee');bansheeGame.unitAbility('banshee');
  assert.equal(bansheeGame.state.enemy.units[0].attack,3,'Grave Banshee ability works outside Deploy and only applies once');

  const kingGame=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),kingPlayer=kingGame.state.player;kingPlayer.essence=30;kingPlayer.hand=[card('forever-dead-king','gate-king')];kingGame.playCard('gate-king');
  const king=kingPlayer.units[0];assert.equal(king.attack,8,'Gatekeeper grants +2 Attack at the owner’s Gate');assert.equal(king.maxHealth,10,'Gatekeeper grants +2 Health at the owner’s Gate');
  king.exhausted=false;kingGame.nextPhase();kingGame.nextPhase();kingGame.selectUnit(king.uid);kingGame.advance();assert.equal(king.attack,6,'Gatekeeper bonus ends after leaving the owner’s Gate');

  const cemetery=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),cp=cemetery.state.player;cp.essence=30;cp.hand=[card('cemetery-gate','cemetery-zone'),card('grave-banshee','cemetery-unit')];cemetery.playCard('cemetery-zone');cemetery.playCard('cemetery-unit');
  assert.equal(cp.units[0].attack,5,'Cemetery Gate grants Undead +3 Attack');cp.units[0].health=0;(cemetery as any).removeDefeated();
  assert.equal(cp.cemetery.length,1,'defeated Undead cards enter the Cemetery pile');assert.equal(cp.graveyard.length,0,'Cemetery Gate keeps defeated Undead out of the graveyard');

  const sacrifice=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),sacp=sacrifice.state.player;sacp.essence=30;sacp.hand=[card('ultimate-sacrifice','sacrifice-spell'),card('grave-banshee','discard-one'),card('queens-guardsman','discard-two')];sacrifice.playCard('sacrifice-spell',{cardUids:['discard-one','discard-two']});
  assert.equal(sacp.graveyard.filter(c=>c.kind==='unit').length,2,'Ultimate Sacrifice discards two chosen Unit cards');

  const muster=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),mp=muster.state.player;mp.essence=30;mp.hand=[card('for-the-queen','muster-spell')];mp.deck=[card('grave-banshee','muster-one'),card('queens-guardsman','muster-two'),card('forever-dead-king','forbidden-king')];muster.playCard('muster-spell',{cardUids:['muster-one','muster-two','forbidden-king']});
  assert.equal(mp.units.length,2,'For the Queen deploys up to two chosen eligible Units');assert.ok(mp.deck.some(c=>c.uid==='forbidden-king'),'For the Queen cannot deploy Forever Dead King');

  const destruction=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),destructionP=destruction.state.player;destructionP.essence=30;destructionP.units=[unit({uid:'friendly-sacrifice',cardId:'grave-banshee',element:'undead',traits:['Undead','Spirit','Dark']})];destruction.state.enemy.units=[unit({uid:'destroy-one'}),unit({uid:'destroy-two'}),unit({uid:'survivor'})];destructionP.hand=[card('queens-destruction','destruction-spell')];destruction.playCard('destruction-spell',{friendlyUnitUids:['friendly-sacrifice'],enemyUnitUids:['destroy-one','destroy-two']});
  assert.equal(destructionP.units.length,0,'Queen’s Destruction sacrifices the chosen friendly Unit');assert.deepEqual(destruction.state.enemy.units.map(u=>u.uid),['survivor'],'Queen’s Destruction destroys up to two chosen enemy Units');

  const guardGame=new HeroicsGame(true),guardAttacker=unit({uid:'guard-attacker',position:1,attack:3}),guard=unit({uid:'royal-guard',cardId:'queens-guardsman',name:'Queen’s Guardsman',element:'undead',traits:['Undead','Soldier','Dark'],position:1,health:6,maxHealth:6}),protectedUnit=unit({uid:'protected',cardId:'grave-banshee',element:'undead',traits:['Undead','Spirit','Dark'],position:1});guardGame.state.player.units=[guardAttacker];guardGame.state.enemy.units=[guard,protectedUnit];guardGame.nextPhase();guardGame.nextPhase();guardGame.nextPhase();guardGame.selectUnit(guardAttacker.uid);guardGame.selectTarget(protectedUnit.uid);guardGame.attack();assert.equal(protectedUnit.health,3,'Royal Guard prevents attacks on other Units in its Zone');guardGame.selectTarget(protectedUnit.uid);guardGame.selectTarget(guard.uid);guardGame.attack();assert.equal(guard.health,3,'the attacker may target Queen’s Guardsman');

  const princeGame=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),prince=unit({uid:'prince',cardId:'forsaken-prince',name:'The Forsaken Prince',element:'undead',traits:['Undead','Royal','Dark'],position:1,attack:5,health:10,maxHealth:10});princeGame.state.player.units=[prince];const princeTargetOne=unit({uid:'prince-target-one',position:1,health:6,maxHealth:6,attack:1}),princeTargetTwo=unit({uid:'prince-target-two',position:1,health:6,maxHealth:6,attack:1});princeGame.state.enemy.units=[princeTargetOne,princeTargetTwo];princeGame.nextPhase();princeGame.nextPhase();princeGame.nextPhase();princeGame.selectUnit(prince.uid);princeGame.selectTarget(princeTargetOne.uid);princeGame.attack();assert.equal(prince.exhausted,false,'The Forsaken Prince remains ready after its first Unit attack');princeGame.selectUnit(prince.uid);princeGame.selectTarget(princeTargetTwo.uid);princeGame.attack();assert.equal(prince.exhausted,true,'The Forsaken Prince exhausts after its second Unit attack');

  const royalBlood=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),rbp=royalBlood.state.player;rbp.essence=50;rbp.hand=[card('forsaken-prince','blood-prince'),card('forever-dead-king','blood-king')];royalBlood.playCard('blood-prince');royalBlood.playCard('blood-king');const bloodPrince=rbp.units.find(u=>u.cardId==='forsaken-prince')!;assert.equal(bloodPrince.attack,8,'Royal Blood grants The Forsaken Prince +3 Attack beside the King');assert.equal(bloodPrince.maxHealth,9,'Royal Blood grants +3 Health beside the King');

  const boneGame=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),boneP=boneGame.state.player;boneP.essence=30;boneP.hand=[card('skeleton-bone-parlor','bone-parlor')];boneGame.playCard('bone-parlor');boneGame.leaderAbility();const parlor=boneP.units.find(u=>u.cardId==='skeleton-bone-parlor')!,token=boneP.units.find(u=>u.cardId==='skeleton-token')!;assert.equal(parlor.attack,8,'Bone Parlor gains +2 Attack for another Skeleton in its Zone');assert.equal(token.attack,3,'Bone Parlor grants other Skeletons +2 Attack');

  const deathBurst=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),dbp=deathBurst.state.player;dbp.units=[unit({uid:'burst-prince',cardId:'forsaken-prince',element:'undead',traits:['Undead','Royal','Dark'],health:0})];deathBurst.state.enemy.units=[unit({uid:'burst-target',health:5,maxHealth:5})];(deathBurst as any).removeDefeated();assert.equal(deathBurst.state.enemy.units[0].health,3,'The Forsaken Prince deals 2 damage to all enemy Units when defeated');

  const reaperGame=new HeroicsGame(true,{playerElement:'undead',enemyElement:'flame'}),reaperP=reaperGame.state.player;reaperP.health=20;const reaper=unit({uid:'reaper',cardId:'cemetery-reaper',name:'Cemetery Reaper',element:'undead',traits:['Undead','Reaper','Dark'],position:1,attack:6,health:5,maxHealth:5}),reaperVictim=unit({uid:'reaper-victim',position:1,health:1,maxHealth:1,attack:0});reaperP.units=[reaper];reaperGame.state.enemy.units=[reaperVictim];reaperGame.nextPhase();reaperGame.nextPhase();reaperGame.nextPhase();reaperGame.selectUnit(reaper.uid);reaperGame.selectTarget(reaperVictim.uid);reaperGame.attack();assert.equal(reaperP.health,25,'Cemetery Reaper heals the Queen for the revised 5 Health after a kill');

  const mirror=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame',playerDeckIds:['pearl-scout','ocean-gate','mending-tide']});
  assert.equal(mirror.state.player.element,'tide');assert.ok(mirror.state.player.hand.every(c=>c.element==='tide'||c.element==='neutral'),'neutral Zone cards are legal in every faction deck');
}

ruleTests();
const runs=200,results=Array.from({length:runs},()=>simulateMatch());
const victories=results.filter(r=>r.winner==='victory').length,defeats=results.filter(r=>r.winner==='defeat').length,stalls=results.filter(r=>r.winner==='stall').length;
const averageTurns=results.reduce((sum,r)=>sum+r.turns,0)/runs,ultimateRate=results.filter(r=>r.playerStage===3||r.enemyStage===3).length/runs;
assert.equal(stalls,0,`no simulated match should exceed 100 turns (stalls: ${stalls})`);
assert.ok(averageTurns>=4&&averageTurns<=45,`average match length should stay within 4–45 turns (actual: ${averageTurns.toFixed(1)})`);

console.log('\nHEROICS AUTOMATED PLAYTEST');
console.log('──────────────────────────');
console.log(`Matches simulated: ${runs}`);
console.log(`Ignis wins:       ${victories} (${(victories/runs*100).toFixed(1)}%)`);
console.log(`Shellgon wins:    ${defeats} (${(defeats/runs*100).toFixed(1)}%)`);
console.log(`Stalled matches:  ${stalls}`);
console.log(`Average turns:    ${averageTurns.toFixed(1)}`);
console.log(`Ultimate seen:    ${(ultimateRate*100).toFixed(1)}%`);
console.log('Rule checks:      PASS');

const matchupRuns=2;
for(const [player,enemy] of [['storm','flame'],['storm','tide'],['undead','flame']] as const){
  const matchup=Array.from({length:matchupRuns},()=>simulateMatch(100,player,enemy)),matchupStalls=matchup.filter(r=>r.winner==='stall').length;
  assert.equal(matchupStalls,0,`${player} vs ${enemy} should not stall`);
  console.log(`${player} vs ${enemy}: ${matchup.filter(r=>r.winner==='victory').length}/${matchupRuns} player wins, 0 stalls`);
}
