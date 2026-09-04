import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixHierarchy() {
  // Delete the old "Ch. Muhammad Rafiq" dummy president
  await prisma.leadershipProfile.deleteMany({
    where: { name: 'Ch. Muhammad Rafiq', category: 'cabinet' }
  });

  // Set Dr. Muhammad Ahsanul Haq to tier 0
  await prisma.leadershipProfile.updateMany({
    where: { name: 'Dr. Muhammad Ahsanul Haq', category: 'cabinet' },
    data: { tier: 0 }
  });

  console.log("Hierarchy fixed!");
}

fixHierarchy()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
