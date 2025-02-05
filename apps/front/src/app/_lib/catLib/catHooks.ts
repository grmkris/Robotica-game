import {
  buyItem,
  getAllItems,
  getCatInteractions,
  getCatState,
  getCats,
  getMishaLeaderboard,
  getUserCatState,
  getUserItems,
  interactWithCat,
  listAllCats,
} from "@/app/_lib/catLib/CatActions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CatId,
  InteractionType,
  ItemId,
  UserId,
  UserItemId,
} from "cat-sdk";

export const useCatState = (catId?: CatId) => {
  return useQuery({
    queryKey: ["catState", catId],
    queryFn: () => {
      if (!catId) throw new Error("Cat ID is required");
      return getCatState(catId);
    },
    enabled: !!catId,
    refetchInterval: 2000,
  });
};

export const useInteractWithCat = (catId: CatId) => {
  const queryClient = useQueryClient();
  return useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catState", catId] });
      queryClient.invalidateQueries({
        queryKey: ["catInteractions", { catId }],
      });
    },
    mutationFn: (props: {
      type: InteractionType;
      input?: string;
      userItemId?: UserItemId;
    }) =>
      interactWithCat({
        catId,
        type: props.type,
        input: props.input,
        userItemId: props.userItemId,
      }),
  });
};

export const useUserCatState = (catId: CatId) => {
  return useQuery({
    queryKey: ["userCatState", catId],
    queryFn: () => getUserCatState(catId),
  });
};

export const useListAllCats = () => {
  return useQuery({
    queryKey: ["allCats"],
    queryFn: listAllCats,
  });
};

export const useGetAllItems = () => {
  return useQuery({
    queryKey: ["allItems"],
    queryFn: getAllItems,
  });
};

export const useBuyItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: ItemId; quantity: number }) =>
      buyItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userItems"] });
    },
  });
};

export const useGetUserItems = () => {
  return useQuery({
    queryKey: ["userItems"],
    queryFn: getUserItems,
  });
};

export const useGetCats = () => {
  return useQuery({
    queryKey: ["cats"],
    queryFn: getCats,
  });
};

export const useIsAIResponding = () => {
  const cats = useGetCats();
  const { data: interactionsData, isLoading: isLoadingInteractions } =
    useCatInteractions({
      catId: cats.data?.[0]?.id,
      page: 1,
      pageSize: 1,
    });
  const latestInteraction = interactionsData?.interactions?.[0];
  const isThinking =
    latestInteraction?.status === "PROCESSING" ||
    latestInteraction?.status === "PENDING";
  console.log("isThinking", { isThinking, latestInteraction });
  return isThinking;
};

export const useCatInteractions = (params: {
  catId?: CatId;
  page?: number;
  pageSize?: number;
  userId?: UserId;
}) => {
  return useQuery({
    enabled: !!params.catId,
    refetchInterval: 1000,
    queryKey: ["catInteractions", params],
    queryFn: () => {
      const catId = params.catId as CatId;
      if (!catId) throw new Error("Cat ID is required");
      return getCatInteractions({ catId, ...params });
    },
  });
};

export const useMishaLeaderboard = (params: { catId?: CatId }) => {
  return useQuery({
    enabled: !!params.catId,
    queryKey: ["mishaLeaderboard", params],
    queryFn: () => {
      if (!params.catId) throw new Error("Cat ID is required");
      return getMishaLeaderboard({ catId: params.catId });
    },
    refetchInterval: 60 * 1000,
  });
};
