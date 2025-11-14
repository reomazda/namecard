import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Simple password check (in production, use environment variable)
    const APP_PASSWORD = process.env.APP_PASSWORD || 'cardconnect2025';

    if (password === APP_PASSWORD) {
      return NextResponse.json({
        success: true,
        message: 'ログイン成功'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'パスワードが正しくありません' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'ログインエラー' },
      { status: 500 }
    );
  }
}
