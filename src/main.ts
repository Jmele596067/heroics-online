import Phaser from 'phaser';
import { HeroicsGame, GameState, MAX_FIELD_TILES, PlayCardChoices, Player, Unit, ZONE_CAPACITY } from './game';
import { CardDef, CardKind, Element, allCards, cardAttribute, cardById, cardPool, starterDeckIds } from './cards';
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
import './hex-update.css';
import './tutorial.css';
import './spectator.css';

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

type Screen='menu'|'builder'|'online'|'battle'|'tutorial';
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
let inspectedTile:number|null=null;
let pileView:PileView=null;
let specialCardUid:string|null=null;
let specialChoices:PlayCardChoices={};
let chronicleOpen=false;
let tutorialPage=0;
let spectatorMode=false;
let spectatorPaused=false;
let spectatorTimer:ReturnType<typeof globalThis.setTimeout>|null=null;

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
const unitTileName=(p:Player,u:Unit)=>{const physical=u.position>2?u.position:u.position===1?1:u.position===0?p.homeTileId:2-p.homeTileId,tile=game?.state.tiles.find(item=>item.id===physical);return tile?.zoneCard?.name??(tile?.kind==='center'?'Center Zone':physical===p.homeTileId?'Home Gate':'Enemy Gate')};
const resetBattleViews=()=>{inspectedBattleCardUid=null;inspectedUnit=null;inspectedLeader=null;inspectedZone=null;inspectedTile=null;pileView=null;specialCardUid=null;specialChoices={};chronicleOpen=false};
const clearSpectatorTimer=()=>{if(spectatorTimer!==null){globalThis.clearTimeout(spectatorTimer);spectatorTimer=null}};

function showMenu(){
  clearSpectatorTimer();spectatorMode=false;spectatorPaused=false;screen='menu';if(onlineClient){onlineClient.disconnect();onlineClient=null}pendingLeader=null;resetBattleViews();document.body.className='menu-screen';renderMenu();
}
function showBuilder(){
  clearSpectatorTimer();spectatorMode=false;spectatorPaused=false;if(onlineClient){onlineClient.disconnect();onlineClient=null}pendingLeader=null;screen='builder';document.body.className='builder-screen';renderBuilder();
}
function startBattle(){
  if(config.cards.length!==DECK_SIZE)return showBuilder();
  clearSpectatorTimer();spectatorMode=false;spectatorPaused=false;resetBattleViews();screen='battle';document.body.className='battle-screen';game=new HeroicsGame(false,{playerElement:config.leader,enemyElement:config.opponent,playerDeckIds:config.cards});game.subscribe(renderBattle);
}

function scheduleSpectatorStep(){
  if(!spectatorMode||spectatorPaused||spectatorTimer!==null||!game||game.state.winner)return;
  const delay=game.state.phase==='enemy'?240:760;
  spectatorTimer=globalThis.setTimeout(()=>{
    spectatorTimer=null;
    if(spectatorMode&&!spectatorPaused&&game instanceof HeroicsGame)game.autoPlayStep();
    scheduleSpectatorStep();
  },delay);
}

function startAiVsAi(){
  clearSpectatorTimer();spectatorMode=true;spectatorPaused=false;resetBattleViews();screen='battle';document.body.className='battle-screen spectator-screen';
  const playerDeck=config.cards.length===DECK_SIZE?config.cards:starterDeckIds(config.leader);
  game=new HeroicsGame(false,{playerElement:config.leader,enemyElement:config.opponent,playerDeckIds:playerDeck,enemyDeckIds:starterDeckIds(config.opponent)},true);
  game.subscribe(renderBattle);
}

function renderMenu(){
  const selected=currentForm(config.leader,0),opponent=currentForm(config.opponent,0);
  app.innerHTML=`<main class="start-screen"><section class="start-copy"><div class="menu-brand"><span>H</span><small>CLASH OF LEADERS</small><h1>HEROICS</h1><strong class="beta-badge">BETA</strong></div><p>Build your deck. Choose your Leader. Enter the battlefield.</p><div class="menu-actions"><button class="primary" data-ui="start">Battle the AI</button><button class="spectate-button" data-ui="spectate">◉ Watch AI vs AI</button><button class="online-button" data-ui="online">⚔ Play Online</button><button data-ui="builder">Create a Deck</button><button data-ui="tutorial">How to Play</button></div><div class="saved-summary"><small>SAVED BATTLE SETUP</small><div><img src="${leaderImage(config.leader)}" alt="${selected.title}"><span><b>${selected.title}</b><em>${config.cards.length} / ${DECK_SIZE} cards</em></span><strong>VS</strong><img src="${leaderImage(config.opponent)}" alt="${opponent.title}"><span><b>${opponent.title}</b><em>${opponentLabel(config.opponent)} AI</em></span></div></div></section><section class="start-art"><div class="menu-leader flame"><img src="${leaderImage('flame')}" alt="Ignis"></div><div class="menu-leader tide"><img src="${leaderImage('tide')}" alt="Shellgon"></div></section></main>`;
  app.querySelector<HTMLElement>('[data-ui="start"]')!.onclick=startBattle;
  app.querySelector<HTMLElement>('[data-ui="spectate"]')!.onclick=startAiVsAi;
  app.querySelector<HTMLElement>('[data-ui="builder"]')!.onclick=showBuilder;
  app.querySelector<HTMLElement>('[data-ui="online"]')!.onclick=showOnline;
  app.querySelector<HTMLElement>('[data-ui="tutorial"]')!.onclick=showTutorial;
}

const tutorialSteps=[
  {title:'Build a 40-card deck',text:'Choose one Leader and any 40 cards from the complete library. Every Leader can use every card, with up to three copies of each card.',icon:'40'},
  {title:'Deploy Phase',text:'Spend Essence to summon units directly onto a legal tile, with no more than three units from either team on one hex. Play Equipment here. Zone cards attach along a highlighted edge; isolated red-X positions are illegal. Magic may be cast during either phase.',icon:'◆'},
  {title:'Battle Phase',text:'Select a unit to move, attack, or activate an ability. A contested tile blocks forward movement unless the unit has Sneak.',icon:'⚔'},
  {title:'Target an attack',text:'Select your unit, press Attack, then choose an enemy in the same tile. Confirm the attack or cancel targeting and keep making other selections. Attacks never cause counterattacks.',icon:'⌖'},
  {title:'Grow the battlefield',text:'The map begins as three edge-connected hexes. A Zone card may attach to either side of any existing tile along the glowing perimeter edges. Every added tile must remain part of the same cluster.',icon:'⬢'},
  {title:'Ability Points and evolution',text:'Leader abilities spend Ability Points, not Essence. AP refreshes each turn. When evolution is ready, activate it at will once during your turn.',icon:'✦'},
  {title:'Review the battle',text:'Click a Leader for complete stats, click the Graveyard to inspect discarded cards, and open Battle Chronicle for damage, costs, summons, abilities, and movement.',icon:'☰'},
];
function showTutorial(){screen='tutorial';tutorialPage=0;document.body.className='tutorial-screen';renderTutorial()}
function renderTutorial(){const step=tutorialSteps[tutorialPage];app.innerHTML=`<main class="tutorial"><header><button data-ui="menu">‹ Main Menu</button><div><small>HEROICS FIELD GUIDE</small><h1>How to Play</h1></div><b>${tutorialPage+1} / ${tutorialSteps.length}</b></header><section><div class="tutorial-icon">${step.icon}</div><small>STEP ${tutorialPage+1}</small><h2>${step.title}</h2><p>${step.text}</p><div class="tutorial-dots">${tutorialSteps.map((_,i)=>`<i class="${i===tutorialPage?'active':''}"></i>`).join('')}</div><footer><button data-tutorial="prev" ${tutorialPage===0?'disabled':''}>Previous</button><button class="primary" data-tutorial="next">${tutorialPage===tutorialSteps.length-1?'Finish Tutorial':'Next'}</button></footer></section></main>`;app.querySelector<HTMLElement>('[data-ui="menu"]')!.onclick=showMenu;app.querySelector<HTMLElement>('[data-tutorial="prev"]')!.onclick=()=>{tutorialPage--;renderTutorial()};app.querySelector<HTMLElement>('[data-tutorial="next"]')!.onclick=()=>{if(tutorialPage===tutorialSteps.length-1)showMenu();else{tutorialPage++;renderTutorial()}}}

