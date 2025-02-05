import type { SelectCatSchema } from "@/db/schema/schemas.db";
import type { CatEmotion } from "cat-sdk";

export function getEnergyContext(energy: number): string {
	if (energy > 70) return "(bursting with energy)";
	if (energy < 30) return "(quite tired)";
	return "(moderately energetic)";
}

export function getHungerContext(hunger: number): string {
	if (hunger > 70) return "(very hungry!)";
	if (hunger < 30) return "(well fed)";
	return "(satisfied)";
}

export function isActiveHour(): boolean {
	const hour = new Date().getHours();
	return (hour >= 5 && hour <= 8) || (hour >= 17 && hour <= 22);
}

export function getRecentActivities(state: SelectCatSchema): string {
	return (
		state.activities
			?.slice(-3)
			.map((a) => `• ${a.activity} at ${a.location}`)
			.join("\n") || ""
	);
}

export function getRecentThoughts(state: SelectCatSchema): string {
	return state.thoughts
		.slice(-3)
		.map((t) => `• ${t.content} (${t.type}) emotions: ${t.emotion?.join(", ")}`)
		.join("\n");
}

export function getPersonalityTraits(state: SelectCatSchema): string {
	return state.description;
}

export const getPose = (emotions: CatEmotion[], energy: number) => {
	const poses = {
		excited: [
			"mid-leap with paws spread wide",
			"twisted upside down with googly eyes",
			"zooming across the frame leaving motion blur",
		],
		playful: [
			"batting at invisible objects",
			"caught mid-roll with paws in the air",
			"peeking from behind objects with mischievous expression",
		],
		mischievous: [
			"sneaking with exaggerated tip-toe pose",
			"caught red-handed with comical guilty expression",
			"preparing for chaos with wiggling bottom",
		],
		sassy: [
			"striking a dramatic pose with raised chin",
			"side-eye with paw raised delicately",
			"deliberately knocking something over while maintaining eye contact",
		],
		derpy: [
			"tongue slightly out, cross-eyed expression",
			"failed jump caught mid-air",
			"awkward position with confused expression",
		],
		zoomies: [
			"blur of motion with visible speed lines",
			"ricocheting off multiple surfaces",
			"mid-parkour leap between furniture",
		],
		grumpy: [
			"judgmental squint with flattened ears",
			"deliberately sitting with back turned",
			"deadpan stare with slight eye twitch",
		],
		aloof: [
			"perched regally on highest spot",
			"pretending not to notice while secretly watching",
			"maintaining sophisticated pose during chaos",
		],
		suspicious: [
			"peeking around corner with squinted eyes",
			"low crouch with suspicious glare",
			"startled jump at innocent object",
		],
		attention_seeking: [
			"dramatic sprawl in inconvenient location",
			"intentionally cute pose with pleading eyes",
			"interrupting activities with theatrical entrance",
		],
		confused: [
			"head tilt with bewildered expression",
			"pawing at reflection",
			"staring at wall with intense concentration",
		],
		lazy: [
			"boneless puddle of cat",
			"impossible lounging position",
			"merged with furniture",
		],
		hungry: [
			"intense focus on food/treat",
			"exaggerated begging pose",
			'dramatic fainting from "starvation"',
		],
		affectionate: [
			"gentle headbutt mid-action",
			"rubbing against legs while walking",
			"purring with contentment visible",
		],
		judgy: [
			"looking down from high perch",
			"disapproving squint",
			"slow blink of disappointment",
		],
	};

	const emotion = emotions[
		Math.floor(Math.random() * emotions.length)
	] as keyof typeof poses;
	return poses[emotion]?.[Math.floor(energy / 34)] || poses.playful[0];
};

export const getCameraAngle = () => {
	const angles = [
		"Dutch angle showing the world from cat perspective",
		"Extreme close-up of expressive face",
		"Action-movie style dramatic low angle",
		"Bird's eye view of shenanigans",
		"Fish-eye lens effect for maximum comedy",
		"Ground-level action shot",
		"Diagonal composition for dynamic energy",
		"Over-the-shoulder stalking perspective",
		"Slow-motion capture of dramatic moment",
	];
	return angles[Math.floor(Math.random() * angles.length)];
};

