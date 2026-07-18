import Phaser from 'phaser';
import { HeroicsGame, GameState, PlayCardChoices, Player, Unit, ZONE_CAPACITY } from './game';
import { CardDef, CardKind, Element, cardById, cardPool, starterDeckIds } from './cards';
import { DECK_SIZE, MAX_COPIES, DeckConfig, loadDeckConfig, saveDeckConfig } from './deck';
import { currentForm, nextForm, EVOLUTIONS } from './evolution';
import { GameController, OnlineGameClient } from './network';
import './style.css';
import './a11y.css';
import './images.css';
import './evolution.css';
import './phases.css';
import './deck-builder.css';
import './undead.css';
import './leader-confirm.css';
import './storm.css';
import './battle-inspector.css';
import './online.css';
import './zones.css';

class BattlefieldScene extends Phaser.Scene {
  constructor(){super('battlefield')}
  create(){
    const {width,height}=this.scale;
    const g=this.add.graphics();
    g.fillGradientStyle(0x260e18,0x0c2130,0x130b22,0x081b29,1);
    g.fillRect(0,0,width,height);
    for(let i=0;i<28;i++)this.add.circle(Phaser.Math.Between(0,width),Phaser.Math.Between(0,height),Phaser.Math.Between(1,3),0xffc86b,Phaser.Math.FloatBetween(.15,.5));
    this.add.circle(width*.14,height*.3,180,0xd84825,.08);
    this.add.circle(width*.86,height*.3,190,0x2c9fc4,.08);
  }
}

new Phaser.Game({type:Phaser.AUTO,parent:'game-bg',transparent:true,scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},scene:[BattlefieldScene],render:{antialias:true}});

type Screen='menu'|'builder'|'online'|'battle';
type Side='player'|'enemy';
type PileView={side:Side;selectedUid:string|null}|null;
type UnitView={side:Side;uid:string}|null;

const app=document.querySelector<HTMLDivElement>('#app')!;
let screen:Screen='menu';
let config:DeckConfig=loadDeckConfig();
let game:GameController|null=null;
let onlineClient:OnlineGameClient|null=null;
let onlineMessage='';
let onlineRoomCode='';
let onlineBusy=false;
let selectedCardId=config.cards[0]??cardPool[config.leader][0].id;
let cardFilter:'all'|CardKind='all';
let searchQuery='';
let pendingLeader:Element|null=null;
let inspectedBattleCardUid:string|null=null;
let inspectedUnit:UnitView=null;
let inspectedLeader:Side|null=null;
let inspectedZone:Side|null=null;
let pileView:PileView=null;
let specialCardUid:string|null=null;
let specialChoices:PlayCardChoices={};

const elementName=(element:Element)=>({flame:'Ignis',tide:'Shellgon',undead:'Queen of the Dead',storm:'Tempestfang'}[element]);
const elementLabel=(element:Element)=>({flame:'Flame Assault',tide:'Ocean Guard',undead:'Undead Dominion',storm:'Storm Magic'}[element]);
const opponentLabel=(element:Element)=>({flame:'Fire Deck',tide:'Water Deck',undead:'Queen of the Dead Deck',storm:'Tempestfang Deck'}[element]);
const elementIcon=(element:Element)=>({flame:'🔥',tide:'🌊',undead:'☠️',storm:'⚡'}[element]);
const leaderTitle=(element:Element)=>currentForm(element,0).title;
const leaderImage=(element:Element)=>`/assets/leaders/${currentForm(element,0).image}`;
const cardImage=(card:CardDef)=>card.image??(card.element==='neutral'?'/assets/zones/field.svg':leaderImage(card.element));
const cardCount=(id:string)=>config.cards.filter(cardId=>cardId===id).length;
const persist=()=>saveDeckConfig(config);
const zoneName=(position:number)=>['Your Gate Zone','Center Gate Zone','Enemy Gate Zone'][position]??'Gate Zone';
const resetBattleViews=()=>{inspectedBattleCardUid=null;inspectedUnit=null;inspectedLeader=null;inspectedZone=null;pileView=null;specialCardUid=null;specialChoices={}};

function showMenu(){
  screen='menu';if(onlineClient){onlineClient.disconnect();onlineClient=null}pendingLeader=null;resetBattleViews();document.body.className='menu-screen';renderMenu();
}
function showBuilder(){
  if(onlineClient){onlineClient.disconnect();onlineClient=null}pendingLeader=null;screen='builder';document.body.className='builder-screen';renderBuilder();
}
function startBattle(){
  if(config.cards.length!==DECK_SIZE)return showBuilder();
  resetBattleViews();screen='battle';document.body.className='battle-screen';game=new HeroicsGame(false,{playerElement:config.leader,enemyElement:config.opponent,playerDeckIds:config.cards});game.subscribe(renderBattle);
}

function renderMenu(){
  const selected=currentForm(config.leader,0),opponent=currentForm(config.opponent,0);
  app.innerHTML=`<main class="start-screen"><section class="start-copy"><div class="menu-brand"><span>H</span><small>CLASH OF LEADERS</small><h1>HEROICS</h1><strong class="beta-badge">BETA</strong></div><p>Build your deck. Choose your Leader. Enter the battlefield.</p><div class="menu-actions"><button class="primary" data-ui="start">Battle the AI</button><button class="online-button" data-ui="online">⚔ Play Online</button><button data-ui="builder">Create a Deck</button></div><div class="saved-summary"><small>SAVED BATTLE SETUP</small><div><img src="${leaderImage(config.leader)}" alt="${selected.title}"><span><b>${selected.title}</b><em>${config.cards.length} / ${DECK_SIZE} cards</em></span><strong>VS</strong><img src="${leaderImage(config.opponent)}" alt="${opponent.title}"><span><b>${opponent.title}</b><em>${opponentLabel(config.opponent)} AI</em></span></div></div></section><section class="start-art"><div class="menu-leader flame"><img src="${leaderImage('flame')}" alt="Ignis"></div><div class="menu-leader tide"><img src="${leaderImage('tide')}" alt="Shellgon"></div></section></main>`;
  app.querySelector<HTMLElement>('[data-ui="start"]')!.onclick=startBattle;
  app.querySelector<HTMLElement>('[data-ui="builder"]')!.onclick=showBuilder;
  app.querySelector<HTMLElement>('[data-ui="online"]')!.onclick=showOnline;
}

