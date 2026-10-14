import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { CONNECTION_STATUS, type ConnectionStatus } from './index';
import { WebSocketClient } from './WebSocketClient';

export function useWebSocket(
  url: string,
  onMessage: (data: string) => void,
  onResume?: (transmit: (data: string) => boolean) => void,
) {
  const onResumeRef = useRef(onResume);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    CONNECTION_STATUS.DISCONNECTED,
  );
  // Construction does not open a connection or start any timers.
  const [client] = useState(
    () => new WebSocketClient({ onStatus: setConnectionStatus, onMessage }),
  );

  useLayoutEffect(() => {
    client.setMessageHandler(onMessage);
    onResumeRef.current = onResume;
  }, [client, onMessage, onResume]);

  useEffect(() => {
    client.setOnline(navigator.onLine);
    const online = () => client.setOnline(true);
    const offline = () => client.setOnline(false);
    const visible = () => {
      if (document.visibilityState !== 'visible') return;

      client.setOnline(navigator.onLine);

      if (client.canSend()) onResumeRef.current?.((data) => client.send(data));
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visible);

    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visible);
      client.dispose();
    };
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
