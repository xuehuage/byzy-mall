'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchPublicSchoolDetail, fetchStudentDetail } from './services/publicApi';

// 定义学生信息类型
interface StudentInfo {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  className: string;
  grade: string;
  enrollmentDate: string;
  studentId: string;
}

// 定义订单信息类型
interface OrderInfo {
  id: string;
  uniformType: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentStatus: string;
}

// 定义查询结果类型
interface QueryResult {
  student: StudentInfo;
  orders: OrderInfo[];
}

export default function Home() {
  const [idNumber, setIdNumber] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const [schoolName, setSchoolName] = useState<String>('学生校服信息查询系统');



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

    setLoading(true);

    try {

      fetchStudentDetail(idNumber.trim()).then(res => {
        console.log('res:::', res)
      })

      // // 模拟API请求
      // await new Promise(resolve => setTimeout(resolve, 1000));

      // // 提取身份证号中的信息
      // const id = idNumber.trim();
      // const birthYear = id.substring(6, 10);
      // const birthMonth = id.substring(10, 12);
      // const birthDay = id.substring(12, 14);

      // // 修复性别判断的类型错误：先将字符转换为数字
      // const genderCode = parseInt(id.charAt(16), 10);
      // const gender = genderCode % 2 === 1 ? '男' : '女';

      // // 模拟返回结果
      // setResult({
      //   student: {
      //     id,
      //     name: '张三',
      //     gender,
      //     birthDate: `${birthYear}-${birthMonth}-${birthDay}`,
      //     className: '高三(1)班',
      //     grade: '高三',
      //     enrollmentDate: '2021-09-01',
      //     studentId: 'G3C1-001'
      //   },
      //   orders: [
      //     {
      //       id: '1001',
      //       uniformType: '夏装',
      //       size: '175',
      //       quantity: 1,
      //       unitPrice: 120.00,
      //       totalPrice: 120.00,
      //       paymentStatus: '未付款'
      //     },
      //     {
      //       id: '1002',
      //       uniformType: '春秋装',
      //       size: '175',
      //       quantity: 1,
      //       unitPrice: 180.00,
      //       totalPrice: 180.00,
      //       paymentStatus: '未付款'
      //     }
      //   ]
      // });
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理回车键查询
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    fetchPublicSchoolDetail(1).then(res => {
      if (res.code === 200) {
        setSchoolName(res.data.name)
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">性别</p>
                      <p className="text-base font-medium">{result.student.gender}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">出生日期</p>
                      <p className="text-base font-medium">{result.student.birthDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">学号</p>
                      <p className="text-base font-medium">{result.student.studentId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">年级</p>
                      <p className="text-base font-medium">{result.student.grade}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">班级</p>
                      <p className="text-base font-medium">{result.student.className}</p>
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
                    <div key={order.id} className="p-5">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">校服类型</p>
                          <p className="text-base font-medium">{order.uniformType}</p>
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
                          <p className="text-base font-medium">¥{order.unitPrice.toFixed(2)}</p>
                        </div>
                        <div className="col-span-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">总价</p>
                              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">¥{order.totalPrice.toFixed(2)}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${order.paymentStatus === '未付款'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              }`}>
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 页脚 */}
      <footer className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
        <p>© {new Date().getFullYear()} 河池市宜州区百盈制衣版权所有</p>
      </footer>
    </div>
  );
}
