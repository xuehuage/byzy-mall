import axiosInstance from 'src/utils/axiosInstance';
import { PrepayParams, PrepayResponse } from '@/types/payment.types';

/**
 * 调用预支付接口，获取支付二维码
 * @param params 包含学生ID和支付方式的参数
 * @returns 预支付信息，包括二维码
 */
export const fetchPrepay = async (params: PrepayParams): Promise<PrepayResponse> => {
    const response = await axiosInstance.post('/public/prepay', params);
    const { data } = response;

    // 统一错误处理（根据后端状态码判断）
    if (data.code !== 200) {
        throw new Error(data.message || '获取支付信息失败');
    }

    return data;
};


export const fetchPaymentStatus = async (orderNo: string) => {
    const response = await axiosInstance.get(`/public/payment/status/${orderNo}`);
    return response.data;
};

