import { useState, useCallback } from 'react';
import { imageService, ResizeOptions } from '../services/imageService';

export function useImageResize() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('idle'); // idle, uploading, processing, completed, failed
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Polling function to check job status every 2 seconds
  const pollJobStatus = useCallback((jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const data = await imageService.checkJobStatus(jobId);

        if (data.status === 'completed') {
          clearInterval(interval);
          setResult(data);
          setStatus('completed');
          setLoading(false);
          setProgressMessage('Image processed successfully!');
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setError(data.failedReason || 'Image processing failed');
          setStatus('failed');
          setLoading(false);
        } else {
          setProgressMessage('Background worker is processing your image...');
        }
      } catch (err: any) {
        clearInterval(interval);
        setError(err.response?.data?.message || 'Error checking job status');
        setStatus('failed');
        setLoading(false);
      }
    }, 2000);
  }, []);

  const handleResize = async (file: File, options: ResizeOptions) => {
    setLoading(true);
    setStatus('uploading');
    setError(null);
    setResult(null);
    setProgressMessage('Uploading image and queuing job...');

    try {
      const response = await imageService.resizeImage(file, options);
      const jobId = response.jobId;

      setStatus('processing');
      setProgressMessage('Image queued. Processing in background...');
      
      // Start polling for result
      pollJobStatus(jobId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload image');
      setStatus('failed');
      setLoading(false);
    }
  };

  return {
    handleResize,
    loading,
    status,
    progressMessage,
    result,
    error,
  };
}