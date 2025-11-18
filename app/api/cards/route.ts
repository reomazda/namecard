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
    // Get user ID from header
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login again' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const backFile = formData.get('backImage') as File | null;

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

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    const timestamp = Date.now();

    // Upload front image to S3
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `cards/${timestamp}-front-${file.name}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
        // Note: ACL removed - bucket policy controls public access instead
      })
    );

    // Generate public URL for the uploaded image (URL encode the filename)
    const encodedFilename = encodeURIComponent(filename).replace(/%2F/g, '/');
    const imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${encodedFilename}`;

    // Upload back image to S3 if provided
    let backImageUrl: string | undefined;
    if (backFile) {
      const backBytes = await backFile.arrayBuffer();
      const backBuffer = Buffer.from(backBytes);
      const backFilename = `cards/${timestamp}-back-${backFile.name}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: backFilename,
          Body: backBuffer,
          ContentType: backFile.type,
        })
      );

      const encodedBackFilename = encodeURIComponent(backFilename).replace(/%2F/g, '/');
      backImageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${encodedBackFilename}`;
    }

    // Save business card to database with S3 image URL
    const card = await prisma.businessCard.create({
      data: {
        ownerId: userId,
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
        backImagePath: backImageUrl,
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

  } catch (error: any) {
    console.error('Error processing business card:', error);

    // Log detailed error for debugging
    if (error.message) console.error('Error message:', error.message);
    if (error.stack) console.error('Error stack:', error.stack);
    if (error.$metadata) console.error('AWS Error metadata:', error.$metadata);

    return NextResponse.json(
      {
        error: 'Failed to process business card',
        details: error.message || 'Unknown error',
        type: error.name || 'UnknownError'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user ID from header
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login again' },
        { status: 401 }
      );
    }

    const cards = await prisma.businessCard.findMany({
      where: { ownerId: userId },
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
