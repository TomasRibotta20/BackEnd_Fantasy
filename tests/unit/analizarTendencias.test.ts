import { describe, it, expect, jest } from '@jest/globals';
import { HistorialPrecioService } from '../../src/HistorialPrecio/historial-precio.service.js';
import { EntityManager } from '@mikro-orm/core';
import { EstadisticaJugador } from '../../src/EstadisticaJugador/estadistica-jugador.entity.js';
import { Partido } from '../../src/Fixture/partido.entity.js';
import { Jornada } from '../../src/Fixture/Jornada.entity.js';

describe('HistorialPrecioService - analizarTendencias', () => {
  
  /**
   * Helper para crear mock de EntityManager con estadísticas
   */
  const crearMockEM = (estadisticas: Array<{ jornadaId: number; puntaje: number }>) => {
    const estadisticasMock = estadisticas.map((est) => {
      const jornada = new Jornada();
      jornada.id = est.jornadaId;

      const partido = new Partido();
      partido.jornada = jornada;

      const estadistica = new EstadisticaJugador();
      estadistica.puntaje_total = est.puntaje;
      estadistica.partido = partido;

      return estadistica;
    });

    const mockEM = {
      find: jest.fn<() => Promise<EstadisticaJugador[]>>().mockResolvedValue(estadisticasMock)
    } as unknown as EntityManager;

    return mockEM;
  };

  /**
   * TEST 1: Sin tendencias (menos de 3 jornadas previas)
   */
  it('debe devolver modificador 0 cuando hay menos de 3 jornadas previas', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 1, puntaje: 7 },
      { jornadaId: 2, puntaje: 8 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 3);

    expect(resultado.modificadorTotal).toBe(0);
    expect(resultado.detalles).toContain('Sin tendencias (jornada < 4)');
  });

  /**
   * TEST 2: Tendencia Ascendente (+4%)
   */
  it('debe aplicar +4% cuando hay tendencia ascendente clara', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 9 },
      { jornadaId: 3, puntaje: 8 },
      { jornadaId: 2, puntaje: 6 },
      { jornadaId: 1, puntaje: 4 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    expect(resultado.modificadorTotal).toBe(4);
    expect(resultado.detalles).toContain('Tendencia ascendente +4%');
  });

  /**
   * TEST 3: Tendencia Descendente (-4%)
   */
  it('debe aplicar -4% cuando hay tendencia descendente', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 5 },
      { jornadaId: 3, puntaje: 6 },
      { jornadaId: 2, puntaje: 8 },
      { jornadaId: 1, puntaje: 10 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    expect(resultado.modificadorTotal).toBe(-4);
    expect(resultado.detalles).toContain('Tendencia descendente -4%');
  });

  /**
   * TEST 4: Consistencia Alta SOLA (+6%)
   * Todos >= 8 pero NO todos >= 12
   */
  it('debe aplicar +6% cuando todas las jornadas tienen puntaje >= 8 (sin racha)', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 9 },
      { jornadaId: 3, puntaje: 10 },
      { jornadaId: 2, puntaje: 8 },
      { jornadaId: 1, puntaje: 9 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    expect(resultado.modificadorTotal).toBe(6);
    expect(resultado.detalles).toContain('Consistencia alta +6%');
    expect(resultado.detalles).not.toContain('Racha hat-tricks');
  });

  /**
   * TEST 5: Racha de Buenas actuaciones SOLA (+10%)
   * Todos >= 12 (NO suma consistencia alta)
   */
  it('debe aplicar +10% con racha de buenas actuaciones SIN sumar consistencia alta', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 14 },
      { jornadaId: 3, puntaje: 12 },
      { jornadaId: 2, puntaje: 12 },
      { jornadaId: 1, puntaje: 12 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    // Solo +10% (racha), NO +6% adicional
    expect(resultado.modificadorTotal).toBe(10);
    expect(resultado.detalles).toContain('Racha hat-tricks +10%');
    expect(resultado.detalles).not.toContain('Consistencia alta');
  });

  /**
   * TEST 6: Racha + Tendencia Ascendente (+14%)
   */
  it('debe aplicar +14% con racha de hat-tricks y tendencia ascendente', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 16 },
      { jornadaId: 3, puntaje: 15 },
      { jornadaId: 2, puntaje: 13 },
      { jornadaId: 1, puntaje: 12 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    // +4% (ascendente) + 10% (racha) = +14%
    expect(resultado.modificadorTotal).toBe(14);
    expect(resultado.detalles).toContain('Tendencia ascendente +4%');
    expect(resultado.detalles).toContain('Racha buenas actuaciones +10%');
    expect(resultado.detalles).not.toContain('Consistencia alta');
  });

  /**
   * TEST 7: Inconsistencia Negativa (-3%)
   */
  it('debe aplicar -3% cuando hay inconsistencia negativa', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 7 },
      { jornadaId: 3, puntaje: 11 },
      { jornadaId: 2, puntaje: 4 },
      { jornadaId: 1, puntaje: 7 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    // Diferencia = 11 - 4 = 7 (>= 7), tiene < 6 → -3%
    expect(resultado.modificadorTotal).toBe(-3);
    expect(resultado.detalles).toContain('Inconsistencia negativa -3%');
  });

    /**
   * TEST 8: Recuperación SOLA (+2%)
   * p1 < 5, p2 < 5, p3 >= 8 (sin tendencia ascendente)
   */
  it('debe aplicar +2% cuando hay recuperación (2 bajos → 1 alto)', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 7 },
      { jornadaId: 3, puntaje: 8 },  // p3 - alto (>= 8)
      { jornadaId: 2, puntaje: 3 },  // p2 - bajo (< 5)
      { jornadaId: 1, puntaje: 4 }   // p1 - bajo (< 5)
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    // p1=4 < 5, p2=3 < 5, p3=8 >= 8 → +2% recuperación
    // NO hay tendencia ascendente porque p1=4 > p2=3 (no es estrictamente creciente)
    expect(resultado.modificadorTotal).toBe(2);
    expect(resultado.detalles).toContain('Recuperacion +2%');
    expect(resultado.detalles).not.toContain('Tendencia ascendente');
  });

  /**
   * TEST 9: Recuperación + Tendencia Ascendente (+6%)
   */
  it('debe aplicar +6% cuando hay recuperación y tendencia ascendente', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 7 },
      { jornadaId: 3, puntaje: 9 },
      { jornadaId: 2, puntaje: 4 },
      { jornadaId: 1, puntaje: 3 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    // +4% (ascendente: 3 < 4 < 9) + 2% (recuperación) = +6%
    expect(resultado.modificadorTotal).toBe(6);
    expect(resultado.detalles).toContain('Tendencia ascendente +4%');
    expect(resultado.detalles).toContain('Recuperacion +2%');
  });

  /**
   * TEST 10: Caída Reciente (-5%)
   */
  it('debe aplicar -5% cuando hay caída reciente (2 altos → 1 bajo)', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 7 },
      { jornadaId: 3, puntaje: 3 },
      { jornadaId: 2, puntaje: 9 },
      { jornadaId: 1, puntaje: 8 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    expect(resultado.modificadorTotal).toBe(-5);
    expect(resultado.detalles).toContain('Caida reciente -5%');
  });

  /**
   * TEST 11: Consistencia Alta + Tendencia Ascendente (+10%)
   */
  it('debe sumar consistencia alta y tendencia ascendente', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 10 },
      { jornadaId: 3, puntaje: 9 },
      { jornadaId: 2, puntaje: 8.5 },
      { jornadaId: 1, puntaje: 8 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    // +4% (ascendente) + 6% (consistencia) = +10%
    expect(resultado.modificadorTotal).toBe(10);
    expect(resultado.detalles).toContain('Tendencia ascendente +4%');
    expect(resultado.detalles).toContain('Consistencia alta +6%');
  });

  /**
   * TEST 12: Sin modificadores de tendencia
   */
  it('debe indicar cuando no hay modificadores aplicables', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 7 },
      { jornadaId: 3, puntaje: 6 },
      { jornadaId: 2, puntaje: 7 },
      { jornadaId: 1, puntaje: 6 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    expect(resultado.modificadorTotal).toBe(0);
    expect(resultado.detalles).toContain('Sin modificadores de tendencia');
  });

  /**
   * TEST 13: Solo Caída Reciente (-5%)
   * Sin inconsistencia porque diferencia < 7
   */
  it('debe aplicar solo -5% cuando hay caída reciente sin inconsistencia', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 7 },
      { jornadaId: 3, puntaje: 4 },
      { jornadaId: 2, puntaje: 10 },
      { jornadaId: 1, puntaje: 9 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    // Diferencia = 10 - 4 = 6 (NO >= 7)
    expect(resultado.modificadorTotal).toBe(-5);
    expect(resultado.detalles).toContain('Caida reciente -5%');
    expect(resultado.detalles).not.toContain('Inconsistencia');
  });

  /**
   * TEST 14: Caída Reciente + Inconsistencia (-8%)
   */
  it('debe aplicar -8% cuando hay caída reciente E inconsistencia', async () => {
    const mockEM = crearMockEM([
      { jornadaId: 4, puntaje: 7 },
      { jornadaId: 3, puntaje: 3 },
      { jornadaId: 2, puntaje: 11 },
      { jornadaId: 1, puntaje: 9 }
    ]);

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 4);

    // Diferencia = 11 - 3 = 8 (>= 7), tiene < 6 → -3% + -5% = -8%
    expect(resultado.modificadorTotal).toBe(-8);
    expect(resultado.detalles).toContain('Inconsistencia negativa -3%');
    expect(resultado.detalles).toContain('Caida reciente -5%');
  });

  /**
   * TEST 15: Validar que filtra correctamente la jornada actual
   */
  it('debe excluir la jornada actual del análisis', async () => {
    const estadisticasMock: EstadisticaJugador[] = [
      (() => {
        const j = new Jornada(); j.id = 5;
        const p = new Partido(); p.jornada = j;
        const e = new EstadisticaJugador();
        e.puntaje_total = 100;
        e.partido = p;
        return e;
      })(),
      ...([
        { jornadaId: 4, puntaje: 9 },
        { jornadaId: 3, puntaje: 8 },
        { jornadaId: 2, puntaje: 7 }
      ].map(est => {
        const j = new Jornada(); j.id = est.jornadaId;
        const p = new Partido(); p.jornada = j;
        const e = new EstadisticaJugador();
        e.puntaje_total = est.puntaje;
        e.partido = p;
        return e;
      }))
    ];

    const mockEM = {
      find: jest.fn<() => Promise<EstadisticaJugador[]>>().mockResolvedValue(estadisticasMock)
    } as unknown as EntityManager;

    // @ts-ignore
    const resultado = await HistorialPrecioService['analizarTendencias'](mockEM, 1, 5);

    expect(resultado.modificadorTotal).toBe(4);
    expect(resultado.detalles).toContain('Tendencia ascendente +4%');
  });
});