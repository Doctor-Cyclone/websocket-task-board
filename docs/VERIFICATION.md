# Verification

Run `pnpm check` for lint, formatting, tests, type checks and the production build.

Automated coverage includes:

- Job CRUD, room isolation, duplicate requests and stale versions.
- Restoring jobs and processed IDs after restart, deletion retention, invalid files and write rollback.
- Reconnect timing and jitter, handshake timeout, offline suspension, manual disconnect and disposal.
- ACK success, timeout, late ACK, server refusal, manual Retry and request cleanup.
- Room cache restoration, stable client IDs, room locking and request history reset.
- Editing original versions, disabled actions, Retry buttons and refusal text.
- Real WebSocket clients in two rooms: broadcasts, private ACK/error, rename conflicts, presence and editing cleanup.
- Oversized frames, excessive message rates and heartbeat responders versus silent clients.

## Manual scenarios

1. Open three tabs. Connect Alice and Bob to Alpha, Carol to Beta. Alpha participants should list Alice and Bob; Beta should list Carol.
2. Create, complete, rename and delete an Alpha job. Both Alpha tabs update; Beta remains unchanged.
3. Edit the same job in both Alpha tabs. Save in one, then save the old draft in the other. The second request fails and displays the current server version.
4. Disconnect, switch rooms and return. Cached jobs remain visible but disabled; reconnect replaces the cached snapshot.
5. Submit an empty title and a title longer than 200 characters. Only the sender sees Failed; no job is added.
6. Stop and restart the server. Jobs and processed request IDs remain saved. Connected pages resume after their retry delays.
7. Use browser offline mode. Status becomes Offline and attempts pause. Restore network; the board reconnects automatically.
8. Return to a background tab after another participant changes the board. It receives the current room snapshot.
9. Use keyboard navigation for room radios, name, title, Edit, Save and Retry. At a narrow viewport the panels stack without losing actions.

Tests create their own temporary storage and dynamic ports. Do not use production board files as test fixtures.
