/**
 * 学生相关类型定义
 * 路径: types/student.types.ts
 */

/**
 * 班级信息类型
 */
export interface ClassInfo {
    id: number;
    name: string;
    class_order: number;
    grade_id: number;
    created_at: string;
    updated_at: string;
}

/**
 * 学生基本信息类型
 */
export interface Student {
    id: number;
    name: string;
    id_card: string;
    student_id: string;
    class_id: number;
    gender: number;
    source: number;
    created_at: string;
    updated_at: string;
    class_name: string;
    grade_name: string;
    school_name: string;
    class: ClassInfo;
}

/**
 * 校服订单类型
 */
export interface StudentUniformOrder {
    student_id: number;
    size: string;
    quantity: number;
    total_amount: string;
    order_type: number;
    payment_time: string | null;
    payment_status: number;
    created_at: string;
    updated_at: string;
    uniform_type: number;
    gender_type: string;
    price: string;
    size_options: string;
}

/**
 * 支付状态枚举
 */
export enum PaymentStatus {
    UNPAID = 0,  // 未付款
    PAID = 1     // 已付款
}

/**
 * 订单类型枚举
 */
export enum OrderType {
    OFFLINE = 0, // 线下订单
    ONLINE = 1   // 线上订单
}

/**
 * 学生详情响应类型
 */
export interface StudentDetailResponse {
    code: number;
    data: {
        student: Student;
        orders: StudentUniformOrder[];
    };
    message: string;
}

/**
 * 学生列表项类型
 */
export interface StudentListItem {
    id: number;
    name: string;
    student_id: string;
    class_name: string;
    grade_name: string;
    gender: number;
    created_at: string;
}

/**
 * 学生列表响应类型
 */
export interface StudentListResponse {
    code: number;
    data: {
        list: StudentListItem[];
        total: number;
        page: number;
        page_size: number;
    };
    message: string;
}

/**
 * 性别枚举
 */
export enum Gender {
    MALE = 1,    // 男
    FEMALE = 2   // 女
}

/**
 * 学生来源枚举
 */
export enum StudentSource {
    IMPORT = 0,  // 导入
    MANUAL = 1   // 手动添加
}

/**
 * 校服类型枚举
 */
export enum UniformType {
    SUMMER = 1,    // 夏装
    WINTER = 2,    // 冬装
    SPRING = 3     // 春秋装
}
