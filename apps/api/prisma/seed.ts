import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEMPLATES = [
  { name: 'Modern Minimalist Bathroom', description: 'Clean lines, neutral tones, floating vanity', category: 'BATHROOM_CAT', roomType: 'BATHROOM', tags: ['modern', 'minimalist', 'clean'] },
  { name: 'Classic Marble Bathroom', description: 'Marble tiles, gold fixtures, elegant design', category: 'CIVIL', roomType: 'BATHROOM', tags: ['classic', 'marble', 'elegant'] },
  { name: 'Contemporary Kitchen', description: 'Sleek cabinets, quartz countertops, island layout', category: 'KITCHEN_CAT', roomType: 'KITCHEN', tags: ['contemporary', 'sleek', 'island'] },
  { name: 'Rustic Farmhouse Kitchen', description: 'Wood cabinets, open shelving, warm tones', category: 'FURNISHINGS', roomType: 'KITCHEN', tags: ['rustic', 'farmhouse', 'warm'] },
  { name: 'Scandinavian Bedroom', description: 'Light wood, white walls, cozy textiles', category: 'FURNISHINGS', roomType: 'BEDROOM', tags: ['scandinavian', 'light', 'cozy'] },
  { name: 'Industrial Loft Bedroom', description: 'Exposed brick, metal accents, dark palette', category: 'CIVIL', roomType: 'BEDROOM', tags: ['industrial', 'loft', 'dark'] },
  { name: 'Open Plan Living Room', description: 'Spacious layout, natural light, neutral palette', category: 'CIVIL', roomType: 'LIVING_ROOM', tags: ['open-plan', 'spacious', 'neutral'] },
  { name: 'Cozy Entertainment Living Room', description: 'Comfortable seating, warm lighting, entertainment center', category: 'ELECTRICAL', roomType: 'LIVING_ROOM', tags: ['cozy', 'entertainment', 'warm'] },
  { name: 'Formal Dining Room', description: 'Statement chandelier, long table, elegant chairs', category: 'ELECTRICAL', roomType: 'DINING_ROOM', tags: ['formal', 'chandelier', 'elegant'] },
  { name: 'Casual Dining Nook', description: 'Booth seating, pendant lights, relaxed vibe', category: 'FURNISHINGS', roomType: 'DINING_ROOM', tags: ['casual', 'nook', 'relaxed'] },
  { name: 'Garden Balcony', description: 'Potted plants, comfortable seating, string lights', category: 'OTHER', roomType: 'BALCONY', tags: ['garden', 'outdoor', 'plants'] },
  { name: 'Urban Balcony Lounge', description: 'Compact furniture, privacy screens, ambient lighting', category: 'ELECTRICAL', roomType: 'BALCONY', tags: ['urban', 'compact', 'ambient'] },
];

async function main() {
  console.log('Seeding templates...');

  // Delete existing system templates and re-create
  await prisma.template.deleteMany({ where: { isSystem: true } });

  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i];
    await prisma.template.create({
      data: {
        name: t.name,
        description: t.description,
        category: t.category as 'CIVIL' | 'FURNISHINGS' | 'BATHROOM_CAT' | 'KITCHEN_CAT' | 'ELECTRICAL' | 'OTHER',
        roomType: t.roomType as 'BATHROOM' | 'KITCHEN' | 'BEDROOM' | 'LIVING_ROOM' | 'DINING_ROOM' | 'BALCONY',
        isSystem: true,
        tags: t.tags,
        sortOrder: i,
      },
    });
    console.log(`  Created: ${t.name}`);
  }

  console.log(`Seeded ${TEMPLATES.length} templates.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
