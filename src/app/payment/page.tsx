// src/app/payment/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchPaymentStatus, fetchPrepay } from '@/api/paymentApi';
import { OrderStatus, PrepayResponse } from '@/types/payment.types';
import { StudentDetailResponse } from '@/types/student.types';
import { fetchStudentDetail } from '@/api/studentApi';

// 5分钟的秒数（二维码有效期）
const PAYMENT_EXPIRY_SECONDS = 5 * 60;

// localStorage 存储结构
interface StoredOrder {
    client_sn: string;
    prepayData: PrepayResponse['data'];
    createdAt: number;
    expiresAt: number;
    studentIdNumber: string;
}

export default function PaymentPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // 从URL获取参数
    const paymentMethod = searchParams.get('method') || '';
    const studentIdNumber = searchParams.get('id') || '';

    // 状态管理
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [prepayData, setPrepayData] = useState<PrepayResponse['data'] | null>(null);
    const [studentInfo, setStudentInfo] = useState<StudentDetailResponse['data']['student'] | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState(PAYMENT_EXPIRY_SECONDS);
    const [isExpired, setIsExpired] = useState(false);
    const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [hasCheckedStoredOrder, setHasCheckedStoredOrder] = useState(false);

    // 轮询相关引用
    const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const isManualChecking = useRef(false);
    const orderStatusRef = useRef<OrderStatus | null>(null);
    const isPollingRef = useRef(false);
    const requestLockRef = useRef(false);

    // 同步状态到 ref
    useEffect(() => {
        orderStatusRef.current = orderStatus;
    }, [orderStatus]);

    useEffect(() => {
        isPollingRef.current = isPolling;
    }, [isPolling]);

    // 存储订单信息到 localStorage
    const storeOrderInfo = useCallback((prepayResponse: PrepayResponse, studentId: string) => {
        const storedOrder: StoredOrder = {
            client_sn: prepayResponse.data.client_sn,
            prepayData: prepayResponse.data,
            createdAt: Date.now(),
            expiresAt: Date.now() + (PAYMENT_EXPIRY_SECONDS * 1000),
            studentIdNumber: studentId
        };
        localStorage.setItem('paymentOrder', JSON.stringify(storedOrder));
    }, []);

    // 从 localStorage 读取订单信息
    const getStoredOrder = useCallback((): StoredOrder | null => {
        try {
            const stored = localStorage.getItem('paymentOrder');
            if (!stored) return null;

            const order: StoredOrder = JSON.parse(stored);

            // 检查是否过期
            if (Date.now() > order.expiresAt) {
                localStorage.removeItem('paymentOrder');
                return null;
            }

            // 检查是否匹配当前学生
            if (order.studentIdNumber !== studentIdNumber) {
                return null;
            }

            return order;
        } catch (error) {
            console.error('读取存储的订单信息失败:', error);
            localStorage.removeItem('paymentOrder');
            return null;
        }
    }, [studentIdNumber]);

    // 清理 localStorage 中的订单信息
    const clearStoredOrder = useCallback(() => {
        localStorage.removeItem('paymentOrder');
    }, []);

    // 获取支付方式文本
    const getPaymentMethodText = () => {
        switch (paymentMethod) {
            case '3':
                return '微信支付';
            case '2':
                return '支付宝';
            default:
                return '';
        }
    };

    // 格式化秒数为分:秒格式
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 停止轮询
    const stopPolling = useCallback(() => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
        setIsPolling(false);
        isPollingRef.current = false;
        startTimeRef.current = null;
    }, []);

    // 处理查询结果
    const handlePaymentStatus = useCallback((data: any) => {
        const status = data?.order_status as OrderStatus;
        setOrderStatus(status);
        orderStatusRef.current = status;

        if (status === 'PAID' || status === 'PAY_CANCELED') {
            // 支付完成状态，清理存储的订单
            clearStoredOrder();
            stopPolling();

            // 如果是支付成功，可以额外存储支付成功标记，避免重复支付
            if (status === 'PAID') {
                localStorage.setItem(`paid_${studentIdNumber}`, Date.now().toString());
            }
        }
    }, [stopPolling, clearStoredOrder, studentIdNumber]);

    // 查询支付状态（统一接口）
    const checkPaymentStatus = useCallback(async (clientSn: string) => {
        if (!clientSn || isManualChecking.current || requestLockRef.current) return;

        requestLockRef.current = true;

        try {
            const response = await fetchPaymentStatus(clientSn);


            const { data } = response;
            const { biz_response, result_code } = data;



            handlePaymentStatus(biz_response.data);

        } catch (err) {
            console.log(err instanceof Error ? err.message : '查询支付状态失败');
        } finally {
            isManualChecking.current = false;
            requestLockRef.current = false;
        }
    }, [handlePaymentStatus]);

    // 开始轮询（按时间区间调整间隔）
    const startPolling = useCallback((clientSn: string) => {
        if (!clientSn || isPollingRef.current) return;

        setIsPolling(true);
        isPollingRef.current = true;
        startTimeRef.current = Date.now();

        const poll = async () => {
            if (!startTimeRef.current) return;

            const now = Date.now();
            const elapsedMinutes = (now - startTimeRef.current) / (1000 * 60);
            let interval = 3000;

            if (elapsedMinutes >= 1 && elapsedMinutes < 5) {
                interval = 10000;
            } else if (elapsedMinutes >= 6) {
                // 使用 ref 获取最新状态
                await checkPaymentStatus(clientSn);
                if (orderStatusRef.current !== 'PAID' && orderStatusRef.current !== 'PAY_CANCELED') {
                    stopPolling();
                }
                return;
            }

            pollTimerRef.current = setTimeout(async () => {
                await checkPaymentStatus(clientSn);
                // 使用 ref 判断状态，避免闭包问题
                if (orderStatusRef.current !== 'PAID' && orderStatusRef.current !== 'PAY_CANCELED') {
                    poll();
                }
            }, interval);
        };

        poll();
    }, [checkPaymentStatus, stopPolling]);

    // 获取预支付信息
    const getPrepayInfo = useCallback(async () => {
        if (requestLockRef.current) return;
        requestLockRef.current = true;

        try {
            setLoading(true);
            setError('');

            // 验证参数
            if (!paymentMethod || !studentIdNumber) {
                throw new Error('参数错误，无法进行支付');
            }

            // 获取学生详情
            const studentDetail = await fetchStudentDetail(studentIdNumber);
            setStudentInfo(studentDetail.data.student);

            // 获取预支付信息
            const prepayResponse = await fetchPrepay({
                id_card: studentIdNumber,
                pay_way: paymentMethod
            });

            setPrepayData(prepayResponse.data);

            // 存储完整的订单信息到 localStorage
            storeOrderInfo(prepayResponse, studentIdNumber);

            setRemainingSeconds(PAYMENT_EXPIRY_SECONDS);
            setIsExpired(false);

            // 预支付成功后启动轮询
            setTimeout(() => {
                startPolling(prepayResponse.data.client_sn);
            }, 60000);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('获取支付信息失败:', errorMessage);
            setError(errorMessage);

            // 如果是429错误，提供更友好的提示
            if (errorMessage.includes('429') || errorMessage.includes('Too many requests')) {
                setError('请求过于频繁，请稍后再试');
            }
        } finally {
            setLoading(false);
            requestLockRef.current = false;
        }
    }, [paymentMethod, studentIdNumber, storeOrderInfo, startPolling]);

    // 手动查询（已付款按钮点击事件）
    const handleManualCheck = async () => {
        const clientSn = prepayData?.client_sn || getStoredOrder()?.client_sn;
        if (!clientSn || loading) return;

        // 暂停自动轮询，防止冲突
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }

        isManualChecking.current = true;
        setIsPolling(false);
        await checkPaymentStatus(clientSn);

        // 非最终状态重启轮询
        if (orderStatus !== 'PAID' && orderStatus !== 'PAY_CANCELED' && clientSn) {
            startPolling(clientSn);
        }
    };

    // 返回首页
    const handleGoHome = () => {
        router.push('/');
    };

    // 初始化：检查存储的订单
    const initFromStoredOrder = useCallback(async () => {
        const storedOrder = getStoredOrder();

        if (storedOrder) {
            console.log('从缓存恢复订单:', storedOrder.client_sn);

            // 设置预支付数据
            setPrepayData(storedOrder.prepayData);

            // 计算剩余时间
            const now = Date.now();
            const remainingMs = storedOrder.expiresAt - now;
            setRemainingSeconds(Math.max(0, Math.floor(remainingMs / 1000)));

            // 获取学生信息
            try {
                const studentDetail = await fetchStudentDetail(studentIdNumber);
                setStudentInfo(studentDetail.data.student);
            } catch (err) {
                console.error('获取学生信息失败:', err);
            }

            // 开始轮询
            startPolling(storedOrder.client_sn);

            setIsExpired(false);
            setHasCheckedStoredOrder(true);
        } else {
            setHasCheckedStoredOrder(true);
            // 没有存储的订单，正常获取新订单
            getPrepayInfo();
        }
    }, [getStoredOrder, studentIdNumber, startPolling, getPrepayInfo]);

    // 初始化 useEffect
    useEffect(() => {
        initFromStoredOrder();

        // 组件卸载时清理轮询
        return () => {
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current);
            }
        };
    }, [initFromStoredOrder]);

    // 二维码倒计时逻辑
    useEffect(() => {
        if (loading || isExpired || !prepayData || orderStatus === 'PAID') return;

        const timer = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    setIsExpired(true);
                    clearInterval(timer);
                    // 过期时清理存储
                    clearStoredOrder();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, isExpired, prepayData, orderStatus, clearStoredOrder]);

    // 检查学生是否已支付
    useEffect(() => {
        const checkIfAlreadyPaid = async () => {
            // 检查本地存储的支付成功标记
            const paidTime = localStorage.getItem(`paid_${studentIdNumber}`);
            if (paidTime) {
                const paidTimestamp = parseInt(paidTime);
                // 如果最近5分钟内支付成功，直接显示成功页面
                if (Date.now() - paidTimestamp < 5 * 60 * 1000) {
                    setOrderStatus('PAID');
                    setLoading(false);
                    return;
                } else {
                    // 清理过期的支付成功标记
                    localStorage.removeItem(`paid_${studentIdNumber}`);
                }
            }
        };

        if (studentIdNumber) {
            checkIfAlreadyPaid();
        }
    }, [studentIdNumber]);

    const renderError = () => {
        return (
            <div className="text-center text-red-500 mb-6">
                <p>{error}</p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-4 text-blue-600 hover:underline"
                >
                    返回首页
                </button>
            </div>
        );
    };

    // 加载状态
    if (loading && !orderStatus && !hasCheckedStoredOrder) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">加载支付信息中...</p>
                </div>
            </div>
        );
    }

    // 支付成功状态
    if (orderStatus === 'PAID') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
                    <div className="max-w-md mx-auto">
                        <h1 className="text-center text-xl font-bold">支付结果</h1>
                    </div>
                </header>

                <main className="flex-1 py-6 px-4 sm:px-6">
                    <div className="max-w-md mx-auto w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                        <div className="text-center">
                            {/* 成功图标 */}
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 text-green-500 dark:text-green-300 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            {/* 成功提示 */}
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">付款成功</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">您已成功完成支付，感谢您的购买</p>

                            {/* 学生信息摘要 */}
                            {studentInfo && (
                                <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <p className="text-gray-700 dark:text-gray-300">
                                        学生：{studentInfo.name} | 订单金额：¥{prepayData?.total_amount || '0.00'}
                                    </p>
                                </div>
                            )}

                            {/* 返回首页按钮 */}
                            <button
                                onClick={handleGoHome}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                返回首页
                            </button>
                        </div>
                    </div>
                </main>

                <footer className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                    <p>© {new Date().getFullYear()} 河池市宜州区百盈制衣版权所有</p>
                </footer>
            </div>
        );
    }

    // 支付失败状态
    if (orderStatus === 'PAY_CANCELED') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
                    <div className="max-w-md mx-auto">
                        <h1 className="text-center text-xl font-bold">支付结果</h1>
                    </div>
                </header>

                <main className="flex-1 py-6 px-4 sm:px-6">
                    <div className="max-w-md mx-auto w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 text-red-500 dark:text-red-300 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">支付失败</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">支付已取消，请重新发起支付</p>

                            <button
                                onClick={handleGoHome}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                返回首页
                            </button>
                        </div>
                    </div>
                </main>

                <footer className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                    <p>© {new Date().getFullYear()} 河池市宜州区百盈制衣版权所有</p>
                </footer>
            </div>
        );
    }

    // 主页面渲染
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
                <div className="max-w-md mx-auto">
                    <h1 className="text-center text-xl font-bold">支付页面</h1>
                </div>
            </header>

            <main className="flex-1 py-6 px-4 sm:px-6">
                <div className="max-w-md mx-auto w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                    {error ? renderError() : (
                        <div className="space-y-6">
                            {/* 学生信息（保留原有） */}
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">学生信息</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400">学生姓名：</span>
                                        <span className="font-medium">{studentInfo?.name || '未知'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400">身份证号：</span>
                                        <span className="font-medium">{studentIdNumber}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 订单信息（保留原有） */}
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">订单信息</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400">支付方式：</span>
                                        <span className="font-medium">{getPaymentMethodText()}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400">订单总金额：</span>
                                        <span className="font-medium">¥{prepayData?.total_amount || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400">订单描述：</span>
                                        <span className="font-medium">{prepayData?.subject || '校服订单'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 支付二维码（保留原有，支付成功后隐藏） */}
                            <div className="text-center">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">扫一扫进行付款</h2>

                                <div className="relative mx-auto w-64 h-64 mb-4">
                                    {/* 二维码 */}
                                    {prepayData?.qr_code && (
                                        <QRCodeSVG
                                            value={prepayData.qr_code}
                                            size={256}
                                            level="H"
                                        />
                                    )}

                                    {/* 过期蒙版 */}
                                    {isExpired && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg">
                                            <p className="text-white font-medium mb-4">二维码已过期</p>
                                            <button
                                                onClick={getPrepayInfo}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                                disabled={loading}
                                            >
                                                {loading ? '生成中...' : '刷新二维码'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* 原有文案保留 */}
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    请保存二维码到相册，用{getPaymentMethodText()}扫一扫进行付款
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    二维码有效期：<span className='text-red-600'>{formatTime(remainingSeconds)}</span>
                                </p>
                            </div>

                            {/* 操作按钮区域（移除取消按钮，新增已付款按钮） */}
                            <div className="pt-4">
                                {/* 已付款按钮（任务内容5） */}
                                {!isExpired && (
                                    <button
                                        type="button"
                                        onClick={handleManualCheck}
                                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        disabled={loading}
                                    >
                                        {loading ? '查询中...' : '已付款'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                <p>© {new Date().getFullYear()} 河池市宜州区百盈制衣版权所有</p>
            </footer>
        </div>
    );
}