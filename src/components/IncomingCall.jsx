import { useState, useEffect } from 'react';

export default function IncomingCall({ callData, onAccept, onDecline }) {
  if (!callData) {
    return null;
  }

  const handleAccept = () => {
    console.log('IncomingCall: Accepting call:', callData);
    onAccept(callData);
  };

  const handleDecline = () => {
    console.log('IncomingCall: Declining call:', callData);
    onDecline(callData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {callData.caller_username.charAt(0).toUpperCase()}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Incoming Video Call
          </h3>
          <p className="text-gray-600">
            {callData.caller_username} is calling you
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleDecline}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full flex items-center gap-2 transition"
          >
            <span>Decline</span>
          </button>
          
          <button
            onClick={handleAccept}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full flex items-center gap-2 transition animate-pulse"
          >
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}