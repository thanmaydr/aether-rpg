import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function backfillQuests() {
    console.log('--- Backfilling Quests for Orphaned Nodes ---')

    // 1. Get all nodes
    const { data: nodes, error: nodeError } = await supabase
        .from('knowledge_nodes')
        .select('*')

    if (nodeError) {
        console.error('Error fetching nodes:', nodeError)
        return
    }

    console.log(`Found ${nodes.length} total nodes. Checking for missing quests...`)

    let fixedCount = 0

    for (const node of nodes) {
        // Check if quest exists
        const { data: quests, error: questError } = await supabase
            .from('quests')
            .select('id')
            .eq('node_id', node.id)

        if (questError) {
            console.error(`Error checking quest for node ${node.title}:`, questError)
            continue
        }

        if (!quests || quests.length === 0) {
            console.log(`Creating quest for orphaned node: "${node.title}"`)

            const newQuest = {
                node_id: node.id,
                quest_type: 'feynman',
                scenario_prompt: `You are a mentor explaining ${node.title} to a curious student. Verify their understanding of: ${node.description}`,
                win_condition: { rubric: "Clear explanation, accurate terminology, covers core concept" },
                xp_reward: 100
            }

            const { error: insertError } = await supabase
                .from('quests')
                .insert(newQuest)

            if (insertError) {
                console.error(`Failed to create quest for ${node.title}:`, insertError.message)
            } else {
                fixedCount++
            }
        }
    }

    console.log(`\n✅ Backfill complete. Created ${fixedCount} missing quests.`)
}

backfillQuests()
