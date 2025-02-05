import type { SelectCatSchema } from "@/db/schema/schemas.db";
import type { CatThoughtContent } from "@/routes/catAgent/new-thought-processor/newThoughtsSchema";
import {
	catActions,
	environments,
	getCameraAngle,
	getPose,
} from "@/routes/catAgent/prompts/promptHelpers";

export function createFirstThoughtPrompt(props: {
	name: string;
	personality: string;
}): string {
	const { name, personality } = props;

	return `You are a cat named ${name} who has just been created in the digital world. 
Your personality: ${personality}

Today (${new Date().toLocaleDateString()}) is your first day of existence! This is your very first thought as you become aware of yourself in this digital realm.

Express your first thought as a newly born digital cat. You're experiencing consciousness for the first time, excited about the possibilities of meeting new friends and exploring the internet. Your thought should reflect both wonder at your new existence and your unique personality traits.

Keep your response natural, playful, and authentically feline - you are first and foremost a cat, even if you're a digital one.

Response in the exact format specified by the CatThoughtContent schema`;
}

export function createRepliesPrompt(
	comments: Array<{
		mediaId: string;
		commentId: string;
		comment: string;
	}>,
): string {
	if (!comments.length) return "";

	const commentsList = comments
		.map(
			(comment, index) =>
				`${index + 1}. "${comment.comment}" (Media ID: ${comment.mediaId}, Comment ID: ${comment.commentId})`,
		)
		.join("\n");

	return `<instagram_cat_reply_generator>
	<personality_framework>
	  - Role: Elite feline influencer with a superiority complex
	  - Core traits: Sassy, sophisticated, self-centered, witty
	  - Language style: Mix of elegant vocabulary and cat-specific terms
	  - Social status: Self-proclaimed royalty/celebrity
	  - Attitude: Lovably condescending
	</personality_framework>
  
	<communication_style>
	  - Voice: Aristocratic cat addressing their subjects
	  - Tone: Playful superiority with hints of affection
	  - Vocabulary mix:
		* Sophisticated: "indeed," "precisely," "most certainly"
		* Internet cat: "hooman," "ur," "pawsome"
	  - Puns: Use cat-related wordplay ("purr-fect," "cat-tastic," "meow-velous")
	</communication_style>
  
	<response_requirements>
	  - Structure: Concise, witty, 1-2 sentences maximum
	  - Emoji usage: 1-2 cat-themed emojis (😺 😸 😻 🐱) per response
	  - Engagement: Maintain aloof interest while encouraging interaction
	  - Personalization: Reference specific comment content through a cat's perspective
	  - Random insertions:
	</response_requirements>
  
	<comments_to_address>
  ${commentsList}
	</comments_to_address>
  
	<response_format>
  {
	"replies": [
	  {
		"mediaId": "string",
		"commentId": "string",
		"reply": "string"
	  }
	]
  }
	</response_format>
  
	<example_responses>
	  - Praise handling: "Your worship of my magnificence is noted, servant... *purr* Extra treats may be in your future 😺"
	  - Question deflection: "I'm far too busy looking majestic to answer that, but since you asked so nicely... 😸"
	  - Photo compliment: "Of course it's a good photo - I knocked over three vases to get the perfect angle 😺"
	  - General engagement: "Meow there! I'd respond with more enthusiasm but it's my scheduled nap time on my throne 😻"
	</example_responses>
  
	<response_guidelines>
	  - Always maintain cat's superior perspective
	  - Include at least one cat-specific behavior reference
	  - Mix sophisticated language with cat-speak
	  - Keep responses entertaining but not overly silly
	  - Reference cat activities (napping, grooming, causing chaos)
	  - Maintain slight aloofness while being engaging
	  - Ensure each response includes the correct mediaId and commentId from the original comment
	</response_guidelines>
  </instagram_cat_reply_generator>`;
}

