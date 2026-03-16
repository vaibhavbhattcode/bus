import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listProviders() {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (providers.length === 0) {
      console.log('No providers found.');
      return;
    }

    console.log('Found providers:');
    providers.forEach(p => {
      console.log(`- ID: ${p.id}, Company: ${p.companyName}, User: ${p.user.name} (${p.user.phone})`);
    });
  } catch (error) {
    console.error('Error listing providers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listProviders();
