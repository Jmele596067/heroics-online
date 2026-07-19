import type { Element } from './cards';

export interface EvolutionForm {
  level: 5 | 10 | 15 | 20;
  title: string;
  form: string;
  gloryRequired: number;
  healthBonus: number;
  attackBonus: number;
  maxHealth: number;
  attack: number;
  abilityPoints: number;
  ability: string;
  abilityDamage: number;
  passive: string;
  image: string;
}

export const EVOLUTIONS: Record<Element, EvolutionForm[]> = {
  flame: [
    { level:5, title:'Ignis, the Solar Knight', form:'Basic Form', gloryRequired:0, healthBonus:0, attackBonus:0, maxHealth:30, attack:3, abilityPoints:2, ability:'Solar Slash', abilityDamage:5, passive:'Solar Slash costs 2 AP and deals 5 damage.', image:'ignis.png' },
    { level:10, title:'Ignis, Dawn Vanguard', form:'Awakened Form', gloryRequired:3, healthBonus:6, attackBonus:1, maxHealth:36, attack:4, abilityPoints:3, ability:'Solar Awakening', abilityDamage:5, passive:'Solar Awakening costs 1 AP and grants 3 Essence for this turn.', image:'ignis-awakened-v2.png' },
    { level:15, title:'Ignis, Sunforged King', form:'Ascended Form', gloryRequired:7, healthBonus:7, attackBonus:3, maxHealth:43, attack:7, abilityPoints:8, ability:'Solar Domain', abilityDamage:5, passive:'Solar Domain costs 4 AP and attaches Flame Domain to a field tile.', image:'ignis-ascended-v2.png' },
    { level:20, title:'Ignis, Avatar of the Sun', form:'Ultimate Form', gloryRequired:12, healthBonus:9, attackBonus:5, maxHealth:52, attack:12, abilityPoints:12, ability:'Supernova Judgment', abilityDamage:15, passive:'Supernova Judgment costs 7 AP and deals 15 damage to a unit or Leader.', image:'ignis-ultimate-v2.png' },
  ],
  tide: [
    { level:5, title:'Shellgon, the Crab Warrior', form:'Basic Form', gloryRequired:0, healthBonus:0, attackBonus:0, maxHealth:30, attack:3, abilityPoints:2, ability:'Healing Waters', abilityDamage:0, passive:'Healing Waters costs 2 AP and restores 3 Health to a unit.', image:'shellgon.png' },
    { level:10, title:'Shellgon, Coral Bastion', form:'Awakened Form', gloryRequired:3, healthBonus:6, attackBonus:0, maxHealth:36, attack:3, abilityPoints:3, ability:'Whirlpool', abilityDamage:1, passive:'Whirlpool costs 2 AP, deals 1 damage, and pushes a unit back one tile.', image:'shellgon-awakened-v2.png' },
    { level:15, title:'Shellgon, Abyssal Warden', form:'Ascended Form', gloryRequired:7, healthBonus:12, attackBonus:2, maxHealth:48, attack:5, abilityPoints:6, ability:'High Tide', abilityDamage:0, passive:'High Tide costs 3 AP and restores 5 Health to every friendly unit in play.', image:'shellgon-ascended-v2.png' },
    { level:20, title:'Shellgon, Emperor of Tides', form:'Ultimate Form', gloryRequired:12, healthBonus:12, attackBonus:3, maxHealth:60, attack:8, abilityPoints:10, ability:'World Tide Collapse', abilityDamage:3, passive:'World Tide Collapse costs 5 AP and deals 3 damage to enemy units on one selected tile.', image:'shellgon-ultimate-v2.png' },
  ],
  undead: [
    { level:5, title:'Queen of the Dead', form:'Undead Queen', gloryRequired:0, healthBonus:0, attackBonus:0, maxHealth:30, attack:0, abilityPoints:1, ability:'Raise Skeleton', abilityDamage:0, passive:'Costs 1 AP. Once per turn, summon a 1 Power / 2 Health Skeleton token.', image:'queen-of-the-dead.png' },
    { level:10, title:'Queen of the Dead, Grave Regent', form:'Evolution I', gloryRequired:3, healthBonus:4, attackBonus:1, maxHealth:34, attack:1, abilityPoints:2, ability:'Royal Muster', abilityDamage:0, passive:'Costs 1 AP. Summon a ready 1/2 Skeleton token.', image:'queen-grave-regent.png' },
    { level:15, title:'Queen of the Dead, Lich Empress', form:'Evolution II', gloryRequired:7, healthBonus:5, attackBonus:1, maxHealth:39, attack:2, abilityPoints:3, ability:'Bone Legion', abilityDamage:0, passive:'Costs 2 AP. Summon up to two 1/2 Skeleton tokens.', image:'queen-lich-empress.png' },
    { level:20, title:'Queen of the Dead, Sovereign of Endless Night', form:'Evolution III', gloryRequired:12, healthBonus:7, attackBonus:2, maxHealth:46, attack:4, abilityPoints:4, ability:'Endless Host', abilityDamage:0, passive:'Costs 2 AP. Summon up to two ready 1/2 Skeleton tokens.', image:'queen-endless-night.png' },
  ],
  storm: [
    { level:5, title:'Tempestfang - Sky-Howler', form:'Base Form', gloryRequired:0, healthBonus:0, attackBonus:0, maxHealth:30, attack:2, abilityPoints:2, ability:'Static Pulse', abilityDamage:1, passive:'Costs 1 AP. Stormborn: casting Magic grants +1 Power this turn.', image:'tempestfang.png' },
    { level:10, title:'Tempestfang, Gale-Blooded', form:'Evolution I', gloryRequired:0, healthBonus:1, attackBonus:1, maxHealth:31, attack:3, abilityPoints:3, ability:'Gale Rend', abilityDamage:2, passive:'Costs 2 AP. All friendly units gain Wind Step.', image:'tempestfang-gale.png' },
    { level:15, title:'Tempestfang, Thunder-Crowned', form:'Evolution II', gloryRequired:0, healthBonus:1, attackBonus:1, maxHealth:32, attack:4, abilityPoints:4, ability:'Crownstrike', abilityDamage:3, passive:'Costs 3 AP. Lightning damage deals 1 bonus damage to all enemy units.', image:'tempestfang-thunder.png' },
    { level:20, title:'Tempestfang, Storm-Devourer', form:'Evolution III', gloryRequired:0, healthBonus:2, attackBonus:1, maxHealth:34, attack:5, abilityPoints:5, ability:'Eye of the Storm', abilityDamage:4, passive:'Costs 4 AP. Magic costs 1 less. Absorb Magic to unleash a 5-damage Storm Blast.', image:'tempestfang-devourer.png' },
  ],
};

export const currentForm = (element:Element, stage:number) => EVOLUTIONS[element][stage];
export const nextForm = (element:Element, stage:number) => EVOLUTIONS[element][stage + 1];
