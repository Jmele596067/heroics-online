import type { CardDef } from './cards';
import type { GameState, PlayCardChoices, Player, Unit } from './game';
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
  attack():void;
  leaderAbility(choice?:'damage'|'heal'|'push'):void;
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
    if(player.activeZone?.zone==='volcano'&&card.kind==='magic'&&card.traits?.includes('Fire')&&!player.zoneSpellDiscountUsed)cost=Math.max(0,cost-1);
    return cost;
  }
  canEvolve(player:Player){const next=nextForm(player.element,player.evolutionStage);if(!next)return false;if(player.element!=='storm')return player.glory>=next.gloryRequired;if(player.evolutionStage===0)return player.magicCastTotal>=2;if(player.evolutionStage===1)return player.damageLastTurn>=6;return player.stormCharges>=3||player.tempestMagicCast}
  evolutionProgress(player:Player){if(player.element!=='storm'){const next=nextForm(player.element,player.evolutionStage);return next?`${player.glory} / ${next.gloryRequired} Glory`:'Maximum evolution'}if(player.evolutionStage===0)return `${Math.min(2,player.magicCastTotal)} / 2 Magic cards cast`;if(player.evolutionStage===1)return `${Math.min(6,player.damageLastTurn)} / 6 damage last turn`;if(player.evolutionStage===2)return `${player.stormCharges} / 3 Storm Charges • or cast Tempest Magic`;return 'Maximum evolution'}
  sameZone(attacker:Unit,target:Unit){return attacker.position+target.position===2}
  playCard(uid:string,choices:PlayCardChoices={}){this.action('playCard',{uid,choices})}
  selectUnit(uid:string){this.action('selectUnit',{uid})}
  selectTarget(uid:string){this.action('selectTarget',{uid})}
  nextPhase(){this.action('nextPhase')}
  evolveLeader(){this.action('evolveLeader')}
  advance(){this.action('advance')}
  attack(){this.action('attack')}
  leaderAbility(choice:'damage'|'heal'|'push'='damage'){this.action('leaderAbility',{choice})}
  unitAbility(uid:string){this.action('unitAbility',{uid})}
  dischargeCore(){this.action('dischargeCore')}
  absorbMagic(){this.action('absorbMagic')}
  restart(){this.send({type:'rematch'})}
}
