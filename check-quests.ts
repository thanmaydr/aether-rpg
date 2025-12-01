import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkQuests() {
    console.log('--- Checking for Orphaned Nodes (No Quests) ---')

    // Get all nodes
    const { data: nodes, error: nodeError } = await supabase
        .from('knowledge_nodes')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

    if (nodeError) {
        console.error('Error fetching nodes:', nodeError)
        return
    }

    console.log(`Found ${nodes.length} recent nodes. Checking for quests...`)

    for (const node of nodes) {
        const { data: quests, error: questError } = await supabase
            .from('quests')
            .select('id')
            .eq('node_id', node.id)

        if (questError) {
            console.error(`Error checking quest for node ${node.title}:`, questError)
            continue
        }

        if (quests && quests.length > 0) {
            console.log(`✅ Node "${node.title}" has ${quests.length} quest(s).`)
        } else {
            console.log(`❌ Node "${node.title}" has NO quests. (Orphaned)`)
        }
    }
}

checkQuests()
