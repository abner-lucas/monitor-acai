import { randomBytes, timingSafeEqual } from 'node:crypto';
import { sign } from './session';

/**
 * Proteção da ida e volta à tela de consentimento do Google (parâmetro state do OAuth):
 * um valor aleatório assinado vai ao Google e fica num cookie; na volta os dois têm de bater.
 */

export const ESTADO_COOKIE = 'monitoracai_drive_state';

export function novoEstado(): { nonce: string; state: string } {
  const nonce = randomBytes(16).toString('base64url');
  return { nonce, state: `${nonce}.${sign(`drive:${nonce}`)}` };
}

export function estadoValido(state: string | null, nonceSalvo: string | undefined): boolean {
  const [nonce, assinatura] = (state ?? '').split('.');
  if (!nonce || !assinatura || nonce !== nonceSalvo) return false;
  const esperado = Buffer.from(sign(`drive:${nonce}`));
  const recebido = Buffer.from(assinatura);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}
