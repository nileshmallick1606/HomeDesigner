import Box from '@mui/material/Box';
import { BottomTabs } from '../../components/navigation/bottom-tabs';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ pb: 8 }}>
      {children}
      <BottomTabs />
    </Box>
  );
}
