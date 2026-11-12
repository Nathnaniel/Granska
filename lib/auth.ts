// Sign-in and check counts, backed by Supabase. Components only talk to this file.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface Session { email: string; name: string }

let client: SupabaseClient | undefined;

// Created on first use, so pages can prerender without the browser's session.
function supabase() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return client;
}

const utcToday = () => new Date().toISOString().slice(0, 10);

export const auth = {
  async sendMagicLink(email: string, redirectTo: string) {
    const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) throw error;
  },

  async signInWithGoogle(redirectTo: string) {
    const { error } = await supabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  },

  // Also finishes a sign-in when the visitor arrives from a magic link.
  async getSession(): Promise<Session | null> {
    const { data } = await supabase().auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const { data: profile } = await supabase().from('profiles').select('name').eq('id', user.id).maybeSingle();
    return { email: user.email ?? '', name: profile?.name ?? user.email?.split('@')[0] ?? '' };
  },

  async signOut() {
    await supabase().auth.signOut();
  },

  async checksToday() {
    const { data } = await supabase().from('daily_usage').select('checks').eq('day', utcToday()).maybeSingle();
    return data?.checks ?? 0;
  },

  // Returns today's total. Only the count is stored, never the address.
  async recordCheck(): Promise<number> {
    const { data, error } = await supabase().rpc('record_check');
    if (error) throw error;
    return data;
  },
};
