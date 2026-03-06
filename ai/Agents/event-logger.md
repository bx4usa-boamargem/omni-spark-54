---
id: event-logger
layer: 1
type: observability
status: active
version: 1.0.0
runtime: antigravity
created_at: 2026-02-28
depends_on:
  - system-state-governor
  - health-monitor
blocks: []
tags: [observability, logging, events, persistence, audit, layer-1]
---

# event-logger

> **Layer 1 — Observability Operator**
> Canonical event persistence layer for the OmniSeen OS. Captures, validates, enriches, and stores all lifecycle events emitted across the system. Provides the audit trail and replay foundation for all other observability operators.

---

## Purpose

The `event-logger` is the immutable record of everything that happens inside OmniSeen. It subscribes to all event bus topics, validates and enriches incoming events, and persists them to Supabase with full fidelity. It is the foundation upon which metrics, alerts, and debugging capabilities are built.

---

## Responsibilities

- Subscribe to all `omniseen.*` event bus topics
- Validate event schema on ingestion
- Enrich events with system context (layer, governor state, sequence number)
- Persist all events to Supabase with guaranteed ordering
- Provide event query and replay API
- Buffer events during Supabase unavailability
- Emit ingestion health signals to `health-monitor`

---

## Inputs

| Field | Type | Source | Required | Description |
|---|---|---|---|---|
| `raw_event` | `event` | Any agent / event bus | ✅ | Any event emitted on omniseen.* topics |
| `direct_log_entry` | `object` | Any agent | ⚠️ | Direct log submission (bypasses event bus) |
| `replay_request` | `object` | Operator / any agent | ⚠️ | Request to replay events from a time range |
| `query_request` | `object` | Any agent | ⚠️ | Structured event query |

### `raw_event` Base Schema

```json
{
  "event_id": "string (uuid)",
  "event_type": "string",
  "topic": "string",
  "source_agent": "string",
  "layer": "integer",
  "timestamp": "ISO8601",
  "payload": "object",
  "schema_version": "string"
}
```

### `replay_request` Schema

```json
{
  "from": "ISO8601",
  "to": "ISO8601",
  "topic_filter": ["string"] ,
  "agent_filter": ["string"],
  "target_agent": "string"
}
```

---

## Outputs

| Field | Type | Target | Description |
|---|---|---|---|
| `persisted_event` | `object` | Supabase | Enriched, validated event record |
| `ingestion_ack` | `event` | Source agent | Confirmation of successful ingestion |
| `ingestion_error` | `event` | system-state-governor | Schema or persistence failure notification |
| `replay_stream` | `stream` | Requesting agent | Ordered event replay output |
| `query_result` | `object` | Requesting agent | Structured query response |
| `logger_health_heartbeat` | `event` | health-monitor | Self-health signal |

### `persisted_event` Schema (enriched)

```json
{
  "event_id": "string (uuid)",
  "sequence_number": "integer (global, monotonic)",
  "event_type": "string",
  "topic": "string",
  "source_agent": "string",
  "layer": "integer",
  "governor_state_at_ingestion": "string",
  "timestamp": "ISO8601",
  "ingested_at": "ISO8601",
  "payload": "object",
  "schema_version": "string",
  "tags": ["string"],
  "checksum": "string (sha256 of payload)"
}
```

---

## Triggers

| Trigger | Condition | Action |
|---|---|---|
| `EVENT_RECEIVED` | Any event arrives on subscribed topic | Validate → Enrich → Persist → Ack |
| `SCHEMA_INVALID` | Event fails schema validation | Reject; emit `ingestion_error`; log to dead-letter queue |
| `SUPABASE_UNAVAILABLE` | Persistence call fails | Buffer in memory; begin retry loop |
| `BUFFER_FLUSH` | Supabase reconnects or buffer reaches threshold | Flush buffered events in order |
| `REPLAY_REQUESTED` | `replay_request` received | Stream events from Supabase in order |
| `QUERY_RECEIVED` | `query_request` received | Execute structured query; return results |
| `DIRECT_LOG` | `direct_log_entry` received | Wrap in event envelope; persist |

---

