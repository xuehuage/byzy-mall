import { useState, useEffect, useRef, useCallback } from 'react';

// 定义 WebSocket 状态类型
export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WebSocketMessage {
    type: string;
    data?: any;
    client_sn?: string;
    timestamp?: string;
}

interface UseWebSocketProps {
    clientSn?: string;
    onMessage?: (message: WebSocketMessage) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
    autoConnect?: boolean;
}

export const useWebSocket = ({
    clientSn,
    onMessage,
    onOpen,
    onClose,
    onError,
    autoConnect = true
}: UseWebSocketProps) => {
    const [status, setStatus] = useState<WebSocketStatus>('disconnected');
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 🔥 修复：使用更稳定的挂载状态管理
    const isMountedRef = useRef(true);
    const componentIdRef = useRef(`ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    const reconnectCountRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 3;


    // 构建 WebSocket URL
    const buildWebSocketUrl = useCallback((sn: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
        const wsUrl = `${baseUrl}?client_sn=${sn}`;
        return wsUrl;
    }, []);

    // 连接 WebSocket
    const connect = useCallback((sn: string) => {

        // 🔥 修复：移除严格的挂载检查，改为在回调中检查
        if (!sn) {
            return;
        }

        // 检查重连次数
        if (reconnectCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
            return;
        }

        // 关闭现有连接
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // 清除重连定时器
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        setStatus('connecting');

        try {
            const wsUrl = buildWebSocketUrl(sn);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                // 🔥 修复：在回调中检查挂载状态
                if (isMountedRef.current) {
                    setStatus('connected');
                    reconnectCountRef.current = 0;
                    onOpen?.();
                } else {
                    ws.close();
                }
            };

            ws.onmessage = (event) => {
                // 🔥 修复：在回调中检查挂载状态
                if (isMountedRef.current) {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        onMessage?.(message);
                    } catch (error) {
                        console.error(`❌ [useWebSocket-${componentIdRef.current}] 解析 WebSocket 消息失败:`, error);
                    }
                } else {
                    console.log(`⚠️ [useWebSocket-${componentIdRef.current}] 收到消息但组件已卸载`);
                }
            };

            ws.onclose = (event) => {


                // 🔥 修复：在回调中检查挂载状态
                if (isMountedRef.current) {
                    setStatus('disconnected');
                    onClose?.();

                    // 如果不是正常关闭且组件仍挂载，尝试重连
                    if (event.code !== 1000 && isMountedRef.current && sn) {
                        reconnectCountRef.current += 1;
                        const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);

                        reconnectTimeoutRef.current = setTimeout(() => {
                            connect(sn);
                        }, delay);
                    }
                }
            };

            ws.onerror = (error) => {
                // 🔥 修复：在回调中检查挂载状态
                if (isMountedRef.current) {
                    setStatus('error');
                    onError?.(error);
                }
            };

        } catch (error) {
            // 🔥 修复：在回调中检查挂载状态
            if (isMountedRef.current) {
                setStatus('error');
            }
        }
    }, [buildWebSocketUrl, onOpen, onMessage, onClose, onError]);

    // 发送消息
    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
            return true;
        }
        return false;
    }, []);

    // 关闭连接
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close(1000, 'Manual close');
            wsRef.current = null;
        }

        // 🔥 修复：只在挂载时更新状态
        if (isMountedRef.current) {
            setStatus('disconnected');
            reconnectCountRef.current = 0;
        }
    }, []);

    // 自动连接
    useEffect(() => {

        if (autoConnect && clientSn) {
            connect(clientSn);
        }
    }, [autoConnect, clientSn, connect]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            disconnect();
        };
    }, [disconnect]);

    return {
        status,
        connect,
        disconnect,
        sendMessage,
        isConnected: status === 'connected'
    };
};