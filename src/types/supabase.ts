export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      subscribers: {
        Row: {
          id: string
          email: string
          subscribed_at: string
          status: string
          created_at: string
          updated_at: string
          last_ip: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          email: string
          subscribed_at?: string
          status?: string
          created_at?: string
          updated_at?: string
          last_ip?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          email?: string
          subscribed_at?: string
          status?: string
          created_at?: string
          updated_at?: string
          last_ip?: string | null
          user_agent?: string | null
        }
      }
      service_role_users: {
        Row: {
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
