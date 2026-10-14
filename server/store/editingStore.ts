import type { WebSocket } from 'ws';
import type { EditingParticipant } from '@/shared/protocol/index.js';

export function createEditingStore() {
  const editors = new Map<WebSocket, EditingParticipant & { room: string; expiresAt: number }>();

  return {
    set: (socket: WebSocket, room: string, editor: EditingParticipant, active: boolean) => {
      if (active) editors.set(socket, { ...editor, room, expiresAt: Date.now() + 5000 });
      else editors.delete(socket);
    },
    remove: (socket: WebSocket) => {
      editors.delete(socket);
    },
    list: (room: string): EditingParticipant[] =>
      [...editors.values()]
        .filter((editor) => editor.room === room)
        .map(({ jobId, clientId, name }) => ({ jobId, clientId, name })),
    expire: (): Set<string> => {
      const rooms = new Set<string>();
      editors.forEach((editor, socket) => {
        if (editor.expiresAt <= Date.now()) {
          editors.delete(socket);
          rooms.add(editor.room);
        }
      });

      return rooms;
    },
  };
}
