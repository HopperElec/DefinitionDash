<script lang="ts">
  import Leaderboard from "$lib/Leaderboard.svelte";
  import { getChannel } from "$lib/ably-client";
  import { page } from "$app/stores";
  import "$lib/button.css";
  import type { PlayerLabelProps } from "$lib/types";

  export let data;

  let players = data.players.reduce(
    (acc, player) => {
      acc[player.id] = player;
      return acc;
    },
    {} as { [key: number]: PlayerLabelProps & { points: number } },
  );
  $: orderedPlayers = Object.values(players).sort(
    (a, b) => b.points - a.points,
  );

  const pointsMessage = getChannel("game:" + $page.params.gameId + ":points");
  $: if ($pointsMessage) {
    switch ($pointsMessage.name) {
      case "points":
        players[$pointsMessage.data.userId].points = $pointsMessage.data.points;
        break;
      case "create":
        players[$pointsMessage.data.userId] = {
          id: $pointsMessage.data.userId,
          ...$pointsMessage.data,
          points: 0,
        };
    }
  }

  const announcement = getChannel(
    "game:" + $page.params.gameId + ":announcements",
  );
  $: if ($announcement?.name == "kick") {
    const userId = $announcement.data.userId;
    delete players[userId];
    players = players; // trigger reactivity
  }
</script>

{#if data.isHost}<a id="end" class="button" href="../end">End game</a>{/if}
<div id="page-container">
  <div id="leaderboard-container">
    <Leaderboard allowKicking currentUserId={data.userId} {orderedPlayers} />
  </div>
  <a class="button" href="../">Back to game</a>
</div>

<style>
  #end {
    position: fixed;
    right: 0;
  }

  #page-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  #leaderboard-container {
    height: 100%;
  }
</style>
