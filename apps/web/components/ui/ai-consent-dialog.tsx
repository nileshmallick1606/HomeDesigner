'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CloudIcon from '@mui/icons-material/Cloud';
import Box from '@mui/material/Box';

interface AIConsentDialogProps {
  open: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export function AIConsentDialog({ open, onConsent, onDecline }: AIConsentDialogProps) {
  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudIcon color="primary" />
          Cloud AI Processing
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          To generate realistic room visualizations, your room photos will be
          processed by a cloud AI service.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          What happens:
        </Typography>
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>Your room photo is sent to a cloud AI service (Replicate)</li>
          <li>The AI generates a visualization of the renovation changes</li>
          <li>The generated image is downloaded and stored in your project</li>
          <li>Photos are used only for generating your visualization</li>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You can change this preference anytime in your profile settings.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onDecline} color="inherit">
          No, Keep Local
        </Button>
        <Button onClick={onConsent} variant="contained">
          Yes, Use Cloud AI
        </Button>
      </DialogActions>
    </Dialog>
  );
}
