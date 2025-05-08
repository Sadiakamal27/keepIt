// hooks/useWebSocketNote.js
import { useEffect, useRef } from "react";

export default function useWebSocketNote(noteId, onMessage) {
  const socket = useRef(null);

  useEffect(() => {
    socket.current = new WebSocket(`ws://localhost:5000/collaborate/${noteId}`);

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    return () => {
      socket.current.close();
    };
  }, [noteId, onMessage]);

  const sendUpdate = (data) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify(data));
    }
  };

  return sendUpdate;
}
