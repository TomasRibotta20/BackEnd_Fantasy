import { Router } from 'express';
import { findAll, findOne } from './posicion.controller.js';
export const posicionRouter = Router();

/**
 * @swagger
 * /api/posiciones:
 *   get:
 *     tags:
 *       - Posicion
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
posicionRouter.get('/', findAll);

/**
 * @swagger
 * /api/posiciones/:id:
 *   get:
 *     tags:
 *       - Posicion
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
posicionRouter.get('/:id', findOne);
