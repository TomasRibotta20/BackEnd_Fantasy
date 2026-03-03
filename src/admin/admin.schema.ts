import { z } from 'zod';

export const seedDatabaseSchema = z.object({
  leagueId: z.number({ error: 'leagueId es requerido y debe ser un número' })
    .int('leagueId debe ser un entero')
    .positive('leagueId debe ser positivo'),
  season: z.number({ error: 'season es requerido y debe ser un número' })
    .int('season debe ser un entero')
    .min(2000, 'season debe ser >= 2000')
    .max(2100, 'season debe ser <= 2100'),
});
