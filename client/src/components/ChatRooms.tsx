import { useEffect, useState } from 'react';
import { socket } from '../socket';
import { config } from '../utils/config';
import type { Room } from '../types/chat';

type RoomWithNumber = Room & { number: string };

type ChatRoomsProps = {
  onRequestJoin?: (roomNumber?: string) => void;
};

export const ChatRooms = ({ onRequestJoin }: ChatRoomsProps) => {
  const [rooms, setRooms] = useState<RoomWithNumber[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRooms() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${config.API_BASE_URL}/api/rooms`, {
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to fetch rooms');
        }
        const data: RoomWithNumber[] = await res.json();
        setRooms(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRooms();
    
    socket.on('updateRooms', (updatedRooms: RoomWithNumber[]) => {
      setRooms(updatedRooms);
    });

    return () => {
      socket.off('updateRooms');
    };
  }, []);

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
  
  const handleJoinClick = (room: RoomWithNumber) => {
    onRequestJoin && onRequestJoin(room.number);
  };


  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">Available Rooms</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <button
            key={room._id}
            className="text-left w-full h-auto rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 transition-colors p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => handleJoinClick(room)}
          >
            <div className="text-lg font-medium text-white truncate">{room.name}</div>
            <div className="text-xs text-gray-500 mt-1">Room #{room.number}</div>
            <div className="text-sm text-gray-400 mt-2">
              {room.users.length > 0 ? `${room.users.length} user(s) online` : 'No users online'}
            </div>
            <div className="flex -space-x-2 overflow-hidden mt-2">
              {room.users.map((u) => (
                <img
                  key={u._id}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-800"
                  src={u.image}
                  alt={u.displayName}
                  title={u.displayName}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

