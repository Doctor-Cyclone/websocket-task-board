import type { Job } from '@/shared/protocol/index.js';

export type RoomState = {
  jobs: Job[];
  processedCreateRequests: Map<string, Job>;
  processedUpdateRequests: Set<string>;
};

export function createRoomStore() {
  const rooms = new Map<string, RoomState>();

  const getRoom = (room: string): RoomState => {
    let roomState = rooms.get(room);

    if (roomState === undefined) {
      roomState = {
        jobs: [],
        processedCreateRequests: new Map(),
        processedUpdateRequests: new Set(),
      };
      rooms.set(room, roomState);
    }

    return roomState;
  };

  return { getRoom };
}
