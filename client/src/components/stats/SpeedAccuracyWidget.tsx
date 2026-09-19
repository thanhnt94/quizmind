import React from 'react'
import { Activity, Timer } from 'lucide-react'
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts'

interface SpeedAccuracyWidgetProps {
  speedAccuracyStats: {
    bins: Array<{ label: string, accuracy: number }>
    avg_speed_correct: number
    avg_speed_wrong: number
  } | undefined
}

export default function SpeedAccuracyWidget({ speedAccuracyStats }: SpeedAccuracyWidgetProps) {
  if (!speedAccuracyStats) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-left">
      {/* Accuracy vs Speed Bins */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-7 shadow-sm lg:col-span-2 relative overflow-hidden">
        <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Activity className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">
              Speed vs. Accuracy Correlation
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">
              Accuracy percentages across response latency intervals
            </p>
          </div>
        </div>

        <div className="h-[200px] w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={speedAccuracyStats.bins}>
              <defs>
                <linearGradient id="speedAccGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }} 
              />
              <Area type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#speedAccGrad)" name="Accuracy (%)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Solve Velocity */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-7 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100/60 flex items-center justify-center text-violet-600">
              <Timer className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">
                Retrieval Velocity
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                Average response latency per question
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
              <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">When Correct</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-emerald-600 leading-none">{speedAccuracyStats.avg_speed_correct}s</span>
              </div>
              <p className="text-[7.5px] font-medium text-slate-400 mt-1 uppercase">Avg recall latency</p>
            </div>

            <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
              <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">When Incorrect</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-rose-600 leading-none">{speedAccuracyStats.avg_speed_wrong}s</span>
              </div>
              <p className="text-[7.5px] font-medium text-slate-400 mt-1 uppercase">Hesitation / struggle time</p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100/40">
          <p className="text-[9px] font-bold text-indigo-700 leading-relaxed">
            {speedAccuracyStats.avg_speed_correct < speedAccuracyStats.avg_speed_wrong ? (
              "💡 Your recall speed is swift for mastered questions, demonstrating solid neural pathway formation!"
            ) : (
              "💡 You take deliberate time before selecting options. Careful analytical thinking yields high accuracy!"
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
