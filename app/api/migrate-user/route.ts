import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or with specific secret
    const secret = request.headers.get('x-migration-secret');
    const expectedSecret = process.env.MIGRATION_SECRET || 'dev-migration-secret';

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid migration secret' },
        { status: 401 }
      );
    }

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

      return NextResponse.json({
        success: true,
        message: 'New user created',
        user: {
          email: newUser.email,
          username: newUser.username
        }
      });
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

    // Count cards associated with this user
    const cardCount = await prisma.businessCard.count({
      where: { ownerId: updatedUser.id }
    });

    return NextResponse.json({
      success: true,
      message: 'User migrated successfully',
      user: {
        email: updatedUser.email,
        username: updatedUser.username,
        cardCount
      }
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}
