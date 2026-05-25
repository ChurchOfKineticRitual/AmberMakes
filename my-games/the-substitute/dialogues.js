// ===== THE SUBSTITUTE — Writing =====
// Edit text freely here. Engine code lives in game.js.
//
// Beat formats:
//   { speaker: 'michael', text: '...' }       — a line of dialogue
//   { speaker: 'narration', text: '...' }     — narrator voice
//   { choice: { prompt: '...', options: [    — a branching choice
//        { label: '...', stat: 'rapport', delta: 1 },
//        ...
//   ]}}
//   { setFlag: 'name', value: true }          — set a game flag

const DIALOGUES = {

    day1: {

        morning: [
            { speaker: 'narration', text: "Monday. 7:48 AM." },
            { speaker: 'narration', text: "You park behind the bins because every other space says STAFF, and your contract is for two weeks." },
            { speaker: 'narration', text: "St Aldhelm's Secondary School. Year 10 English. The previous teacher has been on personal leave for three weeks." },
            { speaker: 'narration', text: "You have a coffee, a lesson plan, and absolutely no idea what's coming." },
            { speaker: 'narration', text: "Your first period starts in twenty minutes. How do you want to open?" },
            { choice: {
                prompt: "How do you start the lesson?",
                options: [
                    { label: "Read aloud from the syllabus. Steady ground.", stat: 'rapport', delta: 1 },
                    { label: "Hand out a poem. Ask what they notice.", stat: 'curiosity', delta: 1 },
                    { label: "Take the register slowly. Learn their names.", stat: 'discretion', delta: 1 }
                ]
            }}
        ],

        classroom: [
            { speaker: 'narration', text: "Year 10. Twenty-seven of them." },
            { speaker: 'narration', text: "They watch you the way wild things watch a new shape in their field." },
            { speaker: 'narration', text: "You make it through." },
            { speaker: 'narration', text: "The bell goes. The staff room is down the corridor, second left, past the photocopier that no one knows how to use." }
        ],

        // First meeting in the staff room. One line each.
        staffroom_intros: {
            michael: [
                { speaker: 'michael', text: "Right. Substitute, yes? Michael Jamey — deputy head." },
                { speaker: 'michael', text: "The kettle's on. Help yourself. Try not to mention Ms Harlow in front of the Year 10s." },
                { speaker: 'michael', text: "Right. Sorry. Welcome." }
            ],
            loala: [
                { speaker: 'loala', text: "FeldLinn. PE." },
                { speaker: 'loala', text: "Don't try and remember it. Everyone just says Coach." }
            ],
            nathan: [
                { speaker: 'nathan', text: "Nathan. Science." },
                { speaker: 'nathan', text: "Welcome. Genuinely. It's been — well. Welcome." }
            ],
            ronny: [
                { speaker: 'ronny', text: "Door wedges go in the cupboard." },
                { speaker: 'ronny', text: "Not on the floor. Not on the chair. The cupboard." }
            ],
            penny: [
                { speaker: 'penny', text: "Oh — hi! Penny. Literacy." },
                { speaker: 'penny', text: "Have you met everyone? I was just — sorry, never mind." },
                { speaker: 'penny', text: "Have a biscuit. They're the boring ones but they're free." }
            ],
            calder: [
                { speaker: 'narration', text: "A man you hadn't noticed gives a small polite smile and looks back at his mug." },
                { speaker: 'narration', text: "By the time you look away you have already forgotten his face." }
            ]
        },

        // Mandatory lunchtime beat — Michael shows you round.
        lunch_michael: [
            { speaker: 'narration', text: "Lunchtime. Michael walks you round the staff room with the brisk energy of a man who would rather be doing anything else." },
            { speaker: 'michael', text: "Pigeonholes. Pinboard. Milk's in the door of the fridge — second shelf, never the top, the top is Ronny's and he will know." },
            { speaker: 'michael', text: "Mugs. Don't use the one with the chip on the rim. That's — " },
            { speaker: 'michael', text: "That's Eleanor's." },
            { speaker: 'narration', text: "He moves on quickly. The kettle clicks off behind him." },
            { speaker: 'michael', text: "Anyway. The Year 10s have a mock in three weeks. Marking schedule's in your pigeonhole. Any questions, find me." },
            { speaker: 'narration', text: "He is gone before you can ask one." }
        ],

        afternoon: [
            { speaker: 'narration', text: "Afternoon. Year 9, then a free period, then Year 10 again." },
            { speaker: 'narration', text: "The Year 9s ask if you're nicer than Mr. Jamey. You say nothing committal." },
            { speaker: 'narration', text: "By 3:30 the corridors are loud, then quiet, then the only sound is a tap running somewhere far down the building." },
            { speaker: 'narration', text: "Someone is still here. Who do you want to find?" }
        ],

        afterschool: {
            michael: [
                { speaker: 'narration', text: "Michael's still at his desk. He glances up, almost surprised you came back." },
                { speaker: 'michael', text: "Settling in?" },
                { speaker: 'michael', text: "You'll get the rhythm. Two weeks goes fast." },
                { speaker: 'michael', text: "...I'd walk you to the gate but I've got — I've got a thing. Sorry. Tomorrow." },
                { speaker: 'narration', text: "He doesn't have a thing. You both know it. You leave him to it." }
            ],
            loala: [
                { speaker: 'narration', text: "Coach is on the field, packing cones into a net bag with the precision of someone who has done it a thousand times." },
                { speaker: 'loala', text: "You run?" },
                { speaker: 'loala', text: "Doesn't matter. Most of the staff don't. Eleanor did. Used to come with me Tuesday mornings." },
                { speaker: 'narration', text: "She stops. Bags a cone harder than she needs to." },
                { speaker: 'loala', text: "Anyway. See you tomorrow, sub." }
            ],
            nathan: [
                { speaker: 'narration', text: "The science prep room smells of methylated spirits and tea." },
                { speaker: 'narration', text: "Nathan is looking at a stack of brown manila folders he is not pretending to file." },
                { speaker: 'nathan', text: "Oh — hello. Sorry. Mess." },
                { speaker: 'nathan', text: "It's good of you to come. People don't, usually. I'm not — terribly conversational this term." },
                { speaker: 'nathan', text: "Eleanor was my friend. Since we were eleven." },
                { speaker: 'narration', text: "He stops. Closes the top folder. You don't see the name on it." }
            ],
            ronny: [
                { speaker: 'narration', text: "Ronny is mopping the maths corridor. He sees you coming and turns the mop slightly to block the wet bit." },
                { speaker: 'ronny', text: "Floor's wet." },
                { speaker: 'ronny', text: "Go round." },
                { speaker: 'narration', text: "You go round." }
            ],
            penny: [
                { speaker: 'narration', text: "Penny's already gone. She leaves at 3:15 on Mondays — something about her dog." },
                { speaker: 'narration', text: "Her desk is the tidiest in the room except for one slightly-too-thick notebook, closed, dead centre." }
            ]
        },

        dayEnd: [
            { speaker: 'narration', text: "You drive home through villages that don't quite end before the next one starts." },
            { speaker: 'narration', text: "Aldhelm's Cross. Wickham. Nether Stowey. Names that sound older than they are." },
            { speaker: 'narration', text: "Tomorrow: Tuesday." }
        ]
    }
};
