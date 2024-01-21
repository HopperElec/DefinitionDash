import { error, type RequestHandler } from "@sveltejs/kit";
import prisma from "$lib/prisma";
import { getMapFor } from "$lib/get-map-for";

export const POST: RequestHandler = async ({ request, locals }) => {
  const params = await request.json();
  const map_id = (await getMapFor(locals.user))?.id;
  if (!map_id) throw error(403, "You do not have access to any maps!");
  await prisma.door.delete({
    where: {
      map_id_room1_id_room2_id: {
        map_id,
        room1_id: params.room1_id,
        room2_id: params.room2_id,
      },
    },
  });
  return new Response();
};
