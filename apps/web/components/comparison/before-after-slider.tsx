'use client';

import { useRef, useState, useCallback } from 'react';
import Box from '@mui/material/Box';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  height?: number;
}

export function BeforeAfterSlider({ beforeSrc, afterSrc, height = 400 }: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDragging) updatePosition(e.clientX);
  }, [isDragging, updatePosition]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setSliderPos((p) => Math.max(0, p - 2));
    if (e.key === 'ArrowRight') setSliderPos((p) => Math.min(100, p + 2));
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        borderRadius: 2,
        cursor: 'ew-resize',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Before/After comparison slider"
      aria-valuenow={Math.round(sliderPos)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* After image (full width) */}
      <Box
        component="img"
        src={afterSrc}
        alt="After"
        sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Before image (clipped) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${sliderPos}%`,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={beforeSrc}
          alt="Before"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: containerRef.current ? containerRef.current.offsetWidth : '100vw',
            height: '100%',
            objectFit: 'cover',
            maxWidth: 'none',
          }}
        />
      </Box>

      {/* Slider handle */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: `${sliderPos}%`,
          transform: 'translateX(-50%)',
          width: 4,
          height: '100%',
          bgcolor: 'white',
          boxShadow: '0 0 8px rgba(0,0,0,0.5)',
          zIndex: 2,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: `${sliderPos}%`,
          transform: 'translate(-50%, -50%)',
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'white',
          boxShadow: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
          fontSize: 18,
        }}
      >
        ⟷
      </Box>

      {/* Labels */}
      <Box sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', px: 1.5, py: 0.5, borderRadius: 1, fontSize: 12 }}>
        Before
      </Box>
      <Box sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', px: 1.5, py: 0.5, borderRadius: 1, fontSize: 12 }}>
        After
      </Box>
    </Box>
  );
}
