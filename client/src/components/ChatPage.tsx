import { useEffect, useState } from 'react';
import { socket } from '../socket';
import { config } from '../utils/config';
import { ChatRooms } from './ChatRooms';
import { ChatWindow } from './ChatWindow'; // Import ChatWindow
import { JoinRoomModal } from './JoinRoomModal';

import type { User, Room } from '../types/chat';

type ChatPageProps = {
  user: User;
};

export const ChatPage = ({ user }: ChatPageProps) => {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [roomName, setRoomName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showJoinModal, setShowJoinModal] = useState<{ open: boolean; defaultNumber?: string }>({ open: false });
  const [createPassword, setCreatePassword] = useState('');

  const handleCreateRoom = async () => {
    if (!roomName) return; // Don't create empty rooms

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // We'll need to handle credentials later for our authCheck
        },
        credentials: 'include',
        body: JSON.stringify({ name: roomName, password: createPassword || undefined }),
      });

      const newRoom = await response.json();
      if (response.ok) {
        alert(`Room "${newRoom.name}" created successfully!`);
        setRoomName(''); // Clear the input field
        setCreatePassword('');
        // The room list will update automatically via socket event
      } else {
        throw new Error(newRoom.message || 'Failed to create room');
      }
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    }
  };

  useEffect(() => {
    // Listener for when the connection is established
    function onConnect() {
      setIsConnected(true);
      console.log('Connected to server!');
    }

    // Listener for when the connection is dropped
    function onDisconnect() {
      setIsConnected(false);
      console.log('Disconnected from server.');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    socket.connect();

    // Cleanup listeners when the component unmounts
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, []);

  const handleLeaveRoom = () => {
    if (selectedRoom) {
      socket.emit('leaveRoom', { roomId: selectedRoom._id });
      setSelectedRoom(null);
    }
  };

  if (selectedRoom) {
    return <ChatWindow room={selectedRoom} user={user} onLeaveRoom={handleLeaveRoom} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <h2 className="text-4xl font-bold mb-2">Chat Application</h2>
      <div className="text-sm mb-8 text-gray-400">Status: {isConnected ? 'Connected' : 'Disconnected'}</div>

      <div className="create-room flex flex-col items-center space-y-4 mb-12">
        <h3 className="text-2xl font-semibold">Create a New Room</h3>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter new room name"
          className="w-full md:w-80 px-4 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-indigo-500 text-white"
        />
        <input
          type="password"
          value={createPassword}
          onChange={(e) => setCreatePassword(e.target.value)}
          placeholder="Set password (optional)"
          className="w-full md:w-80 px-4 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-indigo-500 text-white"
        />
        <button
          onClick={handleCreateRoom}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-md shadow w-full md:w-auto"
        >
          Create Room
        </button>
        <button
          onClick={() => setShowJoinModal({ open: true })}
          className="border border-gray-600 hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-md shadow w-full md:w-auto"
        >
          Join a Room
        </button>
      </div>

      <div className="w-full max-w-5xl">
        <ChatRooms onRequestJoin={(defaultNumber) => setShowJoinModal({ open: true, defaultNumber })} />
      </div>

      {showJoinModal.open && (
        <JoinRoomModal
          defaultRoomNumber={showJoinModal.defaultNumber}
          onClose={() => setShowJoinModal({ open: false })}
          onJoined={(room) => setSelectedRoom(room)}
        />
      )}
    </div>
  );
};