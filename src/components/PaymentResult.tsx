import { ReactNode } from 'react';

interface PaymentResultProps {
    type: 'success' | 'error';
    title: string;
    description: string;
    studentInfo?: {
        name: string;
    };
    amount?: string;
    onAction: () => void;
    actionText: string;
}

export default function PaymentResult({
    type,
    title,
    description,
    studentInfo,
    amount,
    onAction,
    actionText
}: PaymentResultProps) {
    const iconConfig = {
        success: {
            bgColor: 'bg-green-100 dark:bg-green-900',
            textColor: 'text-green-500 dark:text-green-300',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            )
        },
        error: {
            bgColor: 'bg-red-100 dark:bg-red-900',
            textColor: 'text-red-500 dark:text-red-300',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            )
        }
    };

    const config = iconConfig[type];

    return (
        <div className="max-w-md mx-auto w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${config.bgColor} ${config.textColor} mb-6`}>
                    {config.icon}
                </div>

                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{title}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">{description}</p>

                {studentInfo && amount && (
                    <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300">
                            学生：{studentInfo.name} | 订单金额：¥{amount}
                        </p>
                    </div>
                )}

                <button
                    onClick={onAction}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {actionText}
                </button>
            </div>
        </div>
    );
}