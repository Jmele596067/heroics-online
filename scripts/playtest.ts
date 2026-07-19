import assert from 'node:assert/strict';
import { BLOCKED_GATE_COORDINATES, FIXED_ZONE_COORDINATES, HeroicsGame, Unit, ZONE_CAPACITY } from '../src/game';
import { EVOLUTIONS } from '../src/evolution';
import { CardDef, Element, allCards, cardAllowedForLeader, cardById, makeCustomDeck, starterDeckIds, zoneCards } from '../src/cards';
import { DECK_SIZE } from '../src/deck';

const card=(id:string,uid=id)=>({...cardById(id)!,uid});
const unit=(overrides:Partial<Unit>={}):Unit=>({uid:'unit',cardId:'ember-squire',name:'Test Unit',attack:2,health:3,maxHealth:3,position:0,exhausted:false,element:'flame',traits:['Fire'],equipment:[],summonedTurn:1,attacksThisTurn:0,...overrides});
const targeted=new Set(['coral-plate','thorned-rose-crown','crown-eternal-night','blade-forgotten-kings','gale-step-invocation','healing-downpour','stormforged-talons','gale-mantle-cloak','raincaller-totem']);

function playPlayerTurn(game:HeroicsGame){
  const s=game.state;if(s.winner)return;
  for(const c of [...s.player.hand].sort((a,b)=>b.cost-a.cost)){
    if(game.effectiveCost(s.player,c)>s.player.essence)continue;
    if(c.kind==='unit'&&game.gateSlotsOpen(s.player)<=0)continue;
    if(targeted.has(c.id)&&!s.player.units.length)continue;
    if(targeted.has(c.id))game.selectUnit(s.player.units[0].uid);
    game.playCard(c.uid);
  }
  if(game.canEvolve(s.player))game.evolveLeader();
  game.nextPhase();
  if(s.player.element==='flame')game.leaderAbility('damage');
  if(s.player.element==='tide'&&s.player.units.length){game.selectUnit(s.player.units[0].uid);game.leaderAbility('heal')}
  if(s.player.element==='undead')game.leaderAbility();
  if(s.player.element==='storm')game.leaderAbility('damage');
  for(const actor of [...s.player.units]){
    if(actor.exhausted)continue;
    const target=s.enemy.units.find(enemy=>game.sameZone(actor,enemy));
    game.selectUnit(actor.uid);
    if(target){game.selectTarget(target.uid);game.attack()}
    else if(actor.position<2){game.selectTile(actor.position===0?s.player.homeTileId===0?1:1:2-s.player.homeTileId);game.advance()}
    else game.attack();
  }
  game.leaderAttack();
  game.endTurn();
}

function simulate(maxTurns=100,playerElement:Element='flame',enemyElement:Element='tide'){
  const game=new HeroicsGame(true,{playerElement,enemyElement});
  while(!game.state.winner&&game.state.turn<=maxTurns)playPlayerTurn(game);
  return {winner:game.state.winner??'stall',turns:game.state.turn};
}

