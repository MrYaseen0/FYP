/**
 * Healtheon — WebSocket Context
 * Provides real-time case streaming to all components.
 */
import { createContext, useContext, useCallback, useRef } from 'react';
import { createCaseWebSocket } from '../api';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { user } = useAuth();
  const connectionsRef = useRef({});

  const connectToCase = useCallback((caseId, onEvent) => {
    const token = localStorage.getItem('ht_token');
    if (!token || !caseId) return null;

    // Close existing connection for this case
    if (connectionsRef.current[caseId]) {
      connectionsRef.current[caseId].close();
    }

    const ws = createCaseWebSocket(caseId, token, (event) => {
      onEvent(event);
    });

    connectionsRef.current[caseId] = ws;
    return ws;
  }, []);

  const disconnectFromCase = useCallback((caseId) => {
    if (connectionsRef.current[caseId]) {
      connectionsRef.current[caseId].close();
      delete connectionsRef.current[caseId];
    }
  }, []);

  const disconnectAll = useCallback(() => {
    Object.values(connectionsRef.current).forEach(ws => ws.close());
    connectionsRef.current = {};
  }, []);

  return (
    <WebSocketContext.Provider value={{ connectToCase, disconnectFromCase, disconnectAll }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
