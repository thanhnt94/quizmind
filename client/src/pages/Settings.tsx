import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings as SettingsIcon, 
  Brain, 
  Zap, 
  Clock, 
  RotateCcw, 
  Shuffle, 
  ListOrdered,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Bell,
  Moon
} from 'lucide-react'

type LearningMode = 'sequential' | 'random' | 'unseen' | 'review'

const Settings = () => {
  const [learningMode, setLearningMode] = useState<LearningMode>('sequential')

  useEffect(() => {
    const savedMode = localStorage.getItem('quiz_learning_mode') as LearningMode
    if (savedMode) setLearningMode(savedMode)
  }, [])

  const updateLearningMode = (mode: LearningMode) => {
    setLearningMode(mode)
    localStorage.setItem('quiz_learning_mode', mode)
  }

  const modes = [
    {
      id: 'sequential',
      name: 'Orderly Progression',
      desc: 'Follow the original neural sequence (1, 2, 3...)',
      icon: ListOrdered,
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      id: 'unseen',
      name: 'Expansion Mode',
      desc: 'Prioritize nodes you have never encountered before',
      icon: Sparkles,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50'
    },
    {
      id: 'review',
      name: 'Mastery Cycle',
      desc: 'Focus on weak patterns and review session history',
      icon: RotateCcw,
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      id: 'random',
      name: 'Neural Entropy',
      desc: 'Shuffle all nodes for maximum chaos and retention',
      icon: Shuffle,
      color: 'text-rose-500',
      bg: 'bg-rose-50'
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-12 mb-8">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">System Configuration</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Optimize Your Neural Link</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Learning Algorithm Section */}
        <section>
          <div className="flex items-center gap-2 mb-6 px-2">
            <Brain className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Learning Algorithm</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateLearningMode(mode.id as LearningMode)}
                className={`relative p-6 rounded-[2.5rem] border-2 transition-all text-left group ${
                  learningMode === mode.id 
                    ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-50' 
                    : 'border-white bg-white hover:border-slate-100 hover:shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${mode.bg} ${mode.color}`}>
                    <mode.icon className="w-5 h-5" />
                  </div>
                  {learningMode === mode.id && (
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                      <Zap className="w-3 h-3 fill-current" />
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{mode.name}</h3>
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed">{mode.desc}</p>
                
                {learningMode === mode.id && (
                  <motion.div 
                    layoutId="activeGlow"
                    className="absolute -inset-1 border border-indigo-100 rounded-[2.6rem] z-[-1]"
                  />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* General Settings */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8">
           <div className="flex items-center gap-2 mb-8">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">System Preferences</h2>
          </div>

          <div className="space-y-2">
            <SettingItem icon={Bell} label="Neural Notifications" desc="Get alerted when daily patterns refresh" active />
            <SettingItem icon={Moon} label="Dark Matrix Mode" desc="Switch interface to high-contrast dark mode" />
            <SettingItem icon={Clock} label="Focus Timer" desc="Display time spent per neural node during sessions" active />
          </div>
        </section>

        <div className="pt-8 text-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">QuizMind v3.4.2 // Neural OS</p>
        </div>
      </div>
    </div>
  )
}

const SettingItem = ({ icon: Icon, label, desc, active = false }: any) => (
  <div className="flex items-center justify-between p-4 rounded-3xl hover:bg-slate-50 transition-all group cursor-pointer border border-transparent hover:border-slate-100">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{label}</h4>
        <p className="text-[9px] font-medium text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
    <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${active ? 'bg-indigo-600' : 'bg-slate-200'}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${active ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  </div>
)

export default Settings