function rules(){
  assert.equal(DECK_SIZE,40);
  assert.equal(starterDeckIds('flame').length,40);
  assert.ok(allCards.every(card=>(['flame','tide','undead','storm'] as Element[]).every(leader=>cardAllowedForLeader(card,leader))),'every Leader can use every card');
  const universalIds=[...starterDeckIds('flame')];universalIds[0]='kraken';assert.ok(makeCustomDeck(universalIds,'flame').some(card=>card.id==='kraken'),'mixed-attribute custom decks are preserved');
  assert.equal(ZONE_CAPACITY,3);
  assert.equal(zoneCards.length,11);
  assert.ok(Object.values(EVOLUTIONS).every(forms=>forms.length===4));

  const phases=new HeroicsGame(true);assert.equal(phases.state.phase,'deploy');phases.nextPhase();assert.equal(phases.state.phase,'battle');
  const late=card('firebolt','late');phases.state.player.hand=[late];phases.state.player.essence=5;const before=phases.state.enemy.health;phases.playCard('late');assert.equal(phases.state.enemy.health,before-3,'Magic is usable in Battle');

  const combat=new HeroicsGame(true);const attacker=unit({uid:'attacker',position:1,attack:3}),defender=unit({uid:'defender',position:1,attack:9,health:8,maxHealth:8});combat.state.player.units=[attacker];combat.state.enemy.units=[defender];combat.nextPhase();combat.selectUnit(attacker.uid);combat.beginAttack();assert.equal(combat.state.attackMode,'unit');combat.selectTarget(defender.uid);combat.attack();assert.equal(defender.health,5);assert.equal(attacker.health,3,'attacks never counterattack');

  const cancel=new HeroicsGame(true);cancel.state.player.units=[unit({uid:'cancel-unit'})];cancel.nextPhase();cancel.selectUnit('cancel-unit');cancel.beginAttack();cancel.cancelAttack();assert.equal(cancel.state.attackMode,null);assert.equal(cancel.state.phase,'battle');

  const contested=new HeroicsGame(true);const blocked=unit({uid:'blocked'});contested.state.player.units=[blocked];contested.state.enemy.units=[unit({uid:'blocker',position:2})];contested.nextPhase();contested.selectUnit(blocked.uid);contested.selectTile(1);contested.advance();assert.equal(blocked.position,0);blocked.traits.push('Sneak');blocked.exhausted=false;contested.advance();assert.equal(blocked.position,1,'Sneak passes a contested tile');

  const zones=new HeroicsGame(true);zones.state.player.essence=10;zones.state.player.hand=[card('desert-gate','desert'),card('ocean-gate','ocean')];zones.beginZonePlacement('desert');const first=zones.availableZonePlacements(0)[0];zones.placeZone(first.q,first.r,0);assert.equal(zones.state.tiles.length,4);const desertTile=zones.state.tiles.find(tile=>tile.zoneCard?.id==='desert-gate')!;zones.selectTile(desertTile.id);zones.beginZonePlacement('ocean');const second=zones.availableZonePlacements(desertTile.id)[0];zones.placeZone(second.q,second.r,desertTile.id);assert.equal(zones.state.tiles.length,5);assert.ok(zones.areAdjacent(desertTile.id,zones.state.tiles.find(tile=>tile.zoneCard?.id==='ocean-gate')!.id));
  const explorer=unit({uid:'explorer',exhausted:false});zones.state.player.units=[explorer];zones.nextPhase();zones.selectUnit('explorer');zones.selectTile(desertTile.id);zones.advance();assert.equal(explorer.position,desertTile.id,'a unit can enter a newly created Zone during the same turn');
  const fullMap=new HeroicsGame(true);fullMap.state.player.essence=99;fullMap.state.player.hand=['desert-gate','ocean-gate','volcano-gate','field-gate','fog-marsh-gate'].map((id,i)=>card(id,`zone-${i}`));for(let i=0;i<4;i++){const uid=`zone-${i}`;fullMap.beginZonePlacement(uid);const anchor=fullMap.state.selectedTile??0,place=fullMap.availableZonePlacements(anchor)[0]??fullMap.availableZonePlacements(0)[0];fullMap.placeZone(place.q,place.r,place.anchorId)}assert.equal(fullMap.state.tiles.length,7,'the field grows from 3 to a maximum of 7 tiles');fullMap.beginZonePlacement('zone-4');assert.equal(fullMap.state.pendingZoneUid,null,'an eighth field tile cannot be started');

  const ignis=new HeroicsGame(true);ignis.nextPhase();const enemyBefore=ignis.state.enemy.health;ignis.leaderAbility('damage');ignis.leaderAbility('damage');assert.equal(ignis.state.enemy.health,enemyBefore-5);assert.equal(ignis.state.player.abilityPoints,0);
  ignis.state.player.glory=15;ignis.evolveLeader();assert.equal(ignis.state.player.maxHealth,36);assert.equal(ignis.state.player.maxAbilityPoints,3);const stage=ignis.state.player.evolutionStage;ignis.evolveLeader();assert.equal(ignis.state.player.evolutionStage,stage,'evolution is once per turn');

  const shellgon=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame'});shellgon.state.player.units=[unit({uid:'patient',element:'tide',health:1,maxHealth:10})];shellgon.nextPhase();shellgon.selectUnit('patient');shellgon.leaderAbility('heal');assert.equal(shellgon.state.player.units[0].health,4);assert.equal(shellgon.state.player.abilityPoints,0);

  const pearl=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame'});pearl.state.player.essence=10;pearl.state.player.hand=[card('pearl-scout','pearl')];pearl.state.player.deck=[card('mending-tide','mending')];pearl.playCard('pearl');assert.ok(pearl.state.player.hand.some(c=>c.id==='mending-tide'));
  const fire=new HeroicsGame(true);fire.state.player.essence=10;fire.state.player.hand=[card('ember-squire','ember')];fire.state.player.deck=[card('sunblade','blade')];fire.playCard('ember');assert.ok(fire.state.player.hand.some(c=>c.id==='sunblade'));

  const block=new HeroicsGame(true);const striker=unit({uid:'striker',position:1,attack:4}),protectedUnit=unit({uid:'protected',position:1,health:6,maxHealth:6}),coral=unit({uid:'coral',cardId:'coral-defender',name:'Coral Defender',position:1,element:'tide',traits:['Water','Defender','Block'],health:10,maxHealth:10});block.state.player.units=[striker];block.state.enemy.units=[protectedUnit,coral];block.nextPhase();block.selectUnit('striker');block.selectTarget('protected');block.attack();assert.equal(protectedUnit.health,6);assert.equal(coral.health,6,'Coral Defender redirects the attack');

  const riptide=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame'});riptide.state.player.zoneTiles[1]=card('ocean-gate','water-zone');const hunter=unit({uid:'hunter',cardId:'riptide-hunter',position:1,element:'tide',traits:['Water','Hunter'],attack:4});riptide.state.player.units=[hunter];riptide.state.enemy.units=[unit({uid:'one',position:1,health:8,maxHealth:8}),unit({uid:'two',position:1,health:8,maxHealth:8})];riptide.nextPhase();riptide.selectUnit('hunter');riptide.selectTarget('one');riptide.attack();assert.equal(hunter.exhausted,false);riptide.selectUnit('hunter');riptide.selectTarget('two');riptide.attack();assert.equal(hunter.exhausted,true);

  const attributes=new Set(['fire','water','lightning','death','earth','divine']);assert.equal(attributes.size,6);
  const chronicle=new HeroicsGame(true);chronicle.state.player.essence=10;chronicle.state.player.hand=[card('ember-squire','logged')];chronicle.playCard('logged');assert.ok(chronicle.state.log[0].includes('Essence'));

  const cluster=new HeroicsGame(true);cluster.state.player.essence=20;cluster.state.player.hand=[card('desert-gate','cluster-zone')];cluster.beginZonePlacement('cluster-zone');
  const key=({q,r}:{q:number;r:number})=>`${q},${r}`;
  assert.deepEqual(new Set(cluster.availableZonePlacements().map(key)),new Set(FIXED_ZONE_COORDINATES.map(key)),'only the four interior positions of the fixed 2-3-2 cluster are legal');
  assert.deepEqual(new Set(cluster.invalidZonePlacements().map(key)),new Set(BLOCKED_GATE_COORDINATES.map(key)),'the four cells behind Home and Enemy Gates are permanent red-X locations');
  for(const blocked of BLOCKED_GATE_COORDINATES)cluster.placeZone(blocked.q,blocked.r,-1);
  assert.equal(cluster.state.tiles.length,3,'red-X placements behind either Gate are rejected');

  const addedCombat=new HeroicsGame(true);addedCombat.state.tiles.push({id:3,q:1,r:1,kind:'zone',ownerHomeTileId:0,zoneCard:card('desert-gate','added')});const addedAttacker=unit({uid:'added-a',position:3}),addedDefender=unit({uid:'added-d',position:3});addedCombat.state.player.units=[addedAttacker];addedCombat.state.enemy.units=[addedDefender];assert.equal(addedCombat.sameZone(addedAttacker,addedDefender),true,'added hexes use physical same-tile combat');

  const bound=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame'});bound.state.player.essence=20;bound.state.player.hand=[card('kraken','bound-kraken')];bound.playCard('bound-kraken');assert.equal(bound.state.player.units.length,0,'Zone Bound Kraken cannot enter a non-Water tile');const ocean=card('ocean-gate','bound-ocean');bound.state.tiles.push({id:3,q:1,r:1,kind:'zone',ownerHomeTileId:0,zoneCard:ocean});bound.state.player.zoneTiles[3]=ocean;bound.selectTile(3);bound.playCard('bound-kraken');assert.equal(bound.state.player.units[0].position,3,'Kraken summons directly onto the selected Water Zone');

  const recoil=new HeroicsGame(true,{playerElement:'flame',enemyElement:'storm'});const recoilAttacker=unit({uid:'recoil-a',position:1,health:10,maxHealth:10,attack:4}),wraith=unit({uid:'wraith',cardId:'static-wraith',name:'Static Wraith',position:1,element:'storm',traits:['Lightning','Spirit'],health:10,maxHealth:10,recoilDamage:2});recoil.state.player.units=[recoilAttacker];recoil.state.enemy.units=[wraith];recoil.nextPhase();recoil.selectUnit(recoilAttacker.uid);recoil.selectTarget(wraith.uid);recoil.attack();assert.equal(recoilAttacker.health,8,'Electric Recoil damages the attacking unit without counterattacking');

  const tribute=new HeroicsGame(true);const samurai=unit({uid:'samurai',cardId:'ember-samurai',name:'Ember Samurai',health:3,maxHealth:3});tribute.state.player.units=[samurai];tribute.state.player.hand=[card('flame-shogun','shogun')];tribute.state.player.essence=20;tribute.selectUnit('samurai');tribute.playCard('shogun');assert.ok(!tribute.state.player.units.some(u=>u.uid==='samurai')&&tribute.state.player.units.some(u=>u.cardId==='flame-shogun'),'Ember Samurai tributes into Flame Shogun');

  const phoenixChain=new HeroicsGame(true);const hatchling=unit({uid:'hatchling',cardId:'phoenix-hatchling',name:'Phoenix Hatchling',attack:0,health:2,maxHealth:2});phoenixChain.state.player.units=[hatchling];phoenixChain.state.player.deck=[card('phoenix','phoenix-chain')];phoenixChain.nextPhase();phoenixChain.selectUnit('hatchling');phoenixChain.unitAbility('hatchling');assert.ok(phoenixChain.state.player.units.some(u=>u.cardId==='phoenix'),'Phoenix Hatchling can tribute itself to summon Phoenix');

  const tidecaller=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame'});const adept=unit({uid:'adept',cardId:'tidecaller-adept',name:'Tidecaller Adept',element:'tide',traits:['Water','Mage'],attack:3,health:4,maxHealth:4});tidecaller.state.player.units=[adept];tidecaller.state.player.hand=[card('rainfall-blessing','rain-spell')];tidecaller.state.player.essence=10;tidecaller.playCard('rain-spell');assert.equal(adept.attack,4,'Water Magic permanently empowers Tidecaller Adept');

  const fireWeakness=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame'});const fireTarget=unit({uid:'fire-target',health:10,maxHealth:10,traits:['Fire']});fireWeakness.state.enemy.units=[fireTarget];fireWeakness.state.player.hand=[card('aqua-burst','aqua')];fireWeakness.state.player.essence=10;fireWeakness.selectTarget('fire-target');fireWeakness.playCard('aqua');assert.equal(fireTarget.health,4,'Aqua Burst deals 6 to Fire targets');

  const staticEntry=new HeroicsGame(true);const staticZone=card('static-field','static-zone');staticEntry.state.tiles.push({id:3,q:1,r:1,kind:'zone',ownerHomeTileId:2,zoneCard:staticZone});staticEntry.state.enemy.zoneTiles[3]=staticZone;const entrant=unit({uid:'entrant',position:1,health:6,maxHealth:6});staticEntry.state.player.units=[entrant];staticEntry.nextPhase();staticEntry.selectUnit('entrant');staticEntry.selectTile(3);staticEntry.advance();assert.equal(entrant.health,4,'Static Field damages an enemy that enters its tile');

  const cinder=new HeroicsGame(true);cinder.state.player.units=[unit({uid:'witch',cardId:'cinder-witch',name:'Cinder Witch'})];const heatwave=card('heatwave','discounted-fire');cinder.state.player.hand=[heatwave];cinder.state.player.essence=2;assert.equal(cinder.effectiveCost(cinder.state.player,heatwave),2);cinder.playCard('discounted-fire');assert.equal(cinder.state.player.essence,0,'Cinder Witch reduces Fire Magic cost by 1');

  const mask=new HeroicsGame(true);mask.state.player.hand=[card('cinder-mask','mask')];mask.state.player.essence=10;mask.playCard('mask');mask.nextPhase();mask.leaderAbility('damage');assert.equal(mask.state.player.abilityPoints,1,'Cinder Mask reduces Leader ability AP cost by 1');

  const maelstrom=new HeroicsGame(true,{playerElement:'tide',enemyElement:'flame'},true);maelstrom.state.player.units=[unit({uid:'kraken-unit',cardId:'kraken',name:'Kraken',position:1,element:'tide',traits:['Water','Beast'],attack:15,health:25,maxHealth:25}),unit({uid:'ship-unit',cardId:'storm-sailor',name:'Storm Sailor',position:1,element:'tide',traits:['Water','Ship'],attack:4,health:4,maxHealth:4})];maelstrom.nextPhase();maelstrom.endTurn();assert.ok(!maelstrom.state.player.units.some(u=>u.uid==='ship-unit'),'Kraken Maelstrom destroys Ship units sharing its Zone');

  const spectator=new HeroicsGame(true,{playerElement:'flame',enemyElement:'storm'},true);let spectatorSteps=0,sawTopCpu=false,sawTopBattle=false;
  while(!spectator.state.winner&&spectatorSteps<4000){spectator.autoPlayStep();spectatorSteps++;if(spectator.state.phase==='enemy'){sawTopCpu=true;if(spectator.cpuPhaseLabel()==='battle')sawTopBattle=true}}
  assert.ok(sawTopCpu&&sawTopBattle,'AI vs AI advances the top CPU through Deploy and Battle phases');
  assert.ok(spectator.state.winner,'AI vs AI spectator simulation reaches a winner without stalling');
  assert.ok(spectator.state.log.some(entry=>entry.includes('plays')),'AI vs AI actions are recorded in the Battle Chronicle');
  spectator.restart();let replaySteps=0;while(!spectator.state.winner&&replaySteps<4000){spectator.autoPlayStep();replaySteps++}assert.ok(spectator.state.winner,'AI vs AI replay resets both CPU phase trackers and finishes again');
}

rules();
const runs=200,results=Array.from({length:runs},()=>simulate());const stalls=results.filter(result=>result.winner==='stall').length,average=results.reduce((sum,result)=>sum+result.turns,0)/runs;
assert.equal(stalls,0);assert.ok(average>=3&&average<=50);
console.log('\nHEROICS PHASE + HEX UPDATE PLAYTEST');
console.log('────────────────────────────────');
console.log(`Matches simulated: ${runs}`);
console.log(`Stalled matches:  ${stalls}`);
console.log(`Average turns:    ${average.toFixed(1)}`);
console.log('Rule checks:      PASS');
for(const [player,enemy] of [['storm','flame'],['undead','tide']] as const){const games=Array.from({length:4},()=>simulate(100,player,enemy));assert.equal(games.filter(g=>g.winner==='stall').length,0);console.log(`${player} vs ${enemy}: no stalls`)}
