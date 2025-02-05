import { beforeAll, describe, expect, it } from "bun:test";
import {
  type InstagramCredentials,
  createInstagramClient,
} from "./createInstagramClient";

import { z } from "zod";

const TestEnvSchema = z.object({
  IG_USERNAME: z.string(),
  IG_PASSWORD: z.string(),
});

describe("Instagram Client", () => {
  const env = TestEnvSchema.parse(process.env);
  const testCredentials: InstagramCredentials = {
    username: env.IG_USERNAME,
    password: env.IG_PASSWORD,
  };

  it("should create an Instagram client with valid credentials", () => {
    const client = createInstagramClient(testCredentials);
    expect(client).toBeDefined();
    expect(client.post).toBeDefined();
    expect(client.postFromStorage).toBeDefined();
  });

  it("should throw error with invalid credentials", async () => {
    const client = createInstagramClient({ username: "", password: "" });
    await expect(client.post({ imageUrl: "test.jpg" })).rejects.toThrow(
      "Invalid Instagram credentials provided"
    );
  });

  it("should successfully post an image", async () => {
    const client = createInstagramClient(testCredentials);
    const TEST_IMAGE_URL = "https://placehold.co/1080x1080.jpg";

    try {
      const result = await client.post({
        imageUrl: TEST_IMAGE_URL,
        caption: "Test caption from automated test",
        location: {
          name: "New York City",
        },
      });

      expect(result.postId).toBeDefined();
      expect(result.mediaId).toBeDefined();
      expect(result.permalink).toBeDefined();
      expect(result.permalink).toContain("instagram.com/p/");
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

  it("should post with location data", async () => {
    const client = createInstagramClient(testCredentials);
    const TEST_IMAGE_URL = "https://picsum.photos/1080/1080.jpg";
    const result = await client.post({
      imageUrl: TEST_IMAGE_URL,
      caption: "Test with location from automated test",
      location: {
        name: "New York City",
        lat: 40.7128,
        lng: -74.006,
      },
    });

    expect(result.postId).toBeDefined();
    expect(result.mediaId).toBeDefined();
  }, 10000);

  it("should handle batch posting", async () => {
    const client = createInstagramClient(testCredentials);
    const TEST_IMAGE_URL = "https://picsum.photos/1080/1080.jpg";
    const results = await client.batchPost(
      {
        images: [
          {
            imageUrl: TEST_IMAGE_URL,
            caption: "Batch test 1",
          },
          {
            imageUrl: TEST_IMAGE_URL,
            caption: "Batch test 2",
          },
        ],
      },
      30000
    );

    expect(results).toHaveLength(2);
    expect(results[0].postId).toBeDefined();
    expect(results[1].postId).toBeDefined();
  }, 70000);

  it("should handle image download failure", async () => {
    const client = createInstagramClient(testCredentials);
    await expect(
      client.post({ imageUrl: "https://nonexistent-url.com/image.jpg" })
    ).rejects.toThrow();
  });

  describe("Post Interaction", () => {
    let testPostId: string;

    // Create a test post to use for interaction tests
    beforeAll(async () => {
      const client = createInstagramClient(testCredentials);
      const result = await client.post({
        imageUrl: "https://placehold.co/1080x1080/png",
        caption: "Test post for interaction tests",
      });
      testPostId = result.mediaId;
    });

    it("should fetch a post by ID", async () => {
      const client = createInstagramClient(testCredentials);
      const post = await client.getPost(testPostId);

      expect(post).toBeDefined();
      expect(post.id).toBe(testPostId);
      expect(post.caption).toBeDefined();
    });

    it("should fetch a post by URL", async () => {
      const client = createInstagramClient(testCredentials);
      const postUrl = `https://www.instagram.com/p/${testPostId}/`;
      const post = await client.getPostByUrl(postUrl);

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.code).toBeDefined();
      expect(post.user).toBeDefined();
    });

    it("should like and unlike a post", async () => {
      const client = createInstagramClient(testCredentials);

      // Like the post
      const likeResult = await client.likePost(testPostId);
      expect(likeResult).toBe(true);

      // Unlike the post
      const unlikeResult = await client.unlikePost(testPostId);
      expect(unlikeResult).toBe(true);
    });

    it("should add a comment to a post", async () => {
      const client = createInstagramClient(testCredentials);
      const comment = await client.addComment(
        testPostId,
        "Test comment from automated test"
      );

      expect(comment).toBeDefined();
      expect(comment.text).toBe("Test comment from automated test");
      expect(comment.pk).toBeDefined();
    });

    it("should fetch comments from a post", async () => {
      const client = createInstagramClient(testCredentials);
      const comments = await client.getPostComments(testPostId, 5);

      expect(Array.isArray(comments)).toBe(true);
      expect(comments.length).toBeLessThanOrEqual(5);

      if (comments.length > 0) {
        expect(comments[0]).toHaveProperty("text");
        expect(comments[0]).toHaveProperty("user");
      }
    });
  });

  describe("User Posts", () => {
    it("should fetch user posts", async () => {
      const client = createInstagramClient(testCredentials);
      const posts = await client.getUserPosts(env.IG_USERNAME, { limit: 3 });

      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeLessThanOrEqual(3);

      if (posts.length > 0) {
        expect(posts[0]).toHaveProperty("id");
        expect(posts[0]).toHaveProperty("code");
        expect(posts[0]).toHaveProperty("user");
      }
    });

    it("should fetch posts before a specific post", async () => {
      const client = createInstagramClient(testCredentials);

      // First get some posts
      const initialPosts = await client.getUserPosts(env.IG_USERNAME, {
        limit: 2,
      });
      expect(initialPosts.length).toBeGreaterThan(0);

      // Then get posts before the last post
      const beforePostId = initialPosts[0].id;
      const olderPosts = await client.getUserPosts(env.IG_USERNAME, {
        limit: 2,
        before: beforePostId,
      });

      expect(Array.isArray(olderPosts)).toBe(true);
      if (olderPosts.length > 0) {
        expect(olderPosts[0].id).not.toBe(beforePostId);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid post ID", async () => {
      const client = createInstagramClient(testCredentials);
      await expect(client.getPost("invalid-id")).rejects.toThrow();
    });

    it("should handle invalid post URL", async () => {
      const client = createInstagramClient(testCredentials);
      await expect(
        client.getPostByUrl("https://instagram.com/invalid")
      ).rejects.toThrow();
    });

    it("should handle invalid username for user posts", async () => {
      const client = createInstagramClient(testCredentials);
      await expect(
        client.getUserPosts("thisuserdoesnotexist12345678990")
      ).rejects.toThrow();
    });
  });
});
