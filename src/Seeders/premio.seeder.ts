import { Seeder } from '@mikro-orm/seeder';
import { EntityManager } from '@mikro-orm/core';
import { Tier } from '../Premio/premio.entity.js';
import { Saldo } from '../Premio/saldo.entity.js';
import { Ruleta } from '../Premio/ruleta.entity.js';
import { PlayerPick } from '../Premio/playerpick.entity.js';

export class CreatePremiosSeeder extends Seeder {

  async run(em: EntityManager): Promise<void> {
    
    //---TIER ORO---
    
    //Saldo Oro
    em.create(Saldo, {
      descripcion: 'Premio en Efectivo (Oro)',
      tier: Tier.ORO,
      tipo: 'saldo',
      monto: 5000000
    });

    //Ruleta Oro
    em.create(Ruleta, {
      descripcion: 'Ruleta de Cracks (Oro)',
      tier: Tier.ORO,
      tipo: 'ruleta',
      configuracion: {
        distribucion: [
          { min: 10000000, max: null, peso: 5 },  // 5% Cracks
          { min: 5000000, max: 10000000, peso: 25 },
          { min: 1000000, max: 5000000, peso: 70 }
        ]
      }
    });

    //Player Pick Oro
    em.create(PlayerPick, {
      descripcion: 'Elección de Jugador (Oro)',
      tier: Tier.ORO,
      tipo: 'pick',
      configuracion: {
        cantidadOpciones: 3,
        distribucion: [
          { min: 10000000, max: null, peso: 1 }, // 1%
          { min: 5000000, max: 10000000, peso: 15 },
          { min: 1000000, max: 5000000, peso: 84 }
        ]
      }
    });

    //---TIER PLATA---
    
    em.create(Saldo, {
      descripcion: 'Premio en Efectivo (Plata)',
      tier: Tier.PLATA,
      tipo: 'saldo',
      monto: 2000000
    });
    

    //Ruleta Plata
    em.create(Ruleta, {
      descripcion: 'Ruleta Promesa (Plata)',
      tier: Tier.PLATA,
      tipo: 'ruleta',
      configuracion: {
        distribucion: [
          { min: 10000000, max: null,      peso: 1 },  // 1% Jackpot
          { min: 3000000,  max: 10000000,  peso: 25 }, // 25% Jugador Titular
          { min: 0,        max: 3000000,   peso: 74 }  // 74% Jugador de relleno
        ]
      }
    });

    //Player Pick Plata
    em.create(PlayerPick, {
      descripcion: 'Ojeador Básico (Plata)',
      tier: Tier.PLATA,
      tipo: 'pick',
      configuracion: {
        cantidadOpciones: 3,
        distribucion: [
          { min: 10000000, max: null,      peso: 0.5 }, 
          { min: 3000000,  max: 10000000,  peso: 20 },
          { min: 0,        max: 3000000,   peso: 79.5 }
        ]
      }
    });

    //---TIER BRONCE---
    
    em.create(Saldo, {
      descripcion: 'Premio Consuelo (Bronce)',
      tier: Tier.BRONCE,
      tipo: 'saldo',
      monto: 500000
    });

    await em.flush();
  }
}