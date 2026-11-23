import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey.length > 20
);

/**
 * Singleton Supabase Client.
 * When Supabase env variables are not set, client is null or dummy to prevent app runtime crash.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ==============================================================================
// Auth Helper Utilities
// ==============================================================================

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('Supabase auth getUser error:', error.message);
      return null;
    }
    return user;
  } catch (err) {
    console.warn('Failed to retrieve current user:', err);
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Supabase auth getSession error:', error.message);
      return null;
    }
    return session;
  } catch (err) {
    console.warn('Failed to retrieve session:', err);
    return null;
  }
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Ứng dụng đang ở chế độ ngoại tuyến (Offline Mode).');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Ứng dụng đang ở chế độ ngoại tuyến (Offline Mode).');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithMagicLink(email: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Ứng dụng đang ở chế độ ngoại tuyến (Offline Mode).');
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
