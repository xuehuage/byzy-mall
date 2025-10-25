export const PAYMENT_STATUS = {
    0: '未付款',
    1: '已付款'
} as const;

export const UNIFORM_TYPE = {
    1: '夏装',
    2: '春秋装',
    3: '冬装',
    4: '夏装上衣',
    5: '春秋装上衣',
} as const;

type PaymentStatusCode = keyof typeof PAYMENT_STATUS;
type UniformTypeCode = keyof typeof UNIFORM_TYPE;

export const getPaymentStatusText = (code: number): string => {
    if (code in PAYMENT_STATUS) {
        return PAYMENT_STATUS[code as PaymentStatusCode];
    }
    return '---';
};


export const getUniformTypeText = (code: number): string => {
    if (code in UNIFORM_TYPE) {
        return UNIFORM_TYPE[code as UniformTypeCode];
    }
    return '---';
};
