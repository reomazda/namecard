import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check if Claude API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured', details: 'ANTHROPIC_API_KEY environment variable is missing' },
        { status: 500 }
      );
    }

    // Get user ID from header
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login again' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Get all cards for the authenticated user
    const cards = await prisma.businessCard.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' }
    });

    if (cards.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No cards found',
        explanation: '名刺がまだ登録されていません。'
      });
    }

    // Prepare card data for Claude
    const cardsData = cards.map((card, index) => ({
      index,
      id: card.id,
      fullName: card.fullName,
      companyName: card.companyName,
      department: card.department,
      position: card.position,
      email: card.email,
      phone: card.phone,
      mobile: card.mobile,
      address: card.address,
      website: card.website,
      notes: card.notes,
    }));

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `以下は名刺データのリストです。ユーザーからの質問に基づいて、条件に合う名刺のIDリストを返してください。

名刺データ:
${JSON.stringify(cardsData, null, 2)}

ユーザーの質問: ${query}

以下のJSON形式で回答してください：
{
  "matchingCardIds": ["id1", "id2", ...],
  "explanation": "どのような基準で選択したかの説明"
}

JSONのみを返してください。追加の説明は不要です。`,
        },
      ],
    });

    // Extract text content from Claude response
    const content = response.content[0]?.type === 'text' ? response.content[0].text : '{}';

    // Extract JSON from the response
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find any JSON object in the response
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          result = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not parse JSON from response');
        }
      }
    }

    const { matchingCardIds, explanation } = result;

    // Get full card objects for matching IDs
    const matchingCards = cards.filter(card => matchingCardIds.includes(card.id));

    return NextResponse.json({
      success: true,
      results: matchingCards,
      explanation,
      query,
    });

  } catch (error: any) {
    console.error('Error processing search:', error);

    // Log detailed error information
    if (error.status) {
      console.error('Claude API Error:', error.status, error.message);
    }

    return NextResponse.json(
      {
        error: 'Failed to process search',
        details: error.message || 'Unknown error',
        type: error.type || 'unknown',
        statusCode: error.status,
      },
      { status: 500 }
    );
  }
}
