'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import { Canvas, PencilBrush, IText, Rect, Circle } from 'fabric';
import { EditorToolbar } from './toolbar';
import { ToolPanel, type ToolType } from './tool-panel';
import { apiClient } from '../../lib/api-client';

interface CanvasEditorProps {
  roomPhotoUrl: string;
  visualizationUrl?: string;
  canvasState?: Record<string, unknown> | null;
  designId: string;
}

export default function CanvasEditor({ roomPhotoUrl, canvasState, designId }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [brushColor, setBrushColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  const [dirty, setDirty] = useState(false);

  // History
  const historyRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback(() => {
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    historyRef.current.push(json);
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoRef.current = [];
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(false);
    setDirty(true);
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const container = canvasRef.current.parentElement;
    const width = container ? container.clientWidth : 800;
    const height = Math.min(width * 0.75, 600);

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#f5f5f5',
    });
    fabricRef.current = canvas;

    // Load background image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { FabricImage } = require('fabric');
      const fabricImg = new FabricImage(img);
      const scale = Math.min(width / img.width, height / img.height);
      fabricImg.scale(scale);
      canvas.backgroundImage = fabricImg;
      canvas.renderAll();

      // Restore canvas state if exists
      if (canvasState) {
        try {
          canvas.loadFromJSON(JSON.stringify(canvasState)).then(() => {
            canvas.renderAll();
            pushHistory();
          });
        } catch (err) {
          console.error('Failed to restore canvas state:', err);
          pushHistory();
        }
      } else {
        pushHistory();
      }
    };
    img.src = roomPhotoUrl;

    // Track changes
    const onChange = () => pushHistory();
    canvas.on('object:added', onChange);
    canvas.on('object:modified', onChange);
    canvas.on('object:removed', onChange);

    // Auto-save every 30s
    const autoSave = setInterval(() => {
      if (dirty && fabricRef.current) {
        handleSave();
      }
    }, 30000);

    // Save on blur
    const onBlur = () => {
      if (dirty && fabricRef.current) {
        handleSave();
      }
    };
    window.addEventListener('blur', onBlur);

    return () => {
      clearInterval(autoSave);
      window.removeEventListener('blur', onBlur);
      canvas.dispose();
    };
  }, []); // eslint-disable-line

  // Update tool mode
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === 'draw';
    if (activeTool === 'draw') {
      const brush = new PencilBrush(canvas);
      brush.color = brushColor;
      brush.width = brushSize;
      canvas.freeDrawingBrush = brush;
    }

    if (activeTool === 'eraser') {
      const active = canvas.getActiveObjects();
      if (active.length > 0) {
        active.forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
        pushHistory();
      }
      setActiveTool('select');
    }
  }, [activeTool, brushColor, brushSize, pushHistory]);

  // Canvas click for text/shapes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleClick = (e: { pointer?: { x: number; y: number } }) => {
      if (!e.pointer) return;

      if (activeTool === 'text') {
        const text = new IText('Text', {
          left: e.pointer.x,
          top: e.pointer.y,
          fontSize: 20,
          fill: brushColor,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
      } else if (activeTool === 'rect') {
        const rect = new Rect({
          left: e.pointer.x,
          top: e.pointer.y,
          width: 100,
          height: 60,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
        });
        canvas.add(rect);
      } else if (activeTool === 'circle') {
        const circle = new Circle({
          left: e.pointer.x,
          top: e.pointer.y,
          radius: 40,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
        });
        canvas.add(circle);
      }
    };

    canvas.on('mouse:down', handleClick);
    return () => {
      canvas.off('mouse:down', handleClick);
    };
  }, [activeTool, brushColor, brushSize]);

  const handleSave = async () => {
    if (!fabricRef.current) return;
    setIsSaving(true);
    try {
      const state = fabricRef.current.toJSON();
      await apiClient.fetch(`/ai/designs/${designId}`, {
        method: 'PATCH',
        json: { canvasState: state },
      });
      setDirty(false);
      setLastSaved('Saved just now');
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndo = () => {
    if (historyRef.current.length <= 1 || !fabricRef.current) return;
    const current = historyRef.current.pop()!;
    redoRef.current.push(current);
    const prev = historyRef.current[historyRef.current.length - 1];
    fabricRef.current.loadFromJSON(prev).then(() => {
      fabricRef.current?.renderAll();
      setCanUndo(historyRef.current.length > 1);
      setCanRedo(true);
    });
  };

  const handleRedo = () => {
    if (redoRef.current.length === 0 || !fabricRef.current) return;
    const next = redoRef.current.pop()!;
    historyRef.current.push(next);
    fabricRef.current.loadFromJSON(next).then(() => {
      fabricRef.current?.renderAll();
      setCanUndo(true);
      setCanRedo(redoRef.current.length > 0);
    });
  };

  const handleExport = () => {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({ format: 'png', quality: 1 } as any);
    const link = document.createElement('a');
    link.download = `design-${designId}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <EditorToolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onExport={handleExport}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        lastSaved={lastSaved}
      />

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <ToolPanel
            activeTool={activeTool}
            onToolChange={setActiveTool}
            brushColor={brushColor}
            onColorChange={setBrushColor}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
          />
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', p: 1 }}>
          <canvas ref={canvasRef} />
        </Box>
      </Box>

      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <ToolPanel
          activeTool={activeTool}
          onToolChange={setActiveTool}
          brushColor={brushColor}
          onColorChange={setBrushColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
        />
      </Box>
    </Box>
  );
}