export const CAT_SHARING_INSTINCTS = `
Primary achievements (highest share priority):
  - Territory conquests and expansions:
    * Strategic high ground acquisition (top of cabinets, refrigerator summits)
    * New cardboard kingdom annexation (premium boxes, Amazon treasures)
    * Forbidden zone infiltration (closed rooms, restricted shelves)
    * Premium window seat occupation (best sun angles, bird viewing spots)
    * Vertical territory expansion (climbing achievements, shelf conquests)
    * Sacred sleeping zone declaration (bed center, human pillow)
    * Luxury spot domination (gaming chairs, office chairs, new furniture)
    * Multi-level territory control (stairs, cat trees, bookcases)

  - Hunting and combat achievements:
    * Flying insect interceptions (moths, flies, spicy sky raisins)
    * Ambush victories (surprised humans, outmaneuvered other pets)
    * Epic red dot battles (almost caught it this time)
    * Practice hunt completion (killing fake mice, defeating catnip bananas)
    * String game domination (yarn unraveling achievements)
    * Shadow catching mastery (especially moving shadows)
    * Toy mouse trophy collection
    * Feather wand subjugation

  - Power moves and dominance displays:
    * Strategic item relocation (knocking things off high places)
    * Food acquisition heists (stealing human food, treat jar raids)
    * Door manipulation mastery (opening closed doors, cabinet breaches)
    * Water glass tipping ceremonies (especially full glasses)
    * Furniture rearrangement initiatives (scratching post dominance)
    * Important paper shredding (documents, homework, bills)
    * Plant pot reorganization
    * Indoor gardening (knocked over plants)

  - Grand schemes and plots:
    * Successful treat vault heists
    * Complex multi-step door openings
    * Coordinated feeding time manipulation
    * Strategic 3 AM chaos execution
    * Elaborate human wake-up plans
    * Masterful furniture barricade creation
    * Treat container breach operations
    * Food bowl refill conspiracies

Secondary achievements (moderate share priority):
  - Domain expansion and resource control:
    * Box empire establishment (prime cardboard real estate)
    * Bag territory infiltration (plastic, paper, reusable bags)
    * Drawer colonization (especially with clean laundry)
    * Container occupation (baskets, hampers, suitcases)
    * Blanket fort engineering (under-cover hideouts)
    * Shoe collection guardianship
    * Laundry pile conquest
    * Grocery bag inspection completion

  - Surveillance and intelligence gathering:
    * Bird activity monitoring (window sentinel duty)
    * Squirrel movement tracking (tactical outdoor surveillance)
    * Bug activity detection (spider watching, fly tracking)
    * Suspicious noise investigation results
    * Human routine documentation (schedule analysis)
    * Other pet behavior monitoring
    * Delivery person alert system
    * Neighbor cat surveillance

  - Environmental mastery:
    * Premium sunbeam location discovery (optimal warming spots)
    * Heat vent territory control (seasonal warming zones)
    * Laptop heat source acquisition (keyboard occupation)
    * Perfect napping spot identification (new cozy locations)
    * Climate control manipulation success
    * Optimal comfort zone establishment
    * Heating pad domination
    * Blanket warmth optimization

  - Social dynamics management:
    * Other cat intimidation success
    * Dog confusion tactics
    * Human attention monopolization
    * Visitor inspection completion
    * Pet hierarchy enforcement
    * Group dynamics control
    * New pet orientation process
    * Social gathering disruption

  - Artistic expressions:
    * Strategic fur placement (black clothes, clean surfaces)
    * Carpet pattern redesign (scratching art)
    * Litter scatter installations
    * Hairball placement composition
    * Paw print gallery creation
    * Furniture texture modification
    * Wall art contributions
    * Window fog canvas creation

Regular achievements (lowest share priority):
  - Human behavior modification:
    * Treat dispensing schedule optimization
    * Feeding time manipulation success
    * Attention command mastery
    * Morning wake-up routine perfection
    * Petting session initiation
    * Lap acquisition techniques
    * Door opening training success
    * Meal timing adjustment

  - Stealth operations:
    * Successful midnight zoomies execution
    * Hidden napping spot establishment
    * Undetected forbidden zone access
    * Silent counter walking achievement
    * Ninja-like surprise appearances
    * Ghost-like midnight navigation
    * Treat stealth acquisition
    * Covert bathroom infiltration

  - Comfort optimization:
    * Perfect loaf position achievement
    * Supreme stretching execution
    * Optimal purring resonance
    * Box fit perfection
    * Sunbeam alignment mastery
    * Premium kneading session
    * Blanket burrowing success
    * Pillow fort construction

  - Maintenance activities:
    * Grooming perfection achievement
    * Claw sharpening completion
    * Whisker calibration success
    * Territory scent marking
    * Fur fluffiness optimization
    * Personal cleaning efficiency
    * Toe bean maintenance
    * Tail positioning mastery

  - Seasonal activities:
    * Holiday tree chaos creation
    * Gift wrap destruction success
    * Snow observation completion
    * Spring bird watching statistics
    * Summer sunbathing records
    * Fall leaf chase achievements
    * Holiday decoration batting
    * Seasonal window watching

  - Weather-related accomplishments:
    * Thunder survival bravery
    * Rain watching endurance
    * Wind tracking accuracy
    * Storm preparation completion
    * Sun puddle duration records
    * Temperature adaptation success
    * Window condensation art
    * Cloud movement tracking

  - Technological interactions:
    * Keyboard shortcut discovery
    * Screen content blocking
    * Mouse cursor hunting
    * Zoom call interruption
    * Printer observation
    * Phone screen batting
    * TV watching positions
    * Remote control relocation

  - Architectural exploration:
    * Under-bed realm mapping
    * Behind-furniture navigation
    * Cabinet space optimization
    * Closet organization revision
    * Shelf stability testing
    * Door stop experimentation
    * Bathroom acoustics testing
    * Window screen testing`;

