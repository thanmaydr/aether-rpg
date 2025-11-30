
import { createClient } from '@supabase/supabase-js'

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
    console.error('Please ensure these are set in your .env file or environment.')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface SeedNode {
    title: string
    description: string
    concept_content: string
    difficulty_tier: number
    children?: SeedNode[]
}

const biologyNodes: SeedNode[] = [
    {
        title: "The Cell",
        description: "The basic structural, functional, and biological unit of all known organisms.",
        concept_content: "The cell is the smallest unit of life. Cells are often called the 'building blocks of life'. The study of cells is called cell biology, cellular biology, or cytology. Cells consist of cytoplasm enclosed within a membrane, which contains many biomolecules such as proteins and nucleic acids. Most plant and animal cells are only visible under a light microscope, with dimensions between 1 and 100 micrometers.",
        difficulty_tier: 1,
        children: [
            {
                title: "Cell Membrane",
                description: "The semipermeable membrane surrounding the cytoplasm of a cell.",
                concept_content: "The cell membrane (also known as the plasma membrane or cytoplasmic membrane) is a biological membrane that separates the interior of all cells from the outside environment which protects the cell from its environment. The cell membrane consists of a lipid bilayer, including cholesterols (a lipid component) that sit between phospholipids to maintain their fluidity at various temperatures.",
                difficulty_tier: 2
            },
            {
                title: "Nucleus",
                description: "The membrane-enclosed organelle within a cell that contains the chromosomes.",
                concept_content: "The nucleus is a membrane-bound organelle found in eukaryotic cells. Eukaryotes usually have a single nucleus, but a few cell types, such as mammalian red blood cells, have no nuclei (anucleate), while others like osteoclasts have many. The cell nucleus contains all of the cell's genome, except for the small amount of mitochondrial DNA and, in plant cells, plastid DNA.",
                difficulty_tier: 2
            },
            {
                title: "Mitochondria",
                description: "The powerhouse of the cell, responsible for cellular respiration.",
                concept_content: "Mitochondria are membrane-bound cell organelles (mitochondrion, singular) that generate most of the chemical energy needed to power the cell's biochemical reactions. Chemical energy produced by the mitochondria is stored in a small molecule called adenosine triphosphate (ATP). Mitochondria contain their own small chromosomes.",
                difficulty_tier: 3,
                children: [
                    {
                        title: "Cellular Respiration",
                        description: "The set of metabolic reactions and processes that take place in the cells of organisms to convert chemical energy from oxygen molecules or nutrients into adenosine triphosphate (ATP).",
                        concept_content: "Cellular respiration is a set of metabolic reactions and processes that take place in the cells of organisms to convert chemical energy from oxygen molecules or nutrients into adenosine triphosphate (ATP), and then release waste products. The reactions involved in respiration are catabolic reactions, which break large molecules into smaller ones, releasing energy.",
                        difficulty_tier: 4
                    }
                ]
            },
            {
                title: "Chloroplasts",
                description: "Organelles that conduct photosynthesis, found in plant cells.",
                concept_content: "Chloroplasts are organelles that conduct photosynthesis, where the photosynthetic pigment chlorophyll captures the energy from sunlight, converts it and stores it in the energy-storage molecules ATP and NADPH while freeing oxygen from water in plant and algal cells. They are known as the plastids.",
                difficulty_tier: 3,
                children: [
                    {
                        title: "Photosynthesis",
                        description: "The process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water.",
                        concept_content: "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy that, through cellular respiration, can later be released to fuel the organism's activities. Some of this chemical energy is stored in carbohydrate molecules, such as sugars and starches, which are synthesized from carbon dioxide and water.",
                        difficulty_tier: 4
                    }
                ]
            }
        ]
    },
    {
        title: "Genetics",
        description: "The study of genes, genetic variation, and heredity in organisms.",
        concept_content: "Genetics is a branch of biology concerned with the study of genes, genetic variation, and heredity in organisms. Though heredity had been observed for millennia, Gregor Mendel, Moravian scientist and Augustinian friar working in the 19th century in Brno, was the first to study genetics scientifically.",
        difficulty_tier: 2,
        children: [
            {
                title: "DNA Structure",
                description: "The double helix structure of Deoxyribonucleic acid.",
                concept_content: "DNA is a molecule composed of two polynucleotide chains that coil around each other to form a double helix carrying genetic instructions for the development, functioning, growth and reproduction of all known organisms and many viruses. DNA and ribonucleic acid (RNA) are nucleic acids.",
                difficulty_tier: 3,
                children: [
                    {
                        title: "RNA and Transcription",
                        description: "The process of copying a segment of DNA into RNA.",
                        concept_content: "Transcription is the first of several steps of DNA based gene expression in which a particular segment of DNA is copied into RNA (especially mRNA) by the enzyme RNA polymerase. Both DNA and RNA are nucleic acids, which use base pairs of nucleotides as a complementary language.",
                        difficulty_tier: 4,
                        children: [
                            {
                                title: "Protein Synthesis",
                                description: "The process in which cells make proteins.",
                                concept_content: "Protein synthesis is the process in which cells make proteins. It occurs in two stages: transcription and translation. Transcription is the transfer of genetic instructions in DNA to mRNA in the nucleus. Translation occurs at the ribosome, which consists of rRNA and proteins.",
                                difficulty_tier: 5
                            }
                        ]
                    }
                ]
            }
        ]
    },
    // Adding more nodes to reach ~30 total
    {
        title: "Evolution",
        description: "Change in the heritable characteristics of biological populations over successive generations.",
        concept_content: "Evolution is change in the heritable characteristics of biological populations over successive generations. These characteristics are the expressions of genes that are passed on from parent to offspring during reproduction. Different characteristics tend to exist within any given population as a result of mutation, genetic recombination and other sources of genetic variation.",
        difficulty_tier: 3,
        children: [
            {
                title: "Natural Selection",
                description: "The differential survival and reproduction of individuals due to differences in phenotype.",
                concept_content: "Natural selection is the differential survival and reproduction of individuals due to differences in phenotype. It is a key mechanism of evolution, the change in the heritable traits characteristic of a population over generations. Charles Darwin popularized the term 'natural selection', contrasting it with artificial selection, which is intentional, whereas natural selection is not.",
                difficulty_tier: 3
            },
            {
                title: "Adaptation",
                description: "A trait with a current functional role in the life history of an organism that is maintained and evolved by means of natural selection.",
                concept_content: "In biology, adaptation has three related meanings. Firstly, it is the dynamic evolutionary process that fits organisms to their environment, enhancing their evolutionary fitness. Secondly, it is a state reached by the population during that process. Thirdly, it is a phenotypic trait or adaptive trait, with a functional role in each individual organism, that is maintained and has evolved through natural selection.",
                difficulty_tier: 3
            }
        ]
    },
    {
        title: "Ecology",
        description: "The branch of biology that deals with the relations of organisms to one another and to their physical surroundings.",
        concept_content: "Ecology is the study of the relationships between living organisms, including humans, and their physical environment. Ecology considers organisms at the individual, population, community, ecosystem, and biosphere level. Ecology overlaps with the closely related sciences of biogeography, evolutionary biology, genetics, ethology and natural history.",
        difficulty_tier: 2,
        children: [
            {
                title: "Ecosystems",
                description: "A community of living organisms in conjunction with the nonliving components of their environment.",
                concept_content: "An ecosystem (or ecological system) is a community of living organisms in conjunction with the nonliving components of their environment, interacting as a system. These biotic and abiotic components are linked together through nutrient cycles and energy flows. Energy enters the system through photosynthesis and is incorporated into plant tissue.",
                difficulty_tier: 3
            },
            {
                title: "Biodiversity",
                description: "The variety and variability of life on Earth.",
                concept_content: "Biodiversity is the variety and variability of life on Earth. Biodiversity is typically a measure of variation at the genetic, species, and ecosystem level. Terrestrial biodiversity is usually greater near the equator, which is the result of the warm climate and high primary productivity.",
                difficulty_tier: 3
            }
        ]
    },
    {
        title: "Microbiology",
        description: "The study of microscopic organisms.",
        concept_content: "Microbiology is the study of microscopic organisms, such as bacteria, viruses, archaea, fungi and protozoa. This discipline includes fundamental research on the biochemistry, physiology, cell biology, ecology, evolution and clinical aspects of microorganisms, including the host response to these agents.",
        difficulty_tier: 3,
        children: [
            {
                title: "Bacteria",
                description: "A type of biological cell. They constitute a large domain of prokaryotic microorganisms.",
                concept_content: "Bacteria are a type of biological cell. They constitute a large domain of prokaryotic microorganisms. Typically a few micrometers in length, bacteria have a number of shapes, ranging from spheres to rods and spirals. Bacteria were among the first life forms to appear on Earth, and are present in most of its habitats.",
                difficulty_tier: 3
            },
            {
                title: "Viruses",
                description: "A submicroscopic infectious agent that replicates only inside the living cells of an organism.",
                concept_content: "A virus is a submicroscopic infectious agent that replicates only inside the living cells of an organism. Viruses infect all types of life forms, from animals and plants to microorganisms, including bacteria and archaea. Since Dmitri Ivanovsky's 1892 article describing a non-bacterial pathogen infecting tobacco plants and the discovery of the tobacco mosaic virus by Martinus Beijerinck in 1898, more than 9,000 virus species have been described in detail of the millions of types of viruses in the environment.",
                difficulty_tier: 4
            }
        ]
    },
    {
        title: "Human Anatomy",
        description: "The study of the structure of the human body.",
        concept_content: "Human anatomy is the study of the structure of the human body and is one of the most prominent biological sciences. Anatomy is often split into microscopic anatomy and macroscopic anatomy. Macroscopic anatomy, or gross anatomy, is the examination of an animal's body parts using unaided eyesight. Microscopic anatomy involves the use of optical instruments in the study of the tissues of various structures, known as histology, and also in the study of cells.",
        difficulty_tier: 2,
        children: [
            {
                title: "Nervous System",
                description: "The network of nerve cells and fibers that transmits nerve impulses between parts of the body.",
                concept_content: "The nervous system is a highly complex part of an animal that coordinates its actions and sensory information by transmitting signals to and from different parts of its body. The nervous system detects environmental changes that impact the body, then works in tandem with the endocrine system to respond to such events.",
                difficulty_tier: 4,
                children: [
                    {
                        title: "Neurons",
                        description: "Electrically excitable cells in the nervous system that function to process and transmit information.",
                        concept_content: "A neuron or nerve cell is an electrically excitable cell that communicates with other cells via specialized connections called synapses. It is the main component of nervous tissue in all animals except sponges and placozoa. Plants and fungi do not have nerve cells.",
                        difficulty_tier: 4
                    }
                ]
            },
            {
                title: "Circulatory System",
                description: "The system that circulates blood and lymph through the body.",
                concept_content: "The circulatory system, also called the cardiovascular system or the vascular system, is an organ system that permits blood to circulate and transport nutrients (such as amino acids and electrolytes), oxygen, carbon dioxide, hormones, and blood cells to and from the cells in the body to provide nourishment and help in fighting diseases, stabilize temperature and pH, and maintain homeostasis.",
                difficulty_tier: 3
            }
        ]
    }
]

