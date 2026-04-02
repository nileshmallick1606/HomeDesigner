'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import CloseIcon from '@mui/icons-material/Close';

interface ImageViewerProps {
  src: string;
  alt?: string;
  children: (onClick: () => void) => React.ReactNode;
}

/**
 * Wraps any image with a fullscreen viewer on click.
 * Usage: <ImageViewer src={url}>{(open) => <img onClick={open} ... />}</ImageViewer>
 */
export function ImageViewer({ src, alt = 'Image', children }: ImageViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {children(() => setOpen(true))}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        fullScreen
        PaperProps={{
          sx: { bgcolor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        }}
      >
        <IconButton
          onClick={() => setOpen(false)}
          sx={{ position: 'absolute', top: 16, right: 16, color: 'white', zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            maxWidth: '95vw',
            maxHeight: '95vh',
            objectFit: 'contain',
            borderRadius: 1,
          }}
        />
      </Dialog>
    </>
  );
}

/**
 * Simple clickable image that opens fullscreen on click.
 */
export function ClickableImage({
  src,
  alt = 'Image',
  sx,
  ...props
}: {
  src: string;
  alt?: string;
  sx?: Record<string, unknown>;
  [key: string]: unknown;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Box
        component="img"
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        sx={{ cursor: 'pointer', ...sx }}
        {...props}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        fullScreen
        PaperProps={{
          sx: { bgcolor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        }}
      >
        <IconButton
          onClick={() => setOpen(false)}
          sx={{ position: 'absolute', top: 16, right: 16, color: 'white', zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain' }}
        />
      </Dialog>
    </>
  );
}
