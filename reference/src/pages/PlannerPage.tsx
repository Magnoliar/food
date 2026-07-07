import { useState } from "react";
import { Search, Plus, Sparkles, CheckSquare, Square, Save, RotateCcw } from "lucide-react";
import { motion } from "motion/react";

const days = ["周二", "周三", "周四", "周五", "周六", "周日", "周一"];

export default function PlannerPage() {
  const [loadingAI, setLoadingAI] = useState(false);
  const [weeklyMeals, setWeeklyMeals] = useState<Record<string, { dinner: string, lunch: string }>>({
    "周二": { dinner: "", lunch: "" },
    "周三": { dinner: "", lunch: "" },
    "周四": { dinner: "", lunch: "" },
    "周五": { dinner: "", lunch: "" },
    "周六": { dinner: "", lunch: "" },
    "周日": { dinner: "", lunch: "" },
    "周一": { dinner: "", lunch: "" },
  });

  const [shoppingList, setShoppingList] = useState<{name: string, checked: boolean, amount: string}[]>([
    { name: "五花肉", checked: false, amount: "500g" },
    { name: "西红柿", checked: false, amount: "4个" },
    { name: "鸡蛋", checked: true, amount: "1盒" },
    { name: "青菜", checked: false, amount: "1把" },
  ]);

  const handleAutoPlan = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch("/api/plan/auto", { method: "POST" });
      const data = await res.json();
      // Dummy processing to populate fields
      if(data.result) {
        setWeeklyMeals({
          "周二": { dinner: "红烧肉", lunch: "西红柿炒鸡蛋" },
          "周三": { dinner: "麻婆豆腐", lunch: "红烧肉便当" },
          "周四": { dinner: "清炒时蔬", lunch: "麻婆豆腐便当" },
          "周五": { dinner: "水煮牛肉", lunch: "无" },
          "周六": { dinner: "火锅", lunch: "外卖" },
          "周日": { dinner: "清蒸鲈鱼", lunch: "随便吃点" },
          "周一": { dinner: "黄焖鸡", lunch: "鱼肉便当" },
        });
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingAI(false);
  };

  return (
    <div className="h-full flex gap-8 animate-fade-in">
      {/* Calendar Area */}
      <div className="flex-1 overflow-y-auto pr-4 space-y-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-serif text-[#2C2825]">本周规划</h2>
          <button 
            onClick={handleAutoPlan}
            disabled={loadingAI}
            className="px-5 py-2.5 bg-[#A69080] text-white rounded-xl shadow-sm hover:bg-[#8B7D6B] transition-colors flex items-center gap-2 font-medium"
          >
            {loadingAI ? <RotateCcw className="animate-spin" size={18} /> : <Sparkles size={18} />}
            AI 一键填满
          </button>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {days.map((day) => (
            <div key={day} className="col-span-7 grid grid-cols-[100px_1fr_1fr] gap-4 items-stretch group">
              <div className="bg-[#D4C5B2]/20 rounded-2xl flex items-center justify-center font-serif text-lg text-[#8B7D6B] border border-[#C4B5A5]/20">
                {day}
              </div>
              
              {["dinner", "lunch"].map((type) => (
                <div key={type} className="relative bg-white rounded-2xl p-4 border border-[#E8E0D8] min-h-[100px] hover:border-[#A69080] transition-colors cursor-text group/box">
                  <div className="text-xs text-[#A69080] font-bold tracking-widest mb-2 uppercase">{type === "dinner" ? "晚餐" : "便当"}</div>
                  <input 
                    type="text" 
                    placeholder={type === "dinner" ? "计划吃什么?" : "明日便当"}
                    value={weeklyMeals[day][type as "dinner"|"lunch"]}
                    onChange={(e) => setWeeklyMeals({...weeklyMeals, [day]: {...weeklyMeals[day], [type]: e.target.value}})}
                    className="w-full bg-transparent border-none outline-none text-[#2C2825] font-medium placeholder-[#C4B5A5]" 
                  />
                  {!weeklyMeals[day][type as "dinner"|"lunch"] && (
                    <div className="absolute right-4 bottom-4 opacity-0 group-hover/box:opacity-100 transition-opacity">
                      <button className="text-[#A69080] hover:text-[#2C2825]"><Search size={16} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Shopping List Area */}
      <div className="w-[340px] bg-[#C4B5A5]/20 p-6 rounded-2xl border border-[#D4C5B2] flex flex-col shadow-sm">
        <h3 className="text-xl font-bold text-[#2C2825] mb-6 flex items-center justify-between">
          <span>购物清单</span>
          <span className="text-[10px] font-normal bg-white px-2 py-0.5 rounded shadow-sm font-sans">{shoppingList.filter(i => !i.checked).length} 待办</span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 -mx-2 px-2">
          {shoppingList.map((item, idx) => (
            <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${item.checked ? 'bg-white/20 opacity-50' : 'bg-white/40 group'}`}>
              <button 
                onClick={() => {
                  const n = [...shoppingList];
                  n[idx].checked = !n[idx].checked;
                  setShoppingList(n);
                }}
                className="flex items-center justify-center w-5 h-5 rounded-sm shrink-0 border border-[#8B7D6B]"
                style={item.checked ? { backgroundColor: '#8B7D6B' } : {}}
              >
                {item.checked && <CheckSquare size={14} className="text-white opacity-0" />}
              </button>
              <div className={`flex-1 ${item.checked ? 'line-through text-[#8B7D6B]' : 'text-[#2C2825]'}`}>
                <p className="text-xs font-bold tracking-wide">{item.name}</p>
                <p className="text-[10px] opacity-60 font-sans mt-0.5">{item.amount}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 space-y-4">
          <button className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-[#D4C5B2] text-[#8B7D6B] rounded-xl text-xs font-bold hover:bg-[#F5F0EB]/50 transition-colors uppercase tracking-widest">
            <Plus size={14} /> 添加临时项
          </button>
          <button className="w-full py-3 bg-[#8B7D6B] text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-xl transition-all uppercase tracking-widest">
            保存并开始采购
          </button>
        </div>
      </div>
    </div>
  );
}
