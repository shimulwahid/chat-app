import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [roomUsers, setRoomUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [privateTo, setPrivateTo] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ================= SOCKET CONNECTION =================
  useEffect(() => {
    const newSocket = io("http://192.168.0.105:5000"); // change if deployed

    newSocket.on("connect", () => setConnected(true));
    newSocket.on("disconnect", () => setConnected(false));

    // receive room message
    newSocket.on("chat message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // receive users list
    newSocket.on("room users", (users) => {
      setRoomUsers(users);
    });

    // typing indicator
    newSocket.on("typing", (username) => {
      setTypingUser(username);
    });

    newSocket.on("stop typing", () => {
      setTypingUser("");
    });

    // private message
    newSocket.on("private message", (msg) => {
      setMessages((prev) => [...prev, { ...msg, private: true }]);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // ================= AUTO SCROLL =================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ================= AUTO FOCUS =================
  useEffect(() => {
    if (joined) inputRef.current?.focus();
  }, [joined]);

  // ================= JOIN ROOM =================
  const joinRoom = () => {
    if (!username || !room || !socket) return;

    socket.emit("join room", { room, username });
    setJoined(true);
    setMessages([]);
  };

  // ================= SEND MESSAGE =================
  const sendMessage = (e) => {
    e.preventDefault();
    if (!message || !socket) return;

    // private message
    if (privateTo) {
      socket.emit("private message", {
        toSocketId: privateTo.socketId,
        message: message,
      });

      setMessages((prev) => [
        ...prev,
        {
          user: "You (private)",
          text: message,
          time: new Date().toLocaleTimeString(),
          private: true,
        },
      ]);
    } else {
      socket.emit("chat message", message);
    }

    setMessage("");
  };

  // ================= HANDLE TYPING =================
  const handleTyping = (value) => {
    setMessage(value);

    if (!socket) return;

    socket.emit("typing");

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop typing");
    }, 1000);
  };

  // ================= UI =================
  return (
    <div className="container">
      {!joined ? (
        <div className="join-box">
          <h2>Join Chat</h2>
          <p>Status: {connected ? "Connected ✅" : "Disconnected ❌"}</p>

          <input
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            placeholder="Enter room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />

          <button onClick={joinRoom}>Join</button>
        </div>
      ) : (
        <>
          {/* HEADER */}
          <div className="header">
            Room: {room} | You: {username}
            <div style={{ fontSize: "12px", marginTop: "5px" }}>
              Online: {roomUsers.map((u) => u.username).join(", ")}
            </div>
          </div>

          {/* USERS LIST */}
          <div style={{ borderBottom: "1px solid #ddd", padding: "10px" }}>
            <b>Users (Click for Private Chat)</b>

            {roomUsers.map((u, i) => (
              <div
                key={i}
                style={{ cursor: "pointer" }}
                onClick={() => setPrivateTo(u)}
              >
                {u.username}
              </div>
            ))}

            {privateTo && (
              <div style={{ color: "red", marginTop: "5px" }}>
                Private chat with: {privateTo.username}
                <button
                  style={{ marginLeft: "10px" }}
                  onClick={() => setPrivateTo(null)}
                >
                  Back to room
                </button>
              </div>
            )}
          </div>

          {/* MESSAGES */}
          <div className="messages">
            {messages.map((msg, i) => {
              const isMe = msg.user === username || msg.user === "You (private)";

              return (
                <div
                  key={i}
                  className={`message ${
                    isMe ? "my-message" : "other-message"
                  }`}
                >
                  <div
                    className={`bubble ${
                      isMe ? "my-bubble" : "other-bubble"
                    }`}
                  >
                    <div style={{ fontSize: "12px", opacity: 0.7 }}>
                      {msg.user} • {msg.time}
                    </div>

                    <div>
                      {msg.private && (
                        <b style={{ color: "red" }}>[PRIVATE]</b>
                      )}{" "}
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* TYPING */}
            {typingUser && typingUser !== username && (
              <div style={{ fontSize: "12px", opacity: 0.7 }}>
                {typingUser} is typing...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <form className="input-area" onSubmit={sendMessage}>
            <input
              ref={inputRef}
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="Type message..."
            />
            <button>Send</button>
          </form>
        </>
      )}
    </div>
  );
}

export default App;