function showOnline(){screen='online';onlineMessage='Create a private room or enter the code your friend sent you.';onlineRoomCode='';onlineBusy=false;document.body.className='online-screen';renderOnline()}
function onlineUpdate(update:{roomCode?:string;waitingForOpponent?:boolean;opponentConnected?:boolean;message?:string;matchStarted?:boolean}){
  if(update.roomCode)onlineRoomCode=update.roomCode;
  if(update.message)onlineMessage=update.message;
  if(update.waitingForOpponent)onlineMessage='Room created. Share this code and wait for your friend.';
  if(update.matchStarted&&onlineClient){game=onlineClient;screen='battle';onlineBusy=false;resetBattleViews();document.body.className='battle-screen online-battle';onlineClient.subscribe(renderBattle);return}
  if(screen==='online'){onlineBusy=false;renderOnline()}
}
async function startOnline(mode:'create'|'join'|'reconnect',code=''){
  if(config.cards.length!==DECK_SIZE){onlineMessage='Finish your 40-card deck before playing online.';return renderOnline()}
  onlineBusy=true;onlineMessage='Connecting to the Heroics match server…';renderOnline();onlineClient=new OnlineGameClient(config,onlineUpdate);
  try{if(mode==='create')await onlineClient.createRoom();else if(mode==='join')await onlineClient.joinRoom(code);else await onlineClient.reconnect()}
  catch(error){onlineBusy=false;onlineMessage=error instanceof Error?error.message:'Could not connect.';onlineClient=null;renderOnline()}
}
function renderOnline(){
  const saved=OnlineGameClient.savedReconnect(),leader=currentForm(config.leader,0);
  app.innerHTML=`<main class="online-lobby"><header><button data-ui="menu">‹ Back</button><div><small>HEROICS MULTIPLAYER</small><h1>Play With Friends</h1><strong class="beta-badge">BETA</strong></div></header><section class="online-room"><div class="online-leader ${config.leader}"><img src="${leaderImage(config.leader)}" alt="${leader.title}"><div><small>YOUR SAVED DECK</small><h2>${leader.title}</h2><p>${config.cards.length} / ${DECK_SIZE} cards</p><button data-ui="builder">Edit Deck</button></div></div><div class="room-actions"><article><span>1</span><h2>Create a Room</h2><p>Make a private match and send the five-character code to your friend.</p><button class="primary" data-online="create" ${onlineBusy?'disabled':''}>Create Private Room</button></article><i>OR</i><article><span>2</span><h2>Join a Room</h2><p>Enter the room code your friend shared with you.</p><input id="room-code" maxlength="5" autocomplete="off" placeholder="ABCDE" value="${onlineRoomCode}"><button data-online="join" ${onlineBusy?'disabled':''}>Join Friend</button></article></div>${onlineRoomCode?`<div class="room-code"><small>YOUR ROOM CODE</small><strong>${onlineRoomCode}</strong><button data-copy-code>Copy Code</button><em>Waiting for your friend to join…</em></div>`:''}<div class="online-message">${onlineBusy?'<i></i>':''}<span>${onlineMessage}</span></div>${saved&&!onlineRoomCode?`<button class="reconnect" data-online="reconnect" ${onlineBusy?'disabled':''}>Reconnect to room ${saved.roomCode}</button>`:''}<footer>Both players use their saved 40-card deck. The match server protects turn order and synchronizes every move.</footer></section></main>`;
  app.querySelector<HTMLElement>('[data-ui="menu"]')!.onclick=showMenu;
  app.querySelector<HTMLElement>('[data-ui="builder"]')!.onclick=showBuilder;
  app.querySelector<HTMLElement>('[data-online="create"]')?.addEventListener('click',()=>startOnline('create'));
  app.querySelector<HTMLElement>('[data-online="join"]')?.addEventListener('click',()=>{const code=app.querySelector<HTMLInputElement>('#room-code')!.value.trim().toUpperCase();if(code.length!==5){onlineMessage='Enter the complete five-character room code.';return renderOnline()}startOnline('join',code)});
  app.querySelector<HTMLElement>('[data-online="reconnect"]')?.addEventListener('click',()=>startOnline('reconnect'));
  app.querySelector<HTMLElement>('[data-copy-code]')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(onlineRoomCode);onlineMessage='Room code copied.';renderOnline()});
}

const leaderProfiles:Record<Element,{role:string;strategy:string;ability:string;evolution:string;accent:string}>={
  flame:{role:'Solar Knight • Aggressive',strategy:'Push units forward, gain Glory quickly, and finish battles with direct solar damage.',ability:'Solar Slash — Once per turn, spend 2 Ability Points to deal 5 damage to a unit or Leader.',evolution:'Four forms. Evolution may be activated at will once per turn when its requirement is met.',accent:'Fast pressure and rising damage'},
  tide:{role:'Crab Warrior • Defensive',strategy:'Control the battlefield with durable units, healing, and increasingly powerful tidal armor.',ability:'Healing Waters — Spend 2 Ability Points to restore 3 Health to a friendly unit.',evolution:'Four forms. Evolution may be activated at will once per turn when its requirement is met.',accent:'Defense, healing, and control'},
  undead:{role:'Undead Queen • Graveyard',strategy:'Search for royal Units, recycle the fallen, and command an expanding army of Skeleton tokens.',ability:'Raise Skeleton — Once per turn, summon a 1 Power / 2 Health Skeleton token. Higher forms summon ready or additional Skeletons.',evolution:'Four forms. Evolves at 3, 7, and 12 Glory.',accent:'Resurrection, tokens, and kill-triggered healing'},
  storm:{role:'Storm Beast • Magic Tempo',strategy:'Cast Magic to evolve, build Storm Charges, shield aerial Beasts, and control targets with wind and lightning.',ability:'Static Pulse — Once per turn, deal 1 Lightning damage to any target.',evolution:'Cast 2 Magic, deal 6 damage in one turn, then build 3 Charges or cast Tempest Magic.',accent:'Magic chains and battlefield movement'},
};

