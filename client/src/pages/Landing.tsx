import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: "⚡ Tạo đề trắc nghiệm tức thì",
      desc: "Tải file Excel câu hỏi hoặc nhập nội dung bài học để tự động tạo bộ trắc nghiệm sinh động. Ôn tập siêu nhanh, học siêu nhàn!",
      bgGradient: "from-[#fff2eb] via-[#ffe5ec] to-[#fcddec]",
      shadowColor: "shadow-orange-200/40",
      badgeText: "📂 QuizMind_Template.xlsx",
      badgeColor: "bg-orange-500/10 border-orange-200 text-orange-600",
      btnText: "Khám phá tiếp ➡️",
      icon: (
        <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      previewWidget: (
        <div className="w-full bg-white border border-orange-100 rounded-3xl p-5 flex flex-col gap-3 text-left shadow-lg shadow-orange-100/50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">Câu Hỏi Ôn Tập</span>
            <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Dễ Dàng</span>
          </div>
          <p className="text-xs font-black leading-relaxed text-slate-800">Thủ đô của nước Việt Nam là gì?</p>
          <div className="flex flex-col gap-2">
            <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] font-black flex items-center justify-between text-emerald-700 shadow-sm shadow-emerald-50">
              <span>A. Hà Nội</span>
              <span>✅</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-500">
              <span>B. TP. Hồ Chí Minh</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "🎮 Đấu trường thời gian thực",
      desc: "Mở phòng thi trắc nghiệm trực tiếp cùng bạn bè. Cạnh tranh trả lời nhanh, đua top leo bảng xếp hạng cực sôi động!",
      bgGradient: "from-[#e6fbf0] via-[#e0fcf7] to-[#eaf5ff]",
      shadowColor: "shadow-emerald-200/40",
      badgeText: "🔴 PHÒNG ĐẤU TRỰC TIẾP",
      badgeColor: "bg-red-500/10 border-red-200 text-red-600",
      btnText: "Khám phá tiếp ➡️",
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      previewWidget: (
        <div className="w-full bg-white border border-emerald-100 rounded-3xl p-5 flex flex-col gap-3 text-left shadow-lg shadow-emerald-100/50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Bảng Xếp Hạng Live</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs">🥇</span>
                <span className="text-xs font-black text-indigo-700">Bạn (Đang dẫn đầu)</span>
              </div>
              <span className="text-xs font-black text-indigo-600">1,200 XP</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs">🥈</span>
                <span className="text-xs font-bold text-slate-600">Minh Hùng</span>
              </div>
              <span className="text-xs font-bold text-slate-500">1,050 XP</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "🔥 Tích lũy Streak nhận thưởng",
      desc: "Rèn luyện thói quen làm bài ôn luyện mỗi ngày. Giữ vững chuỗi Streak, nhận các huy chương dễ thương và thăng cấp nhanh chóng!",
      bgGradient: "from-[#f0f4ff] via-[#f7e8ff] to-[#ffebf7]",
      shadowColor: "shadow-indigo-200/40",
      badgeText: "📅 THÓI QUEN HỌC TẬP",
      badgeColor: "bg-indigo-500/10 border-indigo-200 text-indigo-600",
      btnText: "Bắt đầu học ngay 🚀",
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      previewWidget: (
        <div className="w-full bg-white border border-indigo-100 rounded-3xl p-6 flex flex-col gap-4 items-center text-center shadow-lg shadow-indigo-100/50">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-400 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/30 animate-bounce">
            <span className="text-3xl">🔥</span>
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800">STREAK: 10 NGÀY</h4>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mt-1">Xuất Sắc! Tiếp tục nhé</p>
          </div>
        </div>
      )
    }
  ];

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <>
      {/* 🖥️ DESKTOP LAYOUT (Fitted elegantly inside a single viewport, completely scroll-free) */}
      <div className="hidden md:flex min-h-screen bg-gradient-to-br from-[#fffbfa] via-[#f4faff] to-[#faf8ff] text-slate-800 flex-col justify-between font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900 relative">
        
        {/* Floating background animation keys */}
        <style>{`
          @keyframes floatSlow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(3deg); }
          }
          @keyframes floatFast {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(-3deg); }
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.25; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(1.05); }
          }
          .animate-float-slow { animation: floatSlow 6s ease-in-out infinite; }
          .animate-float-fast { animation: floatFast 4s ease-in-out infinite; }
          .animate-pulse-glow { animation: pulseGlow 8s ease-in-out infinite; }
        `}</style>

        {/* Background Accent Color Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-indigo-200/20 blur-[120px] pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-pink-200/20 blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '-2s' }} />

        {/* Premium Floating Header */}
        <div className="w-full px-6 py-4 z-20">
          <header className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between bg-white/75 backdrop-blur-lg border border-slate-200/50 rounded-3xl shadow-sm shadow-slate-100/50">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8.5 h-8.5 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-300/30">
                <span className="font-black text-white text-sm">QM</span>
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-800">QuizMind</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="px-4.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200/80 shadow-inner"
              >
                Đăng nhập
              </button>
              <button 
                onClick={() => navigate('/login?signup=true')}
                className="px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-95 shadow-md shadow-indigo-400/20 active:scale-95 transition-all"
              >
                Đăng ký
              </button>
            </div>
          </header>
        </div>

        {/* Main Split Screen Container */}
        <main className="max-w-5xl mx-auto w-full px-6 flex flex-col md:flex-row items-center justify-between flex-grow z-10 py-6 gap-8">
          
          {/* Left Column: Headline, Description & Navigation */}
          <div className="w-full md:w-1/2 text-left flex flex-col justify-center">
            
            {/* Soft Cute Welcoming Badge */}
            <div className="inline-flex self-start items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-600 mb-5 shadow-sm shadow-indigo-50/50">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-pulse"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              ✨ KHÔNG GIAN TRI THỨC SIÊU DỄ THƯƠNG
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-[3.25rem] font-black tracking-tight mb-4 leading-[1.15] text-slate-800">
              Chơi trắc nghiệm, <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Nhớ bài cực lâu!
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-md text-sm lg:text-base font-semibold text-slate-500 mb-6 leading-relaxed">
              Không gian ôn luyện thông minh giúp bạn làm đề trắc nghiệm sinh động. Tự động tạo câu hỏi từ Excel và chơi ngay cùng bạn bè nhé!
            </p>

            {/* Primary Action Buttons (Sign In & Sign Up) */}
            <div className="flex items-center gap-3.5 mb-8">
              <button 
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-500 to-pink-500 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/25 text-sm"
              >
                Đăng nhập ngay 🚀
              </button>
              <button 
                onClick={() => navigate('/login?signup=true')}
                className="px-6 py-3.5 rounded-2xl font-black text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 transition-all text-sm shadow-md shadow-slate-100"
              >
                Đăng ký tài khoản
              </button>
            </div>

            {/* Desktop Slide Tabs (Clickable cards to go next/prev and trigger phone updates!) */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Khám phá tính năng</span>
              <div className="flex items-center gap-3">
                
                {/* 3 Interactive Selector Tabs */}
                <div className="flex gap-2">
                  {slides.map((slide, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveSlide(index)}
                      className={`px-4 py-2.5 rounded-xl border text-[11px] font-black transition-all ${activeSlide === index ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                    >
                      {index === 0 ? "⚡ Tạo đề nhanh" : index === 1 ? "🎮 Đấu trường" : "🔥 Giữ Streak"}
                    </button>
                  ))}
                </div>

                {/* Next / Prev Navigation Buttons for Desktop */}
                <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                  <button 
                    onClick={handlePrevSlide}
                    className="p-2 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 text-slate-500 transition-all active:scale-95 shadow-sm"
                    aria-label="Previous slide"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button 
                    onClick={handleNextSlide}
                    className="p-2 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 text-slate-500 transition-all active:scale-95 shadow-sm"
                    aria-label="Next slide"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Stunning simulated premium smartphone mockup displaying live interactive previews */}
          <div className="w-full md:w-1/2 flex items-center justify-center relative">
            
            {/* Decorative float sticker in background */}
            <div className="absolute top-10 right-10 px-3.5 py-1.5 rounded-2xl bg-white/90 border border-slate-200 text-xs font-black shadow-lg animate-float-slow z-10 flex items-center gap-1">
              🎉 Học vui ghê!
            </div>

            {/* Smart simulated phone container */}
            <div className={`relative w-[280px] h-[520px] rounded-[2.5rem] bg-gradient-to-br ${slides[activeSlide].bgGradient} p-5 border-8 border-slate-800 shadow-2xl ${slides[activeSlide].shadowColor} transition-all duration-500 flex flex-col justify-between overflow-hidden`}>
              
              {/* Phone notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-4.5 bg-slate-800 rounded-b-2xl z-20" />

              {/* Mock App Header */}
              <div className="flex items-center justify-between w-full z-10 pt-2 text-slate-800">
                <span className="text-[10px] font-black tracking-tight flex items-center gap-1 bg-white/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/50">
                  <span>QM</span> QuizMind
                </span>
                <span className="text-[9px] font-black text-slate-400 bg-white/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/50">
                  Demo
                </span>
              </div>

              {/* Mock Widget Space */}
              <div className="flex-grow flex items-center justify-center my-4 z-10">
                {slides[activeSlide].previewWidget}
              </div>

              {/* Mock Bottom text area */}
              <div className="text-left z-10 mt-auto bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-slate-200 mb-1.5 ${slides[activeSlide].badgeColor}`}>
                  {slides[activeSlide].badgeText}
                </span>
                <h3 className="text-xs font-extrabold text-slate-800 mb-1 leading-tight">{slides[activeSlide].title}</h3>
                <p className="text-[10px] font-semibold text-slate-500 leading-normal">{slides[activeSlide].desc}</p>
              </div>

            </div>
          </div>

        </main>

        {/* Floating Premium Bottom Footer */}
        <div className="w-full px-6 py-4 z-20">
          <footer className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between bg-white/50 backdrop-blur-md border border-slate-200/50 rounded-2xl text-slate-400 text-xs font-semibold shadow-sm">
            <span>© {new Date().getFullYear()} QuizMind. Ôn thi thông minh & đáng yêu.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-600 transition-colors">Điều khoản</a>
              <a href="#" className="hover:text-slate-600 transition-colors">Bảo mật</a>
            </div>
          </footer>
        </div>
      </div>


      {/* 📱 MOBILE APP-LIKE FULL-SCREEN ONBOARDING FLOW (No web-like headers, zero scroll, light-mode pastels!) */}
      <div className={`md:hidden h-screen w-screen bg-gradient-to-br ${slides[activeSlide].bgGradient} text-slate-800 flex flex-col justify-between p-6 overflow-hidden relative transition-all duration-500`}>
        
        {/* Background soft design blobs inside the onboarding card */}
        <div className="absolute top-[-10%] right-[-10%] w-[180px] h-[180px] rounded-full bg-white/20 blur-xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[200px] h-[200px] rounded-full bg-white/20 blur-xl pointer-events-none" />

        {/* Mobile Top Header (Transparent, clean, light-mode custom app pill logo!) */}
        <div className="flex items-center justify-between z-10 w-full pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8.5 h-8.5 rounded-xl bg-white/80 border border-slate-200/30 flex items-center justify-center shadow-sm">
              <span className="font-black text-indigo-600 text-xs">QM</span>
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-800">QuizMind</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/login')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-white/80 border border-slate-200/50 hover:bg-slate-50 shadow-sm"
            >
              Đăng nhập
            </button>
            <button 
              onClick={() => navigate('/login?signup=true')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-indigo-600 shadow-sm"
            >
              Đăng ký
            </button>
          </div>
        </div>

        {/* Mobile Center Mockup (Large scale, perfectly centered like an App Screen) */}
        <div className="flex-grow flex items-center justify-center my-6 z-10 w-full max-w-[290px] mx-auto">
          <div className="w-full transform scale-100 active:scale-95 transition-transform duration-300">
            {slides[activeSlide].previewWidget}
          </div>
        </div>

        {/* Mobile Bottom Info & Primary Action Button */}
        <div className="z-10 flex flex-col gap-4 pb-4">
          
          {/* Glassmorphism slide desc panel (Bubbly, cute, bright mode glass style!) */}
          <div className="text-left bg-white/80 backdrop-blur-md rounded-[1.75rem] p-5 border border-slate-200/40 shadow-lg shadow-slate-200/20">
            <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200 mb-2 ${slides[activeSlide].badgeColor}`}>
              {slides[activeSlide].badgeText}
            </span>
            <h2 className="text-lg font-black tracking-tight mb-1 text-slate-800 leading-tight">
              {slides[activeSlide].title}
            </h2>
            <p className="text-[11px] font-semibold text-slate-500 leading-relaxed min-h-[44px]">
              {slides[activeSlide].desc}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex gap-2 justify-start items-center pl-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${activeSlide === index ? 'w-6 bg-indigo-600 shadow-sm shadow-indigo-300' : 'w-2.5 bg-slate-300'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* App-Style Action Button (Single main flow) */}
          <div className="w-full">
            <button
              onClick={activeSlide < slides.length - 1 ? handleNextSlide : () => navigate('/login')}
              className="w-full py-3.5 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"
            >
              <span>{slides[activeSlide].btnText}</span>
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
