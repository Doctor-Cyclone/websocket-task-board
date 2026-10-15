# Changelog

## 1.0.0 — 2026-10-15

First complete local collaboration release.

- Four-column kanban with a soft glass interface and responsive layout.
- Job titles, optional descriptions, stable numbers and initial status selection.
- Details and edit dialogs, keyboard controls and a sliding status selector.
- Drag-and-drop status changes, glowing column targets and deletion by dropping into Deleted.
- Deleted job retention and explicit restoration to Backlog with version protection.
- Room-scoped participants, editing indicators and live synchronization through WebSocket.
- Durable JSON storage, ACK tracking, retry deduplication and conflict feedback.
- Reconnection with backoff and jitter, offline handling, heartbeat and connection timeout.
- Message size/rate limits, bounded caches and request history.
- Automated frontend, server and multi-client integration tests; protocol and acceptance documentation.

This release runs locally with one server process. Authentication, SQLite, hosted HTTPS/WSS and the optional dashboard remain outside its scope. Native drag-and-drop targets desktop browsers; dialog controls provide an alternative for touch and keyboard use.