function evolutionGallery(element:Element){
  return EVOLUTIONS[element].map((evolution,index)=>{
    const condition=element==='storm'?['Base form','Cast 2 Magic cards total','Deal 6 damage in one turn','Hold 3 Storm Charges or cast Tempest Magic'][index]:index===0?'Base form':`${evolution.gloryRequired} Glory`;
    const abilityDetail=element==='undead'?' — Summon Skeleton token(s)':evolution.abilityDamage?` — ${evolution.abilityDamage} damage`:' — Passive ability';
    return `<article class="leader-evolution-card"><img src="/assets/leaders/${evolution.image}" alt="${evolution.title}"><div><small>${evolution.form} • LEVEL ${evolution.level}</small><h3>${evolution.title}</h3><span><b>⚔ ${evolution.attack}</b><b>♥ ${evolution.maxHealth}</b><b>✦ ${evolution.abilityPoints} AP</b></span><p><strong>${evolution.ability}</strong>${abilityDetail}</p><p>${evolution.passive}</p><em>${condition}</em></div></article>`;
  }).join('');
}

function leaderConfirmModal(element:Element){
  const form=currentForm(element,0),profile=leaderProfiles[element],signatures=cardPool[element].filter(card=>card.element===element).slice(0,3);
  return `<div class="leader-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="leader-confirm-title"><section class="leader-confirm ${element}"><button class="confirm-close" data-leader-cancel aria-label="Close Leader details">×</button><div class="confirm-portrait"><img src="${leaderImage(element)}" alt="${form.title}"><span>${elementIcon(element)}</span></div><div class="confirm-copy"><small>CONFIRM YOUR LEADER</small><h2 id="leader-confirm-title">${form.title}</h2><strong>${profile.role}</strong><p>${profile.strategy}</p><div class="confirm-facts"><article><small>HEALTH</small><b>${form.maxHealth}</b></article><article><small>ABILITY POINTS</small><b>${form.abilityPoints}</b></article><article><small>BATTLE STYLE</small><b>${profile.accent}</b></article></div><div class="confirm-rules"><p><b>Ability</b>${profile.ability}</p><p><b>Evolution</b>${profile.evolution}</p></div><div class="leader-evolution-gallery"><small>EVOLUTION LINE • BATTLE STATS</small><div>${evolutionGallery(element)}</div></div><div class="signature-row"><small>SIGNATURE CARDS</small><div>${signatures.map(card=>`<article><img src="${cardImage(card)}" alt=""><span><b>${card.name}</b><small>${card.kind} • ${card.cost} Essence</small></span></article>`).join('')}</div></div><div class="confirm-actions"><button data-leader-cancel>Keep Current Leader</button><button class="primary" data-leader-confirm="${element}">${config.leader===element?'Confirm Leader':'Confirm & Keep Deck'}</button></div><em>${config.leader===element?'This is your currently selected Leader.':'Your current 40-card deck stays equipped. Every Leader may use every card.'}</em></div></section></div>`;
}