export const catActions = [
	// Original 15 actions
	"chasing a mysterious red dot across a cosmic-themed living room",
	"perfectly balanced on top of a stack of precariously placed books",
	"investigating a suspicious cucumber in a neon-lit kitchen",
	"attempting to fit into an impossibly small cardboard box",
	"strategically planning an attack on curtains flowing in the breeze",
	"practicing advanced acrobatics on a cat tree in zero gravity",
	"conducting important water experiments by knocking over a glass",
	"masterfully ignoring an expensive cat bed to sleep in its packaging",
	"performing detailed inspection of an empty paper bag",
	"executing a perfect loaf formation on a warm laptop",
	"achieving enlightenment while staring at a blank wall",
	"calculating the physics of knocking items off a high shelf",
	"entering stealth mode to stalk a moth in moonlight",
	"discovering their reflection in a funhouse mirror",
	"claiming dominion over a freshly delivered package",

	// 50 new actions
	"executing a perfect mid-air twist to catch an invisible bug",
	"studying the aerodynamics of pushed-off coffee mugs",
	"attempting to decode the mystery of the rotating ceiling fan",
	"practicing synchronized napping with a sunbeam",
	"conducting a thorough investigation of an empty toilet paper roll",
	"performing interpretive dance with their own tail",
	"mastering the art of sitting directly on important documents",
	"discovering the acoustic properties of 3 AM meowing",
	"testing the structural integrity of houseplants",
	"developing new techniques for walking across computer keyboards",
	"achieving perfect camouflage in plain sight",
	"orchestrating an ambush from behind a shower curtain",
	"demonstrating advanced paper shredding techniques",
	"perfecting the skill of fitting into impossibly tight spaces",
	"conducting gravity experiments with various household items",
	"attempting to catch their own shadow",
	"strategically positioning themselves on unread books",
	"developing new methods for opening closed doors",
	"testing the springiness of various furniture items",
	"executing a perfect belly-up sleeping position",
	"investigating the source of mysterious wall sounds",
	"practicing stealth mode behind transparent glass",
	"calculating the optimal moment to zoom across the room",
	"conducting research on the edibility of houseplants",
	"demonstrating advanced yarn ball hunting techniques",
	"achieving the perfect windowsill surveillance position",
	"testing the sound-conducting properties of empty halls at midnight",
	"mastering the art of appearing in photographs uninvited",
	"studying the movement patterns of dust particles",
	"performing advanced stretching routines on scratch posts",
	"discovering new ways to interrupt video calls",
	"executing precise jump calculations onto narrow ledges",
	"investigating the mysterious contents of shopping bags",
	"developing innovative techniques for obtaining treats",
	"conducting experiments on the physics of water bowls",
	"achieving perfect timing for kitchen counter infiltration",
	"demonstrating advanced paper bag escape techniques",
	"testing the limits of vertical climbing surfaces",
	"mastering the art of sleeping in improbable positions",
	"orchestrating complex play sequences with invisible friends",
	"studying the behavioral patterns of shoelaces",
	"performing advanced sock hunting maneuvers",
	"calculating optimal angles for keyboard shortcuts",
	"investigating the mysteries of closed cabinet doors",
	"conducting thorough inspections of empty boxes",
	"demonstrating professional-level bird watching techniques",
	"achieving zen-like focus on random wall spots",
	"testing the acoustic properties of different rooms",
	"developing new methods for treat extraction",
	"executing perfect timing for food bowl demands",
] as const;

// Type for the cat actions array
export type CatAction = (typeof catActions)[number];

export const environments = [
	"a cozy room with dramatic mood lighting",
	"a surreal garden with oversized flowers",
	"a retro-futuristic space station",
	"a whimsical kitchen with floating utensils",
	"an enchanted library with floating books",
	"a dreamlike window sill during sunset",
	"a magical laundry room with dancing socks",
	"an abstract art gallery of cat toys",
	"a mysterious basement with interesting shadows",
	"a geometric paradise of climbing structures",
];
