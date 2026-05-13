"use client";

import { useEffect } from "react";
import type mapboxgl from "mapbox-gl";
import { customerFeatureCollection } from "@/lib/geojson";
import { HEATMAP_COLORS } from "@/lib/map-config";
import { useAppStore, filterCustomers } from "@/lib/store";
import { toFeatureCollection } from "@/lib/geojson";
import { customers } from "@/lib/customers";
import { useMap, useMapReady } from "./map-context";

const SOURCE_ID = "gaigg-customers";

export function ClusterHeatLayer() {
  const map = useMap();
  const ready = useMapReady();
  const filters = useAppStore((s) => s.filters);
  const viewportOnly = useAppStore((s) => s.viewportOnlyFilter);
  const visibleIds = useAppStore((s) => s.visibleIdsInViewport);

  // Source setup
  useEffect(() => {
    if (!map || !ready) return;
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: customerFeatureCollection,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
      promoteId: "id",
      clusterProperties: {
        vipCount: ["+", ["get", "isVip"]],
        sumRevenue: ["+", ["get", "revenue"]],
      },
    });

    // Heatmap (low zoom)
    map.addLayer({
      id: "gaigg-heat",
      type: "heatmap",
      source: SOURCE_ID,
      maxzoom: 11,
      paint: {
        "heatmap-weight": ["get", "weight"],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 0.7, 11, 2.6],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          HEATMAP_COLORS[0],
          0.2,
          HEATMAP_COLORS[1],
          0.4,
          HEATMAP_COLORS[2],
          0.6,
          HEATMAP_COLORS[3],
          0.85,
          HEATMAP_COLORS[4],
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 14, 11, 40],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.85, 10, 0.4, 11, 0],
      },
    });

    // Cluster circles
    map.addLayer({
      id: "gaigg-clusters",
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#7fbf5c",
          5,
          "#f4b540",
          10,
          "#c87332",
        ],
        "circle-radius": ["step", ["get", "point_count"], 22, 5, 28, 10, 36],
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(255,255,255,0.9)",
        "circle-opacity": 0.9,
      },
    });

    map.addLayer({
      id: "gaigg-cluster-count",
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 14,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#0e1f12",
      },
    });

    // Cluster click → zoom in
    const onClusterClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["gaigg-clusters"] });
      const cluster = features[0];
      if (!cluster) return;
      const clusterId = cluster.properties?.cluster_id as number | undefined;
      if (clusterId === undefined) return;
      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return;
        const geom = cluster.geometry;
        if (geom.type !== "Point") return;
        map.easeTo({
          center: geom.coordinates as [number, number],
          zoom: zoom + 0.4,
          duration: 900,
        });
      });
    };

    map.on("click", "gaigg-clusters", onClusterClick);
    map.on("mouseenter", "gaigg-clusters", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "gaigg-clusters", () => (map.getCanvas().style.cursor = ""));

    return () => {
      map.off("click", "gaigg-clusters", onClusterClick);
      try {
        if (map.getLayer("gaigg-cluster-count")) map.removeLayer("gaigg-cluster-count");
        if (map.getLayer("gaigg-clusters")) map.removeLayer("gaigg-clusters");
        if (map.getLayer("gaigg-heat")) map.removeLayer("gaigg-heat");
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Map may be removing during HMR
      }
    };
  }, [map, ready]);

  // Filter updates → update source data
  useEffect(() => {
    if (!map || !ready) return;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const filtered = filterCustomers(customers, filters, {
      viewportOnly,
      visibleIds,
    });
    source.setData(toFeatureCollection(filtered));
  }, [map, ready, filters, viewportOnly, visibleIds]);

  return null;
}

export const CUSTOMER_SOURCE_ID = SOURCE_ID;
