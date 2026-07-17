import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { HeroicsGame, type Phase } from '../src/game';
import { cardById, type Element } from '../src/cards';

type Seat='host'|'guest';
type DeckChoice={leader:Element;cards:string[]};
type PlayerSlot={socket:WebSocket|null;token:string;deck:DeckChoice;connected:boolean;rematch:boolean};
type Room={code:string;host:PlayerSlot;guest:PlayerSlot|null;game:HeroicsGame|null;active:Seat;phase:Phase;createdAt:number;cleanup?:ReturnType<typeof setTimeout>};
type ClientMeta={roomCode?:string;seat?:Seat};

const rooms=new Map<string,Room>();
const clients=new WeakMap<WebSocket,ClientMeta>();
const elements=new Set<Element>(['flame','tide','undead','storm']);
const port=Number(process.env.PORT||8787);
const dist=join(process.cwd(),'dist');
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};

const httpServer=createServer((req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,rooms:rooms.size}))}
  const raw=(req.url||'/').split('?')[0];
  const requested=raw==='/'?'index.html':raw.replace(/^\/+/, '');
  const safe=normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '');
  let path=join(dist,safe);
  if(!existsSync(path)||statSync(path).isDirectory())path=join(dist,'index.html');
  if(!existsSync(path)){res.writeHead(503,{'content-type':'text/plain'});return res.end('Build Heroics first with npm run build.')}
  res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':path.endsWith('index.html')?'no-cache':'public, max-age=86400'});
  createReadStream(path).pipe(res);
});

const wss=new WebSocketServer({server:httpServer,path:'/ws'});
type LiveSocket=WebSocket&{isAlive?:boolean};
const send=(socket:WebSocket,payload:unknown)=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(payload))};
const error=(socket:WebSocket,message:string)=>send(socket,{type:'error',message});
const token=()=>randomBytes(18).toString('base64url');
const roomCode=()=>{let code='';do code=randomBytes(4).toString('hex').slice(0,5).toUpperCase();while(rooms.has(code));return code};

function validDeck(value:unknown):value is DeckChoice{
  if(!value||typeof value!=='object')return false;
  const deck=value as DeckChoice;
  return elements.has(deck.leader)&&Array.isArray(deck.cards)&&deck.cards.length===20&&deck.cards.every(id=>typeof id==='string'&&cardById(id)?.element===deck.leader);
}

function slot(room:Room,seat:Seat){return seat==='host'?room.host:room.guest!}
function opponent(room:Room,seat:Seat){return seat==='host'?room.guest:room.host}
function swapPerspective(game:HeroicsGame){[game.state.player,game.state.enemy]=[game.state.enemy,game.state.player]}
function canonicalWinner(room:Room){
  if(!room.game)return null;
  if(room.game.state.player.health<=0)return 'defeat';
  if(room.game.state.enemy.health<=0)return 'victory';
  return null;
}

function viewFor(room:Room,seat:Seat){
  const state=structuredClone(room.game!.state);
  if(seat==='guest')[state.player,state.enemy]=[state.enemy,state.player];
  state.enemy.hand=[];state.enemy.deck=[];
  state.phase=room.active===seat?room.phase:'enemy';
  state.selectedUnit=room.active===seat?state.selectedUnit:null;
  state.selectedTarget=room.active===seat?state.selectedTarget:null;
  state.winner=state.player.health<=0?'defeat':state.enemy.health<=0?'victory':null;
  return state;
}

function broadcast(room:Room){
  for(const seat of ['host','guest'] as const){
    const player=seat==='host'?room.host:room.guest;if(!player?.socket)return;
    if(room.game)send(player.socket,{type:'state',roomCode:room.code,state:viewFor(room,seat),yourTurn:room.active===seat,opponentConnected:Boolean(opponent(room,seat)?.connected)});
    else send(player.socket,{type:'lobby',roomCode:room.code,waitingForOpponent:!room.guest,opponentConnected:Boolean(opponent(room,seat)?.connected)});
  }
}

function startMatch(room:Room){
  if(!room.guest)return;
  room.game=new HeroicsGame(true,{playerElement:room.host.deck.leader,enemyElement:room.guest.deck.leader,playerDeckIds:room.host.deck.cards,enemyDeckIds:room.guest.deck.cards},true);
  room.active='host';room.phase='deploy';room.host.rematch=false;room.guest.rematch=false;
  broadcast(room);
}

