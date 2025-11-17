import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const card = await prisma.businessCard.findUnique({
      where: { id }
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Business card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ card });

  } catch (error) {
    console.error('Error fetching business card:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business card' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const card = await prisma.businessCard.update({
      where: { id },
      data: {
        fullName: body.fullName,
        companyName: body.companyName,
        department: body.department,
        position: body.position,
        email: body.email,
        phone: body.phone,
        mobile: body.mobile,
        fax: body.fax,
        address: body.address,
        website: body.website,
        notes: body.notes,
        rawText: body.rawText,
        ocrJson: body.ocrJson,
        status: body.status
      }
    });

    return NextResponse.json({
      success: true,
      card,
      message: 'Business card updated successfully'
    });

  } catch (error) {
    console.error('Error updating business card:', error);
    return NextResponse.json(
      { error: 'Failed to update business card' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the card to find the image path
    const card = await prisma.businessCard.findUnique({
      where: { id }
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Business card not found' },
        { status: 404 }
      );
    }

    // Delete the image file if it exists
    if (card.imagePath) {
      try {
        const filepath = join(process.cwd(), 'public', card.imagePath);
        await unlink(filepath);
      } catch (err) {
        console.error('Error deleting image file:', err);
        // Continue even if file deletion fails
      }
    }

    // Delete the card from database
    await prisma.businessCard.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Business card deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting business card:', error);
    return NextResponse.json(
      { error: 'Failed to delete business card' },
      { status: 500 }
    );
  }
}