async function seedNode(node: SeedNode, parentId: string | null = null) {
    console.log(`Creating node: ${node.title}`)

    // 1. Create Node
    const { data: nodeData, error: nodeError } = await supabase
        .from('knowledge_nodes')
        .insert({
            title: node.title,
            description: node.description,
            concept_content: node.concept_content,
            domain: 'biology',
            difficulty_tier: node.difficulty_tier,
            parent_node_id: parentId
        })
        .select()
        .single()

    if (nodeError) {
        console.error(`Error creating node ${node.title}:`, nodeError)
        return
    }

    const nodeId = nodeData.id

    // 2. Create Quest
    const { error: questError } = await supabase
        .from('quests')
        .insert({
            node_id: nodeId,
            quest_type: 'feynman',
            scenario_prompt: `The Guardian of ${node.title} has been corrupted. Explain the concept to restore its memory.`,
            win_condition: { min_score: 8 },
            xp_reward: node.difficulty_tier * 50
        })

    if (questError) {
        console.error(`Error creating quest for ${node.title}:`, questError)
    }

    // 3. Recurse for children
    if (node.children) {
        for (const child of node.children) {
            await seedNode(child, nodeId)
        }
    }

    return nodeId
}

async function seed() {
    console.log('Starting seed...')

    // 1. Seed Nodes recursively
    // We need to wait for the recursive structure.
    // Let's just run the seedNode for top level nodes.
    for (const node of biologyNodes) {
        await seedNode(node, null)
    }

    console.log('Nodes and Quests seeded.')

    // 2. Assign User Progress for Demo User
    // Fetch a user (any user)
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

    if (userError || !users || users.length === 0) {
        console.log('No users found. Skipping user_progress seeding.')
        return
    }

    const userId = users[0].id
    console.log(`Seeding progress for user: ${userId}`)

    // Fetch all created nodes to assign progress
    const { data: allNodes, error: fetchError } = await supabase
        .from('knowledge_nodes')
        .select('id')
        .eq('domain', 'biology')
        .order('created_at', { ascending: true })

    if (fetchError || !allNodes) {
        console.error('Error fetching nodes for progress:', fetchError)
        return
    }

    const nodesToAssign = allNodes.map(n => n.id)

    // First 5: Restored
    for (let i = 0; i < 5 && i < nodesToAssign.length; i++) {
        await supabase.from('user_progress').upsert({
            user_id: userId,
            node_id: nodesToAssign[i],
            status: 'restored',
            mastery_score: Math.floor(Math.random() * (95 - 85 + 1)) + 85,
            attempts: 1,
            last_attempt_at: new Date().toISOString()
        })
    }

    // Next 10: Corrupted
    for (let i = 5; i < 15 && i < nodesToAssign.length; i++) {
        await supabase.from('user_progress').upsert({
            user_id: userId,
            node_id: nodesToAssign[i],
            status: 'corrupted',
            mastery_score: 0,
            attempts: 0
        })
    }

    // Rest: Locked (Default, but we can explicitly set if needed, or just leave them be as they don't exist in user_progress yet)
    // The app treats missing progress as 'locked' usually, or we can insert 'locked'.
    // Let's insert 'locked' for the rest to be explicit if we want them to show up in some queries?
    // Actually, usually we only store progress if it's started. But if we want to show them as locked in a list that joins, we might need them.
    // The ArchivesPage uses a left join or map.
    // Let's leave them empty (implicit locked) or insert 'locked'.
    // The prompt says "Rest: status='locked'". I'll insert them.

    for (let i = 15; i < nodesToAssign.length; i++) {
        await supabase.from('user_progress').upsert({
            user_id: userId,
            node_id: nodesToAssign[i],
            status: 'locked',
            mastery_score: 0,
            attempts: 0
        })
    }

    console.log('User progress seeded.')
}

seed()
    .then(() => {
        console.log('Seeding complete.')
        process.exit(0)
    })
    .catch((err) => {
        console.error('Seeding failed:', err)
        process.exit(1)
    })
