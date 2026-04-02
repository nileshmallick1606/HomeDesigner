'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import GridViewIcon from '@mui/icons-material/GridView';
import PersonIcon from '@mui/icons-material/Person';

const tabs = [
  { label: 'Home', icon: <HomeIcon />, href: '/dashboard' },
  { label: 'Projects', icon: <FolderIcon />, href: '/projects' },
  { label: 'Capture', icon: <AddCircleIcon />, href: '/capture' },
  { label: 'Library', icon: <GridViewIcon />, href: '/library' },
  { label: 'Profile', icon: <PersonIcon />, href: '/profile' },
];

export function BottomTabs() {
  const pathname = usePathname();

  const currentTab = tabs.findIndex((tab) => {
    if (tab.href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(tab.href);
  });

  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
      elevation={3}
    >
      <BottomNavigation value={currentTab === -1 ? 0 : currentTab} showLabels>
        {tabs.map((tab) => (
          <BottomNavigationAction
            key={tab.href}
            label={tab.label}
            icon={tab.icon}
            component={Link}
            href={tab.href}
            sx={{ minWidth: 0, '& .MuiBottomNavigationAction-label': { fontSize: '0.75rem' } }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
