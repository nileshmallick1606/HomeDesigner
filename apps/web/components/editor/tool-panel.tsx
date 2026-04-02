'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import CreateIcon from '@mui/icons-material/Create';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CircleIcon from '@mui/icons-material/CircleOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import NearMeIcon from '@mui/icons-material/NearMe';

export type ToolType = 'select' | 'draw' | 'text' | 'rect' | 'circle' | 'eraser';

interface ToolPanelProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  brushColor: string;
  onColorChange: (color: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
}

const TOOLS: Array<{ type: ToolType; icon: React.ReactNode; label: string }> = [
  { type: 'select', icon: <NearMeIcon />, label: 'Select' },
  { type: 'draw', icon: <CreateIcon />, label: 'Draw' },
  { type: 'text', icon: <TextFieldsIcon />, label: 'Text' },
  { type: 'rect', icon: <CropSquareIcon />, label: 'Rectangle' },
  { type: 'circle', icon: <CircleIcon />, label: 'Circle' },
  { type: 'eraser', icon: <DeleteIcon />, label: 'Delete Selected' },
];

const COLORS = ['#000000', '#FF0000', '#0000FF', '#00AA00', '#FF6600', '#9900CC', '#FFFFFF'];

export function ToolPanel({
  activeTool, onToolChange, brushColor, onColorChange, brushSize, onBrushSizeChange,
}: ToolPanelProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'row', md: 'column' },
        alignItems: 'center',
        gap: 1,
        p: 1,
        borderTop: { xs: 1, md: 0 },
        borderRight: { xs: 0, md: 1 },
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflowX: { xs: 'auto', md: 'visible' },
      }}
    >
      {TOOLS.map((tool) => (
        <Tooltip key={tool.type} title={tool.label} placement="right">
          <IconButton
            size="small"
            onClick={() => onToolChange(tool.type)}
            color={activeTool === tool.type ? 'primary' : 'default'}
            sx={{
              border: activeTool === tool.type ? 2 : 1,
              borderColor: activeTool === tool.type ? 'primary.main' : 'divider',
              borderRadius: 1,
            }}
          >
            {tool.icon}
          </IconButton>
        </Tooltip>
      ))}

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {COLORS.map((color) => (
          <Box
            key={color}
            onClick={() => onColorChange(color)}
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: color,
              border: brushColor === color ? '2px solid #1565C0' : '1px solid #ccc',
              cursor: 'pointer',
            }}
          />
        ))}
      </Box>

      <Box sx={{ width: { xs: 80, md: '100%' }, px: 1 }}>
        <Typography variant="caption" color="text.secondary">Size</Typography>
        <Slider
          value={brushSize}
          onChange={(_, v) => onBrushSizeChange(v as number)}
          min={1}
          max={20}
          size="small"
        />
      </Box>
    </Box>
  );
}
