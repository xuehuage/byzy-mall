import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * 创建并配置全局统一的axios实例
 * 所有API请求均使用此实例，避免重复配置
 */
const axiosInstance: AxiosInstance = axios.create({
    // 基础URL从环境变量获取，默认本地API地址
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    // 超时时间统一设置为5秒
    timeout: 5000,
    // 默认请求头配置
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * 请求拦截器：统一处理请求参数、添加认证信息
 */
axiosInstance.interceptors.request.use(
    (config) => {
        // 从localStorage获取token并添加到请求头

        return config;
    },
    (error) => {
        // 统一处理请求错误
        console.error('请求拦截器错误:', error);
        return Promise.reject(error);
    }
);

/**
 * 响应拦截器：统一处理响应数据、错误码
 */
axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        // 直接返回响应数据（可根据后端规范统一处理外层结构）
        return response;
    },
    (error) => {
        // 统一错误处理
        console.error('响应拦截器错误:', error);


        return Promise.reject(error);
    }
);

export default axiosInstance;