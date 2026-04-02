'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { NotificationBell } from '../notifications/notification-bell';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  showBack?: boolean;
  backHref?: string;
}

export function AppHeader({ title, breadcrumbs, actions, showBack, backHref }: AppHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // On mobile, collapse breadcrumbs to just parent + current
  const displayCrumbs = breadcrumbs && isMobile && breadcrumbs.length > 2
    ? [breadcrumbs[0], breadcrumbs[breadcrumbs.length - 1]]
    : breadcrumbs;

  return (
    <Box sx={{ px: 2, pt: 2, pb: 1 }}>
      {displayCrumbs && displayCrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 0.5, fontSize: '0.8rem' }}>
          {displayCrumbs.map((crumb, i) =>
            crumb.href && i < displayCrumbs.length - 1 ? (
              <Link
                key={i}
                href={crumb.href}
                style={{ color: theme.palette.text.secondary, textDecoration: 'none', fontSize: '0.8rem' }}
              >
                {crumb.label.length > 30 ? crumb.label.slice(0, 30) + '...' : crumb.label}
              </Link>
            ) : (
              <Typography key={i} variant="body2" color="text.primary" sx={{ fontSize: '0.8rem' }}>
                {crumb.label.length > 30 ? crumb.label.slice(0, 30) + '...' : crumb.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showBack && (
          <IconButton
            component={backHref ? Link : 'button'}
            href={backHref}
            onClick={backHref ? undefined : () => window.history.back()}
            size="small"
            sx={{ mr: 0.5 }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}

        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          {title}
        </Typography>

        {actions}

        <NotificationBell />
      </Box>
    </Box>
  );
}
