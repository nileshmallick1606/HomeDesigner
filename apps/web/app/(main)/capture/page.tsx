'use client';

import { useRef, useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ReplayIcon from '@mui/icons-material/Replay';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function CapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cameraSupported] = useState(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else {
        setError('Could not access camera. Make sure no other app is using it.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
      stopCamera();
    }
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  return (
    <Container maxWidth="sm" sx={{ pt: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Capture Room Photo
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!cameraSupported ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Camera not available on this device. Use the Upload Photo button in a room detail page instead.
        </Alert>
      ) : !stream && !capturedImage ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CameraAltIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Take a photo of your room to start visualizing changes.
          </Typography>
          <Button variant="contained" size="large" startIcon={<PhotoCameraIcon />} onClick={startCamera}>
            Open Camera
          </Button>
        </Box>
      ) : null}

      {stream && !capturedImage && (
        <Box sx={{ position: 'relative' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', borderRadius: 12, maxHeight: '60vh', objectFit: 'cover' }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
            <Button variant="contained" size="large" startIcon={<PhotoCameraIcon />} onClick={capture}>
              Capture
            </Button>
            <Button variant="outlined" onClick={stopCamera}>
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {capturedImage && (
        <Box>
          <Box
            component="img"
            src={capturedImage}
            alt="Captured"
            sx={{ width: '100%', borderRadius: 2, mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ReplayIcon />} onClick={retake} fullWidth>
              Retake
            </Button>
            <Button variant="contained" startIcon={<CloudUploadIcon />} fullWidth>
              Use Photo
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
            Select a project and room to upload this photo to.
          </Typography>
        </Box>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Container>
  );
}
