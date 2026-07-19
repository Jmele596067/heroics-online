import type { CardDef } from './cards';
import { BLOCKED_GATE_COORDINATES, FIXED_ZONE_COORDINATES, MAX_FIELD_TILES, STARTING_TILE_COUNT } from './game';
import type { GameState, PlayCardChoices, Player, Unit, ZonePlacement } from './game';
import { nextForm } from './evolution';
import type { DeckConfig } from './deck';

type Listener=(state:GameState)=>void;
type LobbyUpdate={roomCode?:string;waitingForOpponent?:boolean;opponentConnected?:boolean;message?:string;matchStarted?:boolean};

export interface GameController {
  state:GameState;
  subscribe(listener:Listener):void;
  effectiveCost(player:Player,card:CardDef):number;
  canEvolve(player:Player):boolean;
  evolutionProgress(player:Player):string;
  sameZone(attacker:Unit,target:Unit):boolean;
  playCard(uid:string,choices?:PlayCardChoices):void;
  selectUnit(uid:string):void;
  selectTarget(uid:string):void;
  nextPhase():void;
  evolveLeader():void;
  advance():void;
  beginAttack():void;
  cancelAttack():void;
  attack():void;
  leaderAttack():void;
  leaderAbility(choice?:string):void;
  selectTile(position:number):void;
  beginZonePlacement(uid:string):void;
  placeZone(q:number,r:number,anchorId:number):void;
  cancelZonePlacement():void;
  availableZonePlacements(anchorId?:number):ZonePlacement[];
  invalidZonePlacements():ZonePlacement[];
  unitAbility(uid:string):void;
  dischargeCore():void;
  absorbMagic():void;
  restart():void;
}

const reconnectKey='heroics-online-reconnect-v1';

export class OnlineGameClient implements GameController {
  state!:GameState;
  roomCode='';
  connected=false;
  opponentConnected=false;
  private socket:WebSocket|null=null;
  private listeners:Listener[]=[];
  private lobbyListener:(update:LobbyUpdate)=>void;

  constructor(private deck:DeckConfig,onLobby:(update:LobbyUpdate)=>void){this.lobbyListener=onLobby}

