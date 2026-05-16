> ## Documentation Index
> Fetch the complete documentation index at: https://docs.worldlabs.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Get an operation

> Get an operation by ID.

Poll this endpoint to check the status of a long-running operation.
When done=true, the response field contains the generated world.

Args:
    operation_id: The operation identifier from /worlds:generate.

Returns:
    GetOperationResponse[World] with:
        - operation_id: Operation identifier
        - created_at: Creation timestamp
        - updated_at: Last update timestamp
        - expires_at: Expiration timestamp
        - done: true when complete, false while in progress
        - error: Error details if failed, null otherwise
        - metadata: Progress information and world_id
        - response: Generated World if done=true, null otherwise

Raises:
    HTTPException: 401 if unauthorized
    HTTPException: 404 if operation not found
    HTTPException: 500 if request fails



## OpenAPI

````yaml GET /marble/v1/operations/{operation_id}
openapi: 3.1.0
info:
  description: Public-facing API for the Marble platform
  summary: Marble Public API v1
  title: Marble Public API v1
  version: 1.0.0
servers:
  - description: World API
    url: https://api.worldlabs.ai
security:
  - ApiKeyAuth: []
paths:
  /marble/v1/operations/{operation_id}:
    get:
      summary: Get Operation
      description: |-
        Get an operation by ID.

        Poll this endpoint to check the status of a long-running operation.
        When done=true, the response field contains the generated world.

        Args:
            operation_id: The operation identifier from /worlds:generate.

        Returns:
            GetOperationResponse[World] with:
                - operation_id: Operation identifier
                - created_at: Creation timestamp
                - updated_at: Last update timestamp
                - expires_at: Expiration timestamp
                - done: true when complete, false while in progress
                - error: Error details if failed, null otherwise
                - metadata: Progress information and world_id
                - response: Generated World if done=true, null otherwise

        Raises:
            HTTPException: 401 if unauthorized
            HTTPException: 404 if operation not found
            HTTPException: 500 if request fails
      operationId: get_operation_marble_v1_operations__operation_id__get
      parameters:
        - in: path
          name: operation_id
          required: true
          schema:
            title: Operation Id
            type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/GetOperationResponse_Union_World__PanoDepthToRgbResult__
          description: Successful Response
        '422':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
          description: Validation Error
