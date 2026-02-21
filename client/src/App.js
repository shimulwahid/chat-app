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

  useEffect(() => {
    const newSocket = io("http://localhost:5000"); // backend URL
    setSocket(newSocket);

    newSocket.on("connect", () => setConnected(true));
    newSocket.on("disconnect", () => setConnected(false));

    newSocket.on("chat message", (msg) => setMessages(prev => [...prev, msg]));
    newSocket.on("room users", (users) => setRoomUsers(users));
    newSocket.on("typing", (user) => setTypingUser(user));
    newSocket.on("stop typing", () => setTypingUser(""));
    newSocket.on("private message", (msg) => setMessages(prev => [...prev, { ...msg, private: true }]));

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (joined) inputRef.current?.focus(); }, [joined]);

  const joinRoom = () => {
    if (!username || !room || !socket) return;
    socket.emit("join room", { room, username });
    setJoined(true);
    setMessages([]);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message || !socket) return;

    if (privateTo) {
      socket.emit("private message", { toSocketId: privateTo.socketId, message });
      setMessages(prev => [...prev, { user: "You (private)", text: message, time: new Date().toLocaleTimeString(), private: true }]);
    } else {
      socket.emit("chat message", message);
    }
    setMessage("");
  };

  const handleTyping = (value) => {
    setMessage(value);
    if (!socket) return;

    socket.emit("typing");
    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => { socket.emit("stop typing"); }, 1000);
  };

  return (
    <div className="container">
      {!joined ? (
        <div className="join-box">
          <h2>Join Chat</h2>
          <p>Status: {connected ? "Connected ✅" : "Disconnected ❌"}</p>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input placeholder="Room" value={room} onChange={e => setRoom(e.target.value)} />
          <button onClick={joinRoom}>Join</button>
        </div>
      ) : (
        <>
          <div className="header">
            Room: {room} | You: {username}
            <div style={{ fontSize: "12px", marginTop: "5px" }}>
              Online: {roomUsers.map(u => u.username).join(", ")}
            </div>
          </div>

          <div className="users-list">
            <b>Users (Click for Private Chat)</b>
            {roomUsers.map((u, i) => (
              <div key={i} style={{ cursor: "pointer" }} onClick={() => setPrivateTo(u)}>
                {u.username}
              </div>
            ))}
            {privateTo && (
              <div style={{ color: "red", marginTop: "5px" }}>
                Private chat with: {privateTo.username}
                <button style={{ marginLeft: "10px" }} onClick={() => setPrivateTo(null)}>Back</button>
              </div>
            )}
          </div>

          <div className="messages">
            {messages.map((msg, i) => {
              const isMe = msg.user === username || msg.user === "You (private)";
              return (
                <div key={i} className={`message ${isMe ? "my-message" : "other-message"}`}>
                  <div className={`bubble ${isMe ? "my-bubble" : "other-bubble"}`}>
                    <div style={{ fontSize: "12px", opacity: 0.7 }}>{msg.user} • {msg.time}</div>
                    <div>{msg.private && <b style={{ color: "red" }}>[PRIVATE]</b>} {msg.text}</div>
                  </div>
                </div>
              );
            })}
            {typingUser && typingUser !== username && <div style={{ fontSize: "12px", opacity: 0.7 }}>{typingUser} is typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          <form className="input-area" onSubmit={sendMessage}>
            <input ref={inputRef} value={message} onChange={e => handleTyping(e.target.value)} placeholder="Type message..." />
            <button>Send</button>
          </form>
        </>
      )}
    </div>
  );
}

export default App;