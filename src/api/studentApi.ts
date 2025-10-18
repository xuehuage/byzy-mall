/**
 * 学生相关API
 * 路径: src/api/studentApi.ts
 */

import axios from 'axios';
import {
    StudentDetailResponse,
    StudentListResponse,
    StudentUniformOrder
} from '@/types/student.types';

// 创建axios实例
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || '/api',
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        // 添加认证token
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // 统一错误处理
        if (error.response && error.response.status === 401) {
            // 未授权，重定向到登录页
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/**
 * 获取学生详情
 * @param studentId 学生ID
 */
export const fetchStudentDetail = async (studentId: number): Promise<StudentDetailResponse> => {
    const response = await api.get(`/students/${studentId}`);
    return response.data;
};

/**
 * 获取学生列表
 * @param params 查询参数
 */
export const fetchStudentList = async (params: {
    page: number;
    page_size: number;
    keyword?: string;
    class_id?: number;
    grade_id?: number;
}): Promise<StudentListResponse> => {
    const response = await api.get('/students', { params });
    return response.data;
};

/**
 * 更新订单支付状态
 * @param orderId 订单ID
 * @param status 支付状态
 */
export const updateOrderPaymentStatus = async (
    orderId: number,
    status: number
): Promise<{
    code: number;
    data: StudentUniformOrder;
    message: string;
}> => {
    const response = await api.put(`/orders/${orderId}/payment-status`, {
        payment_status: status
    });
    return response.data;
};

/**
 * 导入学生数据
 * @param file Excel文件
 * @param schoolId 学校ID
 */
export const importStudents = async (
    file: File,
    schoolId: number
): Promise<{
    code: number;
    data: {
        success: number;
        failed: number;
        total: number;
        errors?: Array<{
            row: number;
            message: string;
        }>;
    };
    message: string;
}> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('school_id', schoolId.toString());

    const response = await api.post('/students/import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });

    return response.data;
};

/**
 * 获取学生订单列表
 * @param studentId 学生ID
 */
export const fetchStudentOrders = async (studentId: number): Promise<{
    code: number;
    data: StudentUniformOrder[];
    message: string;
}> => {
    const response = await api.get(`/students/${studentId}/orders`);
    return response.data;
};

export default api;
