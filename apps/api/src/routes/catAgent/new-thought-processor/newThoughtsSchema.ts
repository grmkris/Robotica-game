import { CatEmotion, ThoughtType } from "cat-sdk";
import { z } from "zod";

// Define possible action types that can result from a thought
export const CAT_THOUGHT_ACTION_TYPES = [
	"RESEARCH",
	"SOCIAL_INSTAGRAM_POST",
	"SOCIAL_TWITTER_POST",
	"SOCIAL_FARCASTER_POST",
	"GIFT_MISHA_TOKEN",
	"SWAP_TOKEN",
	"NONE",
] as const;

export const CatThoughtActionType = z.enum(CAT_THOUGHT_ACTION_TYPES);
export type CatThoughtActionType = z.infer<typeof CatThoughtActionType>;

export const CatThoughtContent = z.object({
	content: z.string().describe("The cat's thought in natural language"),
	emotions: z
		.array(CatEmotion)
		.describe("The emotions associated with this thought"),
	type: ThoughtType.describe("The type/category of the thought"),
});

export type CatThoughtContent = z.infer<typeof CatThoughtContent>;

export const CatThoughtResponseSchema = z
	.object({
		response: z.string().describe("The response to the cat's thought"),
		thinking: z.string().describe("The thinking behind the response"),
		actions: z
			.array(
				z.object({
					actionType: CatThoughtActionType.describe("The action to take"),
					actionDetails: z
						.string()
						.optional()
						.describe("More details about the action to take"),
					trigger: z
						.string()
						.optional()
						.describe("What triggered this thought"),
				}),
			)
			.describe("The actions to take"),
	})
	.describe("The response to the cat's thought");

export type CatThoughtResponseSchema = z.infer<typeof CatThoughtResponseSchema>;
