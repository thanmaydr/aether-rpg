import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function verifySchema() {
    console.log('--- Verifying Schema for knowledge_nodes ---')
    console.log('Target URL:', supabaseUrl)

    // Query information_schema to get columns
    // Note: Supabase JS doesn't support querying information_schema directly easily via .from() 
    // because it's usually not exposed to the API.
    // However, we can try to RPC if we had one, or just infer from the error.

    // Alternative: Try to select * from knowledge_nodes limit 1 and see keys
    const { data, error } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error querying table:', error.message)
        return
    }

    if (data && data.length > 0) {
        console.log('Existing columns on first row:', Object.keys(data[0]))
        if ('status' in data[0]) {
            console.log('✅ "status" column FOUND.')
        } else {
            console.log('❌ "status" column NOT FOUND in returned data.')
        }
    } else {
        console.log('Table is empty, cannot infer columns from data.')
        console.log('Retrying insert to confirm error...')

        const { error: insertError } = await supabase
            .from('knowledge_nodes')
            .insert({ title: 'Schema Test', domain: 'test' }) // Minimal insert

        if (insertError) {
            console.log('Insert Error:', insertError.message)
        }
    }
}

verifySchema()
