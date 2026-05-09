import os

file_path = r'c:\Code\Ecosystem\QuizMind\client\src\pages\QuizPlay.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the mobile feedback area rendering
old_mobile_view = """    if (isMobile) {
      return (
        <div className="flex flex-col h-full">
           <div className="flex items-center gap-1 overflow-x-auto pb-4 no-scrollbar">
              {tabs.map((tab: any) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeedbackTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap",
                    activeFeedbackTab === tab.id 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                      : "bg-white text-slate-400 border border-slate-100"
                  )}
                >
                  <tab.icon className={cn("w-3.5 h-3.5", activeFeedbackTab === tab.id ? "text-white" : tab.color)} />
                  {tab.label}
                </button>
              ))}
           </div>
           <div className="flex-1">
              {renderTabContent()}
           </div>
        </div>
      )
    }"""

new_mobile_view = """    if (isMobile) {
      return (
        <div className="flex flex-col h-full">
           <div className="flex-1 overflow-y-auto pb-4">
              {renderTabContent()}
           </div>
           <div className="flex items-center justify-around gap-1 pt-4 pb-2 border-t border-slate-100 bg-white -mx-4 px-4 sticky bottom-0">
              {tabs.map((tab: any) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeedbackTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-2 px-3 rounded-xl transition-all",
                    activeFeedbackTab === tab.id 
                      ? "text-indigo-600 bg-indigo-50/50" 
                      : "text-slate-400"
                  )}
                >
                  <tab.icon className={cn("w-5 h-5", activeFeedbackTab === tab.id ? "text-indigo-600" : "text-slate-300")} />
                  <span className="text-[8px] font-black tracking-tighter uppercase">{tab.label.split(' ')[0]}</span>
                </button>
              ))}
           </div>
        </div>
      )
    }"""

# Use string replace if exact match, or regex if needed
if old_mobile_view in content:
    content = content.replace(old_mobile_view, new_mobile_view)
else:
    # Fallback to a simpler search if indentation differed
    import re
    content = re.sub(r'if \(isMobile\) \{.*?\}\s+return \(', new_mobile_view + '\n\n    return (', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
