import { Queue } from 'bullmq';
import { redis } from '../lib/redis.ts';

const queueNames = [
  'processing.orchestrator.queue',
  'processing.thumb.queue',
  'processing.metadata.queue',
  'processing.encode.queue',
];

async function clearAllQueues() {
  console.log('🧹 Limpando todas as filas de processamento...');

  for (const queueName of queueNames) {
    const queue = new Queue(queueName, { connection: redis });
    try {
      await queue.obliterate({ force: true });
      console.log(`✅ Fila "${queueName}" limpa com sucesso!`);
    } catch (error) {
      console.error(`❌ Erro ao limpar a fila "${queueName}":`, error);
    } finally {
      await queue.close();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  clearAllQueues()
    .then(() => {
      console.log('🎉 Todas as filas foram limpas.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro ao executar o script de limpeza:', error);
      process.exit(1);
    });
}
