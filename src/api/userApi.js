import api from './axios';

const API_URL = '/user';

export const getUsers = async () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Không tìm thấy token');
  }
  return await api.get(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

export const getUserById = async (id) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Không tìm thấy token');
  }
  return await api.get(`${API_URL}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

export const createUser = async (userData) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Không tìm thấy token');
  }
  return await api.post(API_URL, userData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

export const updateUser = async (id, userData) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Không tìm thấy token');
  }
  return await api.put(`${API_URL}/${id}`, userData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

export const deleteUser = async (id) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Không tìm thấy token');
  }
  return await api.delete(`${API_URL}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

// Upload ảnh đại diện
export const uploadProfileImage = async (file) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Không tìm thấy token');
  }

  const formData = new FormData();
  formData.append('file', file);

  return await api.post(`${API_URL}/profile/upload-avatar`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
};