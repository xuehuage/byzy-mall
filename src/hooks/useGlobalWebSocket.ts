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
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;

    static getInstance(): GlobalWebSocketManager {
        if (!GlobalWebSocketManager.instance) {
            GlobalWebSocketManager.instance = new GlobalWebSocketManager();
        }
        return GlobalWebSocketManager.instance;
    }

    connect(clientSn: string) {
        // 如果已经是连接状态且是同一个 clientSn，直接返回
        if (this.ws && this.getActualStatus() === 'connected' && this.clientSn === clientSn) {
            console.log('✅ WebSocket 已连接，跳过重复连接');
            return;
        }

        this.clientSn = clientSn;
        this.setStatus('connecting');

        // 关闭现有连接
        if (this.ws) {
            console.log('🔄 关闭现有 WebSocket 连接');
            this.ws.close();
            this.ws = null;
        }

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}?client_sn=${clientSn}`;

        try {
            console.log(`🔗 尝试连接 WebSocket: ${wsUrl}`);
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ WebSocket 连接成功');
                this.reconnectAttempts = 0; // 重置重连计数
                this.setStatus('connected'); // 确保状态更新
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    console.log('📨 收到 WebSocket 消息:', message);

                    // 如果收到连接建立消息，确保状态正确
                    if (message.type === 'CONNECTION_ESTABLISHED') {
                        console.log('🔗 服务器确认连接建立');
                        this.setStatus('connected');
                    }

                    this.notifyMessageHandlers(message);
                } catch (error) {
                    console.error('❌ 解析全局 WebSocket 消息失败:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log(`🔴 WebSocket 连接关闭，代码: ${event.code}, 原因: ${event.reason}`);
                this.setStatus('disconnected');
                this.ws = null;

                // 如果是异常关闭且未超过重试次数，尝试重新连接
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts && this.clientSn) {
                    this.reconnectAttempts++;
                    console.log(`🔄 准备重新连接 WebSocket... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => {
                        this.connect(this.clientSn!);
                    }, 3000);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket 连接错误:', error);
                this.setStatus('error');
            };

        } catch (error) {
            console.error('❌ 创建 WebSocket 连接异常:', error);
            this.setStatus('error');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }
        this.setStatus('disconnected');
        this.clientSn = null;
        this.reconnectAttempts = 0;
    }

    getStatus(): WebSocketStatus {
        return this.status;
    }

    // 获取实际的 WebSocket 连接状态
    getActualStatus(): WebSocketStatus {
        if (!this.ws) {
            return 'disconnected';
        }

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'connecting';
            case WebSocket.OPEN:
                return 'connected';
            case WebSocket.CLOSING:
            case WebSocket.CLOSED:
                return 'disconnected';
            default:
                return this.status;
        }
    }

    // 检查是否真正连接
    isActuallyConnected(): boolean {
        return this.getActualStatus() === 'connected';
    }

    private setStatus(newStatus: WebSocketStatus) {
        if (this.status !== newStatus) {
            console.log(`🔄 WebSocket 状态变化: ${this.status} -> ${newStatus}`);
            this.status = newStatus;
            this.notifyStatusListeners();
        } else {
            // 即使状态相同，也确保通知监听器（解决状态同步问题）
            console.log(`🔄 强制通知 WebSocket 状态: ${this.status}`);
            this.notifyStatusListeners();
        }
    }

    addStatusListener(listener: (status: WebSocketStatus) => void) {
        this.listeners.add(listener);
        // 立即通知当前状态
        listener(this.status);
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
        this.listeners.forEach(listener => {
            try {
                listener(this.status);
            } catch (error) {
                console.error('❌ 通知状态监听器失败:', error);
            }
        });
    }

    private notifyMessageHandlers(message: WebSocketMessage) {
        this.messageHandlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                console.error('❌ 通知消息处理器失败:', error);
            }
        });
    }
}

// React Hook
export const useGlobalWebSocket = () => {
    const [status, setStatus] = useState<WebSocketStatus>('disconnected');
    const managerRef = useRef(GlobalWebSocketManager.getInstance());

    useEffect(() => {
        const manager = managerRef.current;

        const handleStatusChange = (newStatus: WebSocketStatus) => {
            console.log(`🎯 React 状态更新: ${status} -> ${newStatus}`);
            setStatus(newStatus);
        };

        // 立即获取当前状态并设置
        const currentStatus = manager.getStatus();
        if (currentStatus !== status) {
            setStatus(currentStatus);
        }

        manager.addStatusListener(handleStatusChange);

        return () => {
            manager.removeStatusListener(handleStatusChange);
        };
    }, [status]); // 添加 status 依赖

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

    const getActualStatus = useCallback((): WebSocketStatus => {
        return managerRef.current.getActualStatus();
    }, []);

    const isActuallyConnected = useCallback((): boolean => {
        return managerRef.current.isActuallyConnected();
    }, []);

    return {
        status,
        connect,
        disconnect,
        addMessageHandler,
        removeMessageHandler,
        getActualStatus,
        isActuallyConnected,
        isConnected: status === 'connected'
    };
};