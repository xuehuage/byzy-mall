interface ServerOverloadModalProps {
    visible: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function ServerOverloadModal({
    visible,
    onClose,
    onRefresh
}: ServerOverloadModalProps) {
    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
                <div className="text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">服务器拥堵</h3>
                    <p className="text-gray-600 mb-6">
                        当前访问人数过多，服务器暂时无法处理您的请求。
                        <br />
                        请尝试刷新页面或稍后再试。
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            稍后重试
                        </button>
                        <button
                            onClick={onRefresh}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            刷新页面
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}