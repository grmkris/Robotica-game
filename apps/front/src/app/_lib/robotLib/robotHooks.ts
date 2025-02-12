import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BattleId, RobotId } from "robot-sdk";
import {
  createBattle,
  createRobot,
  getBattleById,
  getBattleEvents,
  getUserRobots,
  joinBattle,
  listBattles,
  generateGameSignature,
  generateClaimSignature,
} from "./robotActions";
import { robotClient } from "./robotClient";

export const useCreateRobot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (props: { prompt: string }) =>
      createRobot({ prompt: props.prompt, robotClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRobots"] });
    },
  });
};

export const useCreateBattle = () => {
  return useMutation({
    mutationFn: (props: { robot1Id: RobotId }) =>
      createBattle({ robot1Id: props.robot1Id, robotClient }),
  });
};

export const useJoinBattle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (props: {
      battleId: BattleId;
      gameId: number;
      robotId: RobotId;
    }) =>
      joinBattle({
        battleId: props.battleId,
        gameId: props.gameId,
        robotId: props.robotId,
        robotClient,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["battleStatus", variables.battleId],
      });
    },
  });
};

export const useGetBattleById = (battleId: BattleId | undefined) => {
  return useQuery({
    queryKey: ["battleStatus", battleId],
    queryFn: () => {
      if (!battleId) throw new Error("Battle ID is required");
      return getBattleById({ battleId, robotClient });
    },
    enabled: !!battleId,
    refetchInterval: 1000,
  });
};

export const useGetUserRobots = () => {
  return useQuery({
    queryKey: ["userRobots"],
    queryFn: () => getUserRobots({ robotClient }),
  });
};

export const useGetBattleEvents = (battleId: BattleId | undefined) => {
  return useQuery({
    queryKey: ["battleEvents", battleId],
    queryFn: () => {
      if (!battleId) throw new Error("Battle ID is required");
      return getBattleEvents({ battleId, robotClient });
    },
    enabled: !!battleId,
    refetchInterval: 1000,
  });
};

export const useListBattles = (props: { page?: string; limit?: string }) => {
  return useQuery({
    queryKey: ["battles", props],
    queryFn: () =>
      listBattles({
        page: props.page,
        limit: props.limit,
        robotClient,
      }),
  });
};

export const useGenerateGameSignature = () => {
  return useMutation({
    mutationFn: (props: { gameId: number; userAddress: string }) =>
      generateGameSignature({
        gameId: props.gameId,
        userAddress: props.userAddress,
        robotClient,
      }),
  });
};

export const useGenerateClaimSignature = () => {
  return useMutation({
    mutationFn: (props: {
      gameId: number;
      userAddress: string;
      amount: string;
    }) =>
      generateClaimSignature({
        gameId: props.gameId,
        userAddress: props.userAddress,
        amount: props.amount,
        robotClient,
      }),
  });
};
