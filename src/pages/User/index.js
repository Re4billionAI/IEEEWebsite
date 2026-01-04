import React from "react";

const User = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <header className="bg-white shadow w-full py-4">
        <h1 className="text-3xl font-bold text-center text-blue-600">
          Welcome to My User Website
        </h1>
      </header>

      <main className="flex flex-col items-center justify-center flex-grow">
        <p className="text-lg text-gray-700 mb-4">
         
        </p>
        <button className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">
          Learn More
        </button>
      </main>

      <footer className="bg-gray-200 w-full py-2 text-center">
        <p className="text-sm text-gray-600">&copy; 2025 My Website. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default User;