  static savedReconnect(){try{return JSON.parse(localStorage.getItem(reconnectKey)||'null') as {roomCode:string;reconnectToken:string}|null}catch{return null}}
  private url(){const custom=import.meta.env.VITE_WS_URL as string|undefined;if(custom)return custom;const protocol=location.protocol==='https:'?'wss:':'ws:';const host=import.meta.env.DEV?`${location.hostname}:8787`:location.host;return `${protocol}//${host}/ws`}
  connect(){return new Promise<void>((resolve,reject)=>{const socket=new WebSocket(this.url());this.socket=socket;socket.onopen=()=>{this.connected=true;resolve()};socket.onerror=()=>reject(new Error('Could not reach the Heroics online server.'));socket.onclose=()=>{this.connected=false;this.lobbyListener({roomCode:this.roomCode,message:'Connection lost. You can reconnect to this match.'})};socket.onmessage=event=>this.receive(JSON.parse(event.data))})}
  disconnect(){this.socket?.close();this.socket=null}
  private send(payload:unknown){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(payload))}
  private receive(message:any){
    if(message.type==='error')return this.lobbyListener({roomCode:this.roomCode,message:message.message});
    if(['room-created','room-joined','reconnected'].includes(message.type)){
      this.roomCode=message.roomCode;localStorage.setItem(reconnectKey,JSON.stringify({roomCode:message.roomCode,reconnectToken:message.reconnectToken}));
      this.lobbyListener({roomCode:this.roomCode,waitingForOpponent:message.type==='room-created',message:message.type==='room-created'?'Room ready—share the code with your friend.':'Connected to room.'});
    }
    if(message.type==='lobby'){this.roomCode=message.roomCode;this.opponentConnected=message.opponentConnected;this.lobbyListener({roomCode:this.roomCode,waitingForOpponent:message.waitingForOpponent,opponentConnected:message.opponentConnected})}
    if(message.type==='state'){
      const first=!this.state;this.roomCode=message.roomCode;this.state=message.state;this.opponentConnected=message.opponentConnected;
      this.listeners.forEach(listener=>listener(this.state));
      this.lobbyListener({roomCode:this.roomCode,opponentConnected:this.opponentConnected,matchStarted:first});
    }
  }
  async createRoom(){await this.connect();this.send({type:'create',deck:{leader:this.deck.leader,cards:this.deck.cards}})}
  async joinRoom(roomCode:string){await this.connect();this.send({type:'join',roomCode,deck:{leader:this.deck.leader,cards:this.deck.cards}})}
  async reconnect(){const saved=OnlineGameClient.savedReconnect();if(!saved)throw new Error('No online match is saved in this browser.');await this.connect();this.send({type:'reconnect',...saved})}
  surrender(){this.send({type:'surrender'})}
  subscribe(listener:Listener){this.listeners.push(listener);if(this.state)listener(this.state)}
  private action(action:string,payload:Record<string,unknown>={}){this.send({type:'action',action,payload})}
  effectiveCost(player:Player,card:CardDef){
    let cost=card.cost;
    if(player.element==='storm'&&player.evolutionStage>=3&&card.kind==='magic')cost=Math.max(1,cost-1);
    if(player.zoneTiles.some(zone=>zone?.zone==='volcano')&&card.kind==='magic'&&card.traits?.includes('Fire')&&!player.zoneSpellDiscountUsed)cost=Math.max(0,cost-1);
    if(card.kind==='magic'&&card.traits?.includes('Fire')&&player.units.some(unit=>unit.cardId==='cinder-witch'))cost=Math.max(0,cost-1);
    return cost;
  }
  canEvolve(player:Player){const next=nextForm(player.element,player.evolutionStage);if(!next)return false;if(player.element!=='storm')return player.glory>=next.gloryRequired;if(player.evolutionStage===0)return player.magicCastTotal>=2;if(player.evolutionStage===1)return player.damageLastTurn>=6;return player.stormCharges>=3||player.tempestMagicCast}
  evolutionProgress(player:Player){if(player.element!=='storm'){const next=nextForm(player.element,player.evolutionStage);return next?`${player.glory} / ${next.gloryRequired} Glory`:'Maximum evolution'}if(player.evolutionStage===0)return `${Math.min(2,player.magicCastTotal)} / 2 Magic cards cast`;if(player.evolutionStage===1)return `${Math.min(6,player.damageLastTurn)} / 6 damage last turn`;if(player.evolutionStage===2)return `${player.stormCharges} / 3 Storm Charges • or cast Tempest Magic`;return 'Maximum evolution'}
  sameZone(attacker:Unit,target:Unit){
    const owner=(unit:Unit)=>this.state.player.units.some(item=>item.uid===unit.uid)?this.state.player:this.state.enemy.units.some(item=>item.uid===unit.uid)?this.state.enemy:undefined;
    const physical=(player:Player,position:number)=>position>2?position:position===1?1:position===0?player.homeTileId:2-player.homeTileId;
    const a=owner(attacker),b=owner(target);return Boolean(a&&b&&physical(a,attacker.position)===physical(b,target.position));
  }
  playCard(uid:string,choices:PlayCardChoices={}){this.action('playCard',{uid,choices})}
  selectUnit(uid:string){this.action('selectUnit',{uid})}
  selectTarget(uid:string){this.action('selectTarget',{uid})}
  nextPhase(){this.action('nextPhase')}
  evolveLeader(){this.action('evolveLeader')}
  advance(){this.action('advance')}
  beginAttack(){this.action('beginAttack')}
  cancelAttack(){this.action('cancelAttack')}
  attack(){this.action('attack')}
  leaderAttack(){this.action('leaderAttack')}
  leaderAbility(choice:string='damage'){this.action('leaderAbility',{choice})}
  selectTile(position:number){this.action('selectTile',{position})}
  beginZonePlacement(uid:string){this.action('beginZonePlacement',{uid})}
  placeZone(q:number,r:number,anchorId:number){this.action('placeZone',{q,r,anchorId})}
  cancelZonePlacement(){this.action('cancelZonePlacement')}
  availableZonePlacements(anchorId=this.state.player.homeTileId){
    if(this.state.tiles.length>=MAX_FIELD_TILES)return [];
    const occupied=new Set(this.state.tiles.map(tile=>`${tile.q},${tile.r}`));
    const distance=(a:{q:number;r:number},b:{q:number;r:number})=>(Math.abs(a.q-b.q)+Math.abs(a.q+a.r-b.q-b.r)+Math.abs(a.r-b.r))/2;
    const preferred=this.state.tiles.find(tile=>tile.id===anchorId);
    return FIXED_ZONE_COORDINATES.filter(({q,r})=>!occupied.has(`${q},${r}`)).map(({q,r})=>{
      const anchor=this.state.tiles.filter(tile=>tile.id<STARTING_TILE_COUNT&&distance(tile,{q,r})===1).sort((a,b)=>a.id-b.id)[0];
      return {anchorId:anchor.id,q,r};
    }).sort((a,b)=>(preferred&&distance(preferred,a)===1?0:1)-(preferred&&distance(preferred,b)===1?0:1)||a.r-b.r||a.q-b.q);
  }
  invalidZonePlacements(){
    return BLOCKED_GATE_COORDINATES.map(({q,r})=>({anchorId:-1,q,r}));
  }
  unitAbility(uid:string){this.action('unitAbility',{uid})}
  dischargeCore(){this.action('dischargeCore')}
  absorbMagic(){this.action('absorbMagic')}
  restart(){this.send({type:'rematch'})}
}
