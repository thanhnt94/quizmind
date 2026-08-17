import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus, BookOpen, Layers, Zap, Clock } from 'lucide-react';

interface DailyComparisonDay {
  date: string;
  new_cards: number;
  unique_cards: number;
  total_reviews: number;
  study_minutes: number;
}

interface AllTimeAvg {
  new_cards: number;
  unique_cards: number;
  total_reviews: number;
  study_minutes: number;
  active_days: number;
}

interface DailyComparisonChartProps {
  data: DailyComparisonDay[] | undefined;
  allTimeAvg?: AllTimeAvg;
  isLoading?: boolean;
}

export default function DailyComparisonChart({ data, allTimeAvg, isLoading }: DailyComparisonChartProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center justify-center text-center h-[400px]">
        <TrendingUp className="w-8 h-8 text-slate-350 animate-pulse mb-3" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Đang tải biểu đồ so sánh...
        </span>
      </div>
    );
  }

  // Today is the last element in the array
  const todayData = data.length > 0 ? data[data.length - 1] : { date: "", new_cards: 0, unique_cards: 0, total_reviews: 0, study_minutes: 0 };
  const yesterdayData = data.length > 1 ? data[data.length - 2] : { date: "", new_cards: 0, unique_cards: 0, total_reviews: 0, study_minutes: 0 };

  const formatLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;

    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayUTC = yesterday.toISOString().split('T')[0];

    if (dateStr === todayUTC) return "Hôm nay";
    if (dateStr === yesterdayUTC) return "Hôm qua";

    return `${parts[2]}/${parts[1]}`;
  };

  const renderDeltaPill = (todayVal: number, compareVal: number) => {
    const diff = todayVal - compareVal;
    if (diff > 0) {
      return (
        <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
          <ArrowUpRight className="w-3 h-3 stroke-[3px]" />
          {diff.toFixed(diff % 1 === 0 ? 0 : 1)}
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-500 border border-rose-100">
          <ArrowDownRight className="w-3 h-3 stroke-[3px]" />
          {diff.toFixed(Math.abs(diff) % 1 === 0 ? 0 : 1)}
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-50 text-slate-400 border border-slate-100">
          <Minus className="w-3 h-3 stroke-[3px]" />
          ±0
        </div>
      );
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-7 shadow-sm flex flex-col gap-5 text-left relative overflow-hidden">
      <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500" />
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100/80">
              Phân tích học tập
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mt-1">
            So sánh hiệu suất 7 ngày qua
          </h3>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* New Questions Today */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Câu Mới Hôm Nay
            </span>
            <div className="w-6 h-6 rounded-lg bg-orange-100/50 flex items-center justify-center text-orange-600">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-800">
              {todayData.new_cards}
            </span>
            {renderDeltaPill(todayData.new_cards, yesterdayData.new_cards)}
          </div>
        </div>

        {/* Total Questions Today */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Tổng Câu Đã Làm
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-100/50 flex items-center justify-center text-indigo-600">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-800">
              {todayData.unique_cards}
            </span>
            {renderDeltaPill(todayData.unique_cards, yesterdayData.unique_cards)}
          </div>
        </div>

        {/* Total Reviews */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Lượt Ôn Tập
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100/50 flex items-center justify-center text-emerald-600">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-800">
              {todayData.total_reviews}
            </span>
            {renderDeltaPill(todayData.total_reviews, yesterdayData.total_reviews)}
          </div>
        </div>

        {/* Study Time */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Thời Gian Học
            </span>
            <div className="w-6 h-6 rounded-lg bg-purple-100/50 flex items-center justify-center text-purple-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-800">
              {todayData.study_minutes}m
            </span>
            {renderDeltaPill(todayData.study_minutes, yesterdayData.study_minutes)}
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-[220px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatLabel} 
              tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              cursor={{ fill: '#F8FAFC' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const day = payload[0].payload as DailyComparisonDay;
                  return (
                    <div className="bg-slate-900 text-white rounded-2xl p-3 shadow-xl border border-slate-800 text-xs font-medium space-y-1">
                      <p className="font-bold text-amber-300">{formatLabel(day.date)} ({day.date})</p>
                      <p className="flex justify-between gap-4"><span>Học mới:</span> <span className="font-bold text-orange-400">{day.new_cards} câu</span></p>
                      <p className="flex justify-between gap-4"><span>Tổng câu:</span> <span className="font-bold text-indigo-400">{day.unique_cards} câu</span></p>
                      <p className="flex justify-between gap-4"><span>Thời gian:</span> <span className="font-bold text-emerald-400">{day.study_minutes} phút</span></p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="new_cards" fill="#F97316" radius={[4, 4, 0, 0]} name="Câu mới" />
            <Bar dataKey="unique_cards" fill="#6366F1" radius={[4, 4, 0, 0]} name="Tổng câu" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
