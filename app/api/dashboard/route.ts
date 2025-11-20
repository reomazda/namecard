import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Get all cards for the user
    const cards = await prisma.businessCard.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        createdAt: true,
        status: true,
        companyName: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate time series data (last 30 days)
    const timeSeriesData = generateTimeSeriesData(cards);

    // Calculate status distribution
    const statusDistribution = {
      new: cards.filter(c => (c.status || 'new') === 'new').length,
      followup: cards.filter(c => (c.status || 'new') === 'followup').length,
      contacted: cards.filter(c => (c.status || 'new') === 'contacted').length,
      done: cards.filter(c => (c.status || 'new') === 'done').length
    };

    // Calculate company distribution (top 10)
    const companyMap = new Map<string, number>();
    cards.forEach(card => {
      const company = card.companyName || '未登録';
      companyMap.set(company, (companyMap.get(company) || 0) + 1);
    });

    const companyDistribution = Array.from(companyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate summary statistics
    const totalCards = cards.length;
    const cardsThisMonth = cards.filter(c => {
      const cardDate = new Date(c.createdAt);
      const now = new Date();
      return cardDate.getMonth() === now.getMonth() &&
             cardDate.getFullYear() === now.getFullYear();
    }).length;

    const cardsLastMonth = cards.filter(c => {
      const cardDate = new Date(c.createdAt);
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      return cardDate.getMonth() === lastMonth.getMonth() &&
             cardDate.getFullYear() === lastMonth.getFullYear();
    }).length;

    const growthRate = cardsLastMonth === 0 ? 100 :
      ((cardsThisMonth - cardsLastMonth) / cardsLastMonth * 100);

    return NextResponse.json({
      success: true,
      summary: {
        totalCards,
        cardsThisMonth,
        cardsLastMonth,
        growthRate: Math.round(growthRate * 10) / 10
      },
      timeSeriesData,
      statusDistribution,
      companyDistribution
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

function generateTimeSeriesData(cards: any[]) {
  const last30Days = [];
  const now = new Date();

  // Generate last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = cards.filter(card => {
      const cardDate = new Date(card.createdAt);
      return cardDate >= date && cardDate < nextDate;
    }).length;

    // Cumulative count
    const cumulativeCount = cards.filter(card => {
      const cardDate = new Date(card.createdAt);
      return cardDate < nextDate;
    }).length;

    last30Days.push({
      date: date.toISOString().split('T')[0],
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      count,
      cumulative: cumulativeCount
    });
  }

  return last30Days;
}
