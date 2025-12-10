import { describe, it, expect } from '@jest/globals';
import { EstadisticaJugador } from '../../src/EstadisticaJugador/estadistica-jugador.entity.js';
import { EstadisticaJugadorService } from '../../src/EstadisticaJugador/estadistica-jugador.service.js';

describe('EstadisticaJugadorService - calcularPuntaje', () => {
  
  /**
   * TEST 1: Portero con valla invicta (partido completo)
   */
  it('debe calcular correctamente el puntaje de un portero con valla invicta', () => {
    const estadistica = new EstadisticaJugador();
    estadistica.minutos = 90;
    estadistica.posicion = 'G';
    estadistica.goles = 0;
    estadistica.asistencias = 0;
    estadistica.porterias_a_cero = true;
    estadistica.tarjetas_amarillas = 0;
    estadistica.tarjetas_rojas = 0;
    estadistica.rating = 7.5;

    const puntaje = EstadisticaJugadorService.calcularPuntaje(estadistica);

    // Esperado: 1 (minutos) + 4 (portería a cero) + 7.5 (rating) = 12.5
    expect(puntaje).toBe(12.5);
  });

  /**
   * TEST 2: Delantero goleador con asistencia
   */
  it('debe calcular correctamente el puntaje de un delantero con 2 goles y 1 asistencia', () => {
    const estadistica = new EstadisticaJugador();
    estadistica.minutos = 90;
    estadistica.posicion = 'F';
    estadistica.goles = 2;
    estadistica.asistencias = 1;
    estadistica.porterias_a_cero = false;
    estadistica.tarjetas_amarillas = 0;
    estadistica.tarjetas_rojas = 0;
    estadistica.rating = 8.5;

    const puntaje = EstadisticaJugadorService.calcularPuntaje(estadistica);

    // Esperado: 1 (minutos) + 8 (2 goles × 4) + 3 (asistencia) + 8.5 (rating) = 20.5
    expect(puntaje).toBe(20.5);
  });

  /**
   * TEST 3: Defensor con gol y portería a cero
   */
  it('debe calcular correctamente el puntaje de un defensor con gol y valla invicta', () => {
    const estadistica = new EstadisticaJugador();
    estadistica.minutos = 90;
    estadistica.posicion = 'D';
    estadistica.goles = 1;
    estadistica.asistencias = 0;
    estadistica.porterias_a_cero = true;
    estadistica.tarjetas_amarillas = 0;
    estadistica.tarjetas_rojas = 0;
    estadistica.rating = 7.8;

    const puntaje = EstadisticaJugadorService.calcularPuntaje(estadistica);

    // Esperado: 1 (minutos) + 6 (gol × 6) + 4 (portería a cero) + 7.8 (rating) = 18.8
    expect(puntaje).toBe(18.8);
  });

  /**
   * TEST 4: Jugador expulsado con pocos minutos
   */
  it('debe aplicar penalización fuerte a un jugador expulsado', () => {
    const estadistica = new EstadisticaJugador();
    estadistica.minutos = 45;
    estadistica.posicion = 'M';
    estadistica.goles = 0;
    estadistica.asistencias = 0;
    estadistica.porterias_a_cero = false;
    estadistica.tarjetas_amarillas = 1;
    estadistica.tarjetas_rojas = 1;
    estadistica.rating = 4.5;

    const puntaje = EstadisticaJugadorService.calcularPuntaje(estadistica);

    // Esperado: 0 (< 60 min) + 0 (sin goles) - 2 (amarilla) - 5 (roja) + 4.5 (rating) = -2.5
    // Pero la regla de negocio no deja negativos asi que debe devolver 0
    expect(puntaje).toBe(0);
  });

  /**
   * TEST 5: Jugador suplente sin minutos
   */
  it('debe devolver solo el rating para un suplente con pocos minutos', () => {
    const estadistica = new EstadisticaJugador();
    estadistica.minutos = 15;
    estadistica.posicion = 'F';
    estadistica.goles = 0;
    estadistica.asistencias = 0;
    estadistica.porterias_a_cero = false;
    estadistica.tarjetas_amarillas = 0;
    estadistica.tarjetas_rojas = 0;
    estadistica.rating = 6.2;

    const puntaje = EstadisticaJugadorService.calcularPuntaje(estadistica);

    // Esperado: 0 (< 60 min) + 0 (sin stats) + 6.2 (rating) = 6.2
    expect(puntaje).toBe(6.2);
  });

  /**
   * TEST 6: Mediocampista con gol y 2 asistencias (partido completo)
   */
  it('debe calcular correctamente el puntaje de un mediocampista creativo', () => {
    const estadistica = new EstadisticaJugador();
    estadistica.minutos = 90;
    estadistica.posicion = 'M';
    estadistica.goles = 1;
    estadistica.asistencias = 2;
    estadistica.porterias_a_cero = false;
    estadistica.tarjetas_amarillas = 1;
    estadistica.tarjetas_rojas = 0;
    estadistica.rating = 8.0;

    const puntaje = EstadisticaJugadorService.calcularPuntaje(estadistica);

    // Esperado: 1 (minutos) + 5 (gol × 5) + 6 (2 asist × 3) - 2 (amarilla) + 8.0 (rating) = 18.0
    expect(puntaje).toBe(18.0);
  });

  /**
   * TEST 7: Todas las estadísticas en 0
   */
  it('debe devolver 0 cuando todas las estadísticas son 0 o undefined', () => {
    const estadistica = new EstadisticaJugador();
    estadistica.minutos = 0;
    estadistica.posicion = 'M';
    estadistica.goles = 0;
    estadistica.asistencias = 0;
    estadistica.porterias_a_cero = false;
    estadistica.tarjetas_amarillas = 0;
    estadistica.tarjetas_rojas = 0;
    estadistica.rating = undefined;

    const puntaje = EstadisticaJugadorService.calcularPuntaje(estadistica);

    expect(puntaje).toBe(0);
  });

  /**
   * TEST 8: Portero con gol (caso raro pero posible)
   */
  it('debe calcular correctamente cuando un portero marca un gol', () => {
    const estadistica = new EstadisticaJugador();
    estadistica.minutos = 90;
    estadistica.posicion = 'G';
    estadistica.goles = 1;
    estadistica.asistencias = 0;
    estadistica.porterias_a_cero = true;
    estadistica.tarjetas_amarillas = 0;
    estadistica.tarjetas_rojas = 0;
    estadistica.rating = 9.0;

    const puntaje = EstadisticaJugadorService.calcularPuntaje(estadistica);

    // Esperado: 1 (minutos) + 6 (gol × 6) + 4 (portería a cero) + 9.0 (rating) = 20.0
    expect(puntaje).toBe(20.0);
  });
});