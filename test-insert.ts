import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
const supabaseAnon = createClient(supabaseUrl, anonKey)

async function testInsert() {
    console.log('--- Testing DB Insert ---')

    const dummyNode = {
        title: 'Test Node ' + Date.now(),
        description: 'Test Description',
        domain: 'Test Domain',
        difficulty_tier: 1,
        concept_content: 'Test Content'
        // status: 'draft' // Removed
    }

    // 1. Test with Service Role (Should succeed)
    console.log('\n1. Attempting insert with SERVICE ROLE (Bypasses RLS)...')
    const { data: dataAdmin, error: errorAdmin } = await supabaseAdmin
        .from('knowledge_nodes')
        .insert(dummyNode)
        .select()

    if (errorAdmin) {
        console.error('❌ Service Role Insert Failed:', errorAdmin.message)
    } else {
        console.log('✅ Service Role Insert Success:', dataAdmin[0].id)

        // Cleanup
        await supabaseAdmin.from('knowledge_nodes').delete().eq('id', dataAdmin[0].id)
    }

    // 2. Test with Anon Key (Should fail without RLS policy)
    console.log('\n2. Attempting insert with ANON KEY (Enforces RLS)...')
    const { error: errorAnon } = await supabaseAnon
        .from('knowledge_nodes')
        .insert(dummyNode)

    if (errorAnon) {
        console.error('❌ Anon Insert Failed (Expected if RLS is on):', errorAnon.message)
    } else {
        console.log('⚠️ Anon Insert Success (Unexpected if RLS is on and no policy):')
    }
}

testInsert()
