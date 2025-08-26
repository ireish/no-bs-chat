import { useState } from 'react';
import { socket } from '../socket';

type User = {
  _id: string;
  displayName: string;
  image: string;
};

type Room = {
  _id: string;
  name: string;
  number: string;
  users: User[];
};

type JoinRoomModalProps = {
  defaultRoomNumber?: string;
  onClose: () => void;
  onJoined: (room: Room) => void;
};

export const JoinRoomModal = ({ defaultRoomNumber = '', onClose, onJoined }: JoinRoomModalProps) => {
  const [roomNumber, setRoomNumber] = useState(defaultRoomNumber);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = () => {
    setError(null);
    setIsSubmitting(true);
    socket.emit('joinRoomByNumber', { roomNumber, password }, (res: any) => {
      setIsSubmitting(false);
      if (!res?.ok) {
        setError(res?.error || 'Failed to join room');
        return;
      }
      onJoined(res.room as Room);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Join Room</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Room Number</label>
            <input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g., 123456"
              className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-indigo-500 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password (optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password if required"
              className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-indigo-500 text-white"
            />
          </div>
          {error && (
            <div className="text-sm text-red-400">{error}</div>
          )}
          <div className="flex justify-end space-x-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</button>
            <button onClick={handleJoin} disabled={isSubmitting || !roomNumber} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white">{isSubmitting ? 'Joining...' : 'Join'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
