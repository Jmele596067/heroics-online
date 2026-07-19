import { writeFileSync } from 'node:fs';
import { allCards } from '../src/cards';
import { EVOLUTIONS } from '../src/evolution';

const unique=allCards.filter((card,index,list)=>list.findIndex(other=>other.id===card.id)===index);
writeFileSync(process.argv[2],JSON.stringify({cards:unique,evolutions:EVOLUTIONS},null,2));
