import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

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

    // Upload image to S3
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const filename = `cards/${timestamp}-${file.name}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read', // Make uploaded images publicly accessible
      })
    );

    // Generate public URL for the uploaded image (URL encode the filename)
    const encodedFilename = encodeURIComponent(filename).replace(/%2F/g, '/');
    const imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${encodedFilename}`;

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

    // Save business card to database with S3 image URL
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
        imagePath: imageUrl,
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
