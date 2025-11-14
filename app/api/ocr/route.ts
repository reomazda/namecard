import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured', details: 'OPENAI_API_KEY environment variable is missing' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Ensure valid image MIME type
    let mimeType = file.type;

    // If MIME type is missing or invalid, try to infer from file name
    if (!mimeType || !mimeType.startsWith('image/')) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (fileName.endsWith('.webp')) {
        mimeType = 'image/webp';
      } else if (fileName.endsWith('.gif')) {
        mimeType = 'image/gif';
      } else if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
        // HEIC should be converted to JPEG on client-side, but handle it just in case
        mimeType = 'image/jpeg';
        console.warn('HEIC file detected - should have been converted to JPEG on client-side');
      } else {
        // Default to jpeg if unable to determine
        mimeType = 'image/jpeg';
      }
      console.warn(`Invalid MIME type detected: "${file.type}", inferred "${mimeType}" from filename: ${file.name}`);
    }

    console.log('File type:', file.type, '-> Using MIME type:', mimeType, 'File name:', file.name);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Call OpenAI Vision API with GPT-5.1 (reasoning model)
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1-2025-11-13',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `この名刺画像から以下の情報をJSON形式で抽出してください。日本語または英語の名前のみを抽出し、中国語名は除外してください。

必須フィールド（見つからない場合はnullを返す）：
- fullName: 氏名（日本語または英語のみ）
- companyName: 会社名
- department: 部署名
- position: 役職（代表取締役、社長、CEOなど）
- email: メールアドレス
- phone: 電話番号
- mobile: 携帯電話番号
- address: 住所
- website: ウェブサイトURL

JSONのみを返してください。追加の説明は不要です。`,
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high', // Use high detail for better OCR accuracy
              },
            },
          ],
        },
      ],
      // Limit output length for GPT-5.1 chat completions
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    // Extract JSON from the response
    let cardInfo;
    try {
      // Try to parse directly first
      cardInfo = JSON.parse(content);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        cardInfo = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find any JSON object in the response
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          cardInfo = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not parse JSON from response');
        }
      }
    }

    return NextResponse.json({
      success: true,
      cardInfo,
      rawText: content,
    });

  } catch (error: any) {
    console.error('Error processing OCR:', error);

    // Log detailed error information
    if (error.response) {
      console.error('OpenAI API Error:', error.response.status, error.response.data);
    }

    return NextResponse.json(
      {
        error: 'Failed to process image',
        details: error.message || 'Unknown error',
        type: error.type || 'unknown',
        statusCode: error.response?.status,
        apiError: error.response?.data
      },
      { status: 500 }
    );
  }
}
