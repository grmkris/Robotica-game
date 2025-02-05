import type { CatImageKey, CatStorageClient } from "cat-storage";
import {
  IgApiClient,
  type MediaInfoResponseItemsItem,
} from "instagram-private-api";
import type { PostingLocation } from "instagram-private-api/dist/types/posting.options";
import sharp from "sharp";

// Add image validation constants
const MIN_IMAGE_SIZE = 320;
const MAX_IMAGE_SIZE = 1440;
const SUPPORTED_FORMATS = ["image/jpeg", "image/png"];

export interface InstagramCredentials {
  username: string;
  password: string;
}

export interface PostOptions {
  imageUrl: string;
  caption?: string;
  location?: {
    name: string;
    lat?: number;
    lng?: number;
    external_id?: string;
    external_id_source?: string;
    address?: string;
  };
}

export interface PostResult {
  postId: string;
  mediaId: string;
  permalink?: string;
}

export interface BatchPostOptions {
  images: Array<{
    imageUrl: string;
    caption?: string;
  }>;
}

// Add new interfaces
export interface Comment {
  pk: string | number;
  text: string;
  created_at: number;
  has_liked_comment?: boolean;
  media_id: string;
  user: {
    pk: string | number;
    username: string;
    full_name: string;
  };
}

export interface Post {
  id: string;
  code: string;
  taken_at: number;
  caption?: {
    text: string;
  };
  like_count: number;
  comment_count: number;
  media_type: number;
  image_versions2?: {
    candidates: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  user: {
    pk: string | number;
    username: string;
    full_name: string;
  };
}

export interface GetPostsOptions {
  limit?: number;
  before?: string; // Get posts before this post ID
}

export const createInstagramClient = (credentials: InstagramCredentials) => {
  const ig = new IgApiClient();
  let isAuthenticated = false;

  const authenticate = async () => {
    if (isAuthenticated) return;

    ig.state.generateDevice(credentials.username);
    //await ig.simulate.preLoginFlow();
    await ig.account.login(credentials.username, credentials.password);
    //await ig.simulate.postLoginFlow();
    isAuthenticated = true;
  };

  const validateCredentials = () => {
    if (!credentials.username || !credentials.password) {
      throw new Error("Invalid Instagram credentials provided");
    }
  };

  const downloadImage = async (imageUrl: string): Promise<Buffer> => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Validate content type
    const contentType = response.headers.get("content-type");
    if (!contentType || !SUPPORTED_FORMATS.includes(contentType)) {
      throw new Error(
        `Unsupported image format. Must be one of: ${SUPPORTED_FORMATS.join(", ")}`
      );
    }

    return Buffer.from(await response.arrayBuffer());
  };

