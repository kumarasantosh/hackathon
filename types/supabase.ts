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
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          name: string | null
          bio: string | null
          skills: string[] | null
          location: string | null
          trust_score: number
          verified: boolean
          role: 'user' | 'moderator' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          name?: string | null
          bio?: string | null
          skills?: string[] | null
          location?: string | null
          trust_score?: number
          verified?: boolean
          role?: 'user' | 'moderator' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string
          name?: string | null
          bio?: string | null
          skills?: string[] | null
          location?: string | null
          trust_score?: number
          verified?: boolean
          role?: 'user' | 'moderator' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      items: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          category: string
          images: string[]
          location: string
          type: 'free' | 'paid'
          amount: number | null
          status: 'available' | 'rented' | 'sold'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          category: string
          images?: string[]
          location: string
          type: 'free' | 'paid'
          amount?: number | null
          status?: 'available' | 'rented' | 'sold'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          category?: string
          images?: string[]
          location?: string
          type?: 'free' | 'paid'
          amount?: number | null
          status?: 'available' | 'rented' | 'sold'
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          item_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          amount: number
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          amount: number
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          amount?: number
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at?: string
          updated_at?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          item_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
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
      user_role: 'user' | 'moderator' | 'admin'
      item_type: 'free' | 'paid'
      item_status: 'available' | 'rented' | 'sold'
      order_status: 'pending' | 'completed' | 'failed' | 'refunded'
    }
  }
}