function showOnline(){screen='online';onlineMessage='Create a private room or enter the code your friend sent you.';onlineRoomCode='';onlineBusy=false;document.body.className='online-screen';renderOnline()}
function onlineUpdate(update:{roomCode?:string;waitingForOpponent?:boolean;opponentConnected?:boolean;message?:string;matchStarted?:boolean}){
  if(update.roomCode)onlineRoomCode=update.roomCode;
  if(update.message)onlineMessage=update.message;
  if(update.waitingForOpponent)onlineMessage='Room created. Share this code and wait for your friend.';
  if(update.matchStarted&&onlineClient){game=onlineClient;screen='battle';onlineBusy=false;resetBattleViews();document.body.className='battle-screen online-battle';onlineClient.subscribe(renderBattle);return}
  if(screen==='online'){onlineBusy=false;renderOnline()}
}
async function startOnline(mode:'create'|'join'|'reconnect',code=''){
  if(config.cards.length!==DECK_SIZE){onlineMessage='Finish your 20-card deck before playing online.';return renderOnline()}
  onlineBusy=true;onlineMessage='Connecting to the Heroics match server…';renderOnline();onlineClient=new OnlineGameClient(config,onlineUpdate);
  try{if(mode==='create')await onlineClient.createRoom();else if(mode==='join')await onlineClient.joinRoom(code);else await onlineClient.reconnect()}
  catch(error){onlineBusy=false;onlineMessage=error instanceof Error?error.message:'Could not connect.';onlineClient=null;renderOnline()}
}
function renderOnline(){
  const saved=OnlineGameClient.savedReconnect(),leader=currentForm(config.leader,0);
  app.innerHTML=`<main class="online-lobby"><header><button data-ui="menu">‹ Back</button><div><small>HEROICS MULTIPLAYER</small><h1>Play With Friends</h1><strong class="beta-badge">BETA</strong></div></header><section class="online-room"><div class="online-leader ${config.leader}"><img src="${leaderImage(config.leader)}" alt="${leader.title}"><div><small>YOUR SAVED DECK</small><h2>${leader.title}</h2><p>${config.cards.length} / ${DECK_SIZE} cards</p><button data-ui="builder">Edit Deck</button></div></div><div class="room-actions"><article><span>1</span><h2>Create a Room</h2><p>Make a private match and send the five-character code to your friend.</p><button class="primary" data-online="create" ${onlineBusy?'disabled':''}>Create Private Room</button></article><i>OR</i><article><span>2</span><h2>Join a Room</h2><p>Enter the room code your friend shared with you.</p><input id="room-code" maxlength="5" autocomplete="off" placeholder="ABCDE" value="${onlineRoomCode}"><button data-online="join" ${onlineBusy?'disabled':''}>Join Friend</button></article></div>${onlineRoomCode?`<div class="room-code"><small>YOUR ROOM CODE</small><strong>${onlineRoomCode}</strong><button data-copy-code>Copy Code</button><em>Waiting for your friend to join…</em></div>`:''}<div class="online-message">${onlineBusy?'<i></i>':''}<span>${onlineMessage}</span></div>${saved&&!onlineRoomCode?`<button class="reconnect" data-online="reconnect" ${onlineBusy?'disabled':''}>Reconnect to room ${saved.roomCode}</button>`:''}<footer>Both players use their saved 20-card deck. The match server protects turn order and synchronizes every move.</footer></section></main>`;
  app.querySelector<HTMLElement>('[data-ui="menu"]')!.onclick=showMenu;
  app.querySelector<HTMLElement>('[data-ui="builder"]')!.onclick=showBuilder;
  app.querySelector<HTMLElement>('[data-online="create"]')?.addEventListener('click',()=>startOnline('create'));
  app.querySelector<HTMLElement>('[data-online="join"]')?.addEventListener('click',()=>{const code=app.querySelector<HTMLInputElement>('#room-code')!.value.trim().toUpperCase();if(code.length!==5){onlineMessage='Enter the complete five-character room code.';return renderOnline()}startOnline('join',code)});
  app.querySelector<HTMLElement>('[data-online="reconnect"]')?.addEventListener('click',()=>startOnline('reconnect'));
  app.querySelector<HTMLElement>('[data-copy-code]')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(onlineRoomCode);onlineMessage='Room code copied.';renderOnline()});
}

const leaderProfiles:Record<Element,{role:string;strategy:string;ability:string;evolution:string;accent:string}>={
  flame:{role:'Solar Knight • Aggressive',strategy:'Push units forward, gain Glory quickly, and finish battles with direct solar damage.',ability:'Solar Slash — Once per turn, pay 2 Essence to deal 3 damage to the rival Leader.',evolution:'Four forms. Evolves at 3, 7, and 12 Glory.',accent:'Fast pressure and rising damage'},
  tide:{role:'Crab Warrior • Defensive',strategy:'Control the battlefield with durable units, healing, and increasingly powerful tidal armor.',ability:'Tidal Crush — Once per turn, pay 2 Essence to deal 2 damage to the rival Leader.',evolution:'Four forms. Evolves at 3, 7, and 12 Glory.',accent:'Defense, healing, and control'},
  undead:{role:'Undead Queen • Graveyard',strategy:'Search for royal Units, recycle the fallen, and command an expanding army of Skeleton tokens.',ability:'Raise Skeleton — Once per turn, summon a 1 Power / 2 Health Skeleton token. Higher forms summon ready or additional Skeletons.',evolution:'Four forms. Evolves at 3, 7, and 12 Glory.',accent:'Resurrection, tokens, and kill-triggered healing'},
  storm:{role:'Storm Beast • Magic Tempo',strategy:'Cast Magic to evolve, build Storm Charges, shield aerial Beasts, and control targets with wind and lightning.',ability:'Static Pulse — Once per turn, deal 1 Lightning damage to any target.',evolution:'Cast 2 Magic, deal 6 damage in one turn, then build 3 Charges or cast Tempest Magic.',accent:'Magic chains and battlefield movement'},
};

