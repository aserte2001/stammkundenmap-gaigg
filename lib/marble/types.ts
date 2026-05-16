/**
 * TypeScript shape of the Marble API surface we use. Hand-typed from
 * `docs/marble-openapi.yaml` so we get exhaustive checks without the weight
 * of a generated client.
 */
export type MarbleModel =
  | "marble-1.0-draft"
  | "marble-1.0"
  | "marble-1.1"
  | "marble-1.1-plus";

export type MediaAssetKind = "image" | "video";

export type PrepareUploadRequest = {
  file_name: string;
  extension: string;
  kind: MediaAssetKind;
  metadata?: Record<string, unknown>;
};

export type PrepareUploadResponse = {
  media_asset: {
    media_asset_id: string;
    file_name: string;
    extension: string | null;
    kind: MediaAssetKind;
    created_at: string;
    metadata: Record<string, unknown> | null;
  };
  upload_info: {
    upload_url: string;
    upload_method: string;
    required_headers: Record<string, string> | null;
    curl_example: string | null;
  };
};

export type MultiImageItem = {
  azimuth: number;
  content: { source: "media_asset"; media_asset_id: string };
};

export type GenerateWorldRequest = {
  display_name?: string;
  model: MarbleModel;
  tags?: string[];
  world_prompt: {
    type: "multi-image";
    multi_image_prompt: MultiImageItem[];
    reconstruct_images?: boolean;
    text_prompt?: string;
    disable_recaption?: boolean;
  };
};

export type GenerateWorldResponse = {
  operation_id: string;
  done: boolean;
  error: { code?: number; message?: string } | null;
  metadata: Record<string, unknown> | null;
  response: unknown | null;
  created_at: string | null;
  updated_at: string | null;
  expires_at: string | null;
  cost?: { total_credits: number; line_items: Array<{ name: string; credits: number }> } | null;
};

export type WorldAssets = {
  caption: string | null;
  thumbnail_url: string | null;
  imagery: { pano_url: string | null } | null;
  mesh: { collider_mesh_url: string | null } | null;
  splats: {
    spz_urls: Record<string, string> | null;
    semantics_metadata: unknown | null;
  } | null;
};

export type World = {
  world_id: string;
  display_name: string;
  tags: string[] | null;
  assets: WorldAssets | null;
  world_marble_url: string;
  permission?: unknown;
  model?: string | null;
};

export type GetOperationResponse = {
  operation_id: string;
  done: boolean;
  error: { code?: number; message?: string } | null;
  metadata: { progress?: { status: string; description?: string }; world_id?: string } | null;
  response: World | null;
  created_at: string | null;
  updated_at: string | null;
  expires_at: string | null;
  cost?: { total_credits: number; line_items: Array<{ name: string; credits: number }> } | null;
};
