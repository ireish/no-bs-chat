import { useEffect, useState } from 'react';
import { socket } from '../socket';
import { ChatRooms } from './ChatRooms';

export const ChatPage = () => {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [roomName, setRoomName] = useState('');
  const [roomsRefresh, setRoomsRefresh] = useState(0);

  const handleCreateRoom = async () => {
    if (!roomName) return; // Don't create empty rooms

    try {
      const response = await fetch('http://localhost:5000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // We'll need to handle credentials later for our authCheck
        },
        credentials: 'include',
        body: JSON.stringify({ name: roomName }),
      });

      const newRoom = await response.json();
      if (response.ok) {
        alert(`Room "${newRoom.name}" created successfully!`);
        setRoomName(''); // Clear the input field
        setRoomsRefresh((v) => v + 1); // Refresh rooms list
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

    // Cleanup listeners when the component unmounts
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <h2 className="text-4xl font-bold mb-2">Chat Application</h2>
      <div className="text-sm mb-8 text-gray-400">Status: {isConnected ? 'Connected' : 'Disconnected'}</div>

      <div className="create-room flex flex-col items-center space-y-4">
        <h3 className="text-2xl font-semibold">Create a New Room</h3>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter new room name"
          className="w-64 px-4 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:border-indigo-500 text-white"
        />
        <button
          onClick={handleCreateRoom}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-md shadow"
        >
          Create Room
        </button>
      </div>

      <div className="w-full max-w-5xl mt-12">
        <ChatRooms refreshSignal={roomsRefresh} />
      </div>
    </div>
  );
};