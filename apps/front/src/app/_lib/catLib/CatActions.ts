import { apiClient } from "@/lib/apiClient";
import type {
  CatId,
  InteractionType,
  ItemId,
  UserId,
  UserItemId,
} from "cat-sdk";
import type { InferResponseType } from "hono/client";
import { z } from "zod";

export type CatState = InferResponseType<
  (typeof apiClient)["cat-agent"]["get-state"]["$get"],
  200
>;

export const getCatState = async (catId: CatId) => {
  const response = await apiClient["cat-agent"]["get-state"].$get({
    query: { catId },
  });
  if (!response.ok) {
    throw new Error("Failed to get cat state");
  }
  return response.json();
};

export const interactWithCat = async (props: {
  catId: CatId;
  type: InteractionType;
  input?: string;
  userItemId?: UserItemId;
}) => {
  const response = await apiClient["cat-agent"].interact.$post({
    json: {
      catId: props.catId,
      interaction: {
        type: props.type,
        input: props.input,
        userItemId: props.userItemId,
      },
    },
  });

  if (!response.ok) {
    throw new Error("Failed to interact with cat");
  }
  return response.json();
};

export const getUserCatState = async (catId: CatId) => {
  const response = await apiClient["cat-agent"]["get-user-state"].$get({
    query: { catId },
  });
  if (!response.ok) {
    throw new Error("Failed to get user cat state");
  }
  return response.json();
};

export const listAllCats = async () => {
  const response = await apiClient["cat-agent"]["list-all-cats"].$get();
  if (!response.ok) {
    throw new Error("Failed to list all cats");
  }
  return response.json();
};

export const getAllItems = async () => {
  const response = await apiClient["cat-agent"].items.$get();
  if (!response.ok) {
    throw new Error("Failed to get all items");
  }
  return response.json();
};

export const buyItem = async (itemId: ItemId, quantity: number) => {
  console.log("Buying item", itemId, quantity);
  const response = await apiClient["cat-agent"]["buy-item"].$post({
    json: { itemId, quantity },
  });
  if (!response.ok) {
    throw new Error("Failed to buy item");
  }
  return response.json();
};

export const getUserItems = async () => {
  const response = await apiClient["cat-agent"]["user-items"].$get();
  if (!response.ok) {
    throw new Error("Failed to get user items");
  }
  try {
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getCats = async () => {
  const response = await apiClient["cat-agent"]["list-all-cats"].$get();
  if (!response.ok) {
    throw new Error("Failed to get cats");
  }
  return response.json();
};

export const getCatInteractions = async (params: {
  catId: CatId;
  page?: number;
  pageSize?: number;
  userId?: UserId;
}) => {
  const response = await apiClient["cat-agent"].interactions.$get({
    query: {
      catId: params.catId,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      userId: params.userId,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get cat interactions");
  }

  return await response.json();
};

export const getMishaLeaderboard = async (params: { catId: CatId }) => {
  const response = await apiClient["cat-agent"]["misha-leaderboard"].$get({
    query: { catId: params.catId },
  });
  if (!response.ok) {
    throw new Error("Failed to get Misha's leaderboard");
  }

  const schema = z.array(
    z.object({
      userId: z.string(),
      username: z.string(),
      affectionLevel: z.coerce.number(),
      rank: z.coerce.number(),
    }),
  );

  const data = await response.json();
  try {
    return schema.parse(data);
  } catch (error) {
    console.error("Failed to parse Misha's leaderboard response:", error);
    throw new Error("Invalid response format from server");
  }
};

export type ItemResponse = InferResponseType<
  (typeof apiClient)["cat-agent"]["items"]["$get"],
  200
>;

export type UserItemsResponse = InferResponseType<
  (typeof apiClient)["cat-agent"]["user-items"]["$get"],
  200
>;

export type UserItem = UserItemsResponse[number];
