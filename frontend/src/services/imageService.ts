import axios from 'axios';

// ✅ Seedha Express backend ka URL do (Next.js proxy ko bypass karo FormData ke liye)
const BACKEND_URL = 'http://localhost:5000/api/v1';

export interface ResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  targetFileSizeKB?: number;
  targetFileSizeMB?: number;
  preserveResolution?: boolean;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('meettools_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const imageService = {
  resizeImage: async (file: File, options: ResizeOptions) => {
    const formData = new FormData();
    formData.append('image', file); // Field name 'image' matches Multer upload.single('image')

    if (options.width) formData.append('width', options.width.toString());
    if (options.height) formData.append('height', options.height.toString());
    if (options.quality) formData.append('quality', options.quality.toString());
    if (options.format) formData.append('format', options.format);
    if (options.targetFileSizeKB) formData.append('targetFileSizeKB', options.targetFileSizeKB.toString());
    if (options.targetFileSizeMB) formData.append('targetFileSizeMB', options.targetFileSizeMB.toString());
    if (options.preserveResolution !== undefined) {
      formData.append('preserveResolution', options.preserveResolution.toString());
    }

    // ✅ Direct backend request (Axios automatically handles multipart/form-data boundaries)
    const response = await axios.post(`${BACKEND_URL}/images/resize`, formData, {
      headers: {
        ...getAuthHeaders(),
        // ⚠️ NEVER set 'Content-Type': 'multipart/form-data' manually, let Axios handle the boundary!
      },
    });

    return response.data;
  },

  checkJobStatus: async (jobId: string) => {
    const response = await axios.get(`${BACKEND_URL}/images/status/${jobId}`, {
      headers: getAuthHeaders(),
    });

    return response.data;
  },
};