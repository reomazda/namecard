import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Find the default user
    const defaultUser = await prisma.user.findUnique({
      where: { email: 'default@cardconnect.local' }
    });

    if (!defaultUser) {
      console.log('Default user not found. Creating new user for admin@driholdings.ae...');

      // Create new user
      const hashedPassword = await bcrypt.hash(process.env.APP_PASSWORD || 'cardconnect2025', 10);

      const newUser = await prisma.user.create({
        data: {
          email: 'admin@driholdings.ae',
          password: hashedPassword,
          username: 'DRI Holdings Admin'
        }
      });

      console.log('✅ New user created:', newUser.email);
      return;
    }

    console.log('Found default user:', defaultUser.email);
    console.log('Updating to admin@driholdings.ae...');

    // Hash the password (use environment variable or default)
    const password = process.env.APP_PASSWORD || 'cardconnect2025';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { email: 'default@cardconnect.local' },
      data: {
        email: 'admin@driholdings.ae',
        password: hashedPassword,
        username: 'DRI Holdings Admin'
      }
    });

    console.log('✅ User updated successfully!');
    console.log('Email:', updatedUser.email);
    console.log('Username:', updatedUser.username);
    console.log('Password: (hashed with bcrypt)');

    // Count cards associated with this user
    const cardCount = await prisma.businessCard.count({
      where: { ownerId: updatedUser.id }
    });

    console.log(`📇 Business cards associated: ${cardCount}`);

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
