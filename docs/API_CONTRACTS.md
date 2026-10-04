# JalRakshak AI API integration contracts

The workspace contains the Vite/React frontend only; no FastAPI service or existing endpoint definitions were present when this integration was added. The frontend therefore does not claim live watershed, satellite, verification, or report data. Connected Mode has no automatic demo fallback.

Set `VITE_API_BASE_URL` to the FastAPI origin (example: `http://localhost:8000`, see `.env.example`). The current connected photo and AI workflows expect the following contracts. The frontend validates every response before displaying it.

## Photo upload

`POST /api/v1/field-photos` — `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `image` | image file, maximum 15 MB | yes |
| `site_id` | existing backend site identifier | yes |
| `longitude` | decimal degrees | no |
| `latitude` | decimal degrees | no |
| `notes` | text | no |

Response JSON: `{ "id": "photo-id", "filename": "field.jpg", "status": "received" }`, where `status` is `received` or `processing`. A Connected Mode upload requires the user to enter an actual backend site ID; the India-wide map locations are demo examples and are never sent as backend IDs.

## Intervention inference

`POST /api/v1/analyses/interventions` — JSON `{ "photo_id": "photo-id" }`

Response JSON:

```json
{
  "photo_id": "photo-id",
  "status": "completed",
  "model": "model/version",
  "processed_at": "2025-01-01T00:00:00Z",
  "detections": [
    { "category": "farm pond", "confidence": 92, "bbox": [0.1, 0.2, 0.7, 0.8] }
  ]
}
```

`status` is `completed`, `uncertain`, or `failed`; `detections` is an array and may be empty. Confidence is a percentage from 0 through 100. Optional `bbox` is normalized `[x_min, y_min, x_max, y_max]` coordinates in the uploaded image, each from 0 through 1. The backend must return the same `photo_id` as requested. Invalid responses are rejected and never shown as successful predictions.

## Not yet connected

There is no known contract for watershed/site discovery, satellite scenes or indices, authorized task assignment/status transitions, or server-generated PDF reports. Those actions are not simulated in Connected Mode. Add the real service and authorization contracts before wiring them; the interface shows an explicit unavailable state. Demo task records remain local to the browser and are labelled DEMO DATA.

## Error behavior

Network errors, non-success HTTP statuses, missing API configuration, invalid payloads, and absent inference results remain visible to the operator. A failed Connected Mode request is never replaced with a deterministic demo result. Demo simulation occurs only while the user explicitly selects Interactive Demo.
