/**
 * ACTIVE SERVICES
 *
 * O navegador fala apenas com as rotas /api do próprio app; elas validam a sessão
 * e gravam no banco MySQL da Hostinger, separando os dados por unidade piloto.
 */
export * from './types';
export { rotationServiceDa } from './apiRotationService';
export { reportService } from './reportService';
export { campoService } from './campoService';
