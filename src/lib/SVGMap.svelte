<script lang="ts">
  import { onMount } from "svelte";
  import { ICON_SIZE, SVG_NS } from "$lib/constants";
  import createPanZoom, { type PanZoom } from "panzoom";

  let container: HTMLElement;
  let svg: SVGSVGElement;

  export function getSVG() {
    return svg;
  }

  export function getEventRoom(event: MouseEvent) {
    if (event.target instanceof SVGElement) {
      return +(
        event.target.dataset.room ||
        event.target.parentElement?.dataset.room ||
        0
      );
    }
  }

  export function getElmWhere(
    dataName: string,
    dataValue: number,
  ): SVGGraphicsElement | null {
    return svg.querySelector(`[data-${dataName}='${dataValue}']`);
  }
  export function getRoom(id: number): SVGGraphicsElement | null {
    return getElmWhere("room", id) as SVGGraphicsElement;
  }
  export function getLabelsFor(
    roomId: number,
  ): IterableIterator<HTMLElement> | null {
    return svg
      .querySelectorAll(`[data-label-for='${roomId}']`)
      .values() as IterableIterator<HTMLElement>;
  }

  export function removeIcon(icon: SVGImageElement) {
    if (icon.parentElement && icon.parentElement.childElementCount === 1) {
      const labels = getLabelsFor(Number(icon.parentElement.dataset.iconFor));
      if (labels) {
        for (const label of labels) {
          label.style.display = "block";
        }
      }
    }
    icon.remove();
  }

  export function getCenterOf(roomId: number) {
    const room = getRoom(roomId);
    if (!room) return;
    const roomBBox = room.getBBox();
    let center = new DOMPoint(
      roomBBox.x + roomBBox.width / 2,
      roomBBox.y + roomBBox.height / 2,
    );
    const roomCTM = room.getCTM();
    const svgCTM = svg.getCTM();
    if (roomCTM && svgCTM) {
      center = center.matrixTransform(svgCTM.inverse().multiply(roomCTM));
    }
    return center;
  }

  export function addIconTo(svgRef: number, iconSrc: string) {
    const center = getCenterOf(svgRef);
    if (!center) return;

    const labels = getLabelsFor(svgRef);
    if (labels) {
      for (const label of labels) {
        label.style.display = "none";
      }
    }

    const icon = document.createElementNS(SVG_NS, "image");
    icon.setAttribute("referrerpolicy", "no-referrer"); // Avoids Google 403
    icon.href.baseVal = iconSrc;
    icon.setAttribute("width", ICON_SIZE.toString());
    icon.setAttribute("height", ICON_SIZE.toString());

    let iconContainer = getElmWhere("icon-for", svgRef);
    if (iconContainer) {
      icon.setAttribute(
        "transform",
        `translate(${(iconContainer.childElementCount * ICON_SIZE) / 2})`, // Overlap icons slightly
      );
    } else {
      iconContainer = svg.appendChild(document.createElementNS(SVG_NS, "g"));
      iconContainer.dataset.iconFor = svgRef.toString();
    }
    iconContainer.appendChild(icon);

    const iconContainerBBox = iconContainer.getBBox();
    center.x -= iconContainerBBox.width / 2;
    center.y -= iconContainerBBox.height / 2;

    iconContainer.setAttribute(
      "transform",
      `translate(${center.x}, ${center.y})`,
    );
    return icon;
  }

  export let imgURL: string | undefined;
  export let onSuccess = () => {};
  export let onError = (message: string) => {
    (container || document.body).appendChild(
      document.createTextNode("Error: " + message),
    );
  };
  export let onClickRoom: ((clickedRoom: number) => void) | null = null;
  export let allowZooming: boolean = true;
  let panZoom: PanZoom;

  // noinspection JSUnusedGlobalSymbols
  export function getPanZoom() {
    return panZoom;
  }

  onMount(async () => {
    if (imgURL) {
      const tempMapElm = new DOMParser().parseFromString(
        await (await fetch(imgURL)).text(),
        "image/svg+xml",
      ).documentElement;
      if (tempMapElm instanceof SVGSVGElement) {
        container.innerHTML = "";
        svg = container.appendChild(tempMapElm);
        if (allowZooming) {
          // TODO: Reduce bounds to size of SVG
          // TODO: Default zoom fit SVG
          panZoom = createPanZoom(container, {
            minZoom: 1,
            maxZoom: 32,
            bounds: true,
          });
        }
        if (onClickRoom) {
          svg.addEventListener("click", (event) => {
            if (onClickRoom) {
              let clickedRoom = getEventRoom(event);
              if (clickedRoom) onClickRoom(clickedRoom);
            }
          });
        }
        onSuccess();
      } else {
        onError("Invalid map! Must be SVG.");
      }
    } else {
      onError("Not given map image URL");
    }
  });
</script>

<div bind:this={container} id="map-container">
  <p>Loading map...</p>
</div>

<svelte:head>
  <link as="fetch" crossorigin="anonymous" href={imgURL} rel="preload" />
  <style>
    #map-container > svg {
      height: 100%;
    }

    [data-label-for],
    [data-icon-for] {
      pointer-events: none;
    }
  </style>
</svelte:head>

<style lang="scss">
  #map-container {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    & > p {
      font-family: var(--default-font-family-bold);
      font-size: 4em;
    }
  }
</style>
