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
  },
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts'], // Ajustá esto a tu estructura
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
