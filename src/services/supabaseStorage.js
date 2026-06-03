import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appStateKey = import.meta.env.VITE_PARKBUDDY_STATE_KEY || 'default';
const TABLE_NAME = 'parkbuddy_app_state';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function loadParkBuddyState() {
  if (!supabase) {
    return { isConfigured: false, data: null };
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('data')
    .eq('state_key', appStateKey)
    .maybeSingle();

  if (error) throw error;

  return {
    isConfigured: true,
    data: data?.data || null
  };
}

export async function saveParkBuddyState(state) {
  if (!supabase) {
    return { isConfigured: false, savedAt: null };
  }

  const savedAt = new Date().toISOString();
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert({
      state_key: appStateKey,
      data: state,
      updated_at: savedAt
    }, {
      onConflict: 'state_key'
    });

  if (error) throw error;

  return { isConfigured: true, savedAt };
}
