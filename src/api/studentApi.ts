import { StudentDetailResponse } from '@/types/student.types';
import axiosInstance from 'src/utils/axiosInstance';

/**
 * 根据身份证号查询学生详情
 * @param idCard 学生身份证号
 * @returns 学生详情数据
 */
export const fetchStudentDetail = async (idCard: string): Promise<StudentDetailResponse> => {
    const response = await axiosInstance.get(`/public/students/query-by-idcard/${idCard}`);
    const { data } = response;

    if (data.code !== 200) {
        throw new Error(data.message || '查询学生信息失败');
    }

    return data;
};

/**
 * 获取学校基本信息
 */
export const fetchPublicSchoolDetail = async (id: number) => {
    const response = await axiosInstance.get(`/public/school/${id}`);
    return response.data;
};


// // 可添加其他学生相关API
// export const fetchStudentOrders = async (studentId: string) => {
//     const response = await axiosInstance.get(`/student/orders?studentId=${studentId}`);
//     return response.data;
// };