function evolutionGallery(element:Element){
  const baseAttack:Record<Element,number>={flame:3,tide:2,undead:0,storm:2};let attack=baseAttack[element],health=30;
  return EVOLUTIONS[element].map((evolution,index)=>{
    if(index){attack+=evolution.attackBonus;health+=evolution.healthBonus}
    const condition=element==='storm'?['Base form','Cast 2 Magic cards total','Deal 6 damage in one turn','Hold 3 Storm Charges or cast Tempest Magic'][index]:index===0?'Base form':`${evolution.gloryRequired} Glory`;
    const abilityDetail=element==='undead'?' — Summon Skeleton token(s)':evolution.abilityDamage?` — ${evolution.abilityDamage} damage`:' — Passive ability';
    return `<article class="leader-evolution-card"><img src="/assets/leaders/${evolution.image}" alt="${evolution.title}"><div><small>${evolution.form} • LEVEL ${evolution.level}</small><h3>${evolution.title}</h3><span><b>⚔ ${attack}</b><b>♥ ${health}</b><b>🛡 0</b></span><p><strong>${evolution.ability}</strong>${abilityDetail}</p><p>${evolution.passive}</p><em>${condition}</em></div></article>`;
  }).join('');
}

function leaderConfirmModal(element:Element){
  const form=currentForm(element,0),profile=leaderProfiles[element],signatures=cardPool[element].filter(card=>card.element===element).slice(0,3);
  return `<div class="leader-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="leader-confirm-title"><section class="leader-confirm ${element}"><button class="confirm-close" data-leader-cancel aria-label="Close Leader details">×</button><div class="confirm-portrait"><img src="${leaderImage(element)}" alt="${form.title}"><span>${elementIcon(element)}</span></div><div class="confirm-copy"><small>CONFIRM YOUR LEADER</small><h2 id="leader-confirm-title">${form.title}</h2><strong>${profile.role}</strong><p>${profile.strategy}</p><div class="confirm-facts"><article><small>HEALTH</small><b>30</b></article><article><small>LEADER ABILITY</small><b>${form.ability}</b></article><article><small>BATTLE STYLE</small><b>${profile.accent}</b></article></div><div class="confirm-rules"><p><b>Ability</b>${profile.ability}</p><p><b>Evolution</b>${profile.evolution}</p></div><div class="leader-evolution-gallery"><small>EVOLUTION LINE • BATTLE STATS</small><div>${evolutionGallery(element)}</div></div><div class="signature-row"><small>SIGNATURE CARDS</small><div>${signatures.map(card=>`<article><img src="${cardImage(card)}" alt=""><span><b>${card.name}</b><small>${card.kind} • ${card.cost} Essence</small></span></article>`).join('')}</div></div><div class="confirm-actions"><button data-leader-cancel>Keep Current Leader</button><button class="primary" data-leader-confirm="${element}">${config.leader===element?'Confirm Leader':'Confirm & Build Deck'}</button></div><em>${config.leader===element?'This is your currently selected Leader.':'Confirming replaces your current deck with this Leader’s 20-card starter deck.'}</em></div></section></div>`;
}

