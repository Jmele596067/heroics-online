import { Element, starterDeckIds } from './cards';

export const DECK_SIZE=20;
export const MAX_COPIES=3;
export interface DeckConfig { leader:Element; opponent:Element; cards:string[] }

const STORAGE_KEY='heroics-deck-v1';
export const defaultDeckConfig=():DeckConfig=>({leader:'flame',opponent:'tide',cards:starterDeckIds('flame')});

export function loadDeckConfig():DeckConfig{
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)??'null') as Partial<DeckConfig>|null;
    const elements:Element[]=['flame','tide','undead','storm'];
    if(saved&&elements.includes(saved.leader as Element)&&elements.includes(saved.opponent as Element)&&Array.isArray(saved.cards))return {leader:saved.leader as Element,opponent:saved.opponent as Element,cards:saved.cards.slice(0,DECK_SIZE)};
  }catch{/* use a safe starter deck */}
  return defaultDeckConfig();
}

export function saveDeckConfig(config:DeckConfig){localStorage.setItem(STORAGE_KEY,JSON.stringify(config))}
