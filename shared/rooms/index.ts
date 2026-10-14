export const ROOM = {
  ALPHA: 'alpha',
  BETA: 'beta',
} as const;

export type Room = (typeof ROOM)[keyof typeof ROOM];

export const ROOM_LABEL: Record<Room, string> = {
  [ROOM.ALPHA]: 'Alpha',
  [ROOM.BETA]: 'Beta',
};

export const DEFAULT_ROOM = ROOM.ALPHA;
