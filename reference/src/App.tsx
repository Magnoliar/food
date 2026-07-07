import React, { useState, useEffect } from "react";
import { Book, Calendar, Home, Network, FileImage, LayoutGrid, Import } from "lucide-react";
import HomePage from "./pages/HomePage";
import PlannerPage from "./pages/PlannerPage";
import RecipesPage from "./pages/RecipesPage";
import GraphPage from "./pages/GraphPage";
import PosterPage from "./pages/PosterPage";

export default function App() {
  const [currentTab, setCurrentTab] = useState("home");

  const [recipes, setRecipes] = useState<any[]>([]);

  useEffect(() => {
    // Optionally fetch recipes to warm up
    fetch("/api/recipes").then(r => r.json()).then(setRecipes).catch(() => {});
  }, []);

  const renderContent = () => {
    switch (currentTab) {
      case "home": return <HomePage onNavigate={setCurrentTab} />;
      case "planner": return <PlannerPage />;
      case "recipes": return <RecipesPage recipes={recipes} />;
      case "graph": return <GraphPage />;
      case "poster": return <PosterPage />;
      default: return <HomePage onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F5F0EB] text-[#2C2825] font-serif overflow-hidden relative border-8 border-white">
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={{ backgroundImage: "radial-gradient(#A69080 0.5px, transparent 0.5px)", backgroundSize: "10px 10px" }}></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#B5838D] rounded-full blur-[100px] opacity-10 z-0"></div>
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#6D8B74] rounded-full blur-[120px] opacity-10 z-0"></div>

      {/* Sidebar */}
      <aside className="w-64 bg-white/40 backdrop-blur-md border-r border-[#D4C5B2] flex flex-col pt-8 pb-4 z-10">
        <div className="px-6 mb-8">
          <h1 className="text-2xl font-serif font-bold text-[#8B7D6B]">猪猪家吃什么</h1>
          <p className="text-sm text-[#A69080] mt-1 font-mono">Personal Recipe OS</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<Home />} label="首页 (Home)" active={currentTab === "home"} onClick={() => setCurrentTab("home")} />
          <NavItem icon={<Calendar />} label="周规划 (Planner)" active={currentTab === "planner"} onClick={() => setCurrentTab("planner")} />
          <NavItem icon={<Book />} label="菜谱库 (Recipes)" active={currentTab === "recipes"} onClick={() => setCurrentTab("recipes")} />
          <NavItem icon={<Network />} label="食材宇宙 (Graph)" active={currentTab === "graph"} onClick={() => setCurrentTab("graph")} />
          <NavItem icon={<FileImage />} label="海报生成 (Poster)" active={currentTab === "poster"} onClick={() => setCurrentTab("poster")} />
        </nav>
        
        <div className="px-6 mt-auto">
          <button className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#2C2825] text-[#E8E0D8] hover:bg-opacity-90 transition-all font-medium text-sm">
            <Import size={16} />
            导入历史数据
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden z-10 w-full p-4 lg:p-10">
        <header className="flex justify-between items-end mb-8 shrink-0">
          <div className="flex flex-col">
            <p className="text-xs tracking-widest text-[#8B7D6B] uppercase font-sans mb-1">Piggy House Kitchen</p>
            <h1 className="text-4xl lg:text-5xl font-black text-[#2C2825] tracking-tight">猪猪家吃什么<span className="text-[#B5838D] text-2xl ml-2 italic">?</span></h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-sans tracking-tighter opacity-60 uppercase">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-[#A69080] text-white shadow-md' : 'text-[#8B7D6B] hover:bg-[#C4B5A5]/40'}`}
    >
      <div className={`${active ? 'opacity-100' : 'opacity-70'}`}>{icon}</div>
      <span className="font-medium tracking-wide">{label}</span>
    </button>
  );
}
