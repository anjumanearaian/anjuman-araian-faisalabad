import prisma from './lib/prisma';

async function main() {
  const all = await prisma.matrimonial.findMany();
  console.log(JSON.stringify(all, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
