// hooks/usePollingManager.ts
import { useCallback, useRef } from 'react';
import { fetchPaymentStatus } from '@/api/paymentApi';
import { OrderStatus } from '@/types/payment.types';

interface PollingConfig {
    clientSn: string;
    onStatusChange: (status: OrderStatus, data?: any) => void;
    onPaymentSuccess: (paymentData: any) => void;
    onOrderExpired?: () => void; // 新增：订单过期回调
}

export const usePollingManager = () => {
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingConfigRef = useRef<PollingConfig | null>(null);
    const isPollingRef = useRef(false);
    const pollingStartTimeRef = useRef<number | null>(null);
    const orderCreatedTimeRef = useRef<number | null>(null); // 新增：记录订单创建时间

    // 基于业务场景的智能轮询间隔策略
    const getPollingInterval = useCallback((elapsedMinutes: number): number => {
        // 业务场景分析：
        // 0-1分钟：用户保存二维码、打开微信 -> 支付概率低，频率较低
        // 1-4分钟：用户扫描二维码、输入密码 -> 支付高峰期，频率最高
        // 4-5分钟：支付接近截止 -> 频率降低，准备过期处理
        // 5分钟后：订单已过期，停止轮询

        if (elapsedMinutes < 1) return 10000;      // 前1分钟：10秒（用户准备阶段）
        if (elapsedMinutes < 4) return 3000;       // 1-4分钟：3秒（支付高峰期）
        if (elapsedMinutes < 5) return 5000;       // 4-5分钟：5秒（接近过期）
        return 0;                                  // 5分钟后停止
    }, []);

    // 检查订单是否过期（5分钟有效期）
    const isOrderExpired = useCallback((createdTime: number): boolean => {
        return Date.now() - createdTime >= 5 * 60 * 1000; // 5分钟过期
    }, []);

    // 启动轮询
    const startPolling = useCallback((config: PollingConfig, orderCreatedTime: number) => {
        if (isPollingRef.current) return;

        // 检查订单是否已经过期
        if (isOrderExpired(orderCreatedTime)) {
            console.log('🕒 订单已过期，不启动轮询');
            if (config.onOrderExpired) {
                config.onOrderExpired();
            }
            return;
        }

        pollingConfigRef.current = config;
        isPollingRef.current = true;
        pollingStartTimeRef.current = Date.now();
        orderCreatedTimeRef.current = orderCreatedTime;

        console.log('🔄 启动智能轮询模式');

        const poll = async () => {
            // 检查轮询是否应该继续
            if (!isPollingRef.current || !pollingConfigRef.current || !orderCreatedTimeRef.current) {
                return;
            }

            // 检查订单是否过期
            if (isOrderExpired(orderCreatedTimeRef.current)) {
                console.log('🕒 订单已过期，停止轮询');
                stopPolling();
                if (pollingConfigRef.current.onOrderExpired) {
                    pollingConfigRef.current.onOrderExpired();
                }
                return;
            }

            try {
                const response = await fetchPaymentStatus(config.clientSn);
                const status = response.data.biz_response.data?.order_status as OrderStatus;

                // 通知状态变化
                config.onStatusChange(status, response.data.biz_response.data);

                if (status === 'PAID') {
                    // 支付成功，停止轮询
                    console.log('💰 轮询检测到支付成功');
                    config.onPaymentSuccess(response.data.biz_response.data);
                    stopPolling();
                    return;
                }

                if (status === 'PAY_CANCELED') {
                    // 支付取消，停止轮询
                    console.log('❌ 轮询检测到支付取消');
                    stopPolling();
                    return;
                }

            } catch (error) {
                console.error('轮询查询失败:', error);
                // 查询失败不停止轮询，继续尝试（网络问题可能暂时性）
            }

            // 计算下次轮询间隔（基于订单创建时间）
            if (isPollingRef.current && orderCreatedTimeRef.current) {
                const elapsedMinutes = (Date.now() - orderCreatedTimeRef.current) / (1000 * 60);
                const interval = getPollingInterval(elapsedMinutes);

                if (interval > 0) {
                    pollingIntervalRef.current = setTimeout(poll, interval);
                } else {
                    // 间隔为0表示停止轮询（订单过期）
                    console.log('⏰ 轮询周期结束，订单已过期');
                    stopPolling();
                    if (pollingConfigRef.current.onOrderExpired) {
                        pollingConfigRef.current.onOrderExpired();
                    }
                }
            }
        };

        // 立即执行第一次查询
        poll();
    }, [getPollingInterval, isOrderExpired]);

    // 停止轮询
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearTimeout(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        isPollingRef.current = false;
        pollingStartTimeRef.current = null;
        orderCreatedTimeRef.current = null;
        console.log('🛑 停止轮询');
    }, []);

    // 检查是否正在轮询
    const isPolling = useCallback(() => {
        return isPollingRef.current;
    }, []);

    // 获取轮询状态信息（用于调试和显示）
    const getPollingStatus = useCallback(() => {
        if (!isPollingRef.current || !orderCreatedTimeRef.current) {
            return { isActive: false, elapsedMinutes: 0 };
        }

        const elapsedMinutes = (Date.now() - orderCreatedTimeRef.current) / (1000 * 60);
        return {
            isActive: true,
            elapsedMinutes,
            currentInterval: getPollingInterval(elapsedMinutes)
        };
    }, [getPollingInterval]);

    return {
        startPolling,
        stopPolling,
        isPolling,
        getPollingStatus
    };
};