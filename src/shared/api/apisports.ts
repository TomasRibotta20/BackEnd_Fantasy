// ...existing code...
const BASE_URL = process.env.APISPORTS_BASE_URL || 'https://v3.football.api-sports.io';

// Límite por minuto (déjalo en 9 para margen con el free de 10/min)
const REQ_LIMIT_PER_MIN = Number(process.env.APISPORTS_REQ_PER_MIN || 9);

// Ventana de 60s con timestamps
const requestTimestamps: number[] = [];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForSlot() {
  const now = Date.now();
  // Limpia timestamps fuera de ventana
  while (requestTimestamps.length && now - requestTimestamps[0] > 60_000) {
    requestTimestamps.shift();
  }
  
  if (requestTimestamps.length >= REQ_LIMIT_PER_MIN) {
    // Calculamos tiempo exacto a esperar + margen
    const waitMs = 60_000 - (now - requestTimestamps[0]) + 500; // 500ms de margen
    console.log(`Límite de peticiones alcanzado. Esperando ${waitMs}ms...`);
    await sleep(waitMs);
    // Verificar nuevamente después de esperar (por si acaso)
    return waitForSlot();
  }
  
  // Registrar timestamp actual
  requestTimestamps.push(now);
}

type ApiResponse<T> = {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging?: { current: number; total: number };
  response: T[];
};

async function apiFetch(
  url: string,
  headers: Record<string, string>,
  attempt: number
): Promise<Response> {
  try {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      // Rate limit excedido: espera según headers o 10s exponencial
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      const reset = Number(res.headers.get('x-ratelimit-requests-reset')) || 0; // API-FOOTBALL suele enviarlo
      const delay =
        retryAfter > 0
          ? retryAfter * 1000
          : reset > 0
            ? reset * 1000
            : Math.min(30_000, 2 ** attempt * 1000);
      await sleep(delay);
      return apiFetch(url, headers, attempt + 1);
    }
    if (!res.ok && attempt < 5 && res.status >= 500) {
      await sleep(Math.min(30_000, 2 ** attempt * 1000));
      return apiFetch(url, headers, attempt + 1);
    }
    return res;
  } catch (error) {
    if (attempt < 5) {
      await sleep(Math.min(30_000, 2 ** attempt * 1000));
      return apiFetch(url, headers, attempt + 1);
    }
    throw error;
  }
}

export async function apiGet<T>(path: string, params: Record<string, string | number>) {
  const key = process.env.APISPORTS_KEY;
  if (!key) throw new Error('Falta APISPORTS_KEY en .env');

  const url = new URL(path, BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  await waitForSlot();
  const res = await apiFetch(url.toString(), { 'x-apisports-key': key }, 0);
  requestTimestamps.push(Date.now());

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const json = (await res.json()) as ApiResponse<T>;
  if (json.errors && json.errors.length)
    throw new Error(`API errors: ${JSON.stringify(json.errors)}`);
  return json;
}

export type TeamItem = {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string | null;
    founded: number | null;
    national: boolean | null;
    logo: string | null;
  };
  venue?: {
    id?: number | null;
    name?: string | null;
    address?: string | null;
    city?: string | null;
    capacity?: number | null;
    surface?: string | null;
    image?: string | null;
  };
};

export async function getTeams(leagueId: number, season: number) {
  const data = await apiGet<TeamItem>('/teams', { league: leagueId, season });
  return data.response;
}

export type PlayerItem = {
  player: {
    id: number;
    name: string | null;
    firstname?: string | null;
    lastname?: string | null;
    age?: number | null;
    nationality?: string | null;
    height?: string | null;
    weight?: string | null;
    photo?: string | null;
  };
  statistics?: Array<{
    games?: { position?: string | null; number?: number | null };
  }>;
};

export async function getPlayersByTeam(teamId: number, season: number) {
  let page = 1;
  const acc: PlayerItem[] = [];
  while (true) {
    const data = await apiGet<PlayerItem>('/players', { team: teamId, season, page });
    acc.push(...data.response);
    const paging = data.paging ?? { current: page, total: page };
    if (paging.current >= paging.total) break;
    page++;
    await sleep(750); // pequeña pausa entre páginas
  }
  return acc;
}

// ...existing code...

export type FixtureItem = {
  fixture: {
    id: number;
    date: string; // ISO
    status?: { short?: string | null; long?: string | null };
    venue?: { name?: string | null };
  };
  league: {
    id: number;
    season: number;
    round: string; // ej: "2nd Phase - 1"
    stage?: string | null; // ej: "2nd Phase"
  };
  teams: {
    home: { id: number; name?: string | null; logo?: string | null };
    away: { id: number; name?: string | null; logo?: string | null };
  };
};

