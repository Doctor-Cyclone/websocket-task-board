import type { WebSocket } from 'ws';
import type { Participant } from '@/shared/protocol/index.js';

export function createParticipantStore() {
  const participantsBySocket = new Map<WebSocket, Participant & { room: string }>();
  const list = (room: string): Participant[] => {
    const participants = new Map<string, Participant>();
    participantsBySocket.forEach((participant) => {
      if (participant.room === room) {
        participants.set(participant.clientId, {
          clientId: participant.clientId,
          name: participant.name,
        });
      }
    });

    return [...participants.values()];
  };

  return {
    join: (socket: WebSocket, room: string, participant: Participant) => {
      participantsBySocket.set(socket, { ...participant, room });
    },
    leave: (socket: WebSocket) => {
      participantsBySocket.delete(socket);
    },
    list,
  };
}
