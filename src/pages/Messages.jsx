// src/pages/Messages.jsx
import MessageList from "../components/MessageList";

export default function Messages() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <MessageList />
      </div>
    </div>
  );
}