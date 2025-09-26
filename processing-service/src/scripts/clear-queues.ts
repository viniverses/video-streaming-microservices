import { videoMetadataQueue } from '@/queues/video-metadata.ts';
import { videoThumbnailQueue } from '@/queues/video-thumbnail.ts';
import { videoTranscodeQueue } from '@/queues/video-transcode.ts';

const clearAllQueues = async () => {
  console.log('🧹 Limpando filas...');

  await videoMetadataQueue.clean(0, 100, 'completed');
  await videoMetadataQueue.clean(0, 100, 'failed');

  await videoThumbnailQueue.clean(0, 100, 'completed');
  await videoThumbnailQueue.clean(0, 100, 'failed');

  await videoTranscodeQueue.clean(0, 100, 'completed');
  await videoTranscodeQueue.clean(0, 100, 'failed');

  console.log('✅ Filas limpas');
};

const obliterateAllQueues = async () => {
  console.log('💥 OBLITERANDO filas...');

  await videoMetadataQueue.obliterate({ force: true });
  await videoThumbnailQueue.obliterate({ force: true });
  await videoTranscodeQueue.obliterate({ force: true });

  console.log('✅ Filas obliteradas');
};

const showStats = async () => {
  const [meta, thumb, trans] = await Promise.all([
    videoMetadataQueue.getJobCounts(),
    videoThumbnailQueue.getJobCounts(),
    videoTranscodeQueue.getJobCounts(),
  ]);

  console.log('📊 Status das filas:');
  console.log('Metadata:', meta);
  console.log('Thumbnail:', thumb);
  console.log('Transcode:', trans);
};

const main = async () => {
  const command = process.argv[2];

  switch (command) {
    case 'clean':
      await clearAllQueues();
      break;
    case 'obliterate':
      await obliterateAllQueues();
      break;
    case 'stats':
      await showStats();
      break;
    default:
      console.log(`
🔧 Script de limpeza de filas BullMQ

Uso:
  pnpm run clear-queues clean      # Remove jobs completados/falhados
  pnpm run clear-queues obliterate # Remove TODOS os jobs (CUIDADO!)
  pnpm run clear-queues stats      # Mostra estatísticas das filas
      `);
  }

  process.exit(0);
};

main().catch(console.error);
