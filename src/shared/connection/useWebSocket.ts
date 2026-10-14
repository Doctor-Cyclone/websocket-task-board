import { useEffect, useLayoutEffect, useState } from 'react';
import { CONNECTION_STATUS, type ConnectionStatus } from './index';
import { WebSocketClient } from './WebSocketClient';

export function useWebSocket(url: string, onMessage: (data: string) => void) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    CONNECTION_STATUS.DISCONNECTED,
  );
  // Construction does not open a connection or start any timers.
  const [client] = useState(
    () => new WebSocketClient({ onStatus: setConnectionStatus, onMessage }),
  );

  useLayoutEffect(() => {
    client.setMessageHandler(onMessage);
  }, [client, onMessage]);

  useEffect(() => {
    return () => client.dispose();
  }, [client]);

  return {
    connectionStatus,
    connect: () => client.connect(url),
    disconnect: () => client.disconnect(),
    send: (data: string) => client.send(data),
    canSend: () => client.canSend(),
    canChangeConnection: () => client.canChangeConnection(),
  };
}
