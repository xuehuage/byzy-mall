export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
                <div className="max-w-md mx-auto">
                    <h1 className="text-center text-xl font-bold">学生校服信息查询系统</h1>
                    <p className="text-center text-blue-100 text-sm mt-1">校服信息查询系统</p>
                </div>
            </header>
            <main className="flex-1 py-6 px-4 sm:px-6">
                <div className="max-w-md mx-auto w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                    <div className="text-center">
                        {/* 一个简单的加载动画 */}
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
                    </div>
                </div>
            </main>
        </div>
    );
}