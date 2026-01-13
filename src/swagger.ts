// src/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fantasy Liga Argentina API',
      version: '1.0.0',
      description: 'Documentación de la API del proyecto Fantasy (Liga Argentina 2021).',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local' },
    ],
    components: {
      // Autenticación
      securitySchemes: {
        // Mantengo cookieAuth porque es lo usado en los YAML
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token', 
        },
        // Agrego bearerAuth por si también admites Authorization: Bearer <JWT>
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // --- CLUB ---
        Club:
          {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              nombre: { type: 'string', example: 'River Plate' },
              id_api: { type: 'integer', example: 435 },
              codigo: { type: 'string', nullable: true, example: 'RIV' },
              logo: { type: 'string', nullable: true, example: 'https://...' },
              pais: { type: 'string', nullable: true, example: 'Argentina' },
              fundado: { type: 'integer', nullable: true, example: 1901 },
              estadio_nombre: { type: 'string', nullable: true, example: 'Monumental' },
              estadio_ciudad: { type: 'string', nullable: true, example: 'Buenos Aires' },
              estadio_capacidad: { type: 'integer', nullable: true, example: 70074 },
              estadio_imagen: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ClubCreate: {
          type: 'object',
          required: ['nombre', 'id_api'],
          properties: {
            nombre: { type: 'string' },
            id_api: { type: 'integer' },
            codigo: { type: 'string', nullable: true },
            logo: { type: 'string', nullable: true },
            pais: { type: 'string', nullable: true },
            fundado: { type: 'integer', nullable: true },
            estadio_nombre: { type: 'string', nullable: true },
            estadio_ciudad: { type: 'string', nullable: true },
            estadio_capacidad: { type: 'integer', nullable: true },
            estadio_imagen: { type: 'string', nullable: true },
          },
        },
        ClubUpdate: { allOf: [{ $ref: '#/components/schemas/ClubCreate' }] },

        // --- POSITION ---
        Position: {
          type: 'object',
            properties: {
              id: { type: 'integer', example: 3 },
              description: { type: 'string', example: 'Midfielder' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
        },
        PositionCreate: {
          type: 'object',
          required: ['description'],
          properties: { description: { type: 'string' } },
        },
        PositionPatch: {
          type: 'object',
          properties: { description: { type: 'string' } },
        },

        // --- PLAYER ---
        Player: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 10 },
            apiId: { type: 'integer', example: 123456 },
            name: { type: 'string', nullable: true, example: 'Enzo Pérez' },
            firstname: { type: 'string', nullable: true },
            lastname: { type: 'string', nullable: true },
            age: { type: 'integer', nullable: true, example: 34 },
            nationality: { type: 'string', nullable: true, example: 'Argentina' },
            height: { type: 'string', nullable: true, example: '177 cm' },
            weight: { type: 'string', nullable: true, example: '72 kg' },
            photo: { type: 'string', nullable: true },
            jerseyNumber: { type: 'integer', nullable: true, example: 24 },
            club: { $ref: '#/components/schemas/Club' },
            position: { $ref: '#/components/schemas/Position' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PlayerCreate: {
          type: 'object',
          required: ['apiId', 'clubId'],
          properties: {
            apiId: { type: 'integer' },
            name: { type: 'string', nullable: true },
            firstname: { type: 'string', nullable: true },
            lastname: { type: 'string', nullable: true },
            age: { type: 'integer', nullable: true },
            nationality: { type: 'string', nullable: true },
            height: { type: 'string', nullable: true },
            weight: { type: 'string', nullable: true },
            photo: { type: 'string', nullable: true },
            jerseyNumber: { type: 'integer', nullable: true },
            clubId: { type: 'integer' },
            positionId: { type: 'integer', nullable: true },
          },
        },
        PlayerUpdate: { allOf: [{ $ref: '#/components/schemas/PlayerCreate' }] },
        PlayerPatch: {
          type: 'object',
          properties: {
            apiId: { type: 'integer' },
            name: { type: 'string', nullable: true },
            firstname: { type: 'string', nullable: true },
            lastname: { type: 'string', nullable: true },
            age: { type: 'integer', nullable: true },
            nationality: { type: 'string', nullable: true },
            height: { type: 'string', nullable: true },
            weight: { type: 'string', nullable: true },
            photo: { type: 'string', nullable: true },
            jerseyNumber: { type: 'integer', nullable: true },
            clubId: { type: 'integer' },
            positionId: { type: 'integer' },
          },
        },

        // --- JORNADA ---
        Jornada: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 5 },
            nombre: { type: 'string', example: '2nd Phase - 3' },
            temporada: { type: 'integer', example: 2021 },
            etapa: { type: 'string', nullable: true, example: '2nd Phase' },
            liga_id: { type: 'integer', nullable: true, example: 128 },
            fecha_inicio: { type: 'string', format: 'date-time', nullable: true },
            fecha_fin: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        JornadaCreate: {
          type: 'object',
          required: ['nombre', 'temporada'],
          properties: {
            nombre: { type: 'string' },
            temporada: { type: 'integer' },
            etapa: { type: 'string', nullable: true },
            liga_id: { type: 'integer', nullable: true },
            fecha_inicio: { type: 'string', format: 'date-time', nullable: true },
            fecha_fin: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        JornadaUpdate: { allOf: [{ $ref: '#/components/schemas/JornadaCreate' }] },
        JornadaPatch: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            temporada: { type: 'integer' },
            etapa: { type: 'string', nullable: true },
            liga_id: { type: 'integer', nullable: true },
            fecha_inicio: { type: 'string', format: 'date-time', nullable: true },
            fecha_fin: { type: 'string', format: 'date-time', nullable: true },
          },
        },

        // --- PARTIDO ---
        Partido: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 100 },
            id_api: { type: 'integer', example: 987654 },
            fecha: { type: 'string', format: 'date-time', nullable: true },
            estado: { type: 'string', nullable: true, example: 'NS' },
            estado_detalle: { type: 'string', nullable: true, example: 'Not Started' },
            estadio: { type: 'string', nullable: true, example: 'Monumental' },
            local: { $ref: '#/components/schemas/Club' },
            visitante: { $ref: '#/components/schemas/Club' },
            jornada: { $ref: '#/components/schemas/Jornada' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PartidoCreate: {
          type: 'object',
          required: ['id_api', 'jornadaId', 'localId', 'visitanteId'],
          properties: {
            id_api: { type: 'integer' },
            fecha: { type: 'string', format: 'date-time', nullable: true },
            estado: { type: 'string', nullable: true },
            estado_detalle: { type: 'string', nullable: true },
            estadio: { type: 'string', nullable: true },
            jornadaId: { type: 'integer' },
            localId: { type: 'integer' },
            visitanteId: { type: 'integer' },
          },
        },
        PartidoPatch: {
          type: 'object',
          properties: {
            fecha: { type: 'string', format: 'date-time', nullable: true },
            estado: { type: 'string', nullable: true },
            estado_detalle: { type: 'string', nullable: true },
            estadio: { type: 'string', nullable: true },
            jornadaId: { type: 'integer' },
            localId: { type: 'integer' },
            visitanteId: { type: 'integer' },
          },
        },

        // --- EQUIPO ---
        EquipoJugador: {
          type: 'object',
          description: 'Relación entre un equipo y un jugador, indicando titularidad.',
          properties: {
            id: { type: 'integer', example: 101 },
            es_titular: { type: 'boolean', example: true },
            jugador: { $ref: '#/components/schemas/Player' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          }
        },
        Equipo: {
          type: 'object',
          description: 'Representa el equipo de un usuario con su plantilla completa.',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Los Invencibles FC' },
            jugadores: {
              type: 'array',
              items: { $ref: '#/components/schemas/EquipoJugador' }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          }
        },

        // --- RESPUESTAS COMUNES / ENVOLTORIOS ---
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Usuario no autenticado' },
          },
        },
        OperationMessage: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operación realizada con éxito' },
          },
        },
        ApiEquipoCreateResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Equipo creado exitosamente' },
            data: { $ref: '#/components/schemas/Equipo' },
          },
        },
      },
      requestBodies: {
        CreateEquipo: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre: {
                    type: 'string',
                    description: 'El nombre para el nuevo equipo.',
                    example: 'Los Invencibles FC',
                  },
                },
                required: ['nombre'],
              },
            },
          },
        },
        IntercambioJugador: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jugadorSaleId: {
                    type: 'integer',
                    description: 'ID del jugador que sale del equipo.',
                    example: 15,
                  },
                  jugadorEntraId: {
                    type: 'integer',
                    description: 'ID del jugador del mercado que entra al equipo.',
                    example: 128,
                  },
                },
                required: ['jugadorSaleId', 'jugadorEntraId'],
              },
            },
          },
        },
        CambioAlineacion: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jugadorTitularId: {
                    type: 'integer',
                    description: 'ID del jugador titular que pasará a ser suplente.',
                    example: 2,
                  },
                  jugadorSuplenteId: {
                    type: 'integer',
                    description: 'ID del jugador suplente que pasará a ser titular.',
                    example: 18,
                  },
                },
                required: ['jugadorTitularId', 'jugadorSuplenteId'],
              },
            },
          },
        },
      },
    },
  },
  // YAML de paths
  apis: [
    path.join(__dirname, '..', 'src', 'swagger', 'paths', '*.yaml'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
}