function renderBuilder(){
  const available=allCards.filter(card=>(cardFilter==='all'||card.kind===cardFilter)&&card.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selected=cardById(selectedCardId)??allCards[0];
  const nextCount=cardCount(selected.id),canAdd=config.cards.length<DECK_SIZE&&nextCount<MAX_COPIES;
  const deckEntries=allCards.map(card=>({card,count:cardCount(card.id)})).filter(entry=>entry.count>0);
  const filters:(CardKind|'all')[]=['all','unit','magic','equipment','zone'];
  app.innerHTML=`<main class="deck-builder"><header class="builder-header"><button data-ui="menu">‹ Back</button><div><small>HEROICS DECK FORGE</small><h1>Create Your Deck</h1></div><div class="deck-total ${config.cards.length===DECK_SIZE?'complete':''}"><b>${config.cards.length}</b><span>/ ${DECK_SIZE} CARDS</span></div></header><section class="builder-setup"><div><small>1. CHOOSE YOUR LEADER</small><div class="choice-row">${(['flame','tide','undead','storm'] as Element[]).map(element=>`<button class="leader-choice ${config.leader===element?'selected':''}" data-leader="${element}"><img src="${leaderImage(element)}" alt=""><span><b>${elementName(element)}</b><em>${elementLabel(element)}</em></span></button>`).join('')}</div></div><div><small>2. CHOOSE YOUR OPPONENT</small><div class="choice-row">${(['flame','tide','undead','storm'] as Element[]).map(element=>`<button class="opponent-choice ${config.opponent===element?'selected':''}" data-opponent="${element}"><i>${elementIcon(element)}</i><span><b>${opponentLabel(element)}</b><em>${leaderTitle(element)}</em></span></button>`).join('')}</div></div></section><section class="builder-workspace"><div class="collection-panel"><div class="universal-pool-note"><b>UNIVERSAL CARD LIBRARY</b><span>Every Leader can use every card. Build any 40-card combination, with up to 3 copies per card.</span></div><div class="collection-tools"><input id="card-search" value="${searchQuery}" placeholder="Search all cards…"><div>${filters.map(filter=>`<button class="${cardFilter===filter?'active':''}" data-filter="${filter}">${filter}</button>`).join('')}</div></div><div class="collection-grid">${available.map(card=>`<button class="collection-card ${card.element} ${selected.id===card.id?'selected':''}" data-inspect="${card.id}"><img src="${cardImage(card)}" alt="${card.name}"><span class="cost">${card.cost}</span><span class="owned">${cardCount(card.id)} / ${MAX_COPIES}</span><b>${card.name}</b><small>${card.kind} • ${cardAttribute(card)}</small></button>`).join('')}</div></div><aside class="card-preview ${selected.element}"><img src="${cardImage(selected)}" alt="${selected.name}"><div class="preview-info"><span>${selected.kind} • ${cardAttribute(selected)} attribute</span><h2>${selected.name}</h2><div class="preview-stats"><b>◆ ${selected.cost} Essence</b>${selected.kind==='unit'?`<b>⚔ ${selected.attack}</b><b>♥ ${selected.health}</b>`:''}</div><p>${selected.text}</p>${selected.flavor?`<em>“${selected.flavor}”</em>`:''}<button data-add="${selected.id}" ${canAdd?'':'disabled'}>${nextCount>=MAX_COPIES?'Maximum 3 Copies':config.cards.length>=DECK_SIZE?'Deck Is Full':'+ Add to Deck'}</button></div></aside><aside class="deck-panel"><div class="deck-panel-title"><div><small>YOUR DECK</small><h2>${elementName(config.leader)} Deck</h2></div><b>${config.cards.length}/${DECK_SIZE}</b></div><div class="deck-list">${deckEntries.map(({card,count})=>`<button data-remove="${card.id}"><img src="${cardImage(card)}" alt=""><span><b>${card.name}</b><small>${card.kind} • ${card.cost} Essence</small></span><strong>×${count}</strong><i>−</i></button>`).join('')||'<p class="empty-deck">Click a card, then press “Add to Deck.”</p>'}</div><div class="deck-footer"><p>${config.cards.length===DECK_SIZE?'Your deck is ready for battle.':`Add ${DECK_SIZE-config.cards.length} more card${config.cards.length===DECK_SIZE-1?'':'s'}.`}</p><button class="primary" data-ui="start" ${config.cards.length===DECK_SIZE?'':'disabled'}>Start Battle</button><button data-ui="reset">Reset Starter Deck</button></div></aside></section></main>`;
  if(pendingLeader)app.insertAdjacentHTML('beforeend',leaderConfirmModal(pendingLeader));
  bindBuilder();
}

function bindBuilder(){
  app.querySelector<HTMLElement>('[data-ui="menu"]')!.onclick=showMenu;
  app.querySelectorAll<HTMLElement>('[data-leader]').forEach(el=>el.onclick=()=>{pendingLeader=el.dataset.leader as Element;renderBuilder()});
  app.querySelectorAll<HTMLElement>('[data-leader-cancel]').forEach(el=>el.onclick=()=>{pendingLeader=null;renderBuilder()});
  app.querySelectorAll<HTMLElement>('[data-leader-confirm]').forEach(el=>el.onclick=()=>{const selected=el.dataset.leaderConfirm as Element;if(selected!==config.leader){config={...config,leader:selected};persist()}pendingLeader=null;renderBuilder()});
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
  return `<section class="leader leader-portrait-panel ${side} ${p.element} stage-${p.evolutionStage} ${p.evolutionStage?'evolved':''}" data-inspect-leader="${side}" role="button" tabindex="0"><div class="portrait"><img src="/assets/leaders/${form.image}" alt="Full portrait of ${form.title}"></div><div class="leader-copy"><small>${enemy?'RIVAL LEADER':'YOUR LEADER'} • LEVEL ${form.level} • ${form.form}</small><h2>${form.title}</h2><div class="bar"><i style="width:${Math.max(0,p.health/p.maxHealth*100)}%"></i><span>${Math.max(0,p.health)} / ${p.maxHealth} HP</span></div><div class="leader-stats"><b>⚔ ${p.leaderAttack}</b><button data-open-pile="${side}">☠ ${p.graveyard.length}${p.cemetery.length?` • ${p.cemetery.length}`:''}</button><b>${progress}</b></div></div><span class="inspect-hint">View stats</span></section>`;
};

const unitCard=(u:Unit,selected:string|null,side:Side,target:string|null,inZone=true)=>{
  const card=cardById(u.cardId),enemy=side==='enemy';
  const status=[u.exhausted?'exhausted':'',u.shieldReady?'shielded':'',u.frozenThisTurn||u.stunnedThisTurn?'disabled':''].filter(Boolean).join(' ');
  return `<button class="tile-unit ${enemy?'enemy':'ally'} ${u.element} ${status} ${selected===u.uid||target===u.uid?'selected':''} ${enemy&&!inZone?'out-of-zone':''}" ${enemy?`data-target="${u.uid}"`:`data-unit="${u.uid}"`} aria-label="${u.name}, ${u.attack} Power, ${u.health} of ${u.maxHealth} Health"><img src="${card?cardImage(card):leaderImage(u.element)}" alt="${u.name}"></button>`;
};

function tileUnits(s:GameState,physicalZone:number,side:Side){
  const owner=side==='player'?s.player:s.enemy;
  const logicalPosition=physicalZone>2?physicalZone:physicalZone===1?1:physicalZone===owner.homeTileId?0:2;
  const units=owner.units.filter(u=>u.position===logicalPosition);
  const attacker=s.player.units.find(u=>u.uid===s.selectedUnit);
  return units.slice(0,ZONE_CAPACITY).map(u=>unitCard(u,s.selectedUnit,side,s.selectedTarget,!attacker||side==='player'||Boolean(game?.sameZone(attacker,u)))).join('');
}

function battlefield(s:GameState){
  const placements=s.pendingZoneUid&&game?game.availableZonePlacements():[],invalid=s.pendingZoneUid&&game?game.invalidZonePlacements():[];
  // The reference board uses point-top hexagons. These measurements match the
  // rendered 232×268 tile: horizontal neighbours share a full vertical edge,
  // while diagonal neighbours share one full sloped edge.
  const hexWidth=220,hexHeight=254,rowStep=190.5,mapPadding=52;
  const displayNodes=[...s.tiles,...placements,...invalid];
  const rawX=(q:number,r:number)=>(q+r*.5)*hexWidth,rawY=(_q:number,r:number)=>r*rowStep;
  const xValues=displayNodes.map(node=>rawX(node.q,node.r)),yValues=displayNodes.map(node=>rawY(node.q,node.r));
  const minX=Math.min(...xValues),maxX=Math.max(...xValues),minY=Math.min(...yValues),maxY=Math.max(...yValues);
  const mapWidth=maxX-minX+hexWidth+mapPadding*2,mapHeight=maxY-minY+hexHeight+mapPadding*2;
  const coords=(q:number,r:number)=>`--hx:${rawX(q,r)-minX+hexWidth/2+mapPadding}px;--hy:${rawY(q,r)-minY+hexHeight/2+mapPadding}px`;
  const startingArt=(tileId:number)=>tileId===0?'/assets/zones/starting/home-gate.webp':tileId===1?'/assets/zones/starting/center-gate.webp':'/assets/zones/starting/enemy-gate.webp';
  const tiles=s.tiles.map(tile=>{const playerLogical=tile.id>2?tile.id:tile.id===1?1:tile.id===s.player.homeTileId?0:2,enemyLogical=tile.id>2?tile.id:tile.id===1?1:tile.id===s.enemy.homeTileId?0:2,contested=s.player.units.some(u=>u.position===playerLogical)&&s.enemy.units.some(u=>u.position===enemyLogical),domain=s.player.flameDomainTile===tile.id,zoneArt=`--zone-art:url('${tile.zoneCard?cardImage(tile.zoneCard):startingArt(tile.id)}');`,startingName=tile.id===0?'Home Gate':tile.id===1?'Center Gate':'Enemy Gate';return `<section class="physical-zone hex-tile ${tile.kind} ${tile.kind==='zone'?'zone-node':''} ${contested?'contested':''} ${domain?'flame-domain':''} ${s.selectedTile===tile.id?'selected-tile':''}" style="${coords(tile.q,tile.r)};${zoneArt}" data-select-tile="${tile.id}" ${tile.zoneCard?`data-zone-tile="${tile.id}"`:''} aria-label="${tile.zoneCard?.name??startingName}"><div class="tile-unit-layer enemy-unit-layer">${tileUnits(s,tile.id,'enemy')}</div><div class="tile-unit-layer player-unit-layer">${tileUnits(s,tile.id,'player')}</div></section>`}).join('');
  const edgeStyle=(place:typeof placements[number])=>{const anchor=s.tiles.find(tile=>tile.id===place.anchorId)!;const ax=rawX(anchor.q,anchor.r)-minX+hexWidth/2+mapPadding,ay=rawY(anchor.q,anchor.r)-minY+hexHeight/2+mapPadding,px=rawX(place.q,place.r)-minX+hexWidth/2+mapPadding,py=rawY(place.q,place.r)-minY+hexHeight/2+mapPadding,angle=Math.atan2(py-ay,px-ax)*180/Math.PI+90;return `--ex:${(ax+px)/2}px;--ey:${(ay+py)/2}px;--er:${angle}deg`};
  const legalEdges=placements.map(place=>`<button class="hex-edge-placement" style="${edgeStyle(place)}" data-place-zone data-q="${place.q}" data-r="${place.r}" data-anchor="${place.anchorId}" aria-label="Attach Zone along this highlighted edge"><b>+</b></button>`).join('');
  const illegal=invalid.map(place=>`<div class="hex-illegal-placement" style="${coords(place.q,place.r)}" aria-label="Permanent forbidden area behind a Gate"><b>×</b></div>`).join('');
  return `<div class="zone-battlefield hex-field expandable-field"><div class="hex-map" style="width:${mapWidth}px;height:${mapHeight}px">${illegal}${tiles}${legalEdges}</div>${s.pendingZoneUid?`<div class="placement-instruction"><b>Choose one of the four open Zone edges</b><span>Red X hexes behind either Gate are permanently forbidden • ${s.tiles.length} / 7 tiles</span><button data-action="cancel-zone">Cancel</button></div>`:''}</div>`;
}

const hand=(s:GameState)=>`<div class="hand">${s.player.hand.map(c=>{const cost=game?.effectiveCost(s.player,c)??c.cost;return `<button class="card ${c.element} ${c.kind} ${inspectedBattleCardUid===c.uid?'inspected':''}" data-inspect-card="${c.uid}"><span class="cost">${cost}</span><span class="kind">${c.kind}</span><div class="card-art"><img src="${cardImage(c)}" alt="${c.name}"><span>${c.kind==='unit'?'':c.kind==='magic'?'✦':c.kind==='zone'?'⌾':'◆'}</span></div><strong>${c.name}</strong>${c.kind==='unit'?`<div class="combat"><b>⚔ ${c.attack}</b><b>♥ ${c.health}</b></div>`:''}<p>${c.text}</p></button>`}).join('')}</div>`;

const specialIds=new Set(['ultimate-sacrifice','for-the-queen','raise-the-fallen','queens-destruction','ashen-rebirth']);
function battleCardInspector(s:GameState){
  const card=s.player.hand.find(c=>c.uid===inspectedBattleCardUid);if(!card)return '';
  const cost=game?.effectiveCost(s.player,card)??card.cost;
  const phaseAllowed=card.kind==='magic'||s.phase==='deploy';
  const selectedTile=s.tiles.find(tile=>tile.id===s.selectedTile),waterTile=selectedTile?.zoneCard?.zone==='ocean'||selectedTile?.zoneCard?.zone==='lighthouse'||selectedTile?.zoneCard?.traits?.includes('Water');
  const selectedFriendly=s.player.units.some(unit=>unit.uid===s.selectedUnit),selectedEnemy=s.enemy.units.some(unit=>unit.uid===s.selectedTarget);
  const friendlyTargetCards=new Set(['coral-plate','thorned-rose-crown','crown-eternal-night','blade-forgotten-kings','stormforged-talons','gale-step-invocation','healing-downpour','gale-mantle-cloak','raincaller-totem','sailors-compass','coral-shield','captains-raincoat','overcharge','overcharge-ring','skybreaker-spear','sky-howler-spear','flame-shield','molten-armor','flarebow','molten-core-amulet','thunderstep','soul-harvest']);
  const enemyTargetCards=new Set(['aqua-burst','cold-snap','lightning-bolt']);
  const tileTargetCards=new Set(['sirens-echo','pulse-barrier','electric-trap','thunderstep','krakens-call','meteor-drop']);
  const targetBlocked=friendlyTargetCards.has(card.id)&&!selectedFriendly||enemyTargetCards.has(card.id)&&!selectedEnemy||tileTargetCards.has(card.id)&&s.selectedTile===null||['sirens-echo','krakens-call'].includes(card.id)&&!waterTile||card.id==='meteor-drop'&&(!selectedTile||selectedTile.id<3)||card.id==='flame-shogun'&&!s.player.units.some(unit=>unit.uid===s.selectedUnit&&unit.cardId==='ember-samurai');
  const gateFull=card.kind==='unit'&&card.id!=='kraken'&&s.player.units.filter(u=>u.position===0).length>=ZONE_CAPACITY;
  const zoneBoundBlocked=card.id==='kraken'&&!waterTile;
  const fieldFull=card.kind==='zone'&&s.tiles.length>=MAX_FIELD_TILES,canPlay=!spectatorMode&&s.phase!=='enemy'&&phaseAllowed&&cost<=s.player.essence&&!gateFull&&!zoneBoundBlocked&&!targetBlocked&&!fieldFull;
  const label=spectatorMode?'Spectator Mode':!phaseAllowed?'Deploy Phase only':cost>s.player.essence?'Not Enough Essence':gateFull?'Home Tile Full':zoneBoundBlocked?'Select a Water Zone':targetBlocked?'Select Required Target':fieldFull?'Field Maximum: 7 Tiles':card.kind==='zone'?'Choose Edge Placement':specialIds.has(card.id)?'Choose Targets':'Play Card';
  return `<aside class="battle-card-inspector ${card.element}"><button data-close-inspector aria-label="Close card information">×</button><img src="${cardImage(card)}" alt="${card.name}"><div><small>${card.kind} • ${card.element}</small><h3>${card.name}</h3><span><b>◆ ${cost}</b>${card.kind==='unit'?`<b>⚔ ${card.attack}</b><b>♥ ${card.health}</b>`:''}</span><p>${card.text}</p>${card.flavor?`<em>“${card.flavor}”</em>`:''}<button class="primary" data-play-card="${card.uid}" ${canPlay?'':'disabled'}>${label}</button></div></aside>`;
}

function boardUnitInspector(s:GameState){
  if(!inspectedUnit)return '';
  const owner=inspectedUnit.side==='player'?s.player:s.enemy,u=owner.units.find(unit=>unit.uid===inspectedUnit!.uid);if(!u)return '';
  const card=cardById(u.cardId),statuses=[u.exhausted?'Exhausted':'Ready',u.shieldReady?'Wind Step ready':'',u.frozenThisTurn?'Frozen':'',u.stunnedThisTurn?'Stunned':'',u.coralShield?`Coral Shield ${u.coralShield}`:'',u.unitAbilityUsed?'Ability used':''].filter(Boolean);
  const actions=!spectatorMode&&inspectedUnit.side==='player'&&s.phase==='battle'?`<div class="unit-command-row"><button data-action="advance">Move</button><button data-action="begin-attack" ${u.exhausted?'disabled':''}>Attack</button>${s.attackMode==='unit'?'<button data-action="cancel-attack">Cancel Attack</button>':''}</div>`:'';
  return `<aside class="battle-card-inspector unit-inspector ${u.element}"><button data-close-unit-inspector>×</button><img src="${card?cardImage(card):leaderImage(u.element)}" alt="${u.name}"><div><small>${u.traits.join(' • ')} • ${unitTileName(owner,u)}</small><h3>${u.name}</h3><span><b>⚔ ${u.attack}</b><b>♥ ${u.health} / ${u.maxHealth}</b></span><p>${card?.text??'A summoned Skeleton token.'}</p><dl><dt>Equipment</dt><dd>${u.equipment.join(', ')||'None'}</dd><dt>Status</dt><dd>${statuses.join(', ')}</dd></dl>${actions}</div></aside>`;
}

function zoneInspector(s:GameState){
  const tile=s.tiles.find(item=>item.id===inspectedTile),c=tile?.zoneCard;if(!tile||!c)return '';
  const playerCount=s.player.units.filter(u=>(u.position>2?u.position:u.position===1?1:u.position===0?s.player.homeTileId:2-s.player.homeTileId)===tile.id).length,enemyCount=s.enemy.units.filter(u=>(u.position>2?u.position:u.position===1?1:u.position===0?s.enemy.homeTileId:2-s.enemy.homeTileId)===tile.id).length;
  return `<aside class="battle-card-inspector zone-inspector neutral"><button data-close-zone-inspector>×</button><img src="${cardImage(c)}" alt="${c.name}"><div><small>ZONE TILE • CONNECTED CLUSTER</small><h3>${c.name}</h3><span><b>${playerCount} FRIENDLY • ${enemyCount} ENEMY</b></span><p>${c.text}</p>${c.flavor?`<em>“${c.flavor}”</em>`:''}<dl><dt>Tile capacity</dt><dd>Up to 3 units per team</dd><dt>Controller</dt><dd>${tile.ownerHomeTileId===s.player.homeTileId?'You':'Rival'}</dd></dl></div></aside>`;
}

function leaderStatsModal(s:GameState){
  if(!inspectedLeader)return '';
  const p=inspectedLeader==='player'?s.player:s.enemy,form=currentForm(p.element,p.evolutionStage);
  const zoneCount=s.tiles.filter(tile=>tile.kind==='zone'&&tile.ownerHomeTileId===p.homeTileId).length,statuses=[p.leaderAbilityUsed?'Leader ability used this turn':'Leader ability ready',p.rainfieldTurns?`Rainfield: ${p.rainfieldTurns} turns`:'',p.coreEquipped?`${p.stormCharges} Storm Charges`:'',`${zoneCount} connected Zone tile${zoneCount===1?'':'s'}`].filter(Boolean);
  return `<div class="detail-modal" role="dialog" aria-modal="true"><section class="leader-detail ${p.element}"><button data-close-leader>×</button><div class="leader-detail-hero"><img src="/assets/leaders/${form.image}" alt="${form.title}"><div><small>${inspectedLeader==='player'?'YOUR':'RIVAL'} LEADER • ${form.form}</small><h2>${form.title}</h2><p>Level ${form.level} • Evolution ${p.evolutionStage+1} / 4</p></div></div><div class="leader-detail-stats"><article><small>HEALTH</small><b>${Math.max(0,p.health)} / ${p.maxHealth}</b></article><article><small>ATTACK</small><b>${p.leaderAttack}</b></article><article><small>ABILITY POINTS</small><b>${p.abilityPoints} / ${p.maxAbilityPoints}</b></article><article><small>ESSENCE</small><b>${p.essence} / ${p.maxEssence}</b></article></div><div class="leader-current-rules"><article><small>CURRENT ABILITY</small><h3>${form.ability}</h3><p>${leaderProfiles[p.element].ability}</p></article><article><small>CURRENT PASSIVE</small><h3>${form.form}</h3><p>${form.passive}</p></article></div><div class="leader-loadout"><p><b>Equipment:</b> ${p.leaderEquipment.join(', ')||'None'}</p><p><b>Status:</b> ${statuses.join(' • ')}</p></div><div class="leader-ability-list"><small>ALL EVOLUTION ABILITIES</small>${EVOLUTIONS[p.element].map((e,index)=>`<article class="${index===p.evolutionStage?'current':''}"><b>Level ${e.level} — ${e.ability}</b><span>${e.passive}</span></article>`).join('')}</div>${!spectatorMode&&inspectedLeader==='player'&&s.phase==='battle'?`<button class="leader-basic-attack" data-action="leader-attack" ${p.leaderAttackUsed?'disabled':''}>Leader Attack • ${p.leaderAttack}</button>`:''}</section></div>`;
}

function chronicleModal(s:GameState){return chronicleOpen?`<div class="detail-modal chronicle-backdrop"><section class="chronicle-modal"><button data-close-chronicle>×</button><header><small>COMPLETE MATCH RECORD</small><h2>Battle Chronicle</h2><p>Newest events appear first. Costs, damage, healing, movement, summons, and abilities are recorded.</p></header><div>${s.log.map((entry,index)=>`<article><i>${s.log.length-index}</i><p>${entry}</p></article>`).join('')}</div></section></div>`:''}

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
    const owner=category==='friendlyUnitUids'?s.player:s.enemy;return `<button class="choice-card ${isSelected?'selected':''}" data-special-option="${category}" data-special-uid="${u.uid}" data-special-max="${max}"><img src="${cardById(u.cardId)?cardImage(cardById(u.cardId)!):leaderImage(u.element)}" alt=""><span><b>${u.name}</b><small>${unitTileName(owner,u)} • ⚔ ${u.attack} • ♥ ${u.health}</small></span><i>${isSelected?'✓':'+'}</i></button>`;
  };
  if(spell.id==='ultimate-sacrifice'){
    const options=s.player.hand.filter(c=>c.uid!==spell.uid&&c.kind==='unit');body=`<p>Choose one or two Unit cards from your hand to discard.</p><div class="choice-grid">${options.map(c=>cardOption(c,'Hand')).join('')||'<em>No Unit cards are available.</em>'}</div>`;valid=selectedCards.size>0&&selectedCards.size<=2;
  }else if(spell.id==='for-the-queen'){
    const options=s.player.deck.filter(c=>c.kind==='unit'&&c.id!=='forever-dead-king');body=`<p>Choose up to two Units to deploy from your deck. Forever Dead King cannot be chosen.</p><div class="choice-grid">${options.map(c=>cardOption(c,'Deck')).join('')||'<em>No eligible Units remain in your deck.</em>'}</div>`;valid=selectedCards.size>0&&selectedCards.size<=2;
  }else if(spell.id==='raise-the-fallen'){
    const options=s.player.graveyard.filter(c=>c.kind==='unit');body=`<p>Choose up to two fallen Units to deploy directly at your open Gates.</p><div class="choice-grid">${options.map(c=>cardOption(c,'Graveyard')).join('')||'<em>No Unit cards are in your graveyard.</em>'}</div>`;valid=selectedCards.size>0&&selectedCards.size<=2;
  }else if(spell.id==='ashen-rebirth'){
    const options=s.player.graveyard.filter(c=>c.kind==='unit'&&c.traits?.includes('Fire'));body=`<p>Choose one Fire Unit in your graveyard to summon with 1 Health.</p><div class="choice-grid">${options.map(c=>cardOption(c,'Graveyard')).join('')||'<em>No Fire Unit is available.</em>'}</div>`;valid=selectedCards.size===1;
  }else{
    body=`<p>Choose exactly one friendly Unit to sacrifice, then choose one or two enemy Units to destroy.</p><div class="destruction-columns"><section><h3>Friendly sacrifice</h3>${s.player.units.map(u=>unitOption(u,'friendlyUnitUids',1)).join('')||'<em>No friendly Unit available.</em>'}</section><section><h3>Enemy targets</h3>${s.enemy.units.map(u=>unitOption(u,'enemyUnitUids',2)).join('')||'<em>No enemy Unit available.</em>'}</section></div>`;valid=selectedFriendly.size===1&&selectedEnemies.size>0&&selectedEnemies.size<=2;
  }
  return `<div class="detail-modal special-backdrop"><section class="special-modal"><button data-close-special>×</button><header><small>CHOOSE CARD TARGETS</small><h2>${spell.name}</h2><p>${spell.text}</p></header>${body}<footer><button data-close-special>Cancel</button><button class="primary" data-confirm-special ${valid?'':'disabled'}>Confirm & Cast • ${game?.effectiveCost(s.player,spell)??spell.cost} Essence</button></footer></section></div>`;
}

