export const PAYMENT_STATUS = {
    0: '未付款',
    1: '已付款'
} as const;

type PaymentStatusCode = keyof typeof PAYMENT_STATUS;

export const getPaymentStatusText = (code: number): string => {
    if (code in PAYMENT_STATUS) {
        return PAYMENT_STATUS[code as PaymentStatusCode];
    }
    return '---';
};