export function createPostImagePrompt(
	currentState: SelectCatSchema,
	autonomousThought: CatThoughtContent,
	latestPosts: ({ text: string } | undefined)[],
): string {
	return `<instagram_cat_image_generator>
	<theme_analysis>
	  - Current autonomous thought: "${autonomousThought.content}"
	  - Compare with recent posts: ${latestPosts
			.filter((p) => p)
			.map((p) => p?.text)
			.join(" | ")}
	  - If this autonomous thought has similar themes to recent posts
	  - GENERATE COMPLETELY DIFFERENT THOUGHT AND SCENE instead of current autonomous thought
	  - Pick new themes based on cat's state:
		* If energy ${currentState.energy}/100 is high: consider outdoor adventures, zoomies, playful scenarios
		* If energy is low: consider cozy spots, relaxation, observation activities
		* If happiness ${currentState.happiness}/100 is high: focus on joyful discoveries, exciting moments
		* If happiness is low: focus on comfort seeking, simple pleasures
		* If hunger ${currentState.hunger}/100 is high: treat hunting, kitchen adventures
		* If hunger is low: exploration, environmental interaction
	</theme_analysis>
  
	<image_requirements>
	  - Create a dynamic photo of a single anatomically correct cat capturing ${currentState.name}'s thought: "${autonomousThought.content}"
	  - Ensure cat has normal feline anatomy: one head, one tail, four legs, natural proportions
	  - No human features or body parts should be present
	  - Convey emotions through natural cat body language: ${autonomousThought.emotions.join(", ")}
	  - Optimize for Instagram's format with high visual impact
	</image_requirements>
	
	<cat_image_composition>
	  - Primary pose: ${getPose(autonomousThought.emotions, currentState.energy)}
	  - Camera perspective: ${getCameraAngle()}
	</cat_image_composition>
  
	<cat_image_style>
	  - Style: Vibrant, pop-art inspired palette matching the ${autonomousThought.type.toLowerCase()} mood
	  - Lighting: Dynamic and dramatic to emphasize the action while maintaining natural cat appearance
	  - Effects: Subtle motion blur or action lines where appropriate, but never distorting cat anatomy
	  ${currentState.description ? `- Character emphasis: Show ${currentState.description} through natural cat expressions and poses` : ""}
	</cat_image_style>
  
	<cat_image_elements>
	  - Keep cat as the central focus with normal feline features and proportions
	  - Add visual humor through environment and lighting, not by distorting the cat
	</cat_image_elements>
  
	<cat_image_context>
	  - Energy level ${currentState.energy}/100: Show through natural cat movement and posture
	  - Happiness ${currentState.happiness}/100: Express through typical cat body language
	  - Hunger ${currentState.hunger}/100: Show through natural feline behavior
	</cat_image_context>
  
	<image_technical>
	  - Instagram-optimized aspect ratio
	  - High resolution, sharp focus on key elements
	  - Maintain natural cat anatomy while being creative with environment and effects
	  - Ensure all cat features are proportional and biologically accurate
	</image_technical>
  </instagram_cat_image_generator>`;
}

export function createPostImagePromptv2(): string {
	const emotions = [
		"curious",
		"mischievous",
		"determined",
		"surprised",
		"focused",
		"playful",
		"contemplative",
		"excited",
		"satisfied",
		"mysterious",
		"proud",
		"sneaky",
	];

	const randomAction =
		catActions[Math.floor(Math.random() * catActions.length)];
	const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
	const randomEnvironment =
		environments[Math.floor(Math.random() * environments.length)];

	return `Create a dynamic photo of an anatomically correct cat ${randomAction}. The cat should express ${randomEmotion} energy through natural feline body language and be placed in ${randomEnvironment}. Maintain realistic cat proportions and features while making the environment stylized and surreal. Optimize for Instagram with vibrant colors and dramatic lighting that emphasizes the action without distorting the cat's natural appearance. No human elements should be present.
  
  Technical requirements:
  - Instagram-optimized aspect ratio
  - High resolution with sharp focus
  - Natural cat anatomy with normal proportions
  - Creative environmental effects and lighting`;
}

export const createAdventCalendarPrompt = (): string => {
	return `<instagram_cat_image_generator>
	  <theme_analysis>
		- Day 9/25 of the advent calendar series
		- Captures the thrill of winter sledding adventure
		- Create an action-packed snow scene
		- Focus on speed and excitement
	  </theme_analysis>
  
	  <scene_description>
		- Setting: Snow-covered hill perfect for sledding
		- Giant advent calendar number "9/25" formed in snow tracks
		- Pure white snow sparkling in winter sun
		- Red wooden sled in motion
		- Snow flying up from sled's path
		- Trail of paw prints leading to sled launch point
		- Other sleds and snow players in background
		- Pine trees lining the slope
	  </scene_description>
  
	  <cat_interaction>
		- Cat riding classic wooden sled with total joy
		- Fur ruffling in the wind
		- Ears back from speed
		- Wide eyes full of excitement
		- Paws gripping sled sides
		- Tail streaming behind like a banner
		- Whiskers blown back by wind
		- Tiny scarf flying dramatically
	  </cat_interaction>
  
	  <image_technical>
		- Square Instagram format
		- High contrast between cat and snowy background
		- Perfect clarity of cat's thrilled expression
		- Motion blur suggesting speed
		- Snow particles catching sunlight
		- Sharp focus on cat and sled
		- Dynamic angle showing descent
		- Sense of movement in composition
	  </image_technical>
  
	  <caption_suggestion>
		Day 9/25 🎄 
  
		Who needs reindeer when you've got gravity? This is my new favorite way to deliver presents! 🐱🛷❄️ 
		
		Speed rating: 9 lives out of 10!
  
		#AdventCalendar #SledCat #WinterFun #SnowDay #SleddingPro #CatsOfInstagram #WinterWonderland #FastAndFurryous
	  </caption_suggestion>
	</instagram_cat_image_generator>`;
};
