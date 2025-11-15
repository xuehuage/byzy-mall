import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * 创建并配置全局统一的axios实例
 * 所有API请求均使用此实例，避免重复配置
 */
const axiosInstance: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * 请求拦截器：统一处理请求参数、添加认证信息
 */
axiosInstance.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        console.error('请求拦截器错误:', error);
        return Promise.reject(error);
    }
);

/**
 * 响应拦截器：统一处理响应数据、错误码
 */
axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error) => {
        console.error('响应拦截器错误:', error);

        if (error.response?.status === 429) {
            console.error('服务器拥堵，请求被限制');
            // 触发自定义事件，让组件可以监听并显示蒙版
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('serverOverload'));
            }

            return Promise.reject(new Error('服务器拥堵，请稍后再试'));
        }

        // 其他错误处理
        const message = error.response?.data?.message || error.message || 'message请求失败';
        return Promise.reject(new Error(message));
    }
);

export default axiosInstance;