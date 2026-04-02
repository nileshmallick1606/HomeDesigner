'use client';

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiClient } from '../../lib/api-client';

interface ShareLink {
  id: string;
  token: string;
  role: 'VIEWER' | 'EDITOR';
  createdAt: string;
  expiresAt?: string;
}

interface ShareDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({ projectId, open, onClose }: ShareDialogProps) {
  const [role, setRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLinks = async () => {
    try {
      const data = await apiClient.fetch<ShareLink[]>(`/projects/${projectId}/share`);
      setLinks(data);
    } catch {
      // ignore fetch errors
    }
  };

  useEffect(() => {
    if (open) {
      fetchLinks();
      setGeneratedLink('');
    }
  }, [open, projectId]); // eslint-disable-line

  const handleCreateLink = async () => {
    setLoading(true);
    try {
      const body: { role: string; expiresInDays?: number } = { role };
      if (expiresInDays !== '') {
        body.expiresInDays = Number(expiresInDays);
      }
      const data = await apiClient.fetch<{ token: string }>(`/projects/${projectId}/share`, {
        method: 'POST',
        json: body,
      });
      setGeneratedLink(`${window.location.origin}/share/${data.token}`);
      fetchLinks();
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
  };

  const handleRevoke = async (linkId: string) => {
    try {
      await apiClient.fetch(`/projects/${projectId}/share/${linkId}`, {
        method: 'DELETE',
      });
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch {
      // handle error silently
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Share Project</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1, mb: 2 }}>
          <Select
            size="small"
            value={role}
            onChange={(e) => setRole(e.target.value as 'VIEWER' | 'EDITOR')}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="VIEWER">Viewer</MenuItem>
            <MenuItem value="EDITOR">Editor</MenuItem>
          </Select>
          <TextField
            size="small"
            label="Expires in days"
            type="number"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ width: 140 }}
          />
          <Button variant="contained" onClick={handleCreateLink} disabled={loading}>
            Create Link
          </Button>
        </Box>

        {generatedLink && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              mb: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
              {generatedLink}
            </Typography>
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {links.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Active Links
            </Typography>
            <List dense>
              {links.map((link) => (
                <ListItem
                  key={link.id}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => handleRevoke(link.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <Chip
                    label={link.role}
                    size="small"
                    color={link.role === 'EDITOR' ? 'primary' : 'default'}
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Created {new Date(link.createdAt).toLocaleDateString()}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
