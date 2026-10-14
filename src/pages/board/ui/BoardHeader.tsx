import { CONNECTION_STATUS, type ConnectionStatus } from '@/src/shared/connection';
import styles from './BoardHeader.module.scss';
import { ROOM, ROOM_LABEL, type Room } from '@/shared/rooms';

type Props = {
  status: ConnectionStatus;
  room: Room;
  onRoomChange: (room: Room) => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function BoardHeader({ status, room, onRoomChange, onConnect, onDisconnect }: Props) {
  const connected = status === CONNECTION_STATUS.CONNECTED;
  const active =
    connected ||
    status === CONNECTION_STATUS.CONNECTING ||
    status === CONNECTION_STATUS.RECONNECTING ||
    status === CONNECTION_STATUS.ERROR;
  const closing = status === CONNECTION_STATUS.DISCONNECTING;
  const rooms = Object.values(ROOM);
  const selectedRoomIndex = rooms.indexOf(room);

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1>Job Board</h1>
        <span>Your work, in sync.</span>
      </div>
      <div className={styles.controls}>
        <fieldset className={styles.room} disabled={active || closing}>
          <legend>Room</legend>
          <div
            className={styles.roomOptions}
            style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}
          >
            <span
              aria-hidden="true"
              className={styles.roomSlider}
              style={{
                width: `calc((100% - 6px) / ${rooms.length})`,
                transform: `translateX(${selectedRoomIndex * 100}%)`,
              }}
            />
            {rooms.map((roomOption) => (
              <label key={roomOption} className={styles.roomOption}>
                <input
                  type="radio"
                  name="room"
                  value={roomOption}
                  checked={room === roomOption}
                  onChange={() => onRoomChange(roomOption)}
                />
                <span>{ROOM_LABEL[roomOption]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <span role="status" className={`${styles.status} ${connected ? styles.connected : ''}`}>
          <span className={styles.dot} />
          {status}
        </span>
        <button
          className={styles.button}
          disabled={closing || (!active && !room.trim())}
          onClick={active ? onDisconnect : onConnect}
        >
          {active || closing ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    </header>
  );
}
