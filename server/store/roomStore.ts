import type { Job } from '@/shared/protocol/index.js';
import { DEFAULT_STORAGE_PATH, loadBoards, saveBoards } from './fileStorage.js';
import type { StoredBoards } from './storageSchema.js';

export type RoomState = {
  jobs: Job[];
  processedCreateRequests: Map<string, Job>;
  processedUpdateRequests: Set<string>;
  save: () => void;
};

export function createRoomStore(storagePath = DEFAULT_STORAGE_PATH) {
  const rooms = new Map<string, RoomState>();
  let savedSnapshot = loadBoards(storagePath);

  const restore = (snapshot: StoredBoards) => {
    const savedRooms = new Map(snapshot.rooms.map((room) => [room.name, room]));
    rooms.forEach((state, name) => {
      const saved = savedRooms.get(name);
      state.jobs.splice(0, state.jobs.length, ...(saved?.jobs ?? []));
      state.processedCreateRequests.clear();
      saved?.processedCreateRequests.forEach(([id, job]) =>
        state.processedCreateRequests.set(id, job),
      );
      state.processedUpdateRequests.clear();
      saved?.processedUpdateRequests.forEach((id) => state.processedUpdateRequests.add(id));
    });
  };

  const save = () => {
    const snapshot: StoredBoards = {
      formatVersion: 1,
      rooms: [...rooms].map(([name, state]) => ({
        name,
        jobs: state.jobs,
        processedCreateRequests: [...state.processedCreateRequests],
        processedUpdateRequests: [...state.processedUpdateRequests],
      })),
    };

    try {
      saveBoards(storagePath, snapshot);
      // Keep an independent copy for rollback after a failed write.
      savedSnapshot = structuredClone(snapshot);
    } catch (error) {
      restore(savedSnapshot);
      throw error;
    }
  };

  const getRoom = (room: string): RoomState => {
    let roomState = rooms.get(room);

    if (roomState === undefined) {
      roomState = {
        jobs: [],
        processedCreateRequests: new Map(),
        processedUpdateRequests: new Set(),
        save,
      };
      rooms.set(room, roomState);
    }

    return roomState;
  };

  savedSnapshot.rooms.forEach((saved) => getRoom(saved.name));
  restore(structuredClone(savedSnapshot));

  return { getRoom };
}
