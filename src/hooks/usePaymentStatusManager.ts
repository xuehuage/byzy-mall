// hooks/usePaymentStatusManager.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useGlobalWebSocket } from './useGlobalWebSocket';
import { usePollingManager } from './usePollingManager';
import { OrderStatus } from '@/types/payment.types';

interface PaymentStatusManagerConfig {
    clientSn: string;
    onPaymentSuccess: (paymentData: any) => void;
}

export const usePaymentStatusManager = () => {
    const [currentMode, setCurrentMode] = useState<'websocket' | 'polling'>('websocket');
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'degraded' | 'connecting'>('disconnected');

    const configRef = useRef<PaymentStatusManagerConfig | null>(null);
    const hasHandledSuccessRef = useRef(false);
    const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const websocketRetryCountRef = useRef(0);
    const maxWebSocketRetries = 3;

    // WebSocket Hook
    const {
        status: websocketStatus,
        connect: connectWebSocket,
        disconnect: disconnectWebSocket,
        addMessageHandler,
        removeMessageHandler,
        getActualStatus,
        isActuallyConnected,
        isConnected: isWebSocketConnected
    } = useGlobalWebSocket();

    // 轮询管理器
    const {
        startPolling,
        stopPolling,
        isPolling
    } = usePollingManager();

    // 处理支付成功
    const handlePaymentSuccess = useCallback((paymentData: any) => {
        if (hasHandledSuccessRef.current) return;
        hasHandledSuccessRef.current = true;

        console.log('💰 支付成功处理开始');

        if (configRef.current) {
            configRef.current.onPaymentSuccess(paymentData);
        }

        // 停止所有监听
        stopPolling();
        disconnectWebSocket();
        if (statusCheckIntervalRef.current) {
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
        }
    }, [stopPolling, disconnectWebSocket]);

    // WebSocket消息处理
    const handleWebSocketMessage = useCallback((message: any) => {
        console.log('📨 WebSocket 消息处理:', message);
        if (message.type === 'PAYMENT_SUCCESS') {
            console.log('🎯 WebSocket收到支付成功通知');
            handlePaymentSuccess(message.data);
        }
        // 处理连接建立消息
        else if (message.type === 'CONNECTION_ESTABLISHED') {
            console.log('🔗 WebSocket 连接已由服务器确认');
            // 不需要额外处理，状态监听器会自动处理
        }
    }, [handlePaymentSuccess]);

    // 状态变化处理（轮询用）
    const handleStatusChange = useCallback((status: OrderStatus, data?: any) => {
        console.log('🔄 轮询状态变化:', status);
        if (status === 'PAID') {
            console.log('🎯 轮询检测到支付成功');
            handlePaymentSuccess(data);
        }
    }, [handlePaymentSuccess]);

    // 使用实际状态检查 WebSocket 连接状态
    const checkWebSocketStatus = useCallback(() => {
        if (!configRef.current || hasHandledSuccessRef.current) return;

        const actualStatus = getActualStatus();
        const isActuallyConnectedNow = isActuallyConnected();

        console.log(`🔍 检查 WebSocket 状态: React状态=${websocketStatus}, 实际状态=${actualStatus}, 是否已连接=${isActuallyConnectedNow}`);

        if (isActuallyConnectedNow) {
            setConnectionStatus('connected');
            setCurrentMode('websocket');
            stopPolling();
            websocketRetryCountRef.current = 0;
            console.log('✅ WebSocket连接成功，使用实时模式');
        } else if (actualStatus === 'error' || actualStatus === 'disconnected') {
            if (!isPolling() && !hasHandledSuccessRef.current) {
                websocketRetryCountRef.current++;

                if (websocketRetryCountRef.current <= maxWebSocketRetries) {
                    console.log(`🔄 WebSocket 连接失败，尝试重新连接 (${websocketRetryCountRef.current}/${maxWebSocketRetries})`);
                    if (configRef.current) {
                        connectWebSocket(configRef.current.clientSn);
                    }
                } else {
                    console.log('🔄 WebSocket 重试次数耗尽，切换到轮询模式');
                    setCurrentMode('polling');
                    setConnectionStatus('degraded');

                    if (configRef.current) {
                        startPolling({
                            clientSn: configRef.current.clientSn,
                            onStatusChange: handleStatusChange,
                            onPaymentSuccess: handlePaymentSuccess,
                            onOrderExpired: () => {
                                console.log('📄 轮询检测到订单过期');
                            }
                        }, Date.now());
                    }
                }
            }
        } else if (actualStatus === 'connecting') {
            setConnectionStatus('connecting');
            console.log('⏳ WebSocket 连接中...');
        }
    }, [
        getActualStatus,
        isActuallyConnected,
        websocketStatus,
        connectWebSocket,
        stopPolling,
        startPolling,
        isPolling,
        handleStatusChange,
        handlePaymentSuccess
    ]);

    // 初始化支付状态监听
    const initializePaymentStatus = useCallback((config: PaymentStatusManagerConfig) => {
        configRef.current = config;
        hasHandledSuccessRef.current = false;
        websocketRetryCountRef.current = 0;

        console.log('🚀 初始化支付状态监听');

        // 设置WebSocket消息处理器
        addMessageHandler(handleWebSocketMessage);

        // 优先使用WebSocket
        setCurrentMode('websocket');
        setConnectionStatus('connecting');

        console.log(`🔗 开始连接 WebSocket，clientSn: ${config.clientSn}`);
        connectWebSocket(config.clientSn);

        // 设置状态检查 - 但只在连接建立前检查
        const startTime = Date.now();
        const maxCheckTime = 10000; // 最多检查10秒

        statusCheckIntervalRef.current = setInterval(() => {
            const actualStatus = getActualStatus();
            const isActuallyConnectedNow = isActuallyConnected();

            // 如果已经连接或者超过最大检查时间，停止检查
            if (isActuallyConnectedNow || (Date.now() - startTime) > maxCheckTime) {
                if (statusCheckIntervalRef.current) {
                    clearInterval(statusCheckIntervalRef.current);
                    statusCheckIntervalRef.current = null;
                }

                if (!isActuallyConnectedNow) {
                    // 连接失败，切换到轮询
                    console.log('⏰ WebSocket 连接超时，切换到轮询模式');
                    setCurrentMode('polling');
                    setConnectionStatus('degraded');

                    startPolling({
                        clientSn: config.clientSn,
                        onStatusChange: handleStatusChange,
                        onPaymentSuccess: handlePaymentSuccess,
                        onOrderExpired: () => {
                            console.log('📄 轮询检测到订单过期');
                        }
                    }, Date.now());
                }
            } else {
                checkWebSocketStatus();
            }
        }, 1000);

        return () => {
            if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
                statusCheckIntervalRef.current = null;
            }
            removeMessageHandler(handleWebSocketMessage);
        };
    }, [
        connectWebSocket,
        addMessageHandler,
        removeMessageHandler,
        handleWebSocketMessage,
        checkWebSocketStatus,
        getActualStatus,
        isActuallyConnected,
        startPolling,
        handleStatusChange,
        handlePaymentSuccess
    ]);

    // 手动检查支付状态
    const manualCheckStatus = useCallback(async () => {
        if (!configRef.current || hasHandledSuccessRef.current) return;

        try {
            const { fetchPaymentStatus } = await import('@/api/paymentApi');
            const response = await fetchPaymentStatus(configRef.current.clientSn);
            const status = response.data.biz_response.data?.order_status as OrderStatus;

            console.log('🔍 手动检查支付状态:', status);

            if (status === 'PAID') {
                handlePaymentSuccess(response.data.biz_response.data);
            }

            return status;
        } catch (error) {
            console.error('手动检查支付状态失败:', error);
            return null;
        }
    }, [handlePaymentSuccess]);

    // 清理函数
    const cleanup = useCallback(() => {
        console.log('🧹 清理支付状态管理器');
        stopPolling();
        disconnectWebSocket();
        removeMessageHandler(handleWebSocketMessage);
        if (statusCheckIntervalRef.current) {
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
        }
    }, [stopPolling, disconnectWebSocket, removeMessageHandler, handleWebSocketMessage]);

    return {
        // 状态
        currentMode,
        connectionStatus,
        isWebSocketConnected,
        isPolling: isPolling(),

        // 方法
        initializePaymentStatus,
        manualCheckStatus,

        // 清理
        cleanup
    };
};