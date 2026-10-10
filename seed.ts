import { runSeed } from '../src/server/seed.ts';

runSeed()
  .then(() => {
    console.log('✨ Seed finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  });
