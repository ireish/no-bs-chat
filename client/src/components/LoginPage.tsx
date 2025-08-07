// import React from 'react';

export const LoginPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h2 className="text-4xl font-bold mb-4">Welcome to Chat App</h2>
      <p className="mb-6 text-gray-300">Please sign in to continue.</p>
      <a href="http://localhost:5000/auth/google">
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-md shadow">
          Sign in with Google
        </button>
      </a>
    </div>
  );
};