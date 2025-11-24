// app/payment/page.tsx
'use client';

import { Suspense } from 'react';
import SimplePaymentContent from '@/components/SimplePaymentContent';

// 使用 Suspense 包装，确保组件稳定
export default function PaymentPage() {
    return (
        <Suspense fallback={<div>加载支付页面...</div>}>
            <SimplePaymentContent />
        </Suspense>
    );
}