function renderBuilder(){
  const available=cardPool[config.leader].filter(card=>(cardFilter==='all'||card.kind===cardFilter)&&card.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selected=cardById(selectedCardId)??cardPool[config.leader][0];
  const nextCount=cardCount(selected.id),canAdd=config.cards.length<DECK_SIZE&&nextCount<MAX_COPIES;
  const deckEntries=cardPool[config.leader].map(card=>({card,count:cardCount(card.id)})).filter(entry=>entry.count>0);
  const filters:(CardKind|'all')[]=['all','unit','magic','equipment','zone'];
  app.innerHTML=`<main class="deck-builder"><header class="builder-header"><button data-ui="menu">‹ Back</button><div><small>HEROICS DECK FORGE</small><h1>Create Your Deck</h1></div><div class="deck-total ${config.cards.length===DECK_SIZE?'complete':''}"><b>${config.cards.length}</b><span>/ ${DECK_SIZE} CARDS</span></div></header><section class="builder-setup"><div><small>1. CHOOSE YOUR LEADER</small><div class="choice-row">${(['flame','tide','undead','storm'] as Element[]).map(element=>`<button class="leader-choice ${config.leader===element?'selected':''}" data-leader="${element}"><img src="${leaderImage(element)}" alt=""><span><b>${elementName(element)}</b><em>${elementLabel(element)}</em></span></button>`).join('')}</div></div><div><small>2. CHOOSE YOUR OPPONENT</small><div class="choice-row">${(['flame','tide','undead','storm'] as Element[]).map(element=>`<button class="opponent-choice ${config.opponent===element?'selected':''}" data-opponent="${element}"><i>${elementIcon(element)}</i><span><b>${opponentLabel(element)}</b><em>${leaderTitle(element)}</em></span></button>`).join('')}</div></div></section><section class="builder-workspace"><div class="collection-panel"><div class="collection-tools"><input id="card-search" value="${searchQuery}" placeholder="Search cards…"><div>${filters.map(filter=>`<button class="${cardFilter===filter?'active':''}" data-filter="${filter}">${filter}</button>`).join('')}</div></div><div class="collection-grid">${available.map(card=>`<button class="collection-card ${card.element} ${selected.id===card.id?'selected':''}" data-inspect="${card.id}"><img src="${cardImage(card)}" alt="${card.name}"><span class="cost">${card.cost}</span><span class="owned">${cardCount(card.id)} / ${MAX_COPIES}</span><b>${card.name}</b><small>${card.kind}</small></button>`).join('')}</div></div><aside class="card-preview ${selected.element}"><img src="${cardImage(selected)}" alt="${selected.name}"><div class="preview-info"><span>${selected.kind} • ${selected.element}</span><h2>${selected.name}</h2><div class="preview-stats"><b>◆ ${selected.cost} Essence</b>${selected.kind==='unit'?`<b>⚔ ${selected.attack}</b><b>♥ ${selected.health}</b>`:''}</div><p>${selected.text}</p>${selected.flavor?`<em>“${selected.flavor}”</em>`:''}<button data-add="${selected.id}" ${canAdd?'':'disabled'}>${nextCount>=MAX_COPIES?'Maximum 3 Copies':config.cards.length>=DECK_SIZE?'Deck Is Full':'+ Add to Deck'}</button></div></aside><aside class="deck-panel"><div class="deck-panel-title"><div><small>YOUR DECK</small><h2>${elementName(config.leader)} Deck</h2></div><b>${config.cards.length}/${DECK_SIZE}</b></div><div class="deck-list">${deckEntries.map(({card,count})=>`<button data-remove="${card.id}"><img src="${cardImage(card)}" alt=""><span><b>${card.name}</b><small>${card.kind} • ${card.cost} Essence</small></span><strong>×${count}</strong><i>−</i></button>`).join('')||'<p class="empty-deck">Click a card, then press “Add to Deck.”</p>'}</div><div class="deck-footer"><p>${config.cards.length===DECK_SIZE?'Your deck is ready for battle.':`Add ${DECK_SIZE-config.cards.length} more card${config.cards.length===DECK_SIZE-1?'':'s'}.`}</p><button class="primary" data-ui="start" ${config.cards.length===DECK_SIZE?'':'disabled'}>Start Battle</button><button data-ui="reset">Reset Starter Deck</button></div></aside></section></main>`;
  if(pendingLeader)app.insertAdjacentHTML('beforeend',leaderConfirmModal(pendingLeader));
  bindBuilder();
}

function bindBuilder(){
  app.querySelector<HTMLElement>('[data-ui="menu"]')!.onclick=showMenu;
  app.querySelectorAll<HTMLElement>('[data-leader]').forEach(el=>el.onclick=()=>{pendingLeader=el.dataset.leader as Element;renderBuilder()});
  app.querySelectorAll<HTMLElement>('[data-leader-cancel]').forEach(el=>el.onclick=()=>{pendingLeader=null;renderBuilder()});
  app.querySelectorAll<HTMLElement>('[data-leader-confirm]').forEach(el=>el.onclick=()=>{const selected=el.dataset.leaderConfirm as Element;if(selected!==config.leader){config={...config,leader:selected,cards:starterDeckIds(selected)};selectedCardId=cardPool[selected][0].id;cardFilter='all';searchQuery='';persist()}pendingLeader=null;renderBuilder()});
  app.querySelectorAll<HTMLElement>('[data-opponent]').forEach(el=>el.onclick=()=>{config={...config,opponent:el.dataset.opponent as Element};persist();renderBuilder()});
  app.querySelectorAll<HTMLElement>('[data-filter]').forEach(el=>el.onclick=()=>{cardFilter=el.dataset.filter as typeof cardFilter;renderBuilder()});
  app.querySelectorAll<HTMLElement>('[data-inspect]').forEach(el=>el.onclick=()=>{selectedCardId=el.dataset.inspect!;renderBuilder()});
  app.querySelectorAll<HTMLElement>('[data-add]').forEach(el=>el.onclick=()=>{const id=el.dataset.add!;if(config.cards.length<DECK_SIZE&&cardCount(id)<MAX_COPIES){config.cards.push(id);persist();renderBuilder()}});
  app.querySelectorAll<HTMLElement>('[data-remove]').forEach(el=>el.onclick=()=>{const index=config.cards.lastIndexOf(el.dataset.remove!);if(index>=0){config.cards.splice(index,1);persist();renderBuilder()}});
  const search=app.querySelector<HTMLInputElement>('#card-search')!;search.oninput=()=>{searchQuery=search.value;renderBuilder();app.querySelector<HTMLInputElement>('#card-search')?.focus()};
  app.querySelector<HTMLElement>('[data-ui="reset"]')!.onclick=()=>{config.cards=starterDeckIds(config.leader);persist();renderBuilder()};
  const start=app.querySelector<HTMLElement>('[data-ui="start"]');if(start)start.onclick=startBattle;
  document.onkeydown=event=>{if(screen==='builder'&&pendingLeader&&event.key==='Escape'){pendingLeader=null;renderBuilder()}};
  app.querySelector<HTMLElement>('[data-leader-confirm]')?.focus();
}

const leaderPanel=(p:Player,side:Side)=>{
  const form=currentForm(p.element,p.evolutionStage),next=nextForm(p.element,p.evolutionStage),enemy=side==='enemy';
  const progress=p.element==='storm'?`⚡ ${p.stormCharges} Charges`:`✦ ${p.glory}${next?` / ${next.gloryRequired}`:' • MAX'}`;
  return `<section class="leader ${p.element} stage-${p.evolutionStage} ${p.evolutionStage?'evolved':''}" data-inspect-leader="${side}" role="button" tabindex="0"><div class="portrait"><img src="/assets/leaders/${form.image}" alt="${form.title}"></div><div class="leader-copy"><small>${enemy?'RIVAL LEADER':'YOUR LEADER'} • LEVEL ${form.level} • ${form.form}</small><h2>${form.title}</h2><div class="bar"><i style="width:${Math.max(0,p.health/p.maxHealth*100)}%"></i><span>${Math.max(0,p.health)} / ${p.maxHealth} HP</span></div><div class="leader-stats"><b>⚔ ${p.leaderAttack}</b><button data-open-pile="${side}">☠ ${p.graveyard.length} Grave${p.cemetery.length?` • ${p.cemetery.length} Cemetery`:''}</button><b>${progress}</b></div></div><span class="inspect-hint">Click for stats</span></section>`;
};

const unitCard=(u:Unit,selected:string|null,side:Side,target:string|null,inZone=true)=>{
  const card=cardById(u.cardId),enemy=side==='enemy';
  const status=[u.shieldReady?'WIND STEP':'',u.frozenThisTurn?'FROZEN':'',u.speedBonus?`SPEED +${u.speedBonus}`:''].filter(Boolean).join(' • ');
  return `<button class="unit ${u.element} ${u.exhausted?'exhausted':''} ${selected===u.uid||target===u.uid?'selected':''} ${enemy&&!inZone?'out-of-zone':''}" ${enemy?`data-target="${u.uid}"`:`data-unit="${u.uid}"`} aria-label="${u.name}, ${u.attack} Power, ${u.health} Health"><div class="unit-art"><img src="${card?cardImage(card):leaderImage(u.element)}" alt=""></div><span class="unit-icon">${elementIcon(u.element)}</span><strong>${u.name}</strong><small>${status||'READY'}</small><div><b>⚔ ${u.attack}</b><b>♥ ${u.health}</b></div></button>`;
};

function gateSlots(s:GameState,physicalZone:number,side:Side){
  const owner=side==='player'?s.player:s.enemy;
  const logicalPosition=side==='player'?physicalZone:2-physicalZone;
  const units=owner.units.filter(u=>u.position===logicalPosition);
  const attacker=s.player.units.find(u=>u.uid===s.selectedUnit);
  return Array.from({length:ZONE_CAPACITY},(_,index)=>{
    const u=units[index];
    if(u)return `<div class="gate-slot occupied"><span class="gate-number">GATE ${index+1}</span>${unitCard(u,s.selectedUnit,side,s.selectedTarget,!attacker||side==='player'||Boolean(game?.sameZone(attacker,u)))}</div>`;
    return `<div class="gate-slot empty"><span>GATE ${index+1}</span><i>◇</i></div>`;
  }).join('');
}

const activeZoneCard=(p:Player,side:Side)=>p.activeZone?`<button class="active-zone zone-${p.activeZone.zone}" data-inspect-zone="${side}"><img src="${cardImage(p.activeZone)}" alt=""><span><small>${side==='player'?'YOUR':'RIVAL'} ACTIVE ZONE</small><b>${p.activeZone.name}</b><em>${p.activeZone.text}</em></span></button>`:`<div class="active-zone empty-zone"><span><small>${side==='player'?'YOUR':'RIVAL'} ACTIVE ZONE</small><b>No Gate Zone active</b></span></div>`;

function battlefield(s:GameState){
  const names=['YOUR GATE ZONE','CENTER GATE ZONE','ENEMY GATE ZONE'];
  return `<div class="zone-battlefield">${activeZoneCard(s.enemy,'enemy')}<div class="physical-zones">${[0,1,2].map(position=>`<section class="physical-zone position-${position}"><header><small>ZONE ${position+1}</small><b>${names[position]}</b><span>3 GATES PER PLAYER</span></header><div class="gate-rank enemy-gates">${gateSlots(s,position,'enemy')}</div><div class="zone-divider"><i></i><span>${s.player.units.some(u=>u.position===position)&&s.enemy.units.some(u=>u.position===2-position)?'CONTESTED':'OPEN'}</span><i></i></div><div class="gate-rank player-gates">${gateSlots(s,position,'player')}</div></section>`).join('')}</div>${activeZoneCard(s.player,'player')}</div>`;
}

const hand=(s:GameState)=>`<div class="hand">${s.player.hand.map(c=>{const cost=game?.effectiveCost(s.player,c)??c.cost;return `<button class="card ${c.element} ${c.kind} ${inspectedBattleCardUid===c.uid?'inspected':''}" data-inspect-card="${c.uid}"><span class="cost">${cost}</span><span class="kind">${c.kind}</span><div class="card-art"><img src="${cardImage(c)}" alt="${c.name}"><span>${c.kind==='unit'?'':c.kind==='magic'?'✦':c.kind==='zone'?'⌾':'◆'}</span></div><strong>${c.name}</strong>${c.kind==='unit'?`<div class="combat"><b>⚔ ${c.attack}</b><b>♥ ${c.health}</b></div>`:''}<p>${c.text}</p></button>`}).join('')}</div>`;

const specialIds=new Set(['ultimate-sacrifice','for-the-queen','raise-the-fallen','queens-destruction']);
function battleCardInspector(s:GameState){
  const card=s.player.hand.find(c=>c.uid===inspectedBattleCardUid);if(!card)return '';
  const cost=game?.effectiveCost(s.player,card)??card.cost;
  const phaseAllowed=card.kind==='magic'||s.phase==='deploy';
  const gateFull=card.kind==='unit'&&s.player.units.filter(u=>u.position===0).length>=ZONE_CAPACITY;
  const canPlay=s.phase!=='enemy'&&phaseAllowed&&cost<=s.player.essence&&!gateFull;
  const label=!phaseAllowed?'Deploy Phase only':cost>s.player.essence?'Not Enough Essence':gateFull?'Home Gates Full':specialIds.has(card.id)?'Choose Targets':'Play Card';
  return `<aside class="battle-card-inspector ${card.element}"><button data-close-inspector aria-label="Close card information">×</button><img src="${cardImage(card)}" alt="${card.name}"><div><small>${card.kind} • ${card.element}</small><h3>${card.name}</h3><span><b>◆ ${cost}</b>${card.kind==='unit'?`<b>⚔ ${card.attack}</b><b>♥ ${card.health}</b>`:''}</span><p>${card.text}</p>${card.flavor?`<em>“${card.flavor}”</em>`:''}<button class="primary" data-play-card="${card.uid}" ${canPlay?'':'disabled'}>${label}</button></div></aside>`;
}

function boardUnitInspector(s:GameState){
  if(!inspectedUnit)return '';
  const owner=inspectedUnit.side==='player'?s.player:s.enemy,u=owner.units.find(unit=>unit.uid===inspectedUnit!.uid);if(!u)return '';
  const card=cardById(u.cardId),statuses=[u.exhausted?'Exhausted':'Ready',u.shieldReady?'Wind Step ready':'',u.frozenThisTurn?'Frozen':'',u.unitAbilityUsed?'Ability used':''].filter(Boolean);
  return `<aside class="battle-card-inspector unit-inspector ${u.element}"><button data-close-unit-inspector>×</button><img src="${card?cardImage(card):leaderImage(u.element)}" alt="${u.name}"><div><small>${u.traits.join(' • ')} • ${zoneName(inspectedUnit.side==='player'?u.position:2-u.position)}</small><h3>${u.name}</h3><span><b>⚔ ${u.attack}</b><b>♥ ${u.health} / ${u.maxHealth}</b></span><p>${card?.text??'A summoned Skeleton token.'}</p><dl><dt>Equipment</dt><dd>${u.equipment.join(', ')||'None'}</dd><dt>Status</dt><dd>${statuses.join(', ')}</dd></dl></div></aside>`;
}

function zoneInspector(s:GameState){
  if(!inspectedZone)return '';
  const p=inspectedZone==='player'?s.player:s.enemy,c=p.activeZone;if(!c)return '';
  return `<aside class="battle-card-inspector zone-inspector neutral"><button data-close-zone-inspector>×</button><img src="${cardImage(c)}" alt="${c.name}"><div><small>ZONE CARD • ONE ACTIVE PER PLAYER</small><h3>${c.name}</h3><span><b>3 GATES IN EACH BATTLEFIELD ZONE</b></span><p>${c.text}</p>${c.flavor?`<em>“${c.flavor}”</em>`:''}</div></aside>`;
}

function leaderStatsModal(s:GameState){
  if(!inspectedLeader)return '';
  const p=inspectedLeader==='player'?s.player:s.enemy,form=currentForm(p.element,p.evolutionStage);
  const statuses=[p.leaderAbilityUsed?'Leader ability used this turn':'Leader ability ready',p.rainfieldTurns?`Rainfield: ${p.rainfieldTurns} turns`:'',p.coreEquipped?`${p.stormCharges} Storm Charges`:'',p.activeZone?.name??'No active Zone'].filter(Boolean);
  return `<div class="detail-modal" role="dialog" aria-modal="true"><section class="leader-detail ${p.element}"><button data-close-leader>×</button><div class="leader-detail-hero"><img src="/assets/leaders/${form.image}" alt="${form.title}"><div><small>${inspectedLeader==='player'?'YOUR':'RIVAL'} LEADER • ${form.form}</small><h2>${form.title}</h2><p>Level ${form.level} • Evolution ${p.evolutionStage+1} / 4</p></div></div><div class="leader-detail-stats"><article><small>HEALTH</small><b>${Math.max(0,p.health)} / ${p.maxHealth}</b></article><article><small>ATTACK</small><b>${p.leaderAttack}</b></article><article><small>DEFENSE</small><b>${p.leaderDefense}</b></article><article><small>ESSENCE</small><b>${p.essence} / ${p.maxEssence}</b></article></div><div class="leader-current-rules"><article><small>CURRENT ABILITY</small><h3>${form.ability}</h3><p>${leaderProfiles[p.element].ability}</p></article><article><small>CURRENT PASSIVE</small><h3>${form.form}</h3><p>${form.passive}</p></article></div><div class="leader-loadout"><p><b>Equipment:</b> ${p.leaderEquipment.join(', ')||'None'}</p><p><b>Status:</b> ${statuses.join(' • ')}</p></div><div class="leader-ability-list"><small>ALL EVOLUTION ABILITIES</small>${EVOLUTIONS[p.element].map((e,index)=>`<article class="${index===p.evolutionStage?'current':''}"><b>Level ${e.level} — ${e.ability}</b><span>${e.passive}</span></article>`).join('')}</div></section></div>`;
}

function pileModal(s:GameState){
  if(!pileView)return '';
  const p=pileView.side==='player'?s.player:s.enemy;
  const grave=[...p.graveyard].sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name));
  const cemetery=[...p.cemetery].sort((a,b)=>a.name.localeCompare(b.name));
  const selected=[...grave,...cemetery].find(c=>c.uid===pileView?.selectedUid)??grave[0]??cemetery[0];
  const rows=(cards:typeof grave,pile:'grave'|'cemetery')=>cards.map(card=>`<button class="${selected?.uid===card.uid?'selected':''}" data-pile-card="${card.uid}"><img src="${cardImage(card)}" alt=""><span><b>${card.name}</b><small>${card.kind} • ${card.cost} Essence • ${pile}</small></span></button>`).join('');
  return `<div class="detail-modal pile-backdrop"><section class="pile-modal"><button data-close-pile>×</button><header><small>${pileView.side==='player'?'YOUR':'RIVAL'} PUBLIC PILES</small><h2>Graveyard & Cemetery</h2><p>Cards are sorted by type. Click a card to read its full rules.</p></header><div class="pile-layout"><div class="pile-lists"><h3>Graveyard <span>${grave.length}</span></h3>${rows(grave,'grave')||'<em>The graveyard is empty.</em>'}<h3>Cemetery <span>${cemetery.length}</span></h3>${rows(cemetery,'cemetery')||'<em>No cards are stored in the Cemetery Zone.</em>'}</div><aside>${selected?`<img src="${cardImage(selected)}" alt="${selected.name}"><small>${selected.kind} • ${selected.element}</small><h3>${selected.name}</h3><div><b>◆ ${selected.cost}</b>${selected.kind==='unit'?`<b>⚔ ${selected.attack}</b><b>♥ ${selected.health}</b>`:''}</div><p>${selected.text}</p>${selected.flavor?`<em>“${selected.flavor}”</em>`:''}`:'<p>Select a card to inspect it.</p>'}</aside></div></section></div>`;
}

function specialSelectionModal(s:GameState){
  const spell=s.player.hand.find(c=>c.uid===specialCardUid);if(!spell)return '';
  const selectedCards=new Set(specialChoices.cardUids??[]),selectedFriendly=new Set(specialChoices.friendlyUnitUids??[]),selectedEnemies=new Set(specialChoices.enemyUnitUids??[]);
  let body='',valid=false;
  const cardOption=(card:CardDef&{uid:string},source:string)=>`<button class="choice-card ${selectedCards.has(card.uid)?'selected':''}" data-special-option="cardUids" data-special-uid="${card.uid}" data-special-max="2"><img src="${cardImage(card)}" alt=""><span><b>${card.name}</b><small>${source} • ${card.kind} • ${card.cost} Essence</small></span><i>${selectedCards.has(card.uid)?'✓':'+'}</i></button>`;
  const unitOption=(u:Unit,category:'friendlyUnitUids'|'enemyUnitUids',max:number)=>{
    const isSelected=category==='friendlyUnitUids'?selectedFriendly.has(u.uid):selectedEnemies.has(u.uid);
    return `<button class="choice-card ${isSelected?'selected':''}" data-special-option="${category}" data-special-uid="${u.uid}" data-special-max="${max}"><img src="${cardById(u.cardId)?cardImage(cardById(u.cardId)!):leaderImage(u.element)}" alt=""><span><b>${u.name}</b><small>${zoneName(category==='friendlyUnitUids'?u.position:2-u.position)} • ⚔ ${u.attack} • ♥ ${u.health}</small></span><i>${isSelected?'✓':'+'}</i></button>`;
  };
  if(spell.id==='ultimate-sacrifice'){
    const options=s.player.hand.filter(c=>c.uid!==spell.uid&&c.kind==='unit');body=`<p>Choose one or two Unit cards from your hand to discard.</p><div class="choice-grid">${options.map(c=>cardOption(c,'Hand')).join('')||'<em>No Unit cards are available.</em>'}</div>`;valid=selectedCards.size>0&&selectedCards.size<=2;
  }else if(spell.id==='for-the-queen'){
    const options=s.player.deck.filter(c=>c.kind==='unit'&&c.id!=='forever-dead-king');body=`<p>Choose up to two Units to deploy from your deck. Forever Dead King cannot be chosen.</p><div class="choice-grid">${options.map(c=>cardOption(c,'Deck')).join('')||'<em>No eligible Units remain in your deck.</em>'}</div>`;valid=selectedCards.size>0&&selectedCards.size<=2;
  }else if(spell.id==='raise-the-fallen'){
    const options=s.player.graveyard.filter(c=>c.kind==='unit');body=`<p>Choose up to two fallen Units to deploy directly at your open Gates.</p><div class="choice-grid">${options.map(c=>cardOption(c,'Graveyard')).join('')||'<em>No Unit cards are in your graveyard.</em>'}</div>`;valid=selectedCards.size>0&&selectedCards.size<=2;
  }else{
    body=`<p>Choose exactly one friendly Unit to sacrifice, then choose one or two enemy Units to destroy.</p><div class="destruction-columns"><section><h3>Friendly sacrifice</h3>${s.player.units.map(u=>unitOption(u,'friendlyUnitUids',1)).join('')||'<em>No friendly Unit available.</em>'}</section><section><h3>Enemy targets</h3>${s.enemy.units.map(u=>unitOption(u,'enemyUnitUids',2)).join('')||'<em>No enemy Unit available.</em>'}</section></div>`;valid=selectedFriendly.size===1&&selectedEnemies.size>0&&selectedEnemies.size<=2;
  }
  return `<div class="detail-modal special-backdrop"><section class="special-modal"><button data-close-special>×</button><header><small>CHOOSE CARD TARGETS</small><h2>${spell.name}</h2><p>${spell.text}</p></header>${body}<footer><button data-close-special>Cancel</button><button class="primary" data-confirm-special ${valid?'':'disabled'}>Confirm & Cast • ${game?.effectiveCost(s.player,spell)??spell.cost} Essence</button></footer></section></div>`;
}

