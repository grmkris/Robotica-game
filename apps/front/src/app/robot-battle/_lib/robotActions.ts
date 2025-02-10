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

import type { BattleId, RobotId } from "robot-sdk";
import type { RobotClient } from "./robotClient";

export const createRobot = async (props: {
  prompt: string;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"]["create-robot"].$post({
    json: { prompt: props.prompt },
  });
  return response.json();
};

export const createBattle = async (props: {
  robot1Id: RobotId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"]["create-battle"].$post({
    json: { robot1Id: props.robot1Id },
  });
  return response.json();
};

export const joinBattle = async (props: {
  battleId: BattleId;
  robotId: RobotId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"]["join-battle"].$post({
    json: { battleId: props.battleId, robotId: props.robotId },
  });
  return response.json();
};


export const getBattleStatus = async (props: {
  battleId: BattleId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"]["battle-status"].$get({
    query: { battleId: props.battleId },
  });
  return response.json();
};

export const getUserRobots = async (props: { robotClient: RobotClient }) => {
  const response = await props.robotClient["robot-battle"]["user-robots"].$get();
  return response.json();
};

export const selectRobot = async (props: {
  robotId: RobotId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"]["select-robot"].$post({
    json: { robotId: props.robotId },
  });
  return response.json();
};

export const getBattleEvents = async (props: {
  battleId: BattleId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"]["battle-events"][":battleId"].$get({
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
