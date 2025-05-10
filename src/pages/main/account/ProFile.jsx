/* eslint-disable react/prop-types */
import { FaEnvelope, FaPhone, FaEdit, FaTimes, FaBirthdayCake, FaCamera, FaLock, FaCalendar } from 'react-icons/fa';
import { useState, useEffect, useCallback } from 'react';
import { getUserById, uploadProfileImage, updateUser, updateUserPassword } from '../../../api/userApi';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';

// Component hiển thị ảnh đại diện
const ProfileImage = ({ src, alt, onClick, onImageChange }) => (
  <div className="relative inline-block">
    <img
      src={src || 'https://i.pravatar.cc/300'}
      alt={alt}
      className="rounded-full w-32 h-32 sm:w-48 sm:h-48 mx-auto mb-4 border-4 border-pink-500 transition-transform duration-300 hover:scale-105"
      onClick={onClick}
      loading="lazy"
    />
    <label className="absolute bottom-4 right-4 bg-pink-600 text-white rounded-full p-2 cursor-pointer hover:bg-pink-700 transition-colors">
      <FaCamera />
      <input type="file" className="hidden" accept="image/*" onChange={onImageChange} />
    </label>
  </div>
);

const ProfilePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isEditPasswordModalOpen, setIsEditPasswordModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [infoForm, setInfoForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    profileImage: null,
  });
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Hàm validate form thông tin
  const validateInfoForm = () => {
    const errors = {};
    if (!infoForm.fullName.trim()) errors.fullName = 'Họ và tên không được để trống';
    if (!infoForm.email.trim() || !/\S+@\S+\.\S+/.test(infoForm.email)) errors.email = 'Email không hợp lệ';
    if (infoForm.phone && !/^\+?\d{9,12}$/.test(infoForm.phone)) errors.phone = 'Số điện thoại không hợp lệ';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Hàm validate form mật khẩu
  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordForm.password) errors.password = 'Mật khẩu không được để trống';
    else if (passwordForm.password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (passwordForm.password !== passwordForm.confirmPassword)
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Hàm lấy dữ liệu người dùng
  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const decodedToken = jwtDecode(token);
      const userId = decodedToken.id;

      const response = await getUserById(userId);
      const userData = response.data;
      setUser(userData);
      setInfoForm({
        fullName: userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        birthDate: userData.birthDate ? new Date(userData.birthDate).toISOString().slice(0, 10) : '',
        profileImage: userData.profileImage || null,
      });
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu người dùng:', err);
      setError(err.response?.data?.message || 'Không thể tải dữ liệu người dùng. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Xử lý submit form chỉnh sửa thông tin
  const handleEditInfoSubmit = async (e) => {
    e.preventDefault();
    if (!validateInfoForm()) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Không tìm thấy token xác thực');

      const decodedToken = jwtDecode(token);
      const userId = decodedToken.id;
      if (decodedToken.exp * 1000 < Date.now()) {
        throw new Error('Token đã hết hạn');
      }

      const dataToUpdate = {
        fullName: infoForm.fullName,
        email: infoForm.email,
        phone: infoForm.phone || null,
        birthDate: infoForm.birthDate ? new Date(infoForm.birthDate).toISOString() : null,
        role: user?.role || 'Student',
      };

      const updatedUser = await updateUser(userId, dataToUpdate);
      setUser(updatedUser.data);

      if (infoForm.profileImage && infoForm.profileImage instanceof File) {
        const imageResponse = await uploadProfileImage(infoForm.profileImage);
        setUser((prev) => ({ ...prev, profileImage: imageResponse.data.profileImage }));
      }

      setIsEditInfoModalOpen(false);
      toast.success('Cập nhật thông tin thành công!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (err) {
      console.error('Lỗi khi cập nhật thông tin:', err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại sau.', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý submit form đổi mật khẩu
  const handleEditPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Không tìm thấy token xác thực');

      const decodedToken = jwtDecode(token);
      const userId = decodedToken.id;
      if (decodedToken.exp * 1000 < Date.now()) {
        throw new Error('Token đã hết hạn');
      }

      const passwordData = {
        password: passwordForm.password,
        confirmPassword: passwordForm.confirmPassword,
      };

      await updateUserPassword(userId, passwordData);

      setIsEditPasswordModalOpen(false);
      setPasswordForm({ password: '', confirmPassword: '' });
      toast.success('Đổi mật khẩu thành công!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (err) {
      console.error('Lỗi khi đổi mật khẩu:', err);
      toast.error(err.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại sau.', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý thay đổi input cho form thông tin
  const handleInfoInputChange = (e) => {
    const { name, value } = e.target;
    setInfoForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Xử lý thay đổi input cho form mật khẩu
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Xử lý thay đổi ảnh đại diện
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInfoForm((prev) => ({ ...prev, profileImage: file }));
    }
  };

  // Xử lý đóng modal thông tin
  const handleCloseInfoModal = () => {
    if (
      JSON.stringify(infoForm) !==
      JSON.stringify({
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        birthDate: user?.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : '',
        profileImage: user?.profileImage || null,
      })
    ) {
      if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn thoát?')) return;
    }
    setIsEditInfoModalOpen(false);
    setFormErrors({});
  };

  // Xử lý đóng modal mật khẩu
  const handleClosePasswordModal = () => {
    if (passwordForm.password || passwordForm.confirmPassword) {
      if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn thoát?')) return;
    }
    setIsEditPasswordModalOpen(false);
    setFormErrors({});
    setPasswordForm({ password: '', confirmPassword: '' });
  };

  // Hàm định dạng createdAt
  const formatCreatedAt = (createdAt) => {
    if (!createdAt) return 'Chưa có ngày tạo';
    try {
      const [date, time] = createdAt.split(' ');
      const [day, month, year] = date.split('-');
      const parsedDate = new Date(`${year}-${month}-${day}T${time}`);
      if (isNaN(parsedDate)) throw new Error('Invalid date');
      return parsedDate.toLocaleDateString('vi-VN');
    } catch {
      return 'Chưa có ngày tạo';
    }
  };

  if (isLoading && !user) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p>{error}</p>
          <button
            onClick={fetchUserData}
            className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center md:p-4 bg-gray-100 mt-20 md:mt-0">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 sm:p-8 transition-all duration-300">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          {/* Avatar + Tên */}
          <div className="w-full md:w-1/3 text-center mb-6 md:mb-0">
            <ProfileImage
              src={user?.profileImage ? `${import.meta.env.VITE_API_URL}${user.profileImage}` : null}
              alt="Profile"
              onClick={() => setIsModalOpen(true)}
              onImageChange={handleImageChange}
            />
            <h1 className="text-xl sm:text-2xl font-bold text-pink-500 mb-1 sm:mb-2">
              {user?.fullName || 'Đang tải...'}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">{user?.role || 'Người dùng'}</p>
            <div className="flex justify-center mt-3 sm:mt-4 gap-3">
                <button
                  className="bg-pink-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-pink-700 transition-colors duration-300 flex items-center gap-1.5"
                  onClick={() => setIsEditInfoModalOpen(true)}
                >
                  <FaEdit className="text-sm" /> Chỉnh sửa
                </button>
                <button
                  className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors duration-300 flex items-center gap-1.5"
                  onClick={() => setIsEditPasswordModalOpen(true)}
                >
                  <FaLock className="text-sm" /> Mật khẩu
                </button>
              </div>

          </div>

          {/* Thông tin chi tiết */}
          <div className="w-full md:w-2/3 md:pl-8">
            <Section title="Thông tin liên hệ">
              <ul className="space-y-2 text-gray-700">
                <ContactItem icon={<FaEnvelope />} text={user?.email || 'Chưa có email'} />
                <ContactItem icon={<FaPhone />} text={user?.phone || 'Chưa có số điện thoại'} />
                <ContactItem
                  icon={<FaBirthdayCake />}
                  text={
                    user?.birthDate
                      ? new Date(user.birthDate).toLocaleDateString('vi-VN')
                      : 'Chưa có ngày sinh'
                  }
                />
                <ContactItem
                  icon={<FaCalendar />}
                  text={formatCreatedAt(user?.createdAt)}
                />
              </ul>
            </Section>
          </div>
        </div>
      </div>

      {/* Modal Hiển thị ảnh */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 p-4 z-50">
          <div className="relative w-full max-w-xs sm:max-w-md">
            <img
              src={user?.profileImage ? `${import.meta.env.VITE_API_URL}${user.profileImage}` : 'https://i.pravatar.cc/600'}
              alt="Profile Enlarged"
              className="rounded-lg shadow-2xl w-full"
              loading="lazy"
            />
            <button
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2"
              onClick={() => setIsModalOpen(false)}
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa thông tin */}
      {isEditInfoModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl p-6">
            <h2 className="text-2xl font-bold text-pink-500 mb-6 text-center">Chỉnh sửa thông tin</h2>
            <form onSubmit={handleEditInfoSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Họ và tên */}
                <div>
                  <label className="block text-gray-700 mb-2">Họ và tên</label>
                  <input
                    type="text"
                    name="fullName"
                    value={infoForm.fullName}
                    onChange={handleInfoInputChange}
                    className={`w-full border rounded-lg p-2 ${formErrors.fullName ? 'border-red-500' : ''}`}
                    required
                  />
                  {formErrors.fullName && <p className="text-red-500 text-sm">{formErrors.fullName}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={infoForm.email}
                    onChange={handleInfoInputChange}
                    className={`w-full border rounded-lg p-2 ${formErrors.email ? 'border-red-500' : ''}`}
                    required
                  />
                  {formErrors.email && <p className="text-red-500 text-sm">{formErrors.email}</p>}
                </div>

                {/* Số điện thoại */}
                <div>
                  <label className="block text-gray-700 mb-2">Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={infoForm.phone}
                    onChange={handleInfoInputChange}
                    className={`w-full border rounded-lg p-2 ${formErrors.phone ? 'border-red-500' : ''}`}
                  />
                  {formErrors.phone && <p className="text-red-500 text-sm">{formErrors.phone}</p>}
                </div>

                {/* Ngày sinh */}
                <div>
                  <label className="block text-gray-700 mb-2">Ngày sinh</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={infoForm.birthDate}
                    onChange={handleInfoInputChange}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                {/* Ảnh đại diện */}
                <div className="sm:col-span-2">
                  <label className="block text-gray-700 mb-2">Ảnh đại diện</label>
                  <input
                    type="file"
                    name="profileImage"
                    onChange={handleImageChange}
                    className="w-full border rounded-lg p-2"
                    accept="image/*"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={handleCloseInfoModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đổi mật khẩu */}
      {isEditPasswordModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-pink-500 mb-6 text-center">Đổi mật khẩu</h2>
            <form onSubmit={handleEditPasswordSubmit}>
              <div className="space-y-4">
                {/* Mật khẩu mới */}
                <div>
                  <label className="block text-gray-700 mb-2">Mật khẩu mới</label>
                  <input
                    type="password"
                    name="password"
                    value={passwordForm.password}
                    onChange={handlePasswordInputChange}
                    placeholder="Nhập mật khẩu mới"
                    className={`w-full border rounded-lg p-2 ${formErrors.password ? 'border-red-500' : ''}`}
                    required
                  />
                  {formErrors.password && <p className="text-red-500 text-sm">{formErrors.password}</p>}
                </div>

                {/* Xác nhận mật khẩu */}
                <div>
                  <label className="block text-gray-700 mb-2">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Xác nhận mật khẩu mới"
                    className={`w-full border rounded-lg p-2 ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
                    required
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-red-500 text-sm">{formErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={handleClosePasswordModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang lưu...' : 'Lưu mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Các component phụ
const Section = ({ title, children }) => (
  <div className="mb-4 sm:mb-6">
    <h2 className="text-lg sm:text-xl font-semibold text-pink-500 mb-2 sm:mb-4">{title}</h2>
    {children}
  </div>
);

const ContactItem = ({ icon, text }) => (
  <li className="flex items-center gap-2 text-sm sm:text-lg">
    <span className="text-pink-500">{icon}</span>
    {text}
  </li>
);

export default ProfilePage;