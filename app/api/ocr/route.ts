import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
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
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // Call OpenAI Vision API with GPT-5 mini
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
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
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
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

  } catch (error) {
    console.error('Error processing OCR:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: (error as Error).message },
      { status: 500 }
    );
  }
}
