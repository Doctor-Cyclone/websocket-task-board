# WebSocket Job Board

A collaborative job board built with React, TypeScript, SCSS Modules and a Node.js WebSocket server.

## Features

- Separate Alpha and Beta boards with a smooth room selector.
- Named online participants and temporary editing indicators.
- Four kanban columns: Backlog, In progress, Done and Deleted, with stable job numbers.
- Open a card to view its full description, edit details or change its status in a dialog. Deleted jobs are retained; changes arrive through server events.
- Optimistic version checks for updates, with current job data returned on conflicts.
- ACK tracking, a five-second confirmation timeout and manual Retry for all job operations.
- JSON persistence for jobs, versions and processed request IDs.
- Automatic reconnect with exponential backoff and jitter, offline suspension and tab-resume synchronization.
- A ten-second connection timeout, server ping/pong heartbeat, message size and rate limits.
- A soft violet glass interface, keyboard controls, mobile layout and reduced-motion support.

## Run locally

Use Node.js 22.13+ (24 recommended) and pnpm 11.25.0.

```sh
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

In a second terminal:

```sh
pnpm dev:server
```

Open http://127.0.0.1:5174/. The WebSocket server listens on 127.0.0.1:3001. Stop either process with Ctrl+C.

Enter a name, choose a room and press Connect. Disconnect before changing rooms. Saved room snapshots remain visible while disconnected; controls are disabled. Connecting replaces the snapshot with the server's current board.

## Commands

| Command             | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | Start the frontend                           |
| `pnpm dev:server`   | Start the server with automatic reload       |
| `pnpm test`         | Run all tests                                |
| `pnpm test:watch`   | Run tests in watch mode                      |
| `pnpm typecheck`    | Check frontend, server and config types      |
| `pnpm lint`         | Check ESLint rules                           |
| `pnpm lint:fix`     | Apply automatic lint fixes                   |
| `pnpm format`       | Format project files                         |
| `pnpm format:check` | Check formatting                             |
| `pnpm build`        | Check types and build the frontend           |
| `pnpm preview`      | Preview the build on port 4174               |
| `pnpm check`        | Run lint, formatting, tests, types and build |

GitHub Actions runs `pnpm check`. Tests use fake timers, simulated browser sockets and isolated temporary storage. Integration tests start real servers on dynamically assigned loopback ports; they do not modify working boards or use port 3001.

## Architecture

- `src/pages/board/ui/`: header, jobs, editing controls and request history.
- `src/pages/board/model/useJobs.ts`: room snapshots and application event routing.
- `src/pages/board/model/useRequests.ts`: pending requests, ACK, errors, timers and Retry.
- `src/shared/connection/`: React adapter, WebSocket client and reconnect policy.
- `server/createServer.ts`: server composition and incoming event routing.
- `server/handlers/`: job operations and version checks.
- `server/store/`: boards, persistence, participants and editing activity.
- `server/transport/`: event delivery, heartbeat and rate limiting.
- `shared/`: protocol schemas, room constants and limits.

Components have colocated SCSS Modules. `@` points to the repository root. ESLint enforces blank lines around conditionals and before returns; Prettier handles the rest of formatting.

## Persistence and limits

Boards are saved in `server/data/boards.json`. The file is excluded from Git. Keep a backup before moving the project. The server validates stored data on startup and refuses corrupted files rather than overwriting them. Writes use a temporary file and replacement; failures roll back in-memory changes before an ACK is sent.

| Limit                                | Value                                   |
| ------------------------------------ | --------------------------------------- |
| Incoming message                     | 8 KiB                                   |
| Incoming messages per connection     | 30 per one-second window                |
| Jobs per room                        | 1,000                                   |
| Visible request history              | 100; pending requests are preserved     |
| Client room snapshots                | 2 rooms, in memory until page reload    |
| Processed IDs per room and operation | Latest 5,000                            |
| Connection timeout                   | 10 seconds                              |
| ACK timeout                          | 5 seconds                               |
| Heartbeat interval                   | 15 seconds                              |
| Editing indicator expiry             | 5 seconds                               |
| Reconnect delay                      | 80–100% of 2, 4, 8, 16, then 30 seconds |

Deduplication survives restarts but applies only while the request ID is retained. Retry reuses the original ID and event. A missing ACK does not prove that the operation failed. A server refusal is shown as Failed and requires a new corrected request; it does not offer Retry.

The file store supports one server process. Rooms and names provide collaboration grouping, not identity verification. No account system, database migration or hosted deployment is included.

See [the event protocol](docs/PROTOCOL.md) and [verification scenarios](docs/VERIFICATION.md).
