import { useEffect, useState } from 'react';

type Room = {
  _id: string;
  name: string;
};

type ChatRoomsProps = {
  refreshSignal?: number;
  onSelectRoom?: (room: Room) => void;
};

export const ChatRooms = ({ refreshSignal = 0, onSelectRoom }: ChatRoomsProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function fetchRooms() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:5000/api/rooms', {
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to fetch rooms');
        }
        const data: Room[] = await res.json();
        if (!isCancelled) setRooms(data);
      } catch (err) {
        if (!isCancelled) setError((err as Error).message);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }
    fetchRooms();
    return () => {
      isCancelled = true;
    };
  }, [refreshSignal]);

  if (isLoading) {
    return (
      <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-24 rounded-lg bg-gray-800/70 border border-gray-700" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-900/40 border border-red-700 text-red-200">
        {error}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-gray-300">No rooms yet. Create one to get started.</div>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">Available Rooms</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <button
            key={room._id}
            className="text-left w-full h-24 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 transition-colors p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => onSelectRoom?.(room)}
          >
            <div className="text-lg font-medium text-white truncate">{room.name}</div>
            <div className="text-sm text-gray-400 mt-1">Click to join</div>
          </button>
        ))}
      </div>
    </div>
  );
};

