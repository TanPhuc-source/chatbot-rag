import axios from 'axios';

const handleLogin = async (username, password) => {
    try {
        // FastAPI mong đợi dữ liệu dạng form-data cho OAuth2
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await axios.post('http://localhost:8000/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Lưu token vào localStorage
        localStorage.setItem('access_token', response.data.access_token);

        // TODO: Chuyển hướng người dùng sang trang Admin hoặc Chat tùy role
        alert("Đăng nhập thành công!");

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        alert("Tài khoản hoặc mật khẩu không đúng.");
    }
};