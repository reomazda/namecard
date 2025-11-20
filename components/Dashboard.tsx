'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DashboardData {
  summary: {
    totalCards: number;
    cardsThisMonth: number;
    cardsLastMonth: number;
    growthRate: number;
  };
  timeSeriesData: Array<{
    date: string;
    dateLabel: string;
    count: number;
    cumulative: number;
  }>;
  statusDistribution: {
    new: number;
    followup: number;
    contacted: number;
    done: number;
  };
  companyDistribution: Array<{
    name: string;
    count: number;
  }>;
}

const STATUS_COLORS = {
  new: '#3B82F6',      // Blue
  followup: '#F59E0B', // Amber
  contacted: '#10B981', // Green
  done: '#6B7280'      // Gray
};

const STATUS_LABELS = {
  new: '新規',
  followup: 'フォローアップ',
  contacted: '連絡済み',
  done: '完了'
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const userId = sessionStorage.getItem('userId');
      if (!userId) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/dashboard', {
        headers: {
          'x-user-id': userId
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
        }
        return;
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-semibold text-gray-900">ダッシュボードを読み込み中...</h2>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-semibold text-gray-900">データの読み込みに失敗しました</h2>
      </div>
    );
  }

  const statusPieData = [
    { name: STATUS_LABELS.new, value: data.statusDistribution.new, color: STATUS_COLORS.new },
    { name: STATUS_LABELS.followup, value: data.statusDistribution.followup, color: STATUS_COLORS.followup },
    { name: STATUS_LABELS.contacted, value: data.statusDistribution.contacted, color: STATUS_COLORS.contacted },
    { name: STATUS_LABELS.done, value: data.statusDistribution.done, color: STATUS_COLORS.done }
  ].filter(item => item.value > 0);

  // Calculate Y-axis domain for time series
  const maxCumulative = Math.max(...data.timeSeriesData.map(d => d.cumulative), 10);
  const yAxisMax = Math.ceil(maxCumulative * 1.2 / 10) * 10; // Round up to nearest 10

  // Calculate Y-axis domain for company distribution
  const maxCompanyCount = Math.max(...data.companyDistribution.map(d => d.count), 5);
  const companyYMax = Math.ceil(maxCompanyCount * 1.2 / 5) * 5; // Round up to nearest 5

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
          <div className="text-sm font-medium text-gray-600 mb-1">総名刺数</div>
          <div className="text-3xl font-bold text-gray-900">{data.summary.totalCards.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">枚</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="text-sm font-medium text-gray-600 mb-1">今月の登録</div>
          <div className="text-3xl font-bold text-gray-900">{data.summary.cardsThisMonth.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">枚</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="text-sm font-medium text-gray-600 mb-1">先月の登録</div>
          <div className="text-3xl font-bold text-gray-900">{data.summary.cardsLastMonth.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">枚</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500">
          <div className="text-sm font-medium text-gray-600 mb-1">成長率</div>
          <div className={`text-3xl font-bold ${data.summary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.summary.growthRate > 0 ? '+' : ''}{data.summary.growthRate}%
          </div>
          <div className="text-xs text-gray-500 mt-1">前月比</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">名刺登録数の推移（累計）</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data.timeSeriesData}
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="dateLabel"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                stroke="#9CA3AF"
              />
              <YAxis
                domain={[0, yAxisMax]}
                ticks={Array.from({ length: 6 }, (_, i) => Math.round(yAxisMax / 5 * i))}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                stroke="#9CA3AF"
                label={{ value: '累計枚数', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6B7280' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="累計名刺数"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={{ r: 3, fill: '#4F46E5' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">ステータス別分布</h3>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              データがありません
            </div>
          )}
        </div>

        {/* Company Distribution Bar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4">会社別名刺数（TOP 10）</h3>
          {data.companyDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.companyDistribution}
                margin={{ top: 10, right: 30, left: 10, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  stroke="#9CA3AF"
                />
                <YAxis
                  domain={[0, companyYMax]}
                  ticks={Array.from({ length: 6 }, (_, i) => Math.round(companyYMax / 5 * i))}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  stroke="#9CA3AF"
                  label={{ value: '名刺数（枚）', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6B7280' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value}枚`, '名刺数']}
                />
                <Bar
                  dataKey="count"
                  fill="#4F46E5"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              データがありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
