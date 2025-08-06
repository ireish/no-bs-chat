// import React from 'react';

export const LoginPage = () => {
  return (
    <div>
      <h2>Welcome to the Chat App</h2>
      <p>Please sign in to continue.</p>
      <a href="http://localhost:5000/auth/google">
        <button>Sign in with Google</button>
      </a>
    </div>
  );
};