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
          full_name: string | null
          role: 'student' | 'topper' | 'admin'
          is_verified: boolean
          cgpa: number | null
          transcript_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          full_name?: string | null
          role?: 'student' | 'topper' | 'admin'
          is_verified?: boolean
          cgpa?: number | null
          transcript_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string
          full_name?: string | null
          role?: 'student' | 'topper' | 'admin'
          is_verified?: boolean
          cgpa?: number | null
          transcript_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          name: string
          code: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          description?: string | null
          created_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          topper_id: string
          title: string
          description: string | null
          subject_id: string | null
          semester: number | null
          file_url: string
          file_type: string | null
          file_size: number | null
          tags: string[] | null
          price: number
          download_count: number
          rating: number
          rating_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          topper_id: string
          title: string
          description?: string | null
          subject_id?: string | null
          semester?: number | null
          file_url: string
          file_type?: string | null
          file_size?: number | null
          tags?: string[] | null
          price?: number
          download_count?: number
          rating?: number
          rating_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          topper_id?: string
          title?: string
          description?: string | null
          subject_id?: string | null
          semester?: number | null
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          tags?: string[] | null
          price?: number
          download_count?: number
          rating?: number
          rating_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      question_bank: {
        Row: {
          id: string
          resource_id: string | null
          question_text: string
          question_hash: string
          answer_text: string
          subject_id: string | null
          semester: number | null
          topic: string | null
          exam_type: string | null
          year: number | null
          difficulty: 'easy' | 'medium' | 'hard' | null
          created_at: string
        }
        Insert: {
          id?: string
          resource_id?: string | null
          question_text: string
          question_hash: string
          subject_id?: string | null
          semester?: number | null
          topic?: string | null
          exam_type?: string | null
          year?: number | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          created_at?: string
        }
        Update: {
          id?: string
          resource_id?: string | null
          question_text?: string
          question_hash?: string
          subject_id?: string | null
          semester?: number | null
          topic?: string | null
          exam_type?: string | null
          year?: number | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          student_id: string
          topper_id: string
          resource_id: string | null
          session_type: 'tutoring' | 'consultation'
          duration_minutes: number
          scheduled_at: string
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          price: number
          payment_status: 'pending' | 'paid' | 'refunded'
          payment_id: string | null
          meeting_link: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          topper_id: string
          resource_id?: string | null
          session_type?: 'tutoring' | 'consultation'
          duration_minutes: number
          scheduled_at: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          price: number
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          topper_id?: string
          resource_id?: string | null
          session_type?: 'tutoring' | 'consultation'
          duration_minutes?: number
          scheduled_at?: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          price?: number
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      study_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          subject_id: string | null
          topic: string | null
          max_members: number
          meeting_type: 'virtual' | 'physical' | 'both'
          meeting_location: string | null
          meeting_link: string | null
          preferred_time_slots: string[] | null
          created_by: string
          is_active: boolean
          join_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          subject_id?: string | null
          topic?: string | null
          max_members?: number
          meeting_type?: 'virtual' | 'physical' | 'both'
          meeting_location?: string | null
          meeting_link?: string | null
          preferred_time_slots?: string[] | null
          created_by: string
          is_active?: boolean
          join_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          subject_id?: string | null
          topic?: string | null
          max_members?: number
          meeting_type?: 'virtual' | 'physical' | 'both'
          meeting_location?: string | null
          meeting_link?: string | null
          preferred_time_slots?: string[] | null
          created_by?: string
          is_active?: boolean
          join_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      study_group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'leader' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: 'leader' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: 'leader' | 'member'
          joined_at?: string
        }
      }
      resource_transactions: {
        Row: {
          id: string
          student_id: string
          resource_id: string
          amount: number
          payment_status: 'pending' | 'paid' | 'refunded'
          payment_id: string | null
          downloaded_at: string
        }
        Insert: {
          id?: string
          student_id: string
          resource_id: string
          amount: number
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_id?: string | null
          downloaded_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          resource_id?: string
          amount?: number
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_id?: string | null
          downloaded_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          resource_id: string | null
          booking_id: string | null
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          resource_id?: string | null
          booking_id?: string | null
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          resource_id?: string | null
          booking_id?: string | null
          reviewer_id?: string
          reviewee_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_generated_content: {
        Row: {
          id: string
          resource_id: string
          content_type: 'quiz' | 'flashcards' | 'summary' | 'exam_questions'
          content: Json
          generated_at: string
        }
        Insert: {
          id?: string
          resource_id: string
          content_type: 'quiz' | 'flashcards' | 'summary' | 'exam_questions'
          content: Json
          generated_at?: string
        }
        Update: {
          id?: string
          resource_id?: string
          content_type?: 'quiz' | 'flashcards' | 'summary' | 'exam_questions'
          content?: Json
          generated_at?: string
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

