'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchPublicSchoolDetail, fetchStudentDetail } from '@/api/studentApi';
import { StudentDetailResponse, StudentUniformOrder } from '@/types/student.types';
import { getPaymentStatusText, getUniformTypeText } from '../utils/genderEnums';
import { Drawer, Button, RadioChangeEvent, Radio } from 'antd';
import { formatPriceValue } from 'src/utils/formatter';
import Footer from '@/components/Footer';
import ServerOverloadModal from '@/components/ServerOverloadModal';

type PaymentMethod = 2 | 3;
const style: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

export default function Home() {
  const [idNumber, setIdNumber] = useState('');
  const [result, setResult] = useState<StudentDetailResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const [schoolName, setSchoolName] = useState<String>('学生校服信息查询系统');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(3);
  const [serverOverload, setServerOverload] = useState(false);
  const router = useRouter();

  // 🔥 修复：添加请求锁，防止重复请求
  const requestLockRef = useState(false)[0];
  const schoolDataFetchedRef = useState(false)[0];

  // 监听服务器拥堵事件
  useEffect(() => {
    const handleServerOverload = () => {
      setServerOverload(true);
    };

    window.addEventListener('serverOverload', handleServerOverload);

    return () => {
      window.removeEventListener('serverOverload', handleServerOverload);
    };
  }, []);

  const fetchSchoolData = useCallback(async () => {
    // 防止重复请求
    if (schoolDataFetchedRef) return;

    try {
      const res = await fetchPublicSchoolDetail(1);
      if (res.code === 200) {
        setSchoolName(res.data.name);
      }
    } catch (error) {
      console.error('获取学校信息失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchSchoolData();
  }, [fetchSchoolData]);

  // 处理身份证号查询
  const handleSearch = async () => {
    // 重置状态
    setError('');
    setResult(null);

    // 验证输入
    if (!idNumber.trim()) {
      setError('请输入身份证号码');
      return;
    }

    // 简单的身份证号格式验证
    if (!/^\d{17}[\dXx]$/.test(idNumber.trim())) {
      setError('请输入有效的18位身份证号码');
      return;
    }

    // 🔥 修复：添加请求锁，防止重复点击
    if (loading || requestLockRef) return;

    setLoading(true);

    const getStudent = async () => {
      try {
        setError('');
        const res = await fetchStudentDetail(idNumber.trim());
        const next = res.data
        setResult(next)
      } catch (err) {
        console.log('page.tsx捕获到错误:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      } finally {
        setLoading(false)
      }
    };

    getStudent();
  };

  // 处理回车键查询
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 检查是否有未付款订单
  const hasUnpaidOrders = (): boolean => {
    if (!result?.orders || result.orders.length === 0) return false;
    return result.orders.some((order: StudentUniformOrder) => order.payment_status === 0);
  };

  // 处理去付款
  const handlePayment = () => {
    setDrawerVisible(false);
    router.push(`/payment?method=${selectedPaymentMethod}&id=${idNumber.trim()}`);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 服务器拥堵蒙版 */}
      <ServerOverloadModal
        visible={serverOverload}
        onClose={() => setServerOverload(false)}
        onRefresh={handleRefresh}
      />

      {/* 头部 - 显示学校名称 */}
      <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
        <div className="max-w-md mx-auto">
          <h1 className="text-center text-xl font-bold">{schoolName}</h1>
          <p className="text-center text-blue-100 text-sm mt-1">校服信息查询系统</p>
        </div>
      </header>

      <main className="flex-1 py-6 px-4 sm:px-6">
        {/* 内容容器 - 响应式设计 */}
        <div className="max-w-md mx-auto w-full">
          {/* 查询区域 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="idCard" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  学生身份证号
                </label>
                <div className="flex gap-2">
                  <input
                    id="idCard"
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.replace(/\s/g, ''))}
                    onKeyPress={handleKeyPress}
                    placeholder="请输入18位身份证号"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    maxLength={18}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? '查询中...' : '查询'}
                  </button>
                </div>
              </div>

              {error && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* 结果展示区域 */}
          {result && (
            <div className="space-y-6 animate-fadeIn">
              {/* 学生基本信息卡片 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="bg-blue-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">学生基本信息</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">姓名</p>
                      <p className="text-base font-medium">{result.student.name}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">班级</p>
                      <p className="text-base font-medium">{result.student.class_name}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 订单信息卡片 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="bg-blue-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">校服订单信息</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {result.orders.map(order => (
                    <div key={order.student_id} className="p-5">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">校服类型</p>
                          <p className="text-base font-medium">{getUniformTypeText(order.uniform_type)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">尺码</p>
                          <p className="text-base font-medium">{order.size}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">数量</p>
                          <p className="text-base font-medium">{order.quantity} 套</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">单价</p>
                          <p className="text-base font-medium">¥{formatPriceValue(order.price)}</p>
                        </div>
                        <div className="col-span-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">总价</p>
                              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">¥{formatPriceValue(order.total_amount)}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${order.payment_status === 0
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              }`}>
                              {getPaymentStatusText(order.payment_status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* 选择支付方式按钮 - 有订单且存在未付款时显示 */}
              {hasUnpaidOrders() && (
                <Button
                  type="primary"
                  onClick={() => setDrawerVisible(true)}
                  className="w-full"
                >
                  选择支付方式
                </Button>
              )}
            </div>

          )}
        </div>
      </main>

      {/* 使用统一的 Footer 组件 */}
      <Footer />

      {/* 支付方式选择抽屉 */}
      <Drawer
        title="选择支付方式"
        placement="bottom"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        height={300}
        extra={null}
        className="payment-drawer"
      >
        {/* 抽屉内容区 */}
        <div className="py-4">
          <Radio.Group
            value={selectedPaymentMethod}
            onChange={(e: RadioChangeEvent) => setSelectedPaymentMethod(e.target.value)}
            style={style}
            className="space-y-4"
          >
            {/* 微信支付选项（带图标） */}
            <Radio value={3}>
              <span className="flex items-center gap-3 py-2">
                <img
                  src="/icons/wechat-pay.svg"
                  alt="微信支付"
                  className="w-6 h-6 object-contain"
                />
                <span>微信支付</span>
              </span>
            </Radio>

            {/* 支付宝选项（带图标） */}
            <Radio value={2}>
              <span className="flex items-center gap-3 py-2">
                <img
                  src="/icons/alipay.svg"
                  alt="支付宝"
                  className="w-6 h-6 object-contain"
                />
                <span>支付宝</span>
              </span>
            </Radio>
          </Radio.Group>
        </div>

        {/* 抽屉底部区域（放置去付款按钮） */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button
            type="primary"
            onClick={handlePayment}
            className="w-full"
            size="large"
          >
            去付款
          </Button>
        </div>
      </Drawer>
    </div>
  );
}