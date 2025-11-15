import { ReactNode } from 'react';
import Footer from '@/components/Footer';
interface PaymentLayoutProps {
    children: ReactNode;
    title?: string;
    showFooter?: boolean;
}

export default function PaymentLayout({
    children,
    title = "支付页面",
    showFooter = true
}: PaymentLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
                <div className="max-w-md mx-auto">
                    <h1 className="text-center text-xl font-bold">{title}</h1>
                </div>
            </header>

            <main className="flex-1 py-6 px-4 sm:px-6">
                {children}
            </main>

            {showFooter && <Footer />}
        </div>
    );
}