const phaseHelp:Record<string,string>={deploy:'Summon Units into one of your three open home Gates. Magic and abilities are available.',evolution:'Review your evolution. Magic and once-per-turn abilities are still available.',advance:'Select a ready Unit. Enemy Units in its current Zone block movement to the next Zone.',battle:'Units can only attack enemies in the same physical Zone. Magic and abilities remain available.'};

function controls(s:GameState){
  const phases=['deploy','evolution','advance','battle'],form=currentForm(s.player.element,s.player.evolutionStage),storm=s.player.element==='storm',undead=s.player.element==='undead',active=s.phase!=='enemy';
  const homeFull=s.player.units.filter(u=>u.position===0).length>=ZONE_CAPACITY;
  const abilityDisabled=s.player.leaderAbilityUsed||!active||(!storm&&!undead&&s.player.essence<2)||(undead&&homeFull);
  const abilityButtons=storm&&s.player.evolutionStage>=3?`<button data-action="ability-damage" ${abilityDisabled?'disabled':''}>Eye: Damage</button><button data-action="ability-heal" ${abilityDisabled?'disabled':''}>Eye: Heal</button><button data-action="ability-push" ${abilityDisabled?'disabled':''}>Eye: Push</button>`:form.abilityDamage>0||undead?`<button data-action="ability" ${abilityDisabled?'disabled':''}>${form.ability}${storm||undead?'':' • 2'}</button>`:'';
  const selected=s.player.units.find(u=>u.uid===s.selectedUnit),unitAbility=selected?.cardId==='grave-banshee'?`<button data-action="unit-ability" ${selected.unitAbilityUsed?'disabled':''}>Banshee: Drain Attack</button>`:'';
  return `<div class="phase-guide"><span>${phaseHelp[s.phase]??'The rival is taking its turn.'}</span></div><div class="controls"><div class="phases">${phases.map((p,i)=>`<button disabled class="${s.phase===p?'active':''} ${p==='evolution'&&game?.canEvolve(s.player)?'ready':''}"><i>${i+1}</i>${p}</button>`).join('')}</div><div class="actions">${s.phase==='evolution'&&game?.canEvolve(s.player)?'<button class="evolve-action" data-action="evolve">Evolve Leader</button>':''}${s.phase==='advance'?'<button data-action="advance">Advance selected</button>':''}${s.phase==='battle'?'<button data-action="attack">Attack selected</button>':''}${active?abilityButtons+unitAbility:''}${storm&&s.player.evolutionStage>=3&&active?'<button data-action="absorb">Devour Magic • 5</button>':''}${storm&&s.player.coreEquipped&&s.player.stormCharges>=3&&active?'<button data-action="core">Core Discharge • 3</button>':''}<button class="end" data-action="next" ${active?'':'disabled'}>${s.phase==='battle'?'End Turn':'End Phase ›'}</button></div></div>`;
}

