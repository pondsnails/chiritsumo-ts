import { create } from 'zustand';
import { supabase } from '../database/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  initAuth: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  error: null,

  initAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, isLoading: false });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          set({ session });
        }
      );

      return () => subscription?.unsubscribe();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Auth init failed',
        isLoading: false,
      });
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign up failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign in failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign out failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
