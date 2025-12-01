import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkSchema() {
    console.log('--- Checking Profiles Table Schema ---')

    // Check is_public
    const { error: publicError } = await supabase
        .from('profiles')
        .select('is_public')
        .limit(1)

    if (publicError) {
        console.log('❌ Column "is_public": MISSING or Error (' + publicError.message + ')')
    } else {
        console.log('✅ Column "is_public": EXISTS')
    }

    // Check level
    const { error: levelError } = await supabase
        .from('profiles')
        .select('level')
        .limit(1)

    if (levelError) {
        console.log('❌ Column "level": MISSING or Error (' + levelError.message + ')')
    } else {
        console.log('✅ Column "level": EXISTS')
    }

    // Check character_class
    const { error: classError } = await supabase
        .from('profiles')
        .select('character_class')
        .limit(1)

    if (classError) {
        console.log('❌ Column "character_class": MISSING or Error (' + classError.message + ')')
    } else {
        console.log('✅ Column "character_class": EXISTS')
    }
}

checkSchema()
