# Verification

Run `pnpm check` for lint, formatting, tests, type checks and the production build. Tests create isolated temporary storage and dynamically assigned loopback ports. They do not modify working boards.

## Automated coverage

- Creation in Backlog, In progress and Done; title/description validation and clearing descriptions.
- Room isolation, private ACKs/errors, broadcasts, repeated requests and stale versions.
- Persistence of jobs, deleted records and restored jobs after restart; invalid files and write rollback.
- Restoration preserves identity and number, rejects stale or mixed edit/restore requests, and deduplicates retries.
- Dragging to another active column and Deleted, ignored drops in the same column, offline blocking, and click suppression after dragging.
- Read-only card previews, details and edit dialogs, cancellation, status selection and restoration controls.
- Editing retains its original version even if another client updates the job.
- Reconnect backoff and jitter, handshake timeout, offline suspension, disconnect and disposal.
- ACK timeout, late ACK, refusal, Retry and request cleanup.
- Room cache, stable presence IDs, room locking and request history reset.
- Real WebSocket clients: creation, conflicts, restoration, presence, editing cleanup and restart.
- Oversized messages, rate limits and heartbeat responses.

## Manual acceptance checklist

These are repeatable manual scenarios, not a record that every scenario has been run on every device.

1. Connect Alice and Bob to Alpha and Carol to Beta. Check room-scoped participants.
2. Create jobs with title, description and each initial status. Both Alpha clients update; Beta remains unchanged.
3. Drag between active columns. Check the colored glowing target, retained number, absence of an accidental dialog and updates in the other client. Dropping in the original column or outside the board must do nothing.
4. Delete once through the trash button and once by dropping into Deleted. Open a deleted card and restore it. Check the title, description and number are retained, the card moves to Backlog in both clients, and the dialog remains open.
5. Edit the same job in both Alpha clients. Save one draft, then the other. Check the stale request fails and loads the server version.
6. Disconnect and switch rooms. Cached cards remain readable; mutation controls and dragging are disabled. Reconnect and verify the latest snapshot replaces the cache.
7. Stop and restart the server. Check active, deleted and restored jobs survive, clients reconnect, and retries do not duplicate an operation.
8. Enable browser offline mode, then restore connectivity. Check retries pause and resume. Return to a background tab after another client changes the board and check synchronization.
9. Use Tab, Enter, Space and arrow keys for opening cards, status radios and actions. Escape closes dialogs and returns focus. Focus stays within an open dialog. Check empty titles cannot be submitted.
10. At narrow widths, check columns stack, dialogs fit the screen and long titles/descriptions wrap. On touch screens use dialog controls as the alternative to native desktop dragging.
11. Enable reduced motion. Check target scaling is disabled and UI transitions do not animate.

## Current scope

Local collaboration uses one server process and a JSON file. Accounts, permission checks, SQLite, hosted HTTPS/WSS, permanent audit history, custom card ordering and the optional dashboard are outside this release.
