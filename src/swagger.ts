// src/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fantasy Liga Argentina API',
      version: '1.0.0',
      description: 'Documentación de la API del proyecto fantasy',
    },
    // Esquemas de datos
    components: {
      schemas: {
        Club: {
          type: 'object',
          required: ['name'], // Define los campos obligatorios al crear/actualizar
          properties: {
            id: {
              type: 'integer',
              format: 'int64',
              description: 'ID único del club',
              readOnly: true, // Indica que este campo es solo de lectura (ej. autoincremental)
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Nombre oficial del club',
              example: 'Rosario Central',
            },
          },
        },
      },
    },
    // --- FIN DE LA SECCIÓN DE ESQUEMAS ---
  },
  apis: ['./src/swagger/paths/**/*.yaml'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
