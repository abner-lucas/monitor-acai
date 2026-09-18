import { IRotationService } from './types';
import { mockRotationService } from './mockRotationService';
import { supabaseRotationService } from './supabaseRotationService';

/**
 * ACTIVE ROTATION SERVICE
 * 
 * Automatically activates Supabase when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are present.
 * Otherwise, smoothly defaults to mockRotationService (localStorage & local simulation).
 */
const isSupabaseConfigured = Boolean(
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const rotationService: IRotationService = isSupabaseConfigured
  ? supabaseRotationService
  : mockRotationService;

export * from './types';
export { mockRotationService } from './mockRotationService';
export { supabaseRotationService } from './supabaseRotationService';
