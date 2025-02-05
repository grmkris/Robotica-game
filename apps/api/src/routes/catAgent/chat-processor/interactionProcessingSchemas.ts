import { CatActivity } from "cat-sdk";

import { CatSpot, InteractionType } from "cat-sdk";

import { CatEmotion } from "cat-sdk";

import { z } from "zod";

export const Integer = z.number().int();
export const IntegerRange = Integer.min(-20).max(20);

export const INPUT_VALIDATION_STATUS = [
	"VALID",
	"INVALID",
	"NOT_CHECKED",
	"FLAGGED",
	"INTERACTION_TYPE_MISMATCH",
] as const;
export const InputValidationStatus = z
	.enum(INPUT_VALIDATION_STATUS)
	.describe(
		"The validation status of the input, INTERACTION_TYPE_MISMATCH indicates the declared type doesn't match detected type, FLAGGED indicates the input is inappropriate or harmful, NOT_CHECKED indicates the input was not checked because it was filtered out",
	);
export type InputValidationStatus = z.infer<typeof InputValidationStatus>;

/**
 * Step 1: Input Analysis Schema
 */
export const InteractionAnalysisSchema = z.object({
	validation: z.object({
		interactionType: z.object({
			primary: InteractionType,
			confidence: z.number().min(0).max(1),
		}),
		userMood: z.string().describe("The mood of the user"),
		status: InputValidationStatus.describe(
			"The validation status of the input",
		),
		reason: z.string().describe("The reason for the validation status"),
	}),
	thoughtProcess: z.string().describe("Cats thought process about the input"),
});

export type InteractionAnalysisSchema = z.infer<
	typeof InteractionAnalysisSchema
>;

/**
 * Step2: Memory extraction schema
 *
 */
export const MemoryExtractionSchema = z.object({
	relevantMemories: z.array(
		z.object({
			text: z.string(),
			emotions: z.array(CatEmotion),
			relevance: z.number(),
			trigger: z.string(),
		}),
	),
	analysis: z.object({
		dominantEmotion: CatEmotion,
		relevanceToCurrentSituation: z.string(),
		behavioralInfluence: z.string(),
	}),
});
export type MemoryExtractionSchema = z.infer<typeof MemoryExtractionSchema>;

/**
 * Step 2: Response Planning Schema
 */
export const ResponsePlanSchema = z.object({
	response: z.string(),
	stateChange: z.object({
		newMemory: z.string(),
		newActivity: CatActivity.optional(),
		newLocation: CatSpot.optional(),
		hungerDelta: IntegerRange.default(0).describe(
			"The change in the cat's hunger state. Cat maximum hunger is 100, minimum is 0",
		),
		happinessDelta: IntegerRange.default(0).describe(
			"The change in the cat's happiness state. Cat maximum happiness is 100, minimum is 0",
		),
		energyDelta: IntegerRange.default(0).describe(
			"The change in the cat's energy state. Cat maximum energy is 100, minimum is 0",
		),
		userAffectionDelta: IntegerRange.default(0).describe(
			"The change in the cat's user affection state. Cat affection has no minimum or maximum, it can go up or down depending on the interaction",
		),
		emotionalState: CatEmotion.array().min(1).max(5),
	}),
});

export type ResponsePlanSchema = z.infer<typeof ResponsePlanSchema>;

/**
 * Final Combined Response Schema
 */
export const CatResponse = z.object({
	hungerDelta: IntegerRange.default(0),
	happinessDelta: IntegerRange.default(0),
	energyDelta: IntegerRange.default(0),
	userAffectionDelta: IntegerRange.default(0),
	newThought: z.string().optional(),
	newMemory: z.string().optional(),
	newActivity: CatActivity.optional(),
	newLocation: CatSpot.optional(),
	response: z.string(),
	thoughtProcess: z.string(),
	emotionalState: CatEmotion.array().min(1).max(5),
});

export type CatResponse = z.infer<typeof CatResponse>;