components:
  schemas:
    GetOperationResponse_Union_World__PanoDepthToRgbResult__:
      properties:
        created_at:
          anyOf:
            - format: date-time
              type: string
            - type: 'null'
          description: Creation timestamp
          title: Created At
        done:
          description: True if the operation is completed
          title: Done
          type: boolean
        error:
          anyOf:
            - $ref: '#/components/schemas/OperationError'
            - type: 'null'
          description: Error information if the operation failed
        expires_at:
          anyOf:
            - format: date-time
              type: string
            - type: 'null'
          description: Expiration timestamp
          title: Expires At
        metadata:
          anyOf:
            - additionalProperties: true
              type: object
            - type: 'null'
          description: Service-specific metadata, such as progress percentage
          title: Metadata
        operation_id:
          description: Operation identifier
          title: Operation Id
          type: string
        response:
          anyOf:
            - $ref: '#/components/schemas/World'
            - $ref: '#/components/schemas/PanoDepthToRgbResult'
            - type: 'null'
          description: >-
            Result payload when done=true and no error. Structure depends on
            operation type.
          title: Response
        updated_at:
          anyOf:
            - format: date-time
              type: string
            - type: 'null'
          description: Last update timestamp
          title: Updated At
      required:
        - operation_id
        - done
      title: GetOperationResponse[Union[World, PanoDepthToRgbResult]]
      type: object
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          title: Detail
          type: array
      title: HTTPValidationError
      type: object
    OperationError:
      description: Error information for a failed operation.
      properties:
        code:
          anyOf:
            - type: integer
            - type: 'null'
          description: Error code
          title: Code
        message:
          anyOf:
            - type: string
            - type: 'null'
          description: Error message
          title: Message
      title: OperationError
      type: object
    World:
      description: A generated world, including asset URLs.
      properties:
        assets:
          anyOf:
            - $ref: '#/components/schemas/WorldAssets'
            - type: 'null'
          description: Generated world assets
        created_at:
          anyOf:
            - format: date-time
              type: string
            - type: 'null'
          description: Creation timestamp
          title: Created At
        display_name:
          description: Display name
          title: Display Name
          type: string
        model:
          anyOf:
            - type: string
            - type: 'null'
          description: Model used for generation
          title: Model
        permission:
          anyOf:
            - $ref: '#/components/schemas/Permission'
            - type: 'null'
          description: Access control permissions for the world
        tags:
          anyOf:
            - items:
                type: string
              type: array
            - type: 'null'
          description: Tags associated with the world
          title: Tags
        updated_at:
          anyOf:
            - format: date-time
              type: string
            - type: 'null'
          description: Last update timestamp
          title: Updated At
        world_id:
          description: World identifier
          title: World Id
          type: string
        world_marble_url:
          description: World Marble URL
          title: World Marble Url
          type: string
        world_prompt:
          anyOf:
            - discriminator:
                mapping:
                  depth-pano:
                    $ref: '#/components/schemas/DepthPanoPrompt'
                  image:
                    $ref: '#/components/schemas/Prompt'
                  inpaint-pano:
                    $ref: '#/components/schemas/InpaintPanoPrompt'
                  multi-image:
                    $ref: '#/components/schemas/MultiImagePrompt-Output'
                  text:
                    $ref: '#/components/schemas/WorldTextPrompt-Output'
                  video:
                    $ref: '#/components/schemas/VideoPrompt-Output'
                propertyName: type
              oneOf:
                - $ref: '#/components/schemas/WorldTextPrompt-Output'
                - $ref: '#/components/schemas/Prompt'
                - $ref: '#/components/schemas/MultiImagePrompt-Output'
                - $ref: '#/components/schemas/VideoPrompt-Output'
                - $ref: '#/components/schemas/DepthPanoPrompt'
                - $ref: '#/components/schemas/InpaintPanoPrompt'
            - type: 'null'
          description: World prompt
          title: World Prompt
      required:
        - world_id
        - display_name
        - world_marble_url
      title: World
      type: object
    PanoDepthToRgbResult:
      description: |-
        Result from depth-to-RGB panorama generation.

        Returned inside ``Operation.response`` when the
        operation completes successfully (``done=true``).
      properties:
        pano_url:
          anyOf:
            - type: string
            - type: 'null'
          description: >-
            URL of the generated RGB panorama image. Available when the
            operation succeeds.
          title: Pano Url
      title: PanoDepthToRgbResult
      type: object
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          title: Location
          type: array
        msg:
          title: Message
          type: string
        type:
          title: Error Type
          type: string
      required:
        - loc
        - msg
        - type
      title: ValidationError
      type: object
    WorldAssets:
      description: Downloadable outputs of world generation.
      properties:
        caption:
          anyOf:
            - type: string
            - type: 'null'
          description: AI-generated description of the world
          title: Caption
        imagery:
          anyOf:
            - $ref: '#/components/schemas/ImageryAssets'
            - type: 'null'
          description: Imagery assets
        mesh:
          anyOf:
            - $ref: '#/components/schemas/MeshAssets'
            - type: 'null'
          description: Mesh assets
        splats:
          anyOf:
            - $ref: '#/components/schemas/SplatAssets'
            - type: 'null'
          description: Gaussian splat assets
        thumbnail_url:
          anyOf:
            - type: string
            - type: 'null'
          description: Thumbnail URL for the world
          title: Thumbnail Url
      title: WorldAssets
      type: object
    Permission:
      description: Access control permissions for a resource.
      properties:
        allow_id_access:
          default: false
          title: Allow Id Access
          type: boolean
        allowed_readers:
          items:
            type: string
          title: Allowed Readers
          type: array
        allowed_writers:
          items:
            type: string
          title: Allowed Writers
          type: array
        public:
          default: false
          title: Public
          type: boolean
      title: Permission
      type: object
    DepthPanoPrompt:
      description: >-
        For models conditioned on a depth pano and text.

        When depth_pano_image is a log-encoded PNG, z_min and z_max are required

        to decode it correctly. When it is an EXR file containing raw float
        depth

        values, z_min and z_max will both be ignored.

        Please set z_min and z_max both to None when using an EXR file.
      properties:
        depth_pano_image:
          $ref: '#/components/schemas/Content'
        text_prompt:
          anyOf:
            - type: string
            - type: 'null'
          title: Text Prompt
        type:
          const: depth-pano
          default: depth-pano
          title: Type
          type: string
        z_max:
          anyOf:
            - type: number
            - type: 'null'
          title: Z Max
        z_min:
          anyOf:
            - type: number
            - type: 'null'
          title: Z Min
      required:
        - depth_pano_image
      title: DepthPanoPrompt
      type: object
    Prompt:
      description: |-
        For world models generating a world from a single image (+ text).
        Images can be generated using the :image-generation method.
        If no text prompt is provided, it will be generated via recaption.
      properties:
        image_prompt:
          $ref: '#/components/schemas/Content'
        is_pano:
          default: false
          title: Is Pano
          type: boolean
        text_prompt:
          anyOf:
            - type: string
            - type: 'null'
          title: Text Prompt
        type:
          const: image
          default: image
          title: Type
          type: string
      required:
        - image_prompt
      title: Prompt
      type: object
    InpaintPanoPrompt:
      description: For models that inpaint the masked portion of a pano image.
      properties:
        pano_image:
          $ref: '#/components/schemas/Content'
        pano_mask:
          $ref: '#/components/schemas/Content'
        text_prompt:
          anyOf:
            - type: string
            - type: 'null'
          title: Text Prompt
        type:
          const: inpaint-pano
          default: inpaint-pano
          title: Type
          type: string
      required:
        - pano_image
        - pano_mask
      title: InpaintPanoPrompt
      type: object
    MultiImagePrompt-Output:
      description: For world models supporting multi-image (+ text) input.
      properties:
        multi_image_prompt:
          items:
            $ref: '#/components/schemas/SphericallyLocatedContent-Output'
          title: Multi Image Prompt
          type: array
        reconstruct_images:
          default: false
          title: Reconstruct Images
          type: boolean
        text_prompt:
          anyOf:
            - type: string
            - type: 'null'
          title: Text Prompt
        type:
          const: multi-image
          default: multi-image
          title: Type
          type: string
      required:
        - multi_image_prompt
      title: MultiImagePrompt
      type: object
    WorldTextPrompt-Output:
      description: Input prompt class for text-conditioned world generation.
      properties:
        text_prompt:
          anyOf:
            - type: string
            - type: 'null'
          title: Text Prompt
        type:
          const: text
          default: text
          title: Type
          type: string
      title: WorldTextPrompt
      type: object
    VideoPrompt-Output:
      description: For world models supporting video (+ text) input.
      properties:
        text_prompt:
          anyOf:
            - type: string
            - type: 'null'
          title: Text Prompt
        type:
          const: video
          default: video
          title: Type
          type: string
        video_prompt:
          $ref: '#/components/schemas/Content'
      required:
        - video_prompt
      title: VideoPrompt
      type: object
    ImageryAssets:
      description: Imagery asset URLs.
      properties:
        pano_url:
          anyOf:
            - type: string
            - type: 'null'
          description: Panorama image URL
          title: Pano Url
      title: ImageryAssets
      type: object
    MeshAssets:
      description: Mesh asset URLs.
      properties:
        collider_mesh_url:
          anyOf:
            - type: string
            - type: 'null'
          description: Collider mesh URL
          title: Collider Mesh Url
      title: MeshAssets
      type: object
    SplatAssets:
      description: Gaussian splat asset URLs.
      properties:
        semantics_metadata:
          anyOf:
            - $ref: '#/components/schemas/WorldSemanticsMetadata'
            - type: 'null'
          description: Semantic metadata for the world
        spz_urls:
          anyOf:
            - additionalProperties:
                type: string
              type: object
            - type: 'null'
          description: URLs for SPZ format Gaussian splat files
          title: Spz Urls
      title: SplatAssets
      type: object
    Content:
      description: >-
        Represents content (media, text, images) that can be stored inline or
        via URL.


        Supports both direct data storage (up to 10MB) and URL references (up to
        20MB).
      properties:
        data_base64:
          anyOf:
            - type: string
            - type: 'null'
          title: Data Base64
        extension:
          anyOf:
            - type: string
            - type: 'null'
          description: File extension without dot
          examples:
            - jpg
            - png
            - pdf
            - txt
          title: Extension
        uri:
          anyOf:
            - type: string
            - type: 'null'
          title: Uri
      title: Content
      type: object
    SphericallyLocatedContent-Output:
      description: Content with a preferred location on the sphere.
      properties:
        azimuth:
          anyOf:
            - type: number
            - type: 'null'
          title: Azimuth
        data_base64:
          anyOf:
            - type: string
            - type: 'null'
          title: Data Base64
        extension:
          anyOf:
            - type: string
            - type: 'null'
          description: File extension without dot
          examples:
            - jpg
            - png
            - pdf
            - txt
          title: Extension
        uri:
          anyOf:
            - type: string
            - type: 'null'
          title: Uri
      title: SphericallyLocatedContent
      type: object
    WorldSemanticsMetadata:
      description: Semantic metadata for world generation output.
      properties:
        ground_plane_offset:
          anyOf:
            - type: number
            - type: 'null'
          title: Ground Plane Offset
        metric_scale_factor:
          anyOf:
            - type: number
            - type: 'null'
          title: Metric Scale Factor
      title: WorldSemanticsMetadata
      type: object
  securitySchemes:
    ApiKeyAuth:
      description: API key for authentication. Get your key from the developer portal.
      in: header
      name: WLT-Api-Key
      type: apiKey

````