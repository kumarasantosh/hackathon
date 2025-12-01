import { createClientComponentClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const createClient = () => {
  return createClientComponentClient<Database>()
}