function perform(room:Room,seat:Seat,action:string,payload:Record<string,unknown>){
  const game=room.game!;const guest=seat==='guest';if(guest)swapPerspective(game);
  game.state.phase=room.phase;game.state.winner=null;
  try{
    if(action==='playCard'&&typeof payload.uid==='string')game.playCard(payload.uid);
    else if(action==='selectUnit'&&typeof payload.uid==='string')game.selectUnit(payload.uid);
    else if(action==='selectTarget'&&typeof payload.uid==='string')game.selectTarget(payload.uid);
    else if(action==='nextPhase')game.nextPhase();
    else if(action==='evolveLeader')game.evolveLeader();
    else if(action==='advance')game.advance();
    else if(action==='attack')game.attack();
    else if(action==='leaderAbility')game.leaderAbility(payload.choice==='heal'?'heal':payload.choice==='push'?'push':'damage');
    else if(action==='dischargeCore')game.dischargeCore();
    else if(action==='absorbMagic')game.absorbMagic();
  }finally{if(guest)swapPerspective(game)}
  game.state.winner=canonicalWinner(room);
  if(game.state.phase==='enemy'&&!game.state.winner){
    room.active=seat==='host'?'guest':'host';
    const nextGuest=room.active==='guest';if(nextGuest)swapPerspective(game);game.beginOnlineTurn();if(nextGuest)swapPerspective(game);
    room.phase='deploy';game.state.winner=canonicalWinner(room);
  }else room.phase=game.state.phase;
}

function attach(socket:WebSocket,room:Room,seat:Seat){
  const player=slot(room,seat);player.socket=socket;player.connected=true;clients.set(socket,{roomCode:room.code,seat});
  if(room.cleanup){clearTimeout(room.cleanup);room.cleanup=undefined}
}

wss.on('connection',socket=>{
  const live=socket as LiveSocket;live.isAlive=true;socket.on('pong',()=>{live.isAlive=true});
  clients.set(socket,{});
  send(socket,{type:'connected'});
  socket.on('message',raw=>{
    let message:any;try{message=JSON.parse(raw.toString())}catch{return error(socket,'Invalid network message.')}
    if(message.type==='create'){
      if(!validDeck(message.deck))return error(socket,'Your saved deck must contain exactly 20 valid cards.');
      const code=roomCode();const room:Room={code,host:{socket:null,token:token(),deck:message.deck,connected:true,rematch:false},guest:null,game:null,active:'host',phase:'deploy',createdAt:Date.now()};
      rooms.set(code,room);attach(socket,room,'host');send(socket,{type:'room-created',roomCode:code,reconnectToken:room.host.token});broadcast(room);return;
    }
    if(message.type==='join'){
      const code=String(message.roomCode||'').trim().toUpperCase();const room=rooms.get(code);
      if(!room)return error(socket,'Room not found. Check the five-character code.');
      if(room.guest)return error(socket,'That room already has two players.');
      if(!validDeck(message.deck))return error(socket,'Your saved deck must contain exactly 20 valid cards.');
      room.guest={socket:null,token:token(),deck:message.deck,connected:true,rematch:false};attach(socket,room,'guest');send(socket,{type:'room-joined',roomCode:code,reconnectToken:room.guest.token});startMatch(room);return;
    }
    if(message.type==='reconnect'){
      const code=String(message.roomCode||'').toUpperCase();const room=rooms.get(code);if(!room)return error(socket,'The match has expired.');
      const seat=room.host.token===message.reconnectToken?'host':room.guest?.token===message.reconnectToken?'guest':null;if(!seat)return error(socket,'Reconnect token was not accepted.');
      attach(socket,room,seat);send(socket,{type:'reconnected',roomCode:code,reconnectToken:slot(room,seat).token});broadcast(room);return;
    }
    const meta=clients.get(socket);if(!meta?.roomCode||!meta.seat)return error(socket,'Create or join a room first.');
    const room=rooms.get(meta.roomCode);if(!room)return error(socket,'This room has expired.');
    if(message.type==='action'){
      if(!room.game)return error(socket,'Waiting for your friend to join.');
      if(room.active!==meta.seat)return error(socket,"It is your friend's turn.");
      if(!opponent(room,meta.seat)?.connected)return error(socket,'Waiting for your friend to reconnect.');
      if(canonicalWinner(room))return error(socket,'The match is already complete.');
      perform(room,meta.seat,String(message.action||''),message.payload||{});broadcast(room);return;
    }
    if(message.type==='surrender'&&room.game){const own=meta.seat==='host'?room.game.state.player:room.game.state.enemy;own.health=0;room.game.state.winner=canonicalWinner(room);broadcast(room);return}
    if(message.type==='rematch'&&room.game){slot(room,meta.seat).rematch=true;if(room.host.rematch&&room.guest?.rematch)startMatch(room);else broadcast(room)}
  });
  socket.on('close',()=>{
    const meta=clients.get(socket);if(!meta?.roomCode||!meta.seat)return;const room=rooms.get(meta.roomCode);if(!room)return;
    const player=slot(room,meta.seat);if(player.socket===socket){player.socket=null;player.connected=false}broadcast(room);
    room.cleanup=setTimeout(()=>{const current=rooms.get(room.code);if(current&&(!current.host.connected||!current.guest?.connected))rooms.delete(room.code)},10*60*1000);
  });
});

const heartbeat=setInterval(()=>wss.clients.forEach(socket=>{const live=socket as LiveSocket;if(live.isAlive===false)return socket.terminate();live.isAlive=false;socket.ping()}),30_000);
wss.on('close',()=>clearInterval(heartbeat));

httpServer.listen(port,()=>console.log(`Heroics online server running on http://localhost:${port}`));
