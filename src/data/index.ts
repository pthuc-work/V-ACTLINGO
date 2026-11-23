// ==============================================================================
// V-ACT HUB: Data Access Layer Factory & Exports
// ==============================================================================

import { DataRepository } from './repository';
import { LocalRepository, LOCAL_USER_ID } from './localRepository';
import { SupabaseRepository } from './supabaseRepository';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export * from './types';
export * from './repository';
export * from './localRepository';
export * from './supabaseRepository';
export * from './syncQueue';
export * from './seed';

let repositoryInstance: DataRepository | null = null;

/**
 * Returns the active DataRepository singleton based on configuration.
 * - If Supabase URL and ANON KEY are present, returns SupabaseRepository (with offline cache).
 * - Otherwise, automatically returns LocalRepository (IndexedDB).
 */
export function getRepository(): DataRepository {
  if (!repositoryInstance) {
    if (isSupabaseConfigured && supabase) {
      try {
        repositoryInstance = new SupabaseRepository(supabase);
      } catch (err) {
        console.warn('Failed to initialize SupabaseRepository, falling back to LocalRepository:', err);
        repositoryInstance = new LocalRepository();
      }
    } else {
      repositoryInstance = new LocalRepository();
    }
  }
  return repositoryInstance;
}

/**
 * Reset singleton instance (useful for unit testing or switching auth/offline mode).
 */
export function resetRepository(instance?: DataRepository): void {
  repositoryInstance = instance || null;
}