  const validateImage = async (buffer: Buffer): Promise<void> => {
    // You'll need to add the sharp package for this
    try {
      const metadata = await sharp(buffer).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error("Unable to determine image dimensions");
      }

      if (metadata.width < MIN_IMAGE_SIZE || metadata.height < MIN_IMAGE_SIZE) {
        throw new Error(
          `Image dimensions must be at least ${MIN_IMAGE_SIZE}x${MIN_IMAGE_SIZE} pixels`
        );
      }

      if (metadata.width > MAX_IMAGE_SIZE || metadata.height > MAX_IMAGE_SIZE) {
        throw new Error(
          `Image dimensions must not exceed ${MAX_IMAGE_SIZE}x${MAX_IMAGE_SIZE} pixels`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Image validation failed: ${error.message}`);
      }
      throw error;
    }
  };

  const post = async (options: PostOptions): Promise<PostResult> => {
    validateCredentials();
    console.log("Authenticating...");
    await authenticate();
    console.log("Authenticated!");

    try {
      // Download and validate the image
      const imageBuffer = await downloadImage(options.imageUrl);
      await validateImage(imageBuffer);

      // Prepare location if provided
      let mediaLocation: PostingLocation | undefined;
      if (options.location) {
        const locations = await ig.search.location(
          options.location.lat || 0,
          options.location.lng || 0,
          options.location.name
        );
        console.log({
          locations: locations,
        });
        mediaLocation = locations[0];
      }

      console.log({
        mediaLocation: mediaLocation,
        caption: options.caption,
      });

      // Post the image using the example structure
      const publishResult = await ig.publish.photo({
        file: imageBuffer,
        caption: options.caption || "",
        location: mediaLocation,
      });

      if (!publishResult.media) {
        throw new Error("Failed to get media information from publish result");
      }

      return {
        postId: publishResult.media.id,
        mediaId: publishResult.media.id,
        permalink: `https://www.instagram.com/p/${publishResult.media.code}/`,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error({
          msg: "Instagram post failed",
          error: error,
        });
        throw new Error(`Instagram post failed: ${error.message}`);
      }
      throw new Error("Instagram post failed: Unknown error");
    }
  };

  const batchPost = async (
    options: BatchPostOptions,
    delayBetweenPosts = 60000 // Default 1 minute delay between posts
  ): Promise<PostResult[]> => {
    validateCredentials();
    await authenticate();

    const results: PostResult[] = [];

    // Post images sequentially with delay to avoid rate limits
    for (const image of options.images) {
      try {
        const result = await post({
          imageUrl: image.imageUrl,
          caption: image.caption,
        });
        results.push(result);

        if (options.images.indexOf(image) < options.images.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenPosts)
          );
        }
      } catch (error) {
        console.error(`Failed to post image: ${error}`);
        throw error;
      }
    }

    return results;
  };

  const batchCommentAndLike = async (
    comments: Array<{ commentId: string; text: string; postId: string }>,
    delayBetweenComments = 10000
  ): Promise<Comment[]> => {
    validateCredentials();
    await authenticate();

    const results: Comment[] = [];

    for (const { commentId, text, postId } of comments) {
      try {
        // First like the comment
        await ig.media.likeComment(commentId);

        const result = await ig.media.comment({
          mediaId: postId,
          text,
          replyToCommentId: commentId,
        });
        results.push({
          ...result,
          has_liked_comment: true,
          media_id: postId,
        });

        if (
          comments.indexOf({ commentId, text, postId }) <
          comments.length - 1
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenComments)
          );
        }
      } catch (error) {
        console.error(`Failed to post comment: ${error}`);
        throw error;
      }
    }

    return results;
  };

  const postFromStorage = async (
    storage: CatStorageClient,
    key: CatImageKey,
    options: Omit<PostOptions, "imageUrl">
  ): Promise<PostResult> => {
    const imageUrl = await storage.getUploadUrl(key);

    return await post({
      ...options,
      imageUrl,
    });
  };

  const getPost = async (
    mediaId: string
  ): Promise<MediaInfoResponseItemsItem> => {
    validateCredentials();
    await authenticate();

    try {
      const info = await ig.media.info(mediaId);
      return info.items[0];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get post: ${error.message}`);
      }
      throw new Error("Failed to get post: Unknown error");
    }
  };

  const getPostByUrl = async (url: string): Promise<Post> => {
    validateCredentials();
    await authenticate();

    try {
      const shortcode = url.split("/p/")[1]?.split("/")[0];
      if (!shortcode) {
        throw new Error("Invalid Instagram post URL");
      }

      const info = await ig.media.info(shortcode);
      return {
        id: info.items[0].id,
        code: info.items[0].code,
        taken_at: info.items[0].taken_at,
        caption: info.items[0].caption,
        like_count: info.items[0].like_count,
        comment_count: info.items[0].comment_count,
        media_type: info.items[0].media_type,
        image_versions2: info.items[0].image_versions2,
        user: {
          pk: info.items[0].user.pk.toString(),
          username: info.items[0].user.username,
          full_name: info.items[0].user.full_name,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get post by URL: ${error.message}`);
      }
      throw new Error("Failed to get post by URL: Unknown error");
    }
  };

  const getUserPosts = async (
    username: string,
    options: GetPostsOptions = {}
  ): Promise<Post[]> => {
    validateCredentials();
    await authenticate();

    try {
      const user = await ig.user.searchExact(username);
      const feed = ig.feed.user(user.pk);
      const posts: Post[] = [];
      const limit = options.limit || 12;

      while (posts.length < limit) {
        const items = await feed.items();
        if (items.length === 0) break;

        for (const item of items) {
          if (options.before && item.id === options.before) {
            return posts;
          }
          posts.push({
            id: item.id,
            code: item.code,
            taken_at: item.taken_at,
            caption: item.caption ? { text: item.caption.text } : undefined,
            like_count: item.like_count,
            comment_count: item.comment_count,
            media_type: item.media_type,
            image_versions2: item.image_versions2,
            user: {
              pk: item.user.pk.toString(),
              username: item.user.username,
              full_name: item.user.full_name,
            },
          });
          if (posts.length >= limit) {
            return posts;
          }
        }
      }

      return posts;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get user posts: ${error.message}`);
      }
      throw new Error("Failed to get user posts: Unknown error");
    }
  };

  const getPostComments = async (
    mediaId: string,
    limit = 20
  ): Promise<Comment[]> => {
    validateCredentials();
    await authenticate();

    try {
      const feed = ig.feed.mediaComments(mediaId);
      const comments: Comment[] = [];

      do {
        const items = await feed.items();
        if (items.length === 0) break;

        comments.push(
          ...items.map((item) => ({
            ...item,
            media_id: mediaId,
            has_liked_comment: false, // Default value since API doesn't provide this
          }))
        );

        if (comments.length >= limit) {
          return comments.slice(0, limit);
        }
      } while (feed.isMoreAvailable());

      return comments;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get post comments: ${error.message}`);
      }
      throw new Error("Failed to get post comments: Unknown error");
    }
  };

  const likePost = async (mediaId: string): Promise<boolean> => {
    validateCredentials();
    await authenticate();

    try {
      await ig.media.like({
        mediaId,
        moduleInfo: {
          module_name: "feed_timeline",
        },
        d: 0,
      });
      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to like post: ${error.message}`);
      }
      throw new Error("Failed to like post: Unknown error");
    }
  };

  const unlikePost = async (mediaId: string): Promise<boolean> => {
    validateCredentials();
    await authenticate();

    try {
      await ig.media.unlike({
        mediaId,
        moduleInfo: {
          module_name: "feed_timeline",
        },
        d: 0,
      });
      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to unlike post: ${error.message}`);
      }
      throw new Error("Failed to unlike post: Unknown error");
    }
  };

  const addComment = async (
    mediaId: string,
    text: string,
    replyToCommentId?: string
  ): Promise<Comment> => {
    validateCredentials();
    await authenticate();

    try {
      return await ig.media.comment({
        mediaId,
        text,
        replyToCommentId,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to add comment: ${error.message}`);
      }
      throw new Error("Failed to add comment: Unknown error");
    }
  };

  return {
    post,
    postFromStorage,
    getPost,
    getPostByUrl,
    getUserPosts,
    getPostComments,
    likePost,
    unlikePost,
    addComment,
    batchPost,
    batchCommentAndLike,
  };
};

export type InstagramClient = ReturnType<typeof createInstagramClient>;
