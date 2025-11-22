/**
 * 支付相关类型定义
 * 路径: types/payment.types.ts
 */

/**
 * 预支付请求参数类型
 */
export interface PrepayParams {
    id_card: string;
    pay_way: string;
}

/**
 * 预支付接口返回数据类型
 */
export interface PrepayResponse {
    code: number;
    data: {
        total_amount: string;
        subject: string;
        qr_code: string;
        client_sn: string;
        qr_code_image_url: string;
    };
    message: string;
}

/**
 * 付款状态
 * @argument PAID 
 */
export type OrderStatus = 'PAID' | 'PAY_CANCELED' | 'CREATED' | 'PAY_ERROR';