import type { InstagramClient } from "cat-instagram";
import type { MediaGenClient } from "cat-media-gen";
import { createInstagramPost } from "./createInstagramPost";
import { replyToComments } from "./replyToComments";

import type { Tool } from "cat-ai";
export const createInstagramTools = (props: {
	instagramClient: InstagramClient;
	mediaGenClient: MediaGenClient;
}) => {
	return {
		createInstagramPost: createInstagramPost(props),
		replyToComments: replyToComments({ client: props.instagramClient }),
	} satisfies Record<string, Tool>;
};
export * from "./createInstagramPost";
export * from "./replyToComments";
