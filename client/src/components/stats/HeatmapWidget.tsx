import React, { useState } from 'react'
import { Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface HeatmapDay {
  date: string
  count: number
}

interface HeatmapWidgetProps {
  data: HeatmapDay[] | undefined
}

export default function HeatmapWidget({ data }: HeatmapWidgetProps) {
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string, count: number, x: number, y: number } | null>(null)

  const getHeatmapGrid = () => {
    const grid: Array<Array<{ date: Date, dateStr: string, count: number }>> = []
    const today = new Date()
    
    const startDate = new Date()
    startDate.setDate(today.getDate() - 364)
    const startDay = startDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    startDate.setDate(startDate.getDate() - startDay) // Adjust to Sunday of that week
    
    const dateMap = new Map<string, number>()
    if (data) {
      data.forEach(item => {
        dateMap.set(item.date, item.count)
      })
    }
    
    const current = new Date(startDate)
    for (let w = 0; w < 53; w++) {
      const weekDays = []
      for (let d = 0; d < 7; d++) {
        const dateCopy = new Date(current)
        const yyyy = dateCopy.getFullYear()
        const mm = String(dateCopy.getMonth() + 1).padStart(2, '0')
        const dd = String(dateCopy.getDate()).padStart(2, '0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        const count = dateMap.get(dateStr) || 0
        weekDays.push({
          date: dateCopy,
          dateStr,
          count
        })
        current.setDate(current.getDate() + 1)
      }
      grid.push(weekDays)
    }
    return grid
  }

  const getDayColorClass = (count: number) => {
    if (count === 0) return 'bg-slate-100/80 hover:bg-slate-200'
    if (count <= 3) return 'bg-indigo-100/90 hover:bg-indigo-200 shadow-2xs border border-indigo-200/20'
    if (count <= 7) return 'bg-indigo-300 hover:bg-indigo-400 shadow-2xs border border-indigo-300/20'
    if (count <= 12) return 'bg-indigo-500 hover:bg-indigo-600 shadow-sm border border-indigo-500/20'
    return 'bg-indigo-700 hover:bg-indigo-800 shadow-md shadow-indigo-600/30 border border-indigo-700/20 hover:scale-110'
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-7 shadow-sm relative overflow-hidden text-left">
      <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Activity className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">
            Consistency Matrix (Streak Heatmap)
          </h3>
          <p className="text-[9px] font-bold text-slate-400 mt-1">
            Tracking learning consistency across the past 365 days
          </p>
        </div>
      </div>

      <div className="relative border border-slate-100 bg-slate-50/50 rounded-2xl p-4 md:p-6 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex gap-[3.5px] select-none min-w-[700px] justify-between relative">
          <AnimatePresence>
            {hoveredDay && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute bg-slate-900 text-white text-[9px] font-black px-2.5 py-1.5 rounded-xl pointer-events-none z-[130] shadow-xl uppercase tracking-widest flex flex-col items-center gap-0.5"
                style={{ 
                  left: `${hoveredDay.x}px`, 
                  top: `${hoveredDay.y}px`, 
                  transform: 'translateX(-50%)' 
                }}
              >
                <span>{hoveredDay.count} questions practiced</span>
                <span className="text-[8px] text-slate-400">{hoveredDay.dateStr}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col justify-between py-1 text-[8px] font-black text-slate-300 w-6 uppercase tracking-wider">
            <span>Sun</span>
            <span>Tue</span>
            <span>Thu</span>
            <span>Sat</span>
          </div>

          {getHeatmapGrid().map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-[3.5px]">
              {week.map((day, dIdx) => (
                <div
                  key={dIdx}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const container = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
                    if (container) {
                      setHoveredDay({
                        dateStr: day.dateStr,
                        count: day.count,
                        x: rect.left - container.left + rect.width / 2,
                        y: rect.top - container.top - 45
                      })
                    }
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={cn(
                    "w-2.5 h-2.5 md:w-3 md:h-3 rounded-[3px] transition-all cursor-pointer",
                    getDayColorClass(day.count)
                  )}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 text-[9px] font-bold text-slate-400">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-100 border border-slate-200/50" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-100" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-300" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-500" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-700" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
