import { type Profile, Scraper } from "agent-twitter-client";
import sharp from "sharp";

// Image validation constants
const MIN_IMAGE_SIZE = 320;
const MAX_IMAGE_SIZE = 1440;
const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/gif"];

export interface TwitterCredentials {
  username: string;
  password: string;
}

export interface PostOptions {
  imageUrl?: string;
  text: string;
  quoteTweetId?: string;
}

export interface PostResult {
  tweetId: string;
  permalink: string;
}

export interface BatchPostOptions {
  tweets: Array<{
    text: string;
    imageUrl?: string;
  }>;
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: Date;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  user: {
    id: string;
    username: string;
    name: string;
  };
}

export interface GetTweetsOptions {
  limit?: number;
  before?: string;
}

export interface BatchPostResult {
  tweetId: string;
  permalink?: string;
}

export interface LikeResult {
  success: boolean;
  error?: string;
}

export interface RetweetResult {
  success: boolean;
  error?: string;
}

export interface FollowResult {
  success: boolean;
  error?: string;
}

export const createTwitterClient = (credentials: TwitterCredentials) => {
  const scraper = new Scraper();
  let isAuthenticated = false;

  // Note: This implementation uses basic username/password authentication
  // For production use, consider implementing proper session management
  // and cookie persistence to avoid frequent re-authentication
  const authenticate = async () => {
    const cookies = await scraper.getCookies();
    if (cookies.length > 0) {
      isAuthenticated = true;
      scraper.setCookies(cookies);
      console.log("Authenticated with cookies");
      return;
    }
    console.log("Authenticating with username:", credentials.username);
    await scraper.login(credentials.username, credentials.password);
    isAuthenticated = true;
  };

  const validateCredentials = () => {
    if (!credentials.username || !credentials.password) {
      throw new Error("Invalid Twitter credentials provided");
    }
  };

  const downloadImage = async (imageUrl: string): Promise<Buffer> => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !SUPPORTED_FORMATS.includes(contentType)) {
      throw new Error(
        `Unsupported image format. Must be one of: ${SUPPORTED_FORMATS.join(", ")}`
      );
    }

    return Buffer.from(await response.arrayBuffer());
  };

  const validateImage = async (buffer: Buffer): Promise<void> => {
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
    await authenticate();

    try {
      let mediaData: { data: Buffer; mediaType: string }[] | undefined;
      if (options.imageUrl) {
        const imageBuffer = await downloadImage(options.imageUrl);
        await validateImage(imageBuffer);
        mediaData = [{
          data: imageBuffer,
          mediaType: "image/jpeg" // You might want to detect this from the URL
        }];
      }

      if (options.quoteTweetId) {
        const resultTweet = await scraper.sendQuoteTweet(
          options.text,
          options.quoteTweetId,
          mediaData ? { mediaData } : undefined
        );
        const result = await resultTweet.json();
        const tweetId = result.data?.create_tweet?.tweet_results?.result?.rest_id;
        if (!tweetId) {
          throw new Error("Failed to get tweet ID from response");
        }
        return {
          tweetId,
          permalink: `https://twitter.com/i/web/status/${tweetId}`
        };
      }

      const result = await scraper.sendTweet(options.text, undefined, mediaData);
      const resultJson = await result.json();
      const tweetId = resultJson.data?.create_tweet?.tweet_results?.result?.rest_id;
      if (!tweetId) {
        throw new Error("Failed to get tweet ID from response");
      }
      return {
        tweetId,
        permalink: `https://twitter.com/i/web/status/${tweetId}`
      };

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Twitter post failed: ${error.message}`);
      }
      throw error;
    }
  };

  const batchPost = async (
    options: BatchPostOptions,
    delayMs = 5000
  ): Promise<BatchPostResult[]> => {
    validateCredentials();
    await authenticate();

    const results: BatchPostResult[] = [];

    for (const tweet of options.tweets) {
      try {
        const result = await post(tweet);
        results.push(result);

        // Add delay between posts to avoid rate limits
        if (delayMs > 0 && options.tweets.indexOf(tweet) !== options.tweets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Batch post failed: ${error.message}`);
        }
        throw error;
      }
    }

    return results;
  };

  const getTweet = async (tweetId: string): Promise<Tweet> => {
    validateCredentials();
    await authenticate();

    try {
      const tweet = await scraper.getTweet(tweetId);
      if (!tweet) {
        throw new Error(`Tweet with ID ${tweetId} not found`);
      }
      if (!tweet.id) {
        throw new Error(`Tweet with ID ${tweetId} not found`);
      }
      if (!tweet.text) {
        throw new Error(`Tweet with ID ${tweetId} not found`);
      }

      return {
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.timeParsed || new Date(),
        likeCount: tweet.likes || 0,
        retweetCount: tweet.retweets || 0,
        replyCount: tweet.replies || 0,
        user: {
          id: tweet.userId || '',
          username: tweet.username || '',
          name: tweet.name || ''
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch tweet: ${error.message}`);
      }
      throw error;
    }
  };

  const getUserTweets = async (
    userId: string,
    maxTweets = 100
  ): Promise<Tweet[]> => {
    validateCredentials();
    await authenticate();

    try {
      const tweets: Tweet[] = [];
      const iterator = scraper.getTweetsByUserId(userId, maxTweets);

      for await (const tweet of iterator) {
        tweets.push({
          id: tweet.id || '',
          text: tweet.text || '',
          createdAt: tweet.timeParsed || new Date(),
          likeCount: tweet.likes || 0,
          retweetCount: tweet.retweets || 0,
          replyCount: tweet.replies || 0,
          user: {
            id: tweet.userId || '',
            username: tweet.username || '',
            name: tweet.name || ''
          }
        });
      }

      return tweets;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch user tweets: ${error.message}`);
      }
      throw error;
    }
  };

  const likeTweet = async (tweetId: string): Promise<LikeResult> => {
    validateCredentials();
    await authenticate();

    try {
      await scraper.likeTweet(tweetId);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      throw error;
    }
  };

  const retweet = async (tweetId: string): Promise<RetweetResult> => {
    validateCredentials();
    await authenticate();

    try {
      await scraper.retweet(tweetId);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      throw error;
    }
  };

  const followUser = async (username: string): Promise<FollowResult> => {
    validateCredentials();
    await authenticate();

    try {
      await scraper.followUser(username);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      throw error;
    }
  };

  const getProfile = async (username: string): Promise<Profile> => {
    validateCredentials();
    await authenticate();

    return await scraper.getProfile(username);
  };

  const sendQuoteTweet = async (text: string, quoteTweetId: string) => {
    validateCredentials();
    await authenticate();

    return await scraper.sendQuoteTweet(text, quoteTweetId);
  };

  return {
    post,
    batchPost,
    getTweet,
    getUserTweets,
    likeTweet,
    retweet,
    followUser,
    getProfile,
    authenticate,
    sendQuoteTweet
  };
};

export type TwitterClient = ReturnType<typeof createTwitterClient>;
