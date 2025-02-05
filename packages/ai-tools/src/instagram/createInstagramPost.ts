import type { Tool } from "cat-ai";
import type { InstagramClient } from "cat-instagram";
import type { MediaGenClient } from "cat-media-gen";
import { z } from "zod";

export const createInstagramPost = (props: {
	instagramClient: InstagramClient;
	mediaGenClient: MediaGenClient;
}) => {
	return {
		description: "Create an Instagram post",
		parameters: z.object({
			prompt: z.string().describe("The prompt to generate image for the post"),
			caption: z.string().describe("The caption for the post"),
			location: z.string().optional().describe("The location for the post"),
		}),
		execute: async ({ prompt, caption }) => {
			const instagramClient = props.instagramClient;
			const mediaGenClient = props.mediaGenClient;

			const generatedImage = await mediaGenClient.generateImages({
				prompt,
			});

			await instagramClient.post({
				imageUrl: generatedImage[0].imageUrl,
				caption,
			});
		},
	} satisfies Tool;
};
