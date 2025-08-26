import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { ChatPage } from './components/ChatPage';
import { config } from './utils/config';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${config.API_BASE_URL}/api/profile`, {
          credentials: 'include', // Important: tells the browser to send cookies
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // The user is not logged in
          setUser(null);
        }
      } catch (error) {
        console.error("Could not fetch user profile", error);
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="App">
      { user ? <ChatPage user={user} /> : <LoginPage /> }
    </div>
  );
}

export default App;
