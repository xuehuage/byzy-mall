// src/app/payment/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchPrepay } from '@/api/paymentApi';
import { PrepayResponse } from '@/types/payment.types';
import { StudentDetailResponse } from '@/types/student.types';
import { fetchStudentDetail } from '@/api/studentApi';
import { log } from 'console';

// 5分钟的秒数
const PAYMENT_EXPIRY_SECONDS = 5 * 60;

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

    // 获取支付方式文本
    const getPaymentMethodText = () => {
        switch (paymentMethod) {
            case '3':
                return '微信支付';
            case '2':
                return '支付宝';
            default:
                return '未知支付方式';
        }
    };

    // 格式化秒数为分:秒格式
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 获取预支付信息
    const getPrepayInfo = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            // 验证参数
            if (!paymentMethod || !studentIdNumber) {
                throw new Error('参数错误，无法进行支付');
            }
            console.log('studentIdNumber:', studentIdNumber)
            // // 获取学生详情
            // const studentDetail = await fetchStudentDetail(studentIdNumber);
            // setStudentInfo(studentDetail.data.student);

            // 获取预支付信息
            const prepayResponse = await fetchPrepay({
                id_card: studentIdNumber,
                pay_way: paymentMethod
            });
            console.log('prepayResponse:', prepayResponse)

            setPrepayData(prepayResponse.data);
            setRemainingSeconds(PAYMENT_EXPIRY_SECONDS);
            setIsExpired(false);
        } catch (err) {
            console.log('errLLL', err)
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            console.error('获取支付信息失败:', errorMessage);
        } finally {
            setLoading(false);
        }
    }, [paymentMethod, studentIdNumber]);

    // 初始化加载支付信息
    useEffect(() => {
        getPrepayInfo();
    }, [getPrepayInfo]);

    // 倒计时逻辑
    useEffect(() => {
        if (loading || isExpired || !prepayData) return;

        const timer = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    setIsExpired(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, isExpired, prepayData]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">加载支付信息中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
                <div className="max-w-md mx-auto">
                    <h1 className="text-center text-xl font-bold">支付页面</h1>
                </div>
            </header>

            <main className="flex-1 py-6 px-4 sm:px-6">
                <div className="max-w-md mx-auto w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
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

                            {/* 订单信息 */}
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

                            {/* 支付二维码 */}
                            <div className="text-center">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">请完成支付</h2>

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
                                            >
                                                刷新二维码
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    请保存二维码到相册，用{getPaymentMethodText()}扫一扫进行付款
                                </p>

                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    二维码有效期：{formatTime(remainingSeconds)}
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={() => router.push('/')}
                                    className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    取消支付
                                </button>
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