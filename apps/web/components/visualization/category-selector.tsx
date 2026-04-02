'use client';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ConstructionIcon from '@mui/icons-material/Construction';
import ChairIcon from '@mui/icons-material/Chair';
import BathroomIcon from '@mui/icons-material/Bathroom';
import KitchenIcon from '@mui/icons-material/Kitchen';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

const CATEGORIES = [
  { key: 'CIVIL', label: 'Civil', icon: <ConstructionIcon sx={{ fontSize: 36 }} />, color: '#795548' },
  { key: 'FURNISHINGS', label: 'Furnishings', icon: <ChairIcon sx={{ fontSize: 36 }} />, color: '#FF9800' },
  { key: 'BATHROOM_CAT', label: 'Bathroom', icon: <BathroomIcon sx={{ fontSize: 36 }} />, color: '#2196F3' },
  { key: 'KITCHEN_CAT', label: 'Kitchen', icon: <KitchenIcon sx={{ fontSize: 36 }} />, color: '#4CAF50' },
  { key: 'ELECTRICAL', label: 'Electrical', icon: <ElectricBoltIcon sx={{ fontSize: 36 }} />, color: '#FFC107' },
  { key: 'OTHER', label: 'Other', icon: <MoreHorizIcon sx={{ fontSize: 36 }} />, color: '#9E9E9E' },
];

interface CategorySelectorProps {
  onSelect: (category: string) => void;
  selected?: string;
}

export function CategorySelector({ onSelect, selected }: CategorySelectorProps) {
  return (
    <Grid container spacing={1.5}>
      {CATEGORIES.map((cat) => (
        <Grid item xs={4} sm={2} key={cat.key}>
          <Card
            sx={{
              border: selected === cat.key ? 2 : 1,
              borderColor: selected === cat.key ? cat.color : 'divider',
            }}
          >
            <CardActionArea onClick={() => onSelect(cat.key)}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: selected === cat.key ? cat.color : 'text.secondary' }}>
                  {cat.icon}
                </Box>
                <Typography variant="caption" display="block" fontWeight={600} sx={{ mt: 0.5 }}>
                  {cat.label}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
