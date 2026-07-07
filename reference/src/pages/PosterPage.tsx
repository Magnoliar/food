import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { Download, Share2 } from "lucide-react";
import { format } from "date-fns";

export default function PosterPage() {
  const posterRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    if (!posterRef.current) return;
    setGenerating(true);
    
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#F5F0EB"
      });
      
      const link = document.createElement("a");
      link.download = `猪猪家吃什么-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  return (
    <div className="h-full flex flex-col items-center py-8 animate-fade-in">
      <div className="w-full flex justify-between items-end max-w-md mb-6">
        <div>
          <h2 className="text-3xl font-serif text-[#2C2825]">精美打卡</h2>
          <p className="text-sm text-[#A69080] mt-1">生成充满纸质纹理与蜡笔风的手账海报</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={generating}
          className="px-4 py-2 bg-[#2C2825] text-white rounded-xl shadow-sm hover:bg-black transition-colors flex items-center gap-2 font-medium"
        >
          <Download size={16} /> 导出海报
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-md">
        {/* Poster Rendering Area */}
        <div 
          ref={posterRef}
          className="bg-[#FFFDFA] relative w-full aspect-[3/4] p-8 shadow-2xl rounded-sm border border-[#E8E0D8] mx-auto overflow-hidden"
          style={{
            backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')",
            backgroundBlendMode: "multiply",
            backgroundSize: "cover"
          }}
        >
          {/* Decorative Corner Elements */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#C9A96E]/40" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#C9A96E]/40" />
          
          <div className="text-center mt-6">
            <h1 className="font-serif text-4xl text-[#2C2825] tracking-widest" style={{ fontFamily: "Playfair Display, serif" }}>Bon Appétit</h1>
            <p className="text-[#8B7D6B] font-serif text-lg mt-2">猪猪家的温馨食光</p>
            <div className="w-12 h-[1px] bg-[#A69080] mx-auto mt-4 mb-8"></div>
          </div>

          <div className="aspect-square w-full rounded-full overflow-hidden border-4 border-white shadow-xl mb-8 relative">
            <img src="https://picsum.photos/seed/tomato/600/600" alt="番茄土豆牛腩" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>

          <div className="text-center space-y-4 relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-[#8B7D6B]">番茄土豆牛腩煲</h2>
              <p className="text-sm text-[#A69080] font-mono mt-1">{format(new Date(), 'MMM dd, yyyy')}</p>
            </div>
            
            <div className="bg-[#F5F0EB]/80 backdrop-blur rounded-xl p-4 inline-block border border-[#E8E0D8]">
              <div className="flex items-center justify-center gap-2 text-[#C9A96E]">
                {"★".repeat(5)}
              </div>
              <p className="text-sm font-medium text-[#2C2825] mt-1 shadow-sm">"今天火候刚刚好，牛肉软烂入味！"</p>
            </div>
          </div>

          {/* Crayon art mock (usually from API) */}
          <div className="absolute bottom-6 left-6 text-[#E8927C] opacity-80" style={{ fontFamily: "Caveat, cursive", fontSize: "24px", transform: "rotate(-10deg)" }}>
            #WeekendVibes
          </div>
        </div>
      </div>
    </div>
  );
}