function evolutionPanel(s:GameState){
  if(s.phase!=='evolution'||!game)return '';
  const now=currentForm(s.player.element,s.player.evolutionStage),next=nextForm(s.player.element,s.player.evolutionStage);
  const effect=(form:typeof now)=>s.player.element==='undead'?'Summon 1/2 Skeleton token(s)':`${form.abilityDamage} damage`;
  return `<div class="evolution-panel"><div class="evo-card current"><img src="/assets/leaders/${now.image}" alt="${now.title}"><small>CURRENT • LEVEL ${now.level}</small><h3>${now.title}</h3><p>${now.ability}: ${effect(now)}</p></div><div class="evo-arrow">➜</div>${next?`<div class="evo-card next ${game.canEvolve(s.player)?'unlocked':'locked'}"><img src="/assets/leaders/${next.image}" alt="${next.title}"><small>${game.canEvolve(s.player)?'READY TO EVOLVE':'LOCKED'} • LEVEL ${next.level}</small><h3>${next.title}</h3><p><b>${next.ability}</b> • ${effect(next)}</p><p>${next.passive}</p><span>${game.evolutionProgress(s.player)}</span>${game.canEvolve(s.player)?'<button data-action="evolve">Begin Evolution</button>':''}</div>`:'<div class="evo-card max"><small>MAXIMUM EVOLUTION</small><h3>Ultimate power achieved</h3><p>No higher form exists.</p></div>'}</div>`;
}

