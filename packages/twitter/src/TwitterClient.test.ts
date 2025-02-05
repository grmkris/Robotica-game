import { beforeAll, describe, expect, it } from "bun:test";
import { z } from "zod";
import { createTwitterClient } from "./createTwitterClient";

const TestEnvSchema = z.object({
  TWITTER_USERNAME: z.string(),
  TWITTER_PASSWORD: z.string(),
});

describe("Twitter Client", () => {

  const env = TestEnvSchema.parse(process.env);
  const twitterClient = createTwitterClient({
    username: env.TWITTER_USERNAME,
    password: env.TWITTER_PASSWORD,
  });

  beforeAll(async () => {
    await twitterClient.authenticate();
  });


  it("should create a Twitter client with valid credentials", () => {
    expect(twitterClient).toBeDefined();
    expect(twitterClient.post).toBeDefined();
  });

  it("should throw error with invalid credentials", async () => {
    const client = createTwitterClient({ username: "", password: "" });
    await expect(client.post({ text: "test" })).rejects.toThrow(
      "Invalid Twitter credentials provided"
    );
  });

  it("should successfully post a tweet", async () => {
    const TEST_IMAGE_URL = "https://placehold.co/1080x1080.jpg";

    try {
      const result = await twitterClient.post({
        text: "Test tweet from automated test",
        imageUrl: TEST_IMAGE_URL,
      });

      expect(result.tweetId).toBeDefined();
      expect(result.permalink).toBeDefined();
      expect(result.permalink).toContain("twitter.com/i/web/status/");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Test failed with error:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      } else {
        console.error("Unknown error:", error);
      }
      throw error;
    }
  }, 30000);

  it("should handle batch posting", async () => {
    const TEST_IMAGE_URL = "https://picsum.photos/1080/1080.jpg";
    const results = await twitterClient.batchPost(
      {
        tweets: [
          {
            text: "Batch test 1",
            imageUrl: TEST_IMAGE_URL,
          },
          {
            text: "Batch test 2",
            imageUrl: TEST_IMAGE_URL,
          },
        ],
      },
      30000
    );

    expect(results).toHaveLength(2);
    expect(results[0].tweetId).toBeDefined();
    expect(results[1].tweetId).toBeDefined();
  }, 70000);

  it("should handle image download failure", async () => {
    await expect(
      twitterClient.post({
        text: "Test tweet",
        imageUrl: "https://nonexistent-url.com/image.jpg"
      })
    ).rejects.toThrow();
  });

  describe("Tweet Interaction", () => {
    let testTweetId: string;

    // Create a test tweet to use for interaction tests
    beforeAll(async () => {
      const result = await twitterClient.post({
        text: "Test tweet for interaction tests",
        imageUrl: "https://placehold.co/1080x1080/png",
      });
      testTweetId = result.tweetId;
    });

    it("should fetch a tweet by ID", async () => {
      const tweet = await twitterClient.getTweet(testTweetId);

      expect(tweet).toBeDefined();
      expect(tweet.id).toBe(testTweetId);
      expect(tweet.text).toBeDefined();
    });

    it("should like and retweet a tweet", async () => {

      // Like the tweet
      const likeResult = await twitterClient.likeTweet(testTweetId);
      expect(likeResult).toBeDefined();

      // Retweet the tweet
      const retweetResult = await twitterClient.retweet(testTweetId);
      expect(retweetResult).toBeDefined();
    });
  });

  describe("Profile Interaction", () => {
    it("should fetch a profile by username", async () => {
      const profile = await twitterClient.getProfile("_krisgg");
      expect(profile).toBeDefined();
      expect(profile.username).toBe("_krisgg");
      expect(profile.name).toBeDefined();
      expect(profile.isBlueVerified).toBeDefined();
      expect(profile.location).toBeDefined();
      expect(profile.url).toBeDefined();
      expect(profile.tweetsCount).toBeDefined();
      expect(profile.followersCount).toBeDefined();
      expect(profile.followingCount).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid tweet ID", async () => {
      await expect(twitterClient.getTweet("invalid-id")).rejects.toThrow();
    });

    it("should handle invalid username for user tweets", async () => {
      await expect(
        twitterClient.getUserTweets("thisuserdoesnotexist12345678990")
      ).rejects.toThrow();
    });
  });
});