const phaseHelp:Record<string,string>={deploy:'Summon units onto a hex, play Equipment, or attach a Zone card along a highlighted cluster edge. Red X positions are illegal.',battle:'Select a connected destination to move, attack in the same hex, or activate abilities. A contested hex stops forward movement unless a rule such as Sneak or Dive allows it.'};

function leaderAbilityButtons(s:GameState){
  if(s.phase!=='battle')return '';
  const p=s.player,used=(name:string)=>p.leaderAbilitiesUsed.includes(name),button=(action:string,label:string,cost:number,name=label)=>{const paid=p.leaderEquipment.includes('Cinder Mask')?Math.max(0,cost-1):cost;return `<button data-action="${action}" ${p.abilityPoints<paid||used(name)?'disabled':''}>${label} • ${paid} AP</button>`};
  if(p.element==='flame')return button('ability','Solar Slash',2)+(p.evolutionStage>=1?button('ability-awakening','Solar Awakening',1):'')+(p.evolutionStage>=2?button('ability-domain','Solar Domain',4):'')+(p.evolutionStage>=3?button('ability-supernova','Supernova',7,'Supernova Judgment'):'');
  if(p.element==='tide')return button('ability-heal','Healing Waters',2)+(p.evolutionStage>=1?button('ability-whirlpool',p.evolutionStage>=3?'Crushing Waves':'Whirlpool',2,p.evolutionStage>=3?'Crushing Waves':'Whirlpool'):'')+(p.evolutionStage>=2?button('ability-high-tide','High Tide',3):'')+(p.evolutionStage>=3?button('ability-world-tide','World Tide',5,'World Tide Collapse'):'');
  if(p.element==='undead'){const name=currentForm(p.element,p.evolutionStage).ability,cost=p.evolutionStage>=2?2:1;return button('ability',name,cost,name)}
  if(p.evolutionStage>=3)return button('ability-damage','Eye: Damage',4,'Eye of the Storm')+button('ability-heal','Eye: Heal',4,'Eye of the Storm')+button('ability-push','Eye: Push',4,'Eye of the Storm');
  const form=currentForm(p.element,p.evolutionStage);return button('ability',form.ability,p.evolutionStage+1,form.ability);
}

