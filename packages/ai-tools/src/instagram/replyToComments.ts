import type { Tool } from "cat-ai";
import type { InstagramClient } from "cat-instagram";
import { z } from "zod";

export const replyToComments = (props: {
	client: InstagramClient;
}) => {
	return {
		description: "Reply to comments on an Instagram post",
		parameters: z.object({
			replies: z.array(
				z.object({
					postId: z.string().describe("The post id to reply to"),
					commentId: z.string().describe("The comment id to reply to"),
					text: z.string().describe("The reply to the comment"),
				}),
			),
		}),
		execute: async ({ replies }) => {
			await props.client.batchCommentAndLike(replies);
		},
	} satisfies Tool;
};
