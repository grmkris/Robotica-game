import type { Tool } from "cat-ai";
import type { MediaGenClient } from "cat-media-gen";
import type { TwitterClient } from "cat-twitter";
import { z } from "zod";

export const createTweetTool = (props: {
	twitterClient: TwitterClient;
	mediaGenClient: MediaGenClient;
}) => {
	return {
		description: "Create a tweet, optionally with an AI-generated image",
		parameters: z.object({
			text: z.string().describe("The text content of the tweet"),
			generateImage: z
				.boolean()
				.optional()
				.describe("Whether to generate an image for the tweet"),
			imagePrompt: z
				.string()
				.optional()
				.describe("The prompt to generate image for the tweet"),
			quoteTweetId: z
				.string()
				.optional()
				.describe("Optional tweet ID to quote tweet"),
		}),
		execute: async ({ text, generateImage, imagePrompt, quoteTweetId }) => {
			const { twitterClient, mediaGenClient } = props;

			let imageUrl: string | undefined;

			if (generateImage && imagePrompt) {
				const generatedImage = await mediaGenClient.generateImages({
					prompt: imagePrompt,
				});
				imageUrl = generatedImage[0].imageUrl;
			}

			const result = await twitterClient.post({
				text,
				imageUrl,
				quoteTweetId,
			});

			return {
				tweetId: result.tweetId,
				permalink: result.permalink,
			};
		},
	} satisfies Tool;
};

export const getTweetTool = (props: { twitterClient: TwitterClient }) => {
	return {
		description: "Get details of a specific tweet by ID",
		parameters: z.object({
			tweetId: z.string().describe("The ID of the tweet to fetch"),
		}),
		execute: async ({ tweetId }) => {
			const tweet = await props.twitterClient.getTweet(tweetId);
			return tweet;
		},
	} satisfies Tool;
};

export const getUserTweetsTool = (props: { twitterClient: TwitterClient }) => {
	return {
		description: "Get tweets from a specific user",
		parameters: z.object({
			userId: z.string().describe("The ID of the user whose tweets to fetch"),
			maxTweets: z
				.number()
				.optional()
				.describe("Maximum number of tweets to fetch (default: 100)"),
		}),
		execute: async ({ userId, maxTweets }) => {
			const tweets = await props.twitterClient.getUserTweets(userId, maxTweets);
			return tweets;
		},
	} satisfies Tool;
};

export const likeTweetTool = (props: { twitterClient: TwitterClient }) => {
	return {
		description: "Like a specific tweet",
		parameters: z.object({
			tweetId: z.string().describe("The ID of the tweet to like"),
		}),
		execute: async ({ tweetId }) => {
			const result = await props.twitterClient.likeTweet(tweetId);
			return result;
		},
	} satisfies Tool;
};

export const retweetTool = (props: { twitterClient: TwitterClient }) => {
	return {
		description: "Retweet a specific tweet",
		parameters: z.object({
			tweetId: z.string().describe("The ID of the tweet to retweet"),
		}),
		execute: async ({ tweetId }) => {
			const result = await props.twitterClient.retweet(tweetId);
			return result;
		},
	} satisfies Tool;
};

export const followUserTool = (props: { twitterClient: TwitterClient }) => {
	return {
		description: "Follow a specific Twitter user",
		parameters: z.object({
			username: z.string().describe("The username of the account to follow"),
		}),
		execute: async ({ username }) => {
			const result = await props.twitterClient.followUser(username);
			return result;
		},
	} satisfies Tool;
};

export const getProfileTool = (props: { twitterClient: TwitterClient }) => {
	return {
		description: "Get detailed profile information for a Twitter user",
		parameters: z.object({
			username: z
				.string()
				.describe("The username of the account to get info for"),
		}),
		execute: async ({ username }) => {
			const profile = await props.twitterClient.getProfile(username);
			return profile;
		},
	} satisfies Tool;
};

export const quoteTweetTool = (props: { twitterClient: TwitterClient }) => {
	return {
		description: "Quote tweet a specific tweet",
		parameters: z.object({
			text: z.string().describe("The text content of the tweet"),
			quoteTweetId: z.string().describe("The ID of the tweet to quote"),
		}),
		execute: async ({ text, quoteTweetId }) => {
			const result = await props.twitterClient.sendQuoteTweet(
				text,
				quoteTweetId,
			);
			return result;
		},
	} satisfies Tool;
};

// Helper function to create all Twitter tools at once
export const createTwitterTools = (props: {
	twitterClient: TwitterClient;
	mediaGenClient: MediaGenClient;
}): Record<string, Tool> => {
	return {
		createTweet: createTweetTool(props),
		getTweet: getTweetTool(props),
		getUserTweets: getUserTweetsTool(props),
		likeTweet: likeTweetTool(props),
		retweet: retweetTool(props),
		followUser: followUserTool(props),
		getProfile: getProfileTool(props),
		quoteTweet: quoteTweetTool(props),
	};
};