export async function getFixturesSecondPhase(leagueId: number, season: number) {
  // Intento directo por stage
  const byStage = await apiGet<FixtureItem>('/fixtures', {
    league: leagueId,
    season,
    stage: '2nd Phase',
  });
  let list = byStage.response;
  if (!list.length) {
    // Fallback: traer todos y filtrar por round que empiece con "2nd Phase"
    const all = await apiGet<FixtureItem>('/fixtures', { league: leagueId, season });
    list = all.response.filter((f) =>
      (f.league?.round || '').toLowerCase().startsWith('2nd phase')
    );
  }
  return list;
}


const HEADERS = {
  'x-apisports-key': process.env.APISPORTS_KEY || '',
};
 /**
 * Obtiene las estadísticas de los jugadores de un partido específico
 * @param partidoApiId ID de API del partido
 */
// Añade esta función para verificar si un partido tiene estadísticas disponibles antes de intentar obtenerlas
export async function verificarDisponibilidadEstadisticas(partidoId: number): Promise<boolean> {
  await waitForSlot();
  
  try {
    const response = await fetch(`${BASE_URL}/fixtures/statistics?fixture=${partidoId}`, {
      method: 'GET',
      headers: HEADERS
    });

    const data = await response.json();
    
    // Si la respuesta tiene datos, hay estadísticas disponibles
    return data.response && data.response.length > 0;
  } catch (error) {
    console.error(`Error verificando disponibilidad de estadísticas para partido ${partidoId}:`, error);
    return false;
  }
}

// Mejora la función de obtención de estadísticas para ser más robusta
export async function obtenerEstadisticasJugadoresPorPartido(
  partidoId: number, 
  intentos = 3,
  esperaBase = 2000
): Promise<any[]> {
  try {
    // Primero verificamos si hay estadísticas disponibles
    const hayEstadisticas = await verificarDisponibilidadEstadisticas(partidoId);
    
    if (!hayEstadisticas) {
      console.log(`No hay estadísticas disponibles en la API para el partido ${partidoId}`);
      return [];
    }
    
    await waitForSlot();
    
    const response = await fetch(`${BASE_URL}/fixtures/players?fixture=${partidoId}`, {
      method: 'GET',
      headers: HEADERS
    });

    const data = await response.json();

    // Mejor manejo de respuestas vacías
    if (!data.response || data.response.length === 0) {
      throw new Error(`No se encontraron estadísticas para el partido ${partidoId}`);
    }

    // Extraer estadísticas de jugadores
    let jugadores: any[] = [];
    
    data.response.forEach((item: any) => {
      if (item.players && Array.isArray(item.players)) {
        item.players.forEach((player: any) => {
          if (player && player.statistics && player.statistics.length > 0) {
            const stats = player.statistics[0];
            jugadores.push({
              player_id: player.player.id,
              minutos: parseInt(stats.games.minutes || '0'),
              posicion: stats.games.position,
              rating: parseFloat(stats.games.rating || '0'),
              capitan: stats.games.captain || false,
              goles: stats.goals.total || 0,
              asistencias: stats.goals.assists || 0,
              goles_concedidos: stats.goals.conceded || 0,
              atajadas: stats.goals.saves || 0,
              tarjetas_amarillas: stats.cards.yellow || 0,
              tarjetas_rojas: stats.cards.red || 0,
            });
          }
        });
      }
    });

    return jugadores;
  } catch (error) {
    if (intentos > 1) {
      // Backoff exponencial con jitter aleatorio
      const jitter = Math.random() * 0.3 + 0.85; // Entre 0.85 y 1.15
      const esperaMs = Math.floor(esperaBase * jitter);
      
      console.error(`Error obteniendo estadísticas de jugadores: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      console.log(`Intento ${4-intentos}/3 fallido para el partido ${partidoId}. Reintentando en ${esperaMs}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, esperaMs));
      return obtenerEstadisticasJugadoresPorPartido(partidoId, intentos - 1, esperaBase * 2);
    }
    throw error;
  }
}
/**
 * Obtiene los detalles completos de un partido específico
 * @param partidoApiId ID de API del partido
 */
export async function obtenerDetallesPartido(partidoApiId: number) {
  try {
    const response = await fetch(`${BASE_URL}/fixtures?id=${partidoApiId}`, {
      method: 'GET',
      headers: HEADERS
    });

    const data = await response.json();
    
    if (!data.response || data.response.length === 0) {
      throw new Error(`No se encontraron detalles para el partido ${partidoApiId}`);
    }

    // La API devuelve un array, pero nosotros queremos el primer elemento
    return data.response[0];
  } catch (error) {
    console.error(`Error obteniendo detalles del partido ${partidoApiId}:`, error);
    throw error;
  }
}