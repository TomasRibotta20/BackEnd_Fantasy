import Groq from 'groq-sdk';

// Configurar con tu API Key de Groq (obtener en https://console.groq.com)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

export interface JugadorParaPrecio {
  id: number;
  nombre: string;
  posicion: string;
  edad?: number;
}

export interface RespuestaPrecioIA {
  id: number;
  precio: number;
}

export async function calcularPreciosConIA(
  clubNombre: string,
  jugadores: JugadorParaPrecio[]
): Promise<RespuestaPrecioIA[]> {
  
  const prompt = `Eres un analista de Fantasy Football de la Liga Profesional Argentina.

CONTEXTO TEMPORAL: Estamos en febrero de 2021, antes de:
- Mundial Qatar 2022
- Copa América 2021
- Transferencias masivas a Europa post-pandemia

TAREA: Asignar precios iniciales (moneda virtual) a los jugadores del club ${clubNombre}.

BAREMO DE PRECIOS:
- 15.000.000 - 20.000.000: Estrellas nacionales (ej: Julián Álvarez 2021, Enzo Pérez, José Sand, Marco Ruben)
- 10.000.000 - 14.999.999: Titulares indiscutidos con buen presente
- 5.000.000 - 9.999.999: Rotación habitual / Jugadores con potencial
- 2.000.000 - 4.999.999: Suplentes ocasionales / Juveniles prometedores
- 500.000 - 1.999.999: Juveniles sin debut o escasa participación

REGLAS ESTRICTAS:
1. Máximo 2-3 jugadores por club sobre 12.000.000
2. Porteros (Goalkeeper) generalmente entre 3.000.000 - 8.000.000 (salvo nivel Armani)
3. Considera la posición: Delanteros y mediocampistas ofensivos suelen valer más
4. Responde SOLO el JSON, sin texto adicional ni markdown
5. Asigna Precios exactos (sin rangos) en múltiplos de 500.000 moneda virtual y basados en desempeño hasta 2021, no en proyecciones futuras.
6. Asigna precios segun tambien la carrera y el contexto del jugador hasta 2021 (ej: un juvenil con potencial pero sin debutar no puede valer igual que una estrella consagrada o un jugador con pocos partidos en primera división o con pocas estadisticas positivas o buena proyeccion para el momento no puede valer igual que un jugador consagrado o leyenda para ese club)

INPUT:
${JSON.stringify(jugadores, null, 2)}

OUTPUT (solo el array, sin markdown):
[{"id": 123, "precio": 8500000}]`;

   try {
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en Fantasy Football argentino. Respondes únicamente con JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.3,
      max_tokens: 4000
    });

    const respuesta = completion.choices[0]?.message?.content;
    
    if (!respuesta) {
      throw new Error('No se recibió respuesta de la IA');
    }

    // Limpiar respuesta (por si viene con markdown)
    let jsonLimpio = respuesta.trim();
    
    // Remover bloques de código markdown
    jsonLimpio = jsonLimpio.replace(/```json\s*/g, '');
    jsonLimpio = jsonLimpio.replace(/```\s*/g, '');
    jsonLimpio = jsonLimpio.trim();
    
    // Parsear
    const datos = JSON.parse(jsonLimpio);
    // Si la respuesta viene envuelta en un objeto, extraer el array
        let arrayPrecios: any[] = [];
    
    if (Array.isArray(datos)) {
      arrayPrecios = datos;
    } else if (typeof datos === 'object') {
      // Buscar el array en el objeto
      const possibleKeys = ['precios', 'jugadores', 'data', 'results'];
      for (const key of possibleKeys) {
        if (Array.isArray(datos[key])) {
          arrayPrecios = datos[key];
          break;
        }
      }
      
      // Si no encontró nada, tomar el primer valor que sea array
      if (arrayPrecios.length === 0) {
        const valores = Object.values(datos);
        const primerArray = valores.find(v => Array.isArray(v));
        if (primerArray) {
          arrayPrecios = primerArray as any[];
        }
      }
    }
    
    if (!Array.isArray(arrayPrecios) || arrayPrecios.length === 0) {
      console.error('No se pudo extraer array de precios. Datos recibidos:', datos);
      throw new Error('La respuesta no contiene un array válido de precios');
    }
    
    console.log(`Array extraído con ${arrayPrecios.length} elementos`);
    
    return arrayPrecios as RespuestaPrecioIA[];
    
  } catch (error: any) {
    console.error('Error llamando a Groq:', error);
    
    if (error.message?.includes('API key')) {
      throw new Error('API Key de Groq no configurada o inválida. Configura GROQ_API_KEY en .env');
    }
    
    throw new Error(`Error procesando precios con IA: ${error.message}`);
  }
}