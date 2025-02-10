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
  const response = await props.robotClient["robot-battle"].robots["create-robot"].$post({
    json: { prompt: props.prompt },
  });
  return response.json();
};

export const createBattle = async (props: {
  robot1Id: RobotId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].battles["create-battle"].$post({
    json: { robot1Id: props.robot1Id },
  });
  return response.json();
};

export const joinBattle = async (props: {
  battleId: BattleId;
  robotId: RobotId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].battles["{battleId}"].join["{battleId}"].join.$post({
    param: { battleId: props.battleId }, json: { robotId: props.robotId }
  });
  return response.json();
};


export const getBattleById = async (props: {
  battleId: BattleId;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].battles["{battleId}"]["{battleId}"].$get({
    param: { battleId: props.battleId }
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
  const response = await props.robotClient["robot-battle"].battles["{battleId}"].events["{battleId}"].events.$get({
    param: { battleId: props.battleId },
  });
  return response;
};

export const listBattles = async (props: {
  page?: string;
  limit?: string;
  robotClient: RobotClient;
}) => {
  const response = await props.robotClient["robot-battle"].battles.battles.$get({
    query: {
      page: props.page,
      limit: props.limit,
    },
  });
  return response.json();
};
