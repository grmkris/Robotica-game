/*
createRobotRoute
createBattleRoute
joinBattleRoute
startBattleRoute
getBattleStatusRoute
getUserRobotsRoute
selectRobotRoute
battleEventsRoute
listBattlesRoute
*/

import type { RobotClient } from "./robotClient";

// Update types to match API definitions
type RobotId = `rob${string}`;
type BattleId = `bat${string}`;

export const createRobot = async (props: {
  prompt: string;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].robots[
    "create-robot"
  ].$post({
    json: { prompt: props.prompt },
  });
  return response.json();
};

export const createBattle = async (props: {
  robot1Id: RobotId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].battles[
    "create-battle"
  ].$post({
    json: { robot1Id: props.robot1Id },
  });
  if (response.status !== 200) {
    throw new Error("Failed to create battle");
  }
  return response.json();
};

export const joinBattle = async (props: {
  battleId: BattleId;
  gameId: number;
  robotId: RobotId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].battles[
    ":battleId"
  ].join.$post({
    param: {
      battleId: props.battleId,
      gameId: props.gameId,
    },
    json: { robotId: props.robotId },
  });
  if (response.status !== 200) {
    throw new Error("Failed to join battle");
  }
  return response.json();
};

export const getBattleById = async (props: {
  battleId: BattleId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].battles[
    ":battleId"
  ].$get({
    param: { battleId: props.battleId },
  });
  return response.json();
};

export const getUserRobots = async (props: { robotClient: RobotClient }) => {
  const response = await props.robotClient["robot-battle"].robots.$get();
  return response.json();
};

export const getBattleEvents = async (props: {
  battleId: BattleId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].battles[
    ":battleId"
  ].events.$get({
    param: { battleId: props.battleId },
  });
  return response;
};

export const listBattles = async (props: {
  page?: string;
  limit?: string;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].battles.$get({
    query: {
      page: props.page,
      limit: props.limit,
    },
  });
  return response.json();
};

export const generateGameSignature = async (props: {
  gameId: number;
  userAddress: string;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"]["game-signature"][
    "generate-game-signature"
  ].$post({
    json: {
      gameId: props.gameId,
      userAddress: props.userAddress,
    },
  });
  if (response.status !== 200) {
    throw new Error("Failed to generate game signature");
  }
  return response.json();
};

export const generateClaimSignature = async (props: {
  gameId: number;
  userAddress: string;
  amount: string;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"]["claim-signature"][
    "generate-claim-signature"
  ].$post({
    json: {
      gameId: props.gameId,
      userAddress: props.userAddress,
      amount: props.amount,
    },
  });
  return response.json();
};
