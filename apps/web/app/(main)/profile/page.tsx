'use client';

import { useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [editName, setEditName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const handleSaveName = async () => {
    if (!editName.trim() || editName === user.name) return;
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.fetch('/users/me', {
        method: 'PATCH',
        json: { name: editName.trim() },
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Error handled by apiClient
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await apiClient.fetch('/users/me', { method: 'DELETE' });
      logout();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ pt: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Profile
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 28 }}>
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Chip label={user.profileType.replace(/_/g, ' ')} size="small" color="primary" variant="outlined" />
            <Chip label={user.platformRole.replace(/_/g, ' ')} size="small" />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Edit Name
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              size="small"
              fullWidth
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleSaveName}
              disabled={saving || editName === user.name}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
          {saved && <Alert severity="success" sx={{ mt: 1 }}>Name updated!</Alert>}
        </CardContent>
      </Card>

      <Button
        variant="outlined"
        fullWidth
        startIcon={<LogoutIcon />}
        onClick={logout}
        sx={{ mb: 2 }}
      >
        Log Out
      </Button>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" color="error" fontWeight={600} sx={{ mb: 1 }}>
        Danger Zone
      </Typography>
      <Button
        variant="outlined"
        color="error"
        fullWidth
        startIcon={<DeleteIcon />}
        onClick={() => setDeleteOpen(true)}
      >
        Delete Account
      </Button>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete your account and all associated data
            (projects, rooms, photos, designs). This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Forever'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
