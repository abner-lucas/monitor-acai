import { IRotationService } from './types';
import { apiRotationService } from './apiRotationService';

/**
 * ACTIVE ROTATION SERVICE
 *
 * O navegador fala apenas com as rotas /api do próprio app; elas validam a sessão
 * e gravam no banco MySQL da Hostinger.
 */
export const rotationService: IRotationService = apiRotationService;

export * from './types';
export { apiRotationService } from './apiRotationService';
