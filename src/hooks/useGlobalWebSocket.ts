// hooks/useGlobalWebSocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';

type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WebSocketMessage {
    type: string;
    data?: any;
    client_sn?: string;
    timestamp?: string;
}

// 🔥 全局 WebSocket 管理器
class GlobalWebSocketManager {
    private static instance: GlobalWebSocketManager;
    private ws: WebSocket | null = null;
    private status: WebSocketStatus = 'disconnected';
    private listeners: Set<(status: WebSocketStatus) => void> = new Set();
    private messageHandlers: Set<(message: WebSocketMessage) => void> = new Set();
    private clientSn: string | null = null;

    static getInstance(): GlobalWebSocketManager {
        if (!GlobalWebSocketManager.instance) {
            GlobalWebSocketManager.instance = new GlobalWebSocketManager();
        }
        return GlobalWebSocketManager.instance;
    }

    connect(clientSn: string) {
        if (this.ws && this.clientSn === clientSn) {
            return;
        }

        this.clientSn = clientSn;
        this.setStatus('connecting');

        // 关闭现有连接
        if (this.ws) {
            this.ws.close();
        }

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}?client_sn=${clientSn}`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.setStatus('connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    this.notifyMessageHandlers(message);
                } catch (error) {
                    console.error('❌ 解析全局 WebSocket 消息失败:', error);
                }
            };

            this.ws.onclose = (event) => {
                this.setStatus('disconnected');
                this.ws = null;
            };

            this.ws.onerror = (error) => {
                this.setStatus('error');
            };

        } catch (error) {
            this.setStatus('error');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.setStatus('disconnected');
        this.clientSn = null;
    }

    getStatus(): WebSocketStatus {
        return this.status;
    }

    private setStatus(newStatus: WebSocketStatus) {
        this.status = newStatus;
        this.notifyStatusListeners();
    }

    addStatusListener(listener: (status: WebSocketStatus) => void) {
        this.listeners.add(listener);
    }

    removeStatusListener(listener: (status: WebSocketStatus) => void) {
        this.listeners.delete(listener);
    }

    addMessageHandler(handler: (message: WebSocketMessage) => void) {
        this.messageHandlers.add(handler);
    }

    removeMessageHandler(handler: (message: WebSocketMessage) => void) {
        this.messageHandlers.delete(handler);
    }

    private notifyStatusListeners() {
        this.listeners.forEach(listener => listener(this.status));
    }

    private notifyMessageHandlers(message: WebSocketMessage) {
        this.messageHandlers.forEach(handler => handler(message));
    }
}

// React Hook
export const useGlobalWebSocket = () => {
    const [status, setStatus] = useState<WebSocketStatus>('disconnected');
    const managerRef = useRef(GlobalWebSocketManager.getInstance());

    useEffect(() => {
        const manager = managerRef.current;

        const handleStatusChange = (newStatus: WebSocketStatus) => {
            setStatus(newStatus);
        };

        manager.addStatusListener(handleStatusChange);

        return () => {
            manager.removeStatusListener(handleStatusChange);
        };
    }, []);

    const connect = useCallback((clientSn: string) => {
        managerRef.current.connect(clientSn);
    }, []);

    const disconnect = useCallback(() => {
        managerRef.current.disconnect();
    }, []);

    const addMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
        managerRef.current.addMessageHandler(handler);
    }, []);

    const removeMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
        managerRef.current.removeMessageHandler(handler);
    }, []);

    return {
        status,
        connect,
        disconnect,
        addMessageHandler,
        removeMessageHandler,
        isConnected: status === 'connected'
    };
};