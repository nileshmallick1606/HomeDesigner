'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  lastSaved?: string;
}

export function EditorToolbar({
  onUndo, onRedo, onSave, onExport, canUndo, canRedo, isSaving, lastSaved,
}: ToolbarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <IconButton size="small" onClick={onUndo} disabled={!canUndo} title="Undo">
        <UndoIcon />
      </IconButton>
      <IconButton size="small" onClick={onRedo} disabled={!canRedo} title="Redo">
        <RedoIcon />
      </IconButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Button
        size="small"
        variant="outlined"
        startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
        onClick={onSave}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>

      <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={onExport}>
        PNG
      </Button>

      <Box sx={{ flex: 1 }} />

      {lastSaved && (
        <Typography variant="caption" color="text.secondary">
          {lastSaved}
        </Typography>
      )}
    </Box>
  );
}
