export const CONNECTION_STATUS = {
  OFFLINE: 'Offline',
  DISCONNECTING: 'Disconnecting...',
  DISCONNECTED: 'Disconnected',
  CONNECTING: 'Connecting...',
  RECONNECTING: 'Reconnecting...',
  CONNECTED: 'Connected',
  ERROR: 'Connection error',
  FAILED: 'Unable to connect',
  LOST: 'Connection lost',
} as const;

export type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];
