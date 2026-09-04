import prisma from './lib/prisma';
async function run() {
  const msgs = await prisma.leadershipMessage.findMany();
  console.log('msgs:', msgs);
  const profiles = await prisma.leadershipProfile.findMany();
  console.log('profiles length:', profiles.length);
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