function controls(s:GameState){
  if(spectatorMode)return `<div class="phase-guide spectator-guide"><span>Both Leaders are CPU-controlled. You can still inspect Leaders, Units, Zones, Graveyards, and the Battle Chronicle.</span></div><div class="controls spectator-controls"><div class="phases"><button disabled class="active"><i>◉</i>AI VS AI</button></div><div class="actions"><button data-spectator-toggle>${spectatorPaused?'Resume Match':'Pause Match'}</button><button data-open-chronicle>Battle Chronicle</button><button class="end" data-ui="menu">Exit Spectator</button></div></div>`;
  const phases=['deploy','battle'],storm=s.player.element==='storm',active=s.phase!=='enemy';
  const selected=s.player.units.find(u=>u.uid===s.selectedUnit),unitAbility=selected?.cardId==='grave-banshee'?`<button data-action="unit-ability" ${selected.unitAbilityUsed?'disabled':''}>Banshee: Drain Attack</button>`:selected?.cardId==='phoenix-hatchling'?`<button data-action="unit-ability" ${selected.unitAbilityUsed?'disabled':''}>Tribute for Phoenix</button>`:'';
  return `<div class="phase-guide"><span>${phaseHelp[s.phase]??'The rival is taking its turn.'}</span></div><div class="controls"><div class="phases">${phases.map((p,i)=>`<button disabled class="${s.phase===p?'active':''}"><i>${i+1}</i>${p}</button>`).join('')}</div><div class="actions">${active&&game?.canEvolve(s.player)&&!s.player.evolvedThisTurn?'<button class="evolve-action" data-action="evolve">Evolve Now • Once/Turn</button>':''}${s.phase==='battle'&&selected?'<button data-action="advance">Move selected</button>':''}${s.phase==='battle'&&selected&&!s.attackMode?'<button data-action="begin-attack">Attack</button>':''}${s.attackMode?'<button data-action="attack">Confirm Attack</button><button data-action="cancel-attack">Cancel</button>':''}${active?leaderAbilityButtons(s)+unitAbility:''}${storm&&s.player.evolutionStage>=3&&active?'<button data-action="absorb">Devour Magic • 5</button>':''}${storm&&s.player.coreEquipped&&s.player.stormCharges>=3&&active?'<button data-action="core">Core Discharge • 3</button>':''}<button class="end" data-action="next" ${active?'':'disabled'}>${s.phase==='battle'?'End Turn':'Start Battle ›'}</button></div></div>`;
}

