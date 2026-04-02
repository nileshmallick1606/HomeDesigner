import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';

export default function HomePage() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 3,
          px: 2,
        }}
      >
        <Typography variant="h3" component="h1" fontWeight={700} color="primary">
          InteriorScience
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 400 }}>
          See your renovated space before a single wall is touched.
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI-powered before/after visualization for home interiors.
        </Typography>
        <Button variant="contained" size="large" sx={{ mt: 2, px: 4 }}>
          Get Started
        </Button>
      </Box>
    </Container>
  );
}
