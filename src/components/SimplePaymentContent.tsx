// components/SimplePaymentContent.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchPaymentStatus, fetchPrepay } from '@/api/paymentApi';
import { OrderStatus, PrepayResponse } from '@/types/payment.types';
import { StudentDetailResponse } from '@/types/student.types';
import { fetchStudentDetail } from '@/api/studentApi';
import { useGlobalWebSocket } from '@/hooks/useGlobalWebSocket';
import PaymentLayout from '@/components/PaymentLayout';
import PaymentResult from '@/components/PaymentResult';

const PAYMENT_EXPIRY_SECONDS = 5 * 60;

interface StoredOrder {
    client_sn: string;
    prepayData: PrepayResponse['data'];
    createdAt: number;
    expiresAt: number;
    studentIdNumber: string;
}

export default function SimplePaymentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // 使用 ref 稳定参数
    const paramsRef = useRef({
        paymentMethod: searchParams.get('method') || '',
        studentIdNumber: searchParams.get('id') || ''
    });

    // 状态管理
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [prepayData, setPrepayData] = useState<PrepayResponse['data'] | null>(null);
    const [studentInfo, setStudentInfo] = useState<StudentDetailResponse['data']['student'] | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState(PAYMENT_EXPIRY_SECONDS);
    const [isExpired, setIsExpired] = useState(false);
    const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);

    // 🔥 使用全局 WebSocket
    const {
        status: websocketStatus,
        connect: connectWebSocket,
        disconnect: disconnectWebSocket,
        addMessageHandler,
        removeMessageHandler
    } = useGlobalWebSocket();

    // 防止重复初始化
    const initializedRef = useRef(false);
    const requestLockRef = useRef(false);

    // 处理 WebSocket 消息
    const handleWebSocketMessage = useCallback((message: any) => {
        if (message.type === 'PAYMENT_SUCCESS') {
            handlePaymentSuccess(message.data);
        }
    }, []);

    // 处理支付成功
    const handlePaymentSuccess = useCallback((paymentData: any) => {
        setOrderStatus('PAID');
        localStorage.removeItem('paymentOrder');
        localStorage.setItem(`paid_${paramsRef.current.studentIdNumber}`, Date.now().toString());
    }, []);

    // 初始化消息处理器
    useEffect(() => {
        addMessageHandler(handleWebSocketMessage);
        return () => {
            removeMessageHandler(handleWebSocketMessage);
        };
    }, [addMessageHandler, removeMessageHandler, handleWebSocketMessage]);

    // 获取预支付信息
    const getPrepayInfo = useCallback(async () => {
        if (requestLockRef.current) return;
        requestLockRef.current = true;

        try {
            setLoading(true);
            setError('');

            const { paymentMethod, studentIdNumber } = paramsRef.current;

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

            // 存储订单信息
            const storedOrder: StoredOrder = {
                client_sn: prepayResponse.data.client_sn,
                prepayData: prepayResponse.data,
                createdAt: Date.now(),
                expiresAt: Date.now() + (PAYMENT_EXPIRY_SECONDS * 1000),
                studentIdNumber: studentIdNumber
            };
            localStorage.setItem('paymentOrder', JSON.stringify(storedOrder));

            setRemainingSeconds(PAYMENT_EXPIRY_SECONDS);
            setIsExpired(false);

            // 🔥 使用全局 WebSocket 连接
            connectWebSocket(prepayResponse.data.client_sn);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('❌ 获取支付信息失败:', errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
            requestLockRef.current = false;
        }
    }, [connectWebSocket]);

    // 检查存储的订单
    const checkStoredOrder = useCallback(() => {
        try {
            const stored = localStorage.getItem('paymentOrder');
            if (!stored) return null;

            const order: StoredOrder = JSON.parse(stored);
            const now = Date.now();

            // 检查是否过期或学生不匹配
            if (now > order.expiresAt || order.studentIdNumber !== paramsRef.current.studentIdNumber) {
                localStorage.removeItem('paymentOrder');
                return null;
            }

            return order;
        } catch {
            localStorage.removeItem('paymentOrder');
            return null;
        }
    }, []);

    // 初始化
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;


        const storedOrder = checkStoredOrder();
        if (storedOrder) {
            // 从缓存恢复
            setPrepayData(storedOrder.prepayData);
            const remainingMs = storedOrder.expiresAt - Date.now();
            setRemainingSeconds(Math.max(0, Math.floor(remainingMs / 1000)));

            // 获取学生信息
            fetchStudentDetail(paramsRef.current.studentIdNumber)
                .then(studentDetail => setStudentInfo(studentDetail.data.student))
                .catch(console.error);

            // 建立 WebSocket 连接
            connectWebSocket(storedOrder.client_sn);
            setLoading(false);
        } else {
            // 创建新订单
            getPrepayInfo();
        }

        // 检查是否已支付
        const paidTime = localStorage.getItem(`paid_${paramsRef.current.studentIdNumber}`);
        if (paidTime && (Date.now() - parseInt(paidTime) < 5 * 60 * 1000)) {
            setOrderStatus('PAID');
            setLoading(false);
        }
    }, [checkStoredOrder, connectWebSocket, getPrepayInfo]);

    // 倒计时
    useEffect(() => {
        if (loading || isExpired || !prepayData || orderStatus === 'PAID') return;

        const timer = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    setIsExpired(true);
                    localStorage.removeItem('paymentOrder');
                    disconnectWebSocket();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, isExpired, prepayData, orderStatus, disconnectWebSocket]);

    // 手动查询支付状态
    const handleManualCheck = async () => {
        const clientSn = prepayData?.client_sn;
        if (!clientSn || loading) return;

        try {
            const response = await fetchPaymentStatus(clientSn);
            const status = response.data.biz_response.data?.order_status as OrderStatus;
            setOrderStatus(status);

            if (status === 'PAID') {
                handlePaymentSuccess(response.data.biz_response.data);
            }
        } catch (err) {
            console.error('查询支付状态失败:', err);
        }
    };

    // 返回首页
    const handleGoHome = () => router.push('/');

    // 获取支付方式文本
    const getPaymentMethodText = () => {
        switch (paramsRef.current.paymentMethod) {
            case '3': return '微信支付';
            case '2': return '支付宝';
            default: return '';
        }
    };

    // 格式化时间
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 加载状态
    if (loading && !orderStatus) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">加载支付信息中...</p>
                </div>
            </div>
        );
    }

    // 支付成功
    if (orderStatus === 'PAID') {
        return (
            <PaymentLayout title="支付结果">
                <PaymentResult
                    type="success"
                    title="付款成功"
                    description="您已成功完成支付，感谢您的购买"
                    studentInfo={studentInfo || undefined}
                    amount={prepayData?.total_amount || '0.00'}
                    onAction={handleGoHome}
                    actionText="返回首页"
                />
            </PaymentLayout>
        );
    }

    // 主支付页面
    return (
        <PaymentLayout title="支付页面">
            <div className="max-w-md mx-auto w-full bg-white rounded-xl shadow-md p-6">
                {error ? (
                    <div className="text-center text-red-500 mb-6">
                        <p>{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-4 text-blue-600 hover:underline"
                        >
                            返回首页
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 学生信息 */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">学生信息</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="text-gray-600">学生姓名：</span>
                                    <span className="font-medium">{studentInfo?.name || '未知'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="text-gray-600">身份证号：</span>
                                    <span className="font-medium">{paramsRef.current.studentIdNumber}</span>
                                </div>
                            </div>
                        </div>

                        {/* 订单信息 */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">订单信息</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="text-gray-600">支付方式：</span>
                                    <span className="font-medium">{getPaymentMethodText()}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="text-gray-600">订单总金额：</span>
                                    <span className="font-medium">¥{prepayData?.total_amount || '0.00'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="text-gray-600">订单描述：</span>
                                    <span className="font-medium">{prepayData?.subject || '校服订单'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 支付二维码 */}
                        <div className="text-center">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">扫一扫进行付款</h2>

                            <div className="relative mx-auto w-64 h-64 mb-4">
                                {prepayData?.qr_code_image_url && (

                                    <img
                                        src={prepayData.qr_code_image_url}
                                        alt="二维码"
                                        style={{
                                            width: 256,
                                            height: 256,
                                            display: 'block'
                                        }}
                                    />
                                )}

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

                            <p className="text-sm text-gray-600 mb-2">
                                请保存二维码到相册，用{getPaymentMethodText()}扫一扫进行付款
                            </p>
                            <p className="text-sm text-gray-600">
                                二维码有效期：<span className='text-red-600'>{formatTime(remainingSeconds)}</span>
                            </p>

                            {/* WebSocket 状态显示 */}
                            <div className={`text-xs ${websocketStatus === 'connected' ? 'text-green-500' :
                                websocketStatus === 'connecting' ? 'text-yellow-500' :
                                    'text-gray-500'
                                } text-center mt-2`}>
                                {websocketStatus === 'connected' ? '实时连接' :
                                    websocketStatus === 'connecting' ? '连接中...' : '连接断开'}
                            </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="pt-4">
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
        </PaymentLayout>
    );
}