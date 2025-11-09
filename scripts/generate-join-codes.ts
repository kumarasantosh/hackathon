/**
 * Script to generate join codes for existing study groups that don't have one
 * Run this after applying the migration: npm run db:migrate
 * Then run: tsx scripts/generate-join-codes.ts
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function generateJoinCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

async function generateJoinCodesForExistingGroups() {
  try {
    // Get all groups without join codes
    const { data: groups, error: fetchError } = await supabase
      .from('study_groups')
      .select('id, name, join_code')
      .is('join_code', null)

    if (fetchError) {
      console.error('Error fetching groups:', fetchError)
      return
    }

    if (!groups || groups.length === 0) {
      console.log('All groups already have join codes!')
      return
    }

    console.log(`Found ${groups.length} groups without join codes`)

    // Generate and update join codes
    for (const group of groups) {
      let joinCode = generateJoinCode()
      let isUnique = false
      let attempts = 0
      const maxAttempts = 10

      // Ensure uniqueness
      while (!isUnique && attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from('study_groups')
          .select('id')
          .eq('join_code', joinCode)
          .single()

        if (!existing) {
          isUnique = true
        } else {
          joinCode = generateJoinCode()
          attempts++
        }
      }

      if (!isUnique) {
        console.error(`Failed to generate unique code for group: ${group.name}`)
        continue
      }

      // Update the group
      const { error: updateError } = await supabase
        .from('study_groups')
        .update({ join_code: joinCode })
        .eq('id', group.id)

      if (updateError) {
        console.error(`Error updating group ${group.name}:`, updateError)
      } else {
        console.log(`✓ Generated join code for: ${group.name} (${joinCode})`)
      }
    }

    console.log('\nDone! All groups now have join codes.')
  } catch (error) {
    console.error('Error:', error)
  }
}

generateJoinCodesForExistingGroups()

