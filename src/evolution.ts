import type { Element } from './cards';

export interface EvolutionForm {
  level: 5 | 10 | 15 | 20;
  title: string;
  form: string;
  gloryRequired: number;
  healthBonus: number;
  attackBonus: number;
  ability: string;
  abilityDamage: number;
  passive: string;
  image: string;
}

export const EVOLUTIONS: Record<Element, EvolutionForm[]> = {
  flame: [
    { level:5, title:'Ignis, the Solar Knight', form:'Basic Form', gloryRequired:0, healthBonus:0, attackBonus:0, ability:'Solar Slash', abilityDamage:3, passive:'The first Flame unit you summon each turn is your vanguard.', image:'ignis.png' },
    { level:10, title:'Ignis, Dawn Vanguard', form:'Awakened Form', gloryRequired:3, healthBonus:6, attackBonus:1, ability:'Dawn Breaker', abilityDamage:5, passive:'Evolution restores 6 Health.', image:'ignis-awakened.png' },
    { level:15, title:'Ignis, Sunforged King', form:'Ascended Form', gloryRequired:7, healthBonus:7, attackBonus:2, ability:'Solar Dominion', abilityDamage:7, passive:'All friendly units gain +1 Attack on evolution.', image:'ignis-ascended.png' },
    { level:20, title:'Ignis, Avatar of the Sun', form:'Ultimate Form', gloryRequired:12, healthBonus:9, attackBonus:3, ability:'Supernova Judgment', abilityDamage:10, passive:'Deal 2 damage to every enemy unit on evolution.', image:'ignis-ultimate.png' },
  ],
  tide: [
    { level:5, title:'Shellgon, the Crab Warrior', form:'Basic Form', gloryRequired:0, healthBonus:0, attackBonus:0, ability:'Tidal Crush', abilityDamage:2, passive:'Shell armor favors patient battlefield control.', image:'shellgon.png' },
    { level:10, title:'Shellgon, Coral Bastion', form:'Awakened Form', gloryRequired:3, healthBonus:6, attackBonus:1, ability:'Riptide Counter', abilityDamage:4, passive:'Evolution restores 6 Health.', image:'shellgon-awakened.png' },
    { level:15, title:'Shellgon, Abyssal Warden', form:'Ascended Form', gloryRequired:7, healthBonus:7, attackBonus:1, ability:'Abyss Breaker', abilityDamage:6, passive:'All friendly units gain +2 Health on evolution.', image:'shellgon-ascended.png' },
    { level:20, title:'Shellgon, Emperor of Tides', form:'Ultimate Form', gloryRequired:12, healthBonus:9, attackBonus:2, ability:'World-Tide Collapse', abilityDamage:8, passive:'The Emperor commands the battlefield with tidal armor.', image:'shellgon-ultimate.png' },
  ],
  undead: [
    { level:5, title:'Queen of the Dead', form:'Undead Queen', gloryRequired:0, healthBonus:0, attackBonus:0, ability:'Raise Skeleton', abilityDamage:0, passive:'Once per turn, summon a 1 Power / 2 Health Skeleton token.', image:'queen-of-the-dead.png' },
    { level:10, title:'Queen of the Dead, Grave Regent', form:'Evolution I', gloryRequired:3, healthBonus:4, attackBonus:1, ability:'Royal Muster', abilityDamage:0, passive:'Summon a 1/2 Skeleton token ready for immediate movement.', image:'queen-grave-regent.png' },
    { level:15, title:'Queen of the Dead, Lich Empress', form:'Evolution II', gloryRequired:7, healthBonus:5, attackBonus:1, ability:'Bone Legion', abilityDamage:0, passive:'Summon up to two 1/2 Skeleton tokens each turn.', image:'queen-lich-empress.png' },
    { level:20, title:'Queen of the Dead, Sovereign of Endless Night', form:'Evolution III', gloryRequired:12, healthBonus:7, attackBonus:2, ability:'Endless Host', abilityDamage:0, passive:'Summon up to two ready 1/2 Skeleton tokens each turn.', image:'queen-endless-night.png' },
  ],
  storm: [
    { level:5, title:'Tempestfang — Sky-Howler', form:'Base Form', gloryRequired:0, healthBonus:0, attackBonus:0, ability:'Static Pulse', abilityDamage:1, passive:'Stormborn: casting Magic grants +1 Power this turn.', image:'tempestfang.png' },
    { level:10, title:'Tempestfang, Gale-Blooded', form:'Evolution I', gloryRequired:0, healthBonus:1, attackBonus:1, ability:'Gale Rend', abilityDamage:2, passive:'All friendly units gain Wind Step.', image:'tempestfang-gale.png' },
    { level:15, title:'Tempestfang, Thunder-Crowned', form:'Evolution II', gloryRequired:0, healthBonus:1, attackBonus:1, ability:'Crownstrike', abilityDamage:3, passive:'Lightning damage deals 1 bonus damage to all enemy units.', image:'tempestfang-thunder.png' },
    { level:20, title:'Tempestfang, Storm-Devourer', form:'Evolution III', gloryRequired:0, healthBonus:2, attackBonus:1, ability:'Eye of the Storm', abilityDamage:4, passive:'Magic costs 1 less. Absorb Magic to unleash a 5-damage Storm Blast.', image:'tempestfang-devourer.png' },
  ],
};

export const currentForm = (element:Element, stage:number) => EVOLUTIONS[element][stage];
export const nextForm = (element:Element, stage:number) => EVOLUTIONS[element][stage + 1];
