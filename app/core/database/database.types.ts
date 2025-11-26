export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: number;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          created_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          subject_id: number | null;
          title: string;
          isbn: string | null;
          mode: number;
          total_unit: number;
          status: number;
          previous_book_id: string | null;
          priority: number;
          cover_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: number | null;
          title: string;
          isbn?: string | null;
          mode?: number;
          total_unit?: number;
          status?: number;
          previous_book_id?: string | null;
          priority?: number;
          cover_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: number | null;
          title?: string;
          isbn?: string | null;
          mode?: number;
          total_unit?: number;
          status?: number;
          previous_book_id?: string | null;
          priority?: number;
          cover_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          book_id: string;
          unit_index: number;
          state: number;
          stability: number;
          difficulty: number;
          due: string;
          last_review: string | null;
          reps: number;
          photo_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          book_id: string;
          unit_index: number;
          state?: number;
          stability?: number;
          difficulty?: number;
          due: string;
          last_review?: string | null;
          reps?: number;
          photo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          unit_index?: number;
          state?: number;
          stability?: number;
          difficulty?: number;
          due?: string;
          last_review?: string | null;
          reps?: number;
          photo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ledger: {
        Row: {
          id: number;
          user_id: string;
          date: string;
          earned_lex: number;
          target_lex: number;
          balance: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          date: string;
          earned_lex?: number;
          target_lex?: number;
          balance?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          date?: string;
          earned_lex?: number;
          target_lex?: number;
          balance?: number;
          created_at?: string;
        };
      };
      inventory_presets: {
        Row: {
          id: number;
          user_id: string;
          label: string;
          icon_code: number;
          book_ids: Json;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          label: string;
          icon_code: number;
          book_ids?: Json;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          label?: string;
          icon_code?: number;
          book_ids?: Json;
          is_default?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
