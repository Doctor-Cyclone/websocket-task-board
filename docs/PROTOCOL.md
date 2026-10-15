# Event protocol

Browser connections use `ws://127.0.0.1:3001?room=alpha&name=Alice&clientId=...`.

The room is fixed for the lifetime of a connection. `clientId` remains stable across reconnects within a mounted page. It is a client-supplied presence identifier, not an authentication credential. Online lists are scoped to rooms and deduplicate overlapping connections with the same ID.

All application events are JSON text. `shared/protocol/events.ts` contains the authoritative Zod schemas. Browser ping/pong frames are protocol-level messages and do not enter application `onmessage`.

## Client to server

| Type          | Fields                                                                                     | Behavior                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `job:create`  | `requestId`, `payload: { title, description?, status? }`                                   | Trim and validate title, create version 1, save, ACK sender and broadcast                       |
| `job:update`  | `requestId`, `payload: { id, expectedVersion, title?, description?, completed?, status? }` | At least one change is required; reject outdated versions, otherwise increment version and save |
| `job:delete`  | `requestId`, `payload: { id }`                                                             | Move to Deleted, save and ACK; retries do not repeat the change                                 |
| `job:editing` | `payload: { id, active }`                                                                  | Update temporary activity for an existing job                                                   |
| `room:sync`   | No payload                                                                                 | Send the room's board, participants and editing activity to the requester                       |

Title length is 1–200 characters after trimming. Descriptions are optional and limited to 1000 characters; an empty string clears the description. Versions are positive integers. Request IDs must be nonempty strings. Generate a new ID for a new operation; reuse it only to retry the original operation.

## Server to client

| Type                | Payload                               | Audience                           |
| ------------------- | ------------------------------------- | ---------------------------------- |
| `jobs:sync`         | `Job[]`                               | Connecting or synchronizing client |
| `job:created`       | `Job`                                 | Room                               |
| `job:updated`       | `Job`                                 | Room                               |
| `job:deleted`       | `{ id, job }`                         | Room                               |
| `request:ack`       | `{ requestId }`                       | Initiator                          |
| `request:error`     | `{ requestId, message, currentJob? }` | Initiator                          |
| `room:participants` | `{ clientId, name }[]`                | Room                               |
| `room:editing`      | `{ jobId, clientId, name }[]`         | Room                               |

`Job` contains `id`, `title`, `completed`, `version`, and optional `description`, `status` and `number` fields for legacy storage compatibility. New jobs have a stable room-scoped number. Creation accepts `backlog`, `in-progress` or `done`; omitting the status defaults to `backlog`. Creating in `done` sets `completed` to true. Status updates accept `backlog`, `in-progress` or `done`; `completed` is synchronized with `done`. Old jobs without a status use `completed` to select Done or Backlog.

Deletion preserves the job with status `deleted` and increments its version. Deleted jobs are included in room snapshots. Their title and description cannot be edited until restoration. The room limit includes deleted records. `job:deleted` includes the updated job; older events containing only an ID remain readable by the frontend. Records removed before this change cannot be recovered.

## Restoring deleted jobs

Restoration uses the existing update event, with a new request ID and the current version of the deleted job:

```json
{
  "type": "job:update",
  "requestId": "restore-unique-id",
  "payload": {
    "id": "job-id",
    "expectedVersion": 2,
    "status": "backlog"
  }
}
```

For a deleted job this request must contain only the identity, version and `status: "backlog"`; combining restoration with title, description or completed changes is rejected. Restoration keeps the ID, number and details, clears completed, increments the version, persists, ACKs the sender and broadcasts `job:updated` to the room. A stale version returns the current job; retrying a processed request reuses its original ID and receives another ACK without another change. A job already physically removed by an older application version cannot be restored.

Dragging to Deleted sends `job:delete`; dragging between active columns and choosing a dialog status send `job:update`. The frontend waits for server broadcasts before moving a card. Conflicts keep the server version and display a failed request in Live activity.

## Acknowledgements and errors

ACK confirms application processing after persistence. Broadcasts update the board; ACKs settle a particular request. A duplicate processed request receives another ACK but is not applied or broadcast again.

On an update conflict, `request:error` carries the current job. The client refreshes that job without replacing a newer local version and marks the rejected request Failed. The user can submit a new change against the latest version.

Malformed JSON or events with no valid correlated request identity are logged; the server cannot attribute an error to an unknown request ID. Oversized frames close with code 1009; excessive message rates and unknown rooms close with code 1008.

## Reconnection and cleanup

Only close events schedule reconnects. Errors do not create a second retry timer. A stalled handshake is closed after ten seconds. Disconnect cancels retry timers and pending request waits. Component cleanup removes callbacks and network listeners.

Offline events suspend retries and keep the board snapshot. Online events resume the same connection address. Returning to a visible tab reconnects if needed or requests `room:sync` if still connected. Manual room changes are available only after Disconnect and clear request history before showing the selected room cache.

Editing activity is throttled on the client and expires server-side after five seconds. Socket closure removes online and editing presence. Server shutdown clears heartbeat and expiry intervals.