## Event Enrichment Pipeline

```
1. Receive raw_event
2. Validate against base schema
3. If invalid → dead-letter queue + ingestion_error
4. Assign global sequence_number (atomic increment)
5. Attach governor_state_at_ingestion (from cached governor state)
6. Compute payload checksum (sha256)
7. Attach ingested_at timestamp
8. Normalize tags from topic + event_type
9. Write to Supabase omniseen_events
10. Emit ingestion_ack to source
```

---

## Fallbacks

| Scenario | Fallback Behavior |
|---|---|
| Supabase unavailable | Buffer up to 10,000 events in memory; flush on reconnect in order |
| Buffer capacity exceeded | Drop lowest-priority events (non-critical topics); emit `ingestion_error` for dropped events |
| Event bus subscription lost | Attempt resubscription every 15s; accept `direct_log_entry` as fallback channel |
| Schema validation failure | Route to dead-letter table `omniseen_events_dead_letter`; never discard silently |
| Sequence counter corruption | Reset from max sequence in Supabase + 1; emit `GOV` alert |
| Replay request for unavailable range | Return partial results with explicit gap markers |

---

## Persistence

| Data | Store | Table | Notes |
|---|---|---|---|
| All valid events | Supabase | `omniseen_events` | Append-only, indexed by sequence + timestamp + topic |
| Invalid events | Supabase | `omniseen_events_dead_letter` | With rejection reason |
| In-memory buffer | Runtime memory | — | During Supabase outage only |
| Logger health | Supabase | `omniseen_agent_health` | Via health-monitor |

### Supabase Index Strategy

```
omniseen_events:
  - PRIMARY: sequence_number (monotonic)
  - INDEX: timestamp DESC
  - INDEX: topic
  - INDEX: source_agent
  - INDEX: event_type
  - COMPOSITE: (topic, timestamp DESC)
```

---

## Boot Sequence (Self)

```
1. Receive layer_activation_signal (gate: health-monitor HEALTHY)
2. Self-register with system-state-governor
3. Connect to Supabase; verify omniseen_events table exists
4. Load max sequence_number from Supabase (resume counter)
5. Subscribe to all omniseen.* event bus topics
6. Begin ingestion loop
7. Emit self-heartbeat to health-monitor
8. Set own status → HEALTHY
```

---

## Interfaces

### Supabase Edge Functions

```
POST /functions/v1/event-logger/ingest        [direct log submission]
POST /functions/v1/event-logger/replay        [replay request]
POST /functions/v1/event-logger/query         [structured query]
GET  /functions/v1/event-logger/status        [ingestion queue status]
```

### Event Bus Subscriptions

```
omniseen.*    (wildcard — all topics)
```

### Event Bus Publications

```
omniseen.logger.ingestion_error
omniseen.logger.buffer_flushed
omniseen.logger.replay_complete
```

---

## Self-Registration Payload

```json
{
  "agent_id": "event-logger",
  "layer": 1,
  "type": "observability",
  "version": "1.0.0",
  "capabilities": [
    "event-ingestion",
    "event-enrichment",
    "event-persistence",
    "dead-letter-routing",
    "event-replay",
    "event-query"
  ],
  "health_endpoint": "/functions/v1/event-logger/status",
  "critical": true
}
```

---

## Constraints

- Events are **append-only** — no event may be modified or deleted after persistence.
- Sequence numbers are **globally monotonic** — gaps are never acceptable outside explicit gap markers.
- The `event-logger` **must not filter or suppress** any valid event — full fidelity is non-negotiable.
- Dead-letter events must be **retained**, never silently discarded.
- Must be `HEALTHY` before `metrics-collector` initializes.

---

## Error Codes

| Code | Meaning |
|---|---|
| `EL-001` | Event schema validation failed — routed to dead-letter |
| `EL-002` | Supabase write failure — buffering active |
| `EL-003` | In-memory buffer capacity exceeded — dropping low-priority events |
| `EL-004` | Event bus subscription lost |
| `EL-005` | Sequence counter read failure at boot |
| `EL-006` | Replay range not available in Supabase |
| `EL-007` | Direct log submission schema invalid |
