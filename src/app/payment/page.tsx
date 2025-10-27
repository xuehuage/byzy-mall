// src/app/payment/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PaymentPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const paymentMethod = searchParams.get('method');
    const studentId = searchParams.get('id');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    useEffect(() => {
        // 验证参数是否存在
        if (!paymentMethod || !studentId) {
            setError('参数错误，无法进行支付');
            setLoading(false);
            return;
        }

        // 这里可以添加实际支付逻辑的初始化

        setLoading(false);
    }, [paymentMethod, studentId]);

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
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">支付信息</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400">选择的支付方式：</span>
                                        <span className="font-medium">{getPaymentMethodText()}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400">学生ID：</span>
                                        <span className="font-medium">{studentId}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                    onClick={() => {
                                        // 这里添加实际支付逻辑
                                        alert('支付功能已触发，实际项目中这里会调用支付接口');
                                        router.push('/');
                                    }}
                                >
                                    确认{getPaymentMethodText()}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push('/')}
                                    className="w-full py-3 mt-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    取消
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