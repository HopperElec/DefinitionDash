import prisma from "$lib/server/prisma";
import { error, redirect } from "@sveltejs/kit";
import chooseSpawnpoint from "$lib/server/choose-spawnpoint";
import ablyServer from "$lib/server/ably-server";

export default async function getPlayerId(
  user: { id: number; schoolId: number },
  gameId: number,
): Promise<number> {
  const player = await prisma.player.findFirst({
    where: { userId: user.id, gameId: gameId },
    select: {
      id: true,
      game: { select: { isOngoing: true } },
    },
  });
  if (player) {
    if (player.game.isOngoing) return player.id;
    redirect(301, "/game/" + gameId + "/end");
  }
  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      map: { creator: { schoolId: user.schoolId } },
      isOngoing: true,
    },
    select: { mapId: true },
  });
  if (!game) error(403, "You do not have access to this game!");
  const spawnpoint = await chooseSpawnpoint(game.mapId);
  const newPlayer = await prisma.player.create({
    data: { userId: user.id, gameId, currRoomId: spawnpoint },
    select: {
      id: true,
      currRoom: { select: { svgRef: true } },
      user: { select: { name: true, picture: true } },
      game: {
        select: {
          claimedRooms: { where: { roomId: spawnpoint } },
        },
      },
    },
  });
  if (newPlayer.game.claimedRooms.length == 0) {
    await prisma.claimedRoom.create({
      data: { gameId, roomId: spawnpoint },
    });
  }
  ablyServer.channels.get("game:" + gameId + ":positions").publish("create", {
    userId: user.id,
    picture: newPlayer.user.picture,
    svgRef: newPlayer.currRoom.svgRef,
  });
  ablyServer.channels
    .get("game:" + gameId + ":points")
    .publish("create", { userId: user.id, name: newPlayer.user.name });
  return newPlayer.id;
}
