import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { format } from 'date-fns';
import { config } from '../utils/config';
import type { Message, Room, User } from '../types/chat';

// Types moved to shared definitions


type ChatWindowProps = {
    room: Room;
    user: User;
    onLeaveRoom: () => void;
};

export const ChatWindow = ({ room, user, onLeaveRoom }: ChatWindowProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    useEffect(() => {
        // Fetch initial messages
        const fetchMessages = async () => {
            try {
                const res = await fetch(`${config.API_BASE_URL}/api/rooms/${room._id}/messages`, {
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data);
                }
            } catch (error) {
                console.error("Failed to fetch messages", error);
            }
        };

        fetchMessages();
        
        // Listen for new messages
        const handleNewMessage = (message: Message) => {
            if (message.room === room._id) {
                setMessages((prevMessages) => [...prevMessages, message]);
            }
        };

        socket.on('newMessage', handleNewMessage);

        return () => {
            socket.off('newMessage', handleNewMessage);
        };
    }, [room._id]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            const text = newMessage;
            setNewMessage('');
            socket.emit('sendMessage', { roomId: room._id, text }, (res: any) => {
                if (!res?.ok) {
                    // Optionally show error
                    return;
                }
                // No need to add to list here because server emits newMessage
            });
        }
    };

    return (
        <div className="flex flex-col h-[80vh] bg-gray-800 rounded-lg">
            <div className="p-4 bg-gray-900 rounded-t-lg flex justify-between items-center">
                <h2 className="text-xl font-bold">{room.name}</h2>
                <button onClick={onLeaveRoom} className="text-sm text-red-400 hover:text-red-300">Leave Room</button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((msg) => (
                    <div key={msg._id} className={`flex items-start mb-4 ${msg.user._id === user._id ? 'justify-end' : ''}`}>
                        {msg.user._id !== user._id && (
                             <img src={msg.user.image} alt={msg.user.displayName} className="w-8 h-8 rounded-full mr-3" />
                        )}
                        <div className={`rounded-lg px-4 py-2 max-w-xs lg:max-w-md ${msg.user._id === user._id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                            <div className="font-bold text-sm">{msg.user.displayName}</div>
                            <p>{msg.text}</p>
                            <div className="text-xs text-gray-400 mt-1 text-right">{format(new Date(msg.createdAt), 'p')}</div>
                        </div>
                         {msg.user._id === user._id && (
                             <img src={msg.user.image} alt={user.displayName} className="w-8 h-8 rounded-full ml-3" />
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-gray-900 rounded-b-lg flex">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 rounded-l-md bg-gray-700 border border-gray-600 focus:outline-none focus:border-indigo-500 text-white"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-r-md">Send</button>
            </form>
        </div>
    );
};
