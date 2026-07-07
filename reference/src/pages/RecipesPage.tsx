import { useState } from "react";
import { Search, Filter, Star, Clock, ChefHat } from "lucide-react";

export default function RecipesPage({ recipes }: { recipes: any[] }) {
  const [search, setSearch] = useState("");
  
  // Mock data if none passed
  const displayRecipes = recipes.length ? recipes : [
    { id: '1', name: "红烧肉", score: 9.5, diff: 3, time: 60, counts: 12, tags: ["猪肉", "红烧", "妈妈的味道"] },
    { id: '2', name: "清蒸鲈鱼", score: 8.8, diff: 2, time: 20, counts: 5, tags: ["海鲜", "清淡", "高蛋白"] },
    { id: '3', name: "麻婆豆腐", score: 9.0, diff: 2, time: 15, counts: 8, tags: ["川菜", "下饭", "快手"] },
    { id: '4', name: "番茄土豆牛腩", score: 9.8, diff: 4, time: 120, counts: 3, tags: ["牛肉", "炖菜", "周末聚餐"] },
    { id: '5', name: "蒜蓉西兰花", score: 7.5, diff: 1, time: 10, counts: 20, tags: ["素菜", "健康", "便当"] },
    { id: '6', name: "照烧鸡腿肉", score: 8.5, diff: 2, time: 25, counts: 15, tags: ["鸡肉", "日式", "便当之选"] }
  ];

  return (
    <div className="h-full flex flex-col animate-fade-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif text-[#2C2825]">菜谱库</h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A69080]" size={18} />
            <input 
              type="text" 
              placeholder="搜索菜名、食材或标签..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 pr-4 py-3 w-80 bg-white rounded-full border border-[#E8E0D8] focus:border-[#A69080] outline-none text-[#2C2825] shadow-sm transition-all"
            />
          </div>
          <button className="px-5 py-3 bg-white text-[#8B7D6B] rounded-full border border-[#E8E0D8] font-bold flex items-center gap-2 hover:bg-[#F5F0EB] transition-colors">
            <Filter size={18} /> 筛选
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {["全部", "做过最多的", "最高评分", "快手菜", "重口味", "便当好伙伴"].map(tag => (
          <button key={tag} className="px-4 py-1.5 bg-[#D4C5B2]/30 text-[#8B7D6B] rounded-full text-sm font-medium hover:bg-[#A69080] hover:text-white transition-colors">
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pr-2 pb-8">
        {displayRecipes.map((recipe, i) => (
          <div key={recipe.id || i} className="group bg-white p-5 rounded-3xl border border-[#E8E0D8] hover:border-[#C4B5A5] hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-[#F5F0EB] rounded-2xl mb-4 overflow-hidden relative">
              <img src={`https://picsum.photos/seed/${recipe.name}/400/300`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={recipe.name} referrerPolicy="no-referrer" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold text-[#8B7D6B] flex items-center gap-1 shadow-sm">
                <Star size={12} className="text-[#C9A96E] fill-[#C9A96E]"/> {recipe.score}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-[#2C2825] mb-2">{recipe.name}</h3>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.tags.map((t: string) => (
                <span key={t} className="px-2 py-1 bg-[#F5F0EB] text-[#A69080] text-xs font-medium rounded-lg">{t}</span>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-[#E8E0D8] flex items-center justify-between text-[#8B7D6B] text-sm">
              <div className="flex items-center gap-1 font-mono"><Clock size={14} /> {recipe.time}m</div>
              <div className="flex items-center gap-1"><ChefHat size={14} /> 做过{recipe.counts}次</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
