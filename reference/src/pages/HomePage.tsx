import { useState } from "react";
import { Sparkles, ArrowRight, Utensils, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

export default function HomePage({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [isPlanned, setIsPlanned] = useState(false);

  return (
    <div className="h-full flex flex-col justify-center items-center py-12 relative animate-fade-in">
      {!isPlanned ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-serif text-[#2C2825] leading-tight">这周还没有规划哦，<br/>要让AI帮帮忙吗？</h2>
            <p className="text-lg text-[#8B7D6B] font-medium">根据时令食材和你们的偏好，开启本周美食旅程。</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => setIsPlanned(true)}
              className="group relative p-8 bg-white/60 backdrop-blur-lg rounded-3xl border border-[#C4B5A5]/40 hover:border-[#A69080] hover:shadow-xl transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-500">
                <Sparkles size={48} className="text-[#B5838D]" />
              </div>
              <h3 className="text-xl font-bold text-[#8B7D6B] mb-2">AI 智能规划</h3>
              <p className="text-[#A69080] text-sm leading-relaxed mb-6">一键生成7天晚餐与便当，自动生成购物清单。</p>
              <div className="flex items-center text-[#B5838D] font-medium">
                快速生成 <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button 
              onClick={() => onNavigate("planner")}
              className="group relative p-8 bg-[#A69080] rounded-3xl text-white hover:shadow-xl hover:bg-[#8B7D6B] transition-all duration-300 text-left overflow-hidden"
            >
              <h3 className="text-xl font-bold mb-2">手动规划</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-6">浏览菜谱库，挑选想吃的菜，手动填入周历。</p>
              <div className="flex items-center text-white/90 font-medium">
                去日历 <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          <div className="mt-12 bg-white/40 p-6 rounded-2xl backdrop-blur-md inline-block">
            <h4 className="text-sm font-bold text-[#A69080] uppercase tracking-widest mb-2 flex justify-center items-center gap-2"><Sparkles size={14}/> 厨艺小贴士</h4>
            <p className="text-[#2C2825]">"煎鱼前记得用厨房纸吸干表面水分，热锅冷油，鱼皮才不破。"</p>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full flex flex-col pt-4">
          <div className="grid grid-cols-12 gap-8 h-full">
            <section className="col-span-8 flex flex-col gap-6">
              <div className="bg-white p-1 shadow-xl rotate-1 relative group overflow-hidden min-h-[340px]">
                <div className="w-full h-full bg-[#D4C5B2] bg-[url('https://picsum.photos/seed/beef/800/600')] bg-cover bg-center flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                  <div className="absolute bottom-6 left-8 z-20 text-white">
                    <span className="bg-[#B5838D] text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block shadow-sm">今日主角 · DINNER</span>
                    <h2 className="text-4xl font-serif font-bold mb-2 tracking-wide">番茄土豆牛腩煲</h2>
                    <div className="flex gap-4 text-xs opacity-90 font-mono">
                      <span className="flex items-center gap-1">⌚ 120min</span>
                      <span className="flex items-center gap-1">🏆 难度: 3/5</span>
                    </div>
                  </div>
                  
                  <div className="absolute right-6 bottom-6 z-20 flex gap-3">
                    <button className="bg-[#8B7D6B] hover:bg-[#A69080] text-white px-6 py-2 rounded-none font-sans text-xs tracking-widest uppercase transition-colors shadow-lg">开始烹饪</button>
                    <button className="bg-white/20 hover:bg-white/40 backdrop-blur-sm border border-white/40 text-white px-6 py-2 rounded-none font-sans text-xs tracking-widest uppercase transition-colors shadow-lg">记录</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#6D8B74]/10 rounded-xl p-5 border border-[#6D8B74]/30 relative overflow-hidden group">
                  <div className="absolute top-2 right-2 text-[#6D8B74] opacity-20 group-hover:scale-110 transition-transform"><CheckCircle size={40} /></div>
                  <h4 className="text-xs font-bold text-[#6D8B74] uppercase tracking-wide mb-1">明日便当预告</h4>
                  <p className="text-sm font-serif text-[#2C2825] leading-relaxed">香煎鸡胸肉 + 清炒西兰花</p>
                  <span className="inline-block mt-3 px-2 py-1 bg-white/60 text-[#6D8B74] text-[10px] font-bold rounded">需备餐</span>
                </div>
              </div>
            </section>

            <section className="col-span-4 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-none border border-[#D4C5B2] shadow-sm flex flex-col relative h-full">
                <div className="absolute -top-3 -right-2 bg-[#C9A96E] text-white text-[10px] px-3 py-1 rotate-6 rounded-sm shadow-md tracking-wider">NEW TIP</div>
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-[#8B7D6B] uppercase tracking-widest"><Sparkles size={14} className="text-[#C9A96E]" /> 猪猪家厨艺秘籍</h4>
                <p className="text-sm leading-relaxed italic text-[#2C2825] flex-1 font-serif">“炖牛肉不柴秘诀：加点山楂或者茶叶，小火慢炖至少一个半小时，最后半小时再放盐。”</p>
                <div className="mt-4 pt-4 border-t border-[#D4C5B2]/40 flex justify-between items-center">
                  <span className="text-[10px] font-mono opacity-40 uppercase">From 125 Notes</span>
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      )}
    </div>
  );
}