function evolutionPanel(s:GameState){
  return '';
}

function renderBattle(s:GameState){
  if(screen!=='battle')return;
  const onlineGame=game instanceof OnlineGameClient?game:null,online=Boolean(onlineGame);
  const onlineBanner=onlineGame?`<div class="online-match-bar"><span><b>ONLINE</b> ROOM ${onlineGame.roomCode}</span><strong>${s.phase==='enemy'?"Waiting for friend's turn":'Your turn'}</strong><button data-surrender>Surrender</button></div>${!onlineGame.opponentConnected?'<div class="reconnect-overlay"><div><i>⌁</i><h2>Friend disconnected</h2><p>The match is saved for 10 minutes. Waiting for them to reconnect…</p></div></div>':''}`:'';
  const cpuPhase=spectatorMode&&game instanceof HeroicsGame?game.cpuPhaseLabel():s.phase;
  const spectatorBanner=spectatorMode?`<div class="spectator-match-bar"><span><b><i></i> AI VS AI</b>${currentForm(s.player.element,s.player.evolutionStage).title} CPU vs ${currentForm(s.enemy.element,s.enemy.evolutionStage).title} CPU</span><strong>${spectatorPaused?'PAUSED':`${s.phase==='enemy'?'TOP CPU':'BOTTOM CPU'} • ${cpuPhase.toUpperCase()}`}</strong><button data-spectator-toggle>${spectatorPaused?'Resume':'Pause'}</button></div>`:'';
  app.innerHTML=`<div class="shell zone-shell ${spectatorMode?'spectator-mode':''}"><header><button class="battle-menu" data-ui="menu">☰ Menu</button><div class="brand"><span>H</span><div><small>CLASH OF LEADERS</small><h1>HEROICS</h1></div></div><div class="turn"><small>TURN ${s.turn}</small><strong>${spectatorMode?`${s.phase==='enemy'?'TOP':'BOTTOM'} CPU • ${cpuPhase.toUpperCase()}`:s.phase==='enemy'?'RIVAL TURN':s.phase.toUpperCase()+' PHASE'}</strong></div><div class="resource"><small>ESSENCE • ABILITY POINTS</small><b>${'◆'.repeat(Math.min(10,s.player.essence))}<i> ✦ ${s.player.abilityPoints}</i></b><span>${s.player.essence} Essence • ${s.player.abilityPoints}/${s.player.maxAbilityPoints} AP</span></div><button class="chronicle-toggle" data-open-chronicle>Battle Chronicle <b>${s.log.length}</b></button></header>${onlineBanner}${spectatorBanner}${leaderPanel(s.enemy,'enemy')}${battlefield(s)}${leaderPanel(s.player,'player')}<section class="bottom">${controls(s)}${hand(s)}</section>${battleCardInspector(s)}${boardUnitInspector(s)}${zoneInspector(s)}${evolutionPanel(s)}${leaderStatsModal(s)}${pileModal(s)}${specialSelectionModal(s)}${chronicleModal(s)}${s.winner?`<div class="modal"><div><small>MATCH COMPLETE</small><h2>${spectatorMode?(s.winner==='victory'?'BOTTOM CPU WINS':'TOP CPU WINS'):(s.winner==='victory'?'VICTORY':'DEFEAT')}</h2><p>${spectatorMode?'The automated match is complete.':s.winner==='victory'?'The rival Leader has fallen!':'Your Leader has been defeated.'}</p><button data-action="restart">${online?'Request rematch':spectatorMode?'Watch again':'Play again'}</button><button data-ui="menu">Return to menu</button></div></div>`:''}</div>`;
  bindBattle();
  if(spectatorMode)scheduleSpectatorStep();
}

