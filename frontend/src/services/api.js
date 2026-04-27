import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export const uploadAndProcessImage = async (file, apiKey, modelId, onProgress) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('apiKey', apiKey);
  formData.append('modelId', modelId);

  const response = await api.post('/art/process', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return response.data;
};

export const getArtwork = async (uuid) => {
  const response = await api.get(`/art/${uuid}`);
  return response.data;
};

export const publishArtwork = async (uuid, title) => {
  const response = await api.post(`/art/${uuid}/publish`, { title });
  return response.data;
};

export const getGallery = async (params = {}) => {
  const { sort = 'latest', page = 1, limit = 20 } = params;
  const response = await api.get('/gallery', {
    params: { sort, page, limit }
  });
  return response.data;
};

export const getGalleryItem = async (uuid) => {
  const response = await api.get(`/gallery/${uuid}`);
  return response.data;
};

export const likeArtwork = async (uuid) => {
  const response = await api.post(`/gallery/${uuid}/like`);
  return response.data;
};

export const checkLikeStatus = async (uuid) => {
  const response = await api.get(`/gallery/${uuid}/like-status`);
  return response.data;
};

export default api;
