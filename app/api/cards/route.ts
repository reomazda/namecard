import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    // Get OCR data from form data
    const fullName = formData.get('fullName') as string | null;
    const companyName = formData.get('companyName') as string | null;
    const department = formData.get('department') as string | null;
    const position = formData.get('position') as string | null;
    const email = formData.get('email') as string | null;
    const phone = formData.get('phone') as string | null;
    const mobile = formData.get('mobile') as string | null;
    const address = formData.get('address') as string | null;
    const website = formData.get('website') as string | null;
    const rawText = formData.get('rawText') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Save the uploaded image
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    // For MVP, we'll use a default user ID
    // In production, this would come from the authenticated session
    let user = await prisma.user.findUnique({
      where: { email: 'default@cardconnect.local' }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'default@cardconnect.local',
          password: 'placeholder', // Will be replaced with proper auth later
          username: 'Default User'
        }
      });
    }

    // Save business card to database
    const card = await prisma.businessCard.create({
      data: {
        ownerId: user.id,
        fullName: fullName || undefined,
        companyName: companyName || undefined,
        department: department || undefined,
        position: position || undefined,
        email: email || undefined,
        phone: phone || undefined,
        mobile: mobile || undefined,
        address: address || undefined,
        website: website || undefined,
        imagePath: `/uploads/${filename}`,
        rawText: rawText || undefined,
        ocrJson: JSON.stringify({
          fullName,
          companyName,
          department,
          position,
          email,
          phone,
          mobile,
          address,
          website
        })
      }
    });

    return NextResponse.json({
      success: true,
      card,
      message: 'Business card uploaded successfully'
    });

  } catch (error) {
    console.error('Error processing business card:', error);
    return NextResponse.json(
      { error: 'Failed to process business card' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // For MVP, get all cards for the default user
    const user = await prisma.user.findUnique({
      where: { email: 'default@cardconnect.local' }
    });

    if (!user) {
      return NextResponse.json({ cards: [] });
    }

    const cards = await prisma.businessCard.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ cards });

  } catch (error) {
    console.error('Error fetching business cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business cards' },
      { status: 500 }
    );
  }
}