function closeTopView(){
  if(specialCardUid){specialCardUid=null;specialChoices={}}
  else if(pileView)pileView=null;
  else if(inspectedLeader)inspectedLeader=null;
  else if(inspectedZone)inspectedZone=null;
  else if(inspectedTile!==null)inspectedTile=null;
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
  app.onclick=event=>{
    const target=(event.target as HTMLElement).closest<HTMLElement>('[data-open-chronicle],[data-close-chronicle]');
    if(!target)return;
    event.preventDefault();
    event.stopPropagation();
    chronicleOpen=target.hasAttribute('data-open-chronicle');
    renderBattle(game!.state);
  };
  app.querySelectorAll<HTMLElement>('[data-inspect-card]').forEach(el=>el.onclick=()=>{inspectedBattleCardUid=el.dataset.inspectCard!;inspectedUnit=null;inspectedZone=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-play-card]').forEach(el=>el.onclick=()=>{if(spectatorMode)return;const uid=el.dataset.playCard!,card=game!.state.player.hand.find(c=>c.uid===uid);if(card?.kind==='zone'){inspectedBattleCardUid=null;game!.beginZonePlacement(uid)}else if(card&&specialIds.has(card.id)){specialCardUid=uid;specialChoices={};renderBattle(game!.state)}else{inspectedBattleCardUid=null;game!.playCard(uid)}});
  app.querySelectorAll<HTMLElement>('[data-close-inspector]').forEach(el=>el.onclick=()=>{inspectedBattleCardUid=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-unit-inspector]').forEach(el=>el.onclick=()=>{inspectedUnit=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-zone-inspector]').forEach(el=>el.onclick=()=>{inspectedTile=null;inspectedZone=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-unit]').forEach(el=>el.onclick=()=>{inspectedUnit={side:'player',uid:el.dataset.unit!};inspectedBattleCardUid=null;if(spectatorMode)renderBattle(game!.state);else game!.selectUnit(el.dataset.unit!)});
  app.querySelectorAll<HTMLElement>('[data-target]').forEach(el=>el.onclick=()=>{inspectedUnit={side:'enemy',uid:el.dataset.target!};inspectedBattleCardUid=null;if(spectatorMode)renderBattle(game!.state);else game!.selectTarget(el.dataset.target!)});
  app.querySelectorAll<HTMLElement>('[data-select-tile]').forEach(el=>el.onclick=event=>{if((event.target as HTMLElement).closest('[data-unit],[data-target]'))return;const tileId=Number(el.dataset.selectTile);if(el.dataset.zoneTile&&(spectatorMode||game!.state.selectedTile===tileId)){inspectedTile=tileId;renderBattle(game!.state)}else if(!spectatorMode)game!.selectTile(tileId)});
  app.querySelectorAll<HTMLElement>('[data-place-zone]').forEach(el=>el.onclick=()=>{if(!spectatorMode)game!.placeZone(Number(el.dataset.q),Number(el.dataset.r),Number(el.dataset.anchor))});
  app.querySelectorAll<HTMLElement>('[data-inspect-tile]').forEach(el=>el.onclick=event=>{event.stopPropagation();inspectedTile=Number(el.dataset.inspectTile);renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-open-chronicle]').forEach(el=>el.onclick=event=>{event.stopPropagation();chronicleOpen=true;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-chronicle]').forEach(el=>el.onclick=event=>{event.stopPropagation();chronicleOpen=false;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-inspect-leader]').forEach(el=>el.onclick=event=>{if((event.target as HTMLElement).closest('[data-open-pile]'))return;inspectedLeader=el.dataset.inspectLeader as Side;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-open-pile]').forEach(el=>el.onclick=event=>{event.stopPropagation();pileView={side:el.dataset.openPile as Side,selectedUid:null};renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-inspect-zone]').forEach(el=>el.onclick=()=>{inspectedZone=el.dataset.inspectZone as Side;inspectedUnit=null;inspectedBattleCardUid=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-leader]').forEach(el=>el.onclick=()=>{inspectedLeader=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-pile]').forEach(el=>el.onclick=()=>{pileView=null;renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-pile-card]').forEach(el=>el.onclick=()=>{if(pileView)pileView={...pileView,selectedUid:el.dataset.pileCard!};renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-close-special]').forEach(el=>el.onclick=()=>{specialCardUid=null;specialChoices={};renderBattle(game!.state)});
  app.querySelectorAll<HTMLElement>('[data-special-option]').forEach(el=>el.onclick=()=>{toggleChoice(el.dataset.specialOption as keyof PlayCardChoices,el.dataset.specialUid!,Number(el.dataset.specialMax));renderBattle(game!.state)});
  app.querySelector<HTMLElement>('[data-confirm-special]')?.addEventListener('click',()=>{if(spectatorMode||!specialCardUid)return;const uid=specialCardUid,choices=specialChoices;specialCardUid=null;specialChoices={};inspectedBattleCardUid=null;game!.playCard(uid,choices)});
  app.querySelectorAll<HTMLElement>('[data-ui="menu"]').forEach(el=>el.onclick=showMenu);
  app.querySelector<HTMLElement>('[data-surrender]')?.addEventListener('click',()=>{if(game instanceof OnlineGameClient&&confirm('Surrender this online match?'))game.surrender()});
  app.querySelectorAll<HTMLElement>('[data-spectator-toggle]').forEach(el=>el.onclick=()=>{spectatorPaused=!spectatorPaused;if(spectatorPaused)clearSpectatorTimer();renderBattle(game!.state);if(!spectatorPaused)scheduleSpectatorStep()});
  app.querySelectorAll<HTMLElement>('[data-action]').forEach(el=>el.onclick=()=>{
    const action=el.dataset.action;
    if(action==='restart'){spectatorPaused=false;game!.restart();if(spectatorMode)scheduleSpectatorStep();return}
    if(spectatorMode)return;
    if(action==='evolve')game!.evolveLeader();
    if(action==='advance')game!.advance();
    if(action==='begin-attack')game!.beginAttack();
    if(action==='cancel-attack')game!.cancelAttack();
    if(action==='cancel-zone')game!.cancelZonePlacement();
    if(action==='attack')game!.attack();
    if(action==='leader-attack')game!.leaderAttack();
    if(action==='ability'||action==='ability-damage')game!.leaderAbility('damage');
    if(action==='ability-heal')game!.leaderAbility('heal');
    if(action==='ability-push')game!.leaderAbility('push');
    if(action==='ability-awakening')game!.leaderAbility('awakening');
    if(action==='ability-domain')game!.leaderAbility('domain');
    if(action==='ability-supernova')game!.leaderAbility('supernova');
    if(action==='ability-whirlpool')game!.leaderAbility('whirlpool');
    if(action==='ability-high-tide')game!.leaderAbility('high-tide');
    if(action==='ability-world-tide')game!.leaderAbility('world-tide');
    if(action==='unit-ability'&&game!.state.selectedUnit)game!.unitAbility(game!.state.selectedUnit);
    if(action==='core')game!.dischargeCore();
    if(action==='absorb')game!.absorbMagic();
    if(action==='next')game!.nextPhase();
  });
  document.onkeydown=event=>{if(screen==='battle'&&event.key==='Escape'){closeTopView();renderBattle(game!.state)}};
}

showMenu();
