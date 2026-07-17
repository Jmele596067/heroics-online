import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import { starterDeckIds } from '../src/cards';

const port=8799;
const server=spawn(process.execPath,['--import','tsx','server/server.ts'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:'ignore'});

class Inbox {
  messages:any[]=[];
  constructor(public socket:WebSocket){socket.on('message',raw=>this.messages.push(JSON.parse(raw.toString())))}
  async type(type:string,timeout=3000):Promise<any>{
    const found=this.messages.findIndex(message=>message.type===type);if(found>=0)return this.messages.splice(found,1)[0];
    const end=Date.now()+timeout;
    while(Date.now()<end){const index=this.messages.findIndex(message=>message.type===type);if(index>=0)return this.messages.splice(index,1)[0];await new Promise(resolve=>setTimeout(resolve,10))}
    throw new Error(`Timed out waiting for ${type}`);
  }
  send(message:unknown){this.socket.send(JSON.stringify(message))}
}

async function connect(){const socket=new WebSocket(`ws://127.0.0.1:${port}/ws`);await new Promise<void>((resolve,reject)=>{socket.once('open',()=>resolve());socket.once('error',reject)});const inbox=new Inbox(socket);return inbox}
async function waitForServer(){for(let i=0;i<40;i++){try{if((await fetch(`http://127.0.0.1:${port}/health`)).ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,50))}throw new Error('Online server did not start')}

try{
  await waitForServer();
  const host=await connect();host.send({type:'create',deck:{leader:'flame',cards:starterDeckIds('flame')}});
  const created=await host.type('room-created');assert.match(created.roomCode,/^[A-F0-9]{5}$/,'server creates a shareable five-character room code');
  const guest=await connect();guest.send({type:'join',roomCode:created.roomCode,deck:{leader:'storm',cards:starterDeckIds('storm')}});
  const joined=await guest.type('room-joined');const hostStart=await host.type('state');const guestStart=await guest.type('state');
  assert.equal(hostStart.state.player.element,'flame','host receives their own deck perspective');
  assert.equal(guestStart.state.player.element,'storm','guest receives their own deck perspective');
  assert.equal(hostStart.state.enemy.hand.length,0,'opponent hand contents stay private');
  assert.equal(guestStart.state.enemy.deck.length,0,'opponent deck order stays private');
  assert.equal(hostStart.state.phase,'deploy','host takes the opening turn');
  assert.equal(guestStart.state.phase,'enemy','guest waits during the host turn');

  for(let i=0;i<3;i++){host.send({type:'action',action:'nextPhase'});await host.type('state');await guest.type('state')}
  host.send({type:'action',action:'nextPhase'});const hostWait=await host.type('state');const guestTurn=await guest.type('state');
  assert.equal(hostWait.state.phase,'enemy','host waits after ending the turn');
  assert.equal(guestTurn.state.phase,'deploy','guest receives the next synchronized turn');
  host.send({type:'action',action:'nextPhase'});assert.match((await host.type('error')).message,/friend's turn/i,'server rejects out-of-turn actions');

  guest.socket.close();const disconnected=await host.type('state');assert.equal(disconnected.opponentConnected,false,'remaining player sees disconnect state');
  const reconnectedGuest=await connect();reconnectedGuest.send({type:'reconnect',roomCode:joined.roomCode,reconnectToken:joined.reconnectToken});await reconnectedGuest.type('reconnected');await reconnectedGuest.type('state');
  const hostReconnected=await host.type('state');assert.equal(hostReconnected.opponentConnected,true,'a player can reconnect to the saved match');
  reconnectedGuest.send({type:'surrender'});const hostWin=await host.type('state');const guestLoss=await reconnectedGuest.type('state');
  assert.equal(hostWin.state.winner,'victory','surrender awards victory to the friend');
  assert.equal(guestLoss.state.winner,'defeat','surrender records defeat for the surrendering player');
  host.send({type:'rematch'});await host.type('state');await reconnectedGuest.type('state');
  reconnectedGuest.send({type:'rematch'});const hostRematch=await host.type('state');const guestRematch=await reconnectedGuest.type('state');
  assert.equal(hostRematch.state.winner,null,'mutual rematch starts a fresh battle');
  assert.equal(guestRematch.state.turn,1,'rematch resets the synchronized turn counter');
  host.socket.close();reconnectedGuest.socket.close();
  console.log('HEROICS ONLINE PLAYTEST: PASS');
  console.log('Room creation, private perspectives, turn validation, reconnect, surrender, and rematch all synchronized correctly.');
}finally{server.kill('SIGTERM')}
