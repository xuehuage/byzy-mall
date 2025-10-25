const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';



export const fetchStudentDetail = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/public/students/query-by-idcard/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch school details');
    }

    return response.json();
};