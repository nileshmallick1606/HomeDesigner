import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async exportDesignImage(designId: string, format: 'jpeg' | 'png' = 'jpeg'): Promise<Buffer> {
    const viz = await this.prisma.visualization.findFirst({
      where: { designId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!viz || !viz.imageUrl) throw new NotFoundException('No completed visualization');

    const imageBuffer = await this.r2.download(viz.imageUrl.replace(/^\/api\/media\/files\//, ''));

    if (format === 'png') {
      return sharp(imageBuffer).png().toBuffer();
    }
    return sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
  }

  async exportComparison(designId: string): Promise<Buffer> {
    const design = await this.prisma.design.findUnique({
      where: { id: designId },
      include: {
        visualizations: { where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' }, take: 1 },
        room: { include: { photos: { take: 1, orderBy: { createdAt: 'desc' } } } },
      },
    });
    if (!design) throw new NotFoundException('Design not found');

    const viz = design.visualizations[0];
    const photo = design.room.photos[0];
    if (!viz?.imageUrl || !photo?.originalUrl) throw new NotFoundException('Missing images');

    const beforeBuf = await this.r2.download(photo.originalUrl.replace(/^(https?:\/\/[^/]+)?\/api\/media\/files\//, ''));
    const afterBuf = await this.r2.download(viz.imageUrl.replace(/^\/api\/media\/files\//, ''));

    const beforeMeta = await sharp(beforeBuf).metadata();
    const width = beforeMeta.width || 800;
    const height = beforeMeta.height || 600;

    const before = await sharp(beforeBuf).resize(width, height, { fit: 'cover' }).jpeg().toBuffer();
    const after = await sharp(afterBuf).resize(width, height, { fit: 'cover' }).jpeg().toBuffer();

    return sharp({
      create: { width: width * 2 + 20, height: height, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .composite([
        { input: before, left: 0, top: 0 },
        { input: after, left: width + 20, top: 0 },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  async exportProjectPdf(projectId: string): Promise<Buffer> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rooms: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            photos: { take: 1, orderBy: { createdAt: 'desc' } },
            designs: {
              take: 1,
              orderBy: { updatedAt: 'desc' },
              include: { visualizations: { where: { status: 'COMPLETED' }, take: 1 } },
            },
            roomBudgets: true,
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    this.logger.log(`Generating PDF for project: ${project.name} (${project.rooms.length} rooms)`);

    return new Promise<Buffer>(async (resolve, reject) => {
      try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Page 1: Header ──
      doc.rect(0, 0, doc.page.width, 80).fill('#1565C0');
      doc.fontSize(28).fillColor('white').text('InteriorScience', 50, 25);
      doc.fontSize(10).text('AI-Powered Interior Visualization', 50, 55);

      doc.moveDown(3);
      doc.fillColor('#333');
      doc.fontSize(22).text(project.name, { align: 'left' });
      doc.moveDown(0.5);

      if (project.description) {
        doc.fontSize(11).fillColor('#666').text(project.description);
        doc.moveDown(0.5);
      }

      doc.fontSize(11).fillColor('#333');
      doc.text(`Status: ${project.status}`);
      if (project.overallBudget) {
        doc.text(`Budget: ₹${Number(project.overallBudget).toLocaleString()}`);
      }
      doc.text(`Rooms: ${project.rooms.length}`);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`);

      // ── Room sections ──
      let pageCount = 1;
      const MAX_PAGES = 50;

      for (const room of project.rooms) {
        if (pageCount >= MAX_PAGES) {
          doc.addPage();
          doc.fontSize(14).fillColor('#C62828').text('Document truncated — too many rooms.', { align: 'center' });
          break;
        }

        doc.addPage();
        pageCount++;

        // Room header
        doc.rect(0, 0, doc.page.width, 40).fill('#E3F2FD');
        doc.fontSize(16).fillColor('#1565C0').text(
          `${room.name} — ${room.type.replace(/_/g, ' ')}`,
          50, 12,
        );

        doc.moveDown(2);
        doc.fillColor('#333');

        // Budget items
        if (room.roomBudgets.length > 0) {
          doc.fontSize(12).text('Budget:', { underline: true });
          doc.moveDown(0.3);
          for (const b of room.roomBudgets) {
            doc.fontSize(10).text(
              `  ${b.category.replace(/_/g, ' ')}: Est ₹${Number(b.estimatedAmount).toLocaleString()} / Act ₹${Number(b.actualAmount).toLocaleString()}`,
            );
          }
          doc.moveDown(0.5);
        }

        // Photo info
        if (room.photos.length > 0) {
          doc.fontSize(10).fillColor('#666').text(`Photos: ${room.photos.length} uploaded`);
          // Attempt to embed photo thumbnail
          try {
            const photoUrl = room.photos[0].originalUrl;
            const cleanUrl = photoUrl.replace(/^(https?:\/\/[^/]+)?\/api\/media\/files\//, '');
            const photoBuf = await this.r2.download(cleanUrl);
            const thumb = await sharp(photoBuf).resize(300, 200, { fit: 'inside' }).jpeg().toBuffer();
            doc.image(thumb, { width: 250 });
            doc.moveDown(0.5);
          } catch {
            doc.fontSize(9).fillColor('#999').text('[Photo could not be embedded]');
          }
        } else {
          doc.fontSize(10).fillColor('#999').text('No photos uploaded yet.');
        }

        // Visualization info
        const viz = room.designs[0]?.visualizations?.[0];
        if (viz?.imageUrl) {
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#666').text(`Design: ${room.designs[0].category.replace(/_/g, ' ')}`);
          try {
            const vizUrl = viz.imageUrl.replace(/^(https?:\/\/[^/]+)?\/api\/media\/files\//, '');
            const vizBuf = await this.r2.download(vizUrl);
            const vizThumb = await sharp(vizBuf).resize(300, 200, { fit: 'inside' }).jpeg().toBuffer();
            doc.image(vizThumb, { width: 250 });
          } catch {
            doc.fontSize(9).fillColor('#999').text('[Visualization could not be embedded]');
          }
        }
      }

      // Footer on last page
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#999').text(
        `Generated by InteriorScience — ${new Date().toISOString()}`,
        { align: 'center' },
      );

      doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