function renderBattle(s:GameState){
  if(screen!=='battle')return;
  const onlineGame=game instanceof OnlineGameClient?game:null,online=Boolean(onlineGame);
  const onlineBanner=onlineGame?`<div class="online-match-bar"><span><b>ONLINE</b> ROOM ${onlineGame.roomCode}</span><strong>${s.phase==='enemy'?"Waiting for friend's turn":'Your turn'}</strong><button data-surrender>Surrender</button></div>${!onlineGame.opponentConnected?'<div class="reconnect-overlay"><div><i>⌁</i><h2>Friend disconnected</h2><p>The match is saved for 10 minutes. Waiting for them to reconnect…</p></div></div>':''}`:'';
  app.innerHTML=`<div class="shell zone-shell"><header><button class="battle-menu" data-ui="menu">☰ Menu</button><div class="brand"><span>H</span><div><small>CLASH OF LEADERS</small><h1>HEROICS</h1></div></div><div class="turn"><small>TURN ${s.turn}</small><strong>${s.phase==='enemy'?'RIVAL TURN':s.phase.toUpperCase()+' PHASE'}</strong></div><div class="resource"><small>ESSENCE</small><b>${'◆'.repeat(s.player.essence)}<i>${'◇'.repeat(Math.max(0,s.player.maxEssence-s.player.essence))}</i></b><span>${s.player.essence} / ${s.player.maxEssence}</span></div></header>${onlineBanner}${leaderPanel(s.enemy,'enemy')}${battlefield(s)}${leaderPanel(s.player,'player')}<section class="bottom">${controls(s)}${hand(s)}</section><aside class="log"><strong>BATTLE CHRONICLE</strong>${s.log.slice(0,5).map(x=>`<p>${x}</p>`).join('')}</aside>${battleCardInspector(s)}${boardUnitInspector(s)}${zoneInspector(s)}${evolutionPanel(s)}${leaderStatsModal(s)}${pileModal(s)}${specialSelectionModal(s)}${s.winner?`<div class="modal"><div><small>MATCH COMPLETE</small><h2>${s.winner==='victory'?'VICTORY':'DEFEAT'}</h2><p>${s.winner==='victory'?'The rival Leader has fallen!':'Your Leader has been defeated.'}</p><button data-action="restart">${online?'Request rematch':'Play again'}</button><button data-ui="menu">Return to menu</button></div></div>`:''}</div>`;
  bindBattle();
}

function closeTopView(){
  if(specialCardUid){specialCardUid=null;specialChoices={}}
  else if(pileView)pileView=null;
  else if(inspectedLeader)inspectedLeader=null;
  else if(inspectedZone)inspectedZone=null;
  else if(inspectedBattleCardUid)inspectedBattleCardUid=null;
  else if(inspectedUnit)inspectedUnit=null;
}

function toggleChoice(category:keyof PlayCardChoices,uid:string,max:number){
  const list=[...(specialChoices[category]??[])],index=list.indexOf(uid);
  if(index>=0)list.splice(index,1);else{if(list.length>=max)list.shift();list.push(uid)}
  specialChoices={...specialChoices,[category]:list};
}

function bindBattle(){
  if(!game)return;
  app.querySelectorAll<HTMLElement>('[data-inspect-card]').forEach(el=>el.onclick=()=>{inspectedBattleCardUid=el.dataset.inspectCard!;inspectedUnit=null;inspectedZone=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-play-card]').forEach(el=>el.onclick=()=>{const uid=el.dataset.playCard!,card=game!.state.player.hand.find(c=>c.uid===uid);if(card&&specialIds.has(card.id)){specialCardUid=uid;specialChoices={};renderBattle(game!.state)}else{inspectedBattleCardUid=null;game!.playCard(uid)}});
  app.querySelectorAll<HTMLElement>('[data-close-inspector]').forEach(el=>el.onclick=()=>{inspectedBattleCardUid=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-unit-inspector]').forEach(el=>el.onclick=()=>{inspectedUnit=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-zone-inspector]').forEach(el=>el.onclick=()=>{inspectedZone=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-unit]').forEach(el=>el.onclick=()=>{inspectedUnit={side:'player',uid:el.dataset.unit!};inspectedBattleCardUid=null;game!.selectUnit(el.dataset.unit!)});
  app.querySelectorAll<HTMLElement>('[data-target]').forEach(el=>el.onclick=()=>{inspectedUnit={side:'enemy',uid:el.dataset.target!};inspectedBattleCardUid=null;game!.selectTarget(el.dataset.target!)});
  app.querySelectorAll<HTMLElement>('[data-inspect-leader]').forEach(el=>el.onclick=event=>{if((event.target as HTMLElement).closest('[data-open-pile]'))return;inspectedLeader=el.dataset.inspectLeader as Side;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-open-pile]').forEach(el=>el.onclick=event=>{event.stopPropagation();pileView={side:el.dataset.openPile as Side,selectedUid:null};renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-inspect-zone]').forEach(el=>el.onclick=()=>{inspectedZone=el.dataset.inspectZone as Side;inspectedUnit=null;inspectedBattleCardUid=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-leader]').forEach(el=>el.onclick=()=>{inspectedLeader=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-pile]').forEach(el=>el.onclick=()=>{pileView=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-pile-card]').forEach(el=>el.onclick=()=>{if(pileView)pileView={...pileView,selectedUid:el.dataset.pileCard!};renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-special]').forEach(el=>el.onclick=()=>{specialCardUid=null;specialChoices={};renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-special-option]').forEach(el=>el.onclick=()=>{toggleChoice(el.dataset.specialOption as keyof PlayCardChoices,el.dataset.specialUid!,Number(el.dataset.specialMax));renderBattle(game!.state)});
  app.querySelector<HTMLElement>('[data-confirm-special]')?.addEventListener('click',()=>{if(!specialCardUid)return;const uid=specialCardUid,choices=specialChoices;specialCardUid=null;specialChoices={};inspectedBattleCardUid=null;game!.playCard(uid,choices)});
  app.querySelectorAll<HTMLElement>('[data-ui="menu"]').forEach(el=>el.onclick=showMenu);
  app.querySelector<HTMLElement>('[data-surrender]')?.addEventListener('click',()=>{if(game instanceof OnlineGameClient&&confirm('Surrender this online match?'))game.surrender()});
  app.querySelectorAll<HTMLElement>('[data-action]').forEach(el=>el.onclick=()=>{
    const action=el.dataset.action;
    if(action==='evolve')game!.evolveLeader();
    if(action==='advance')game!.advance();
    if(action==='attack')game!.attack();
    if(action==='ability'||action==='ability-damage')game!.leaderAbility('damage');
    if(action==='ability-heal')game!.leaderAbility('heal');
    if(action==='ability-push')game!.leaderAbility('push');
    if(action==='unit-ability'&&game!.state.selectedUnit)game!.unitAbility(game!.state.selectedUnit);
    if(action==='core')game!.dischargeCore();
    if(action==='absorb')game!.absorbMagic();
    if(action==='next')game!.nextPhase();
    if(action==='restart')game!.restart();
  });
  document.onkeydown=event=>{if(screen==='battle'&&event.key==='Escape'){closeTopView();renderBattle(game!.state)}};
}

showMenu();
