import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous
    d3.select(containerRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const data: any = {
      nodes: [
        { id: "猪肉", group: 1, radius: 30 },
        { id: "牛肉", group: 1, radius: 25 },
        { id: "鸡肉", group: 1, radius: 20 },
        { id: "红烧肉", group: 2, radius: 15 },
        { id: "五花肉", group: 3, radius: 10 },
        { id: "番茄土豆牛腩", group: 2, radius: 15 },
        { id: "照烧鸡腿", group: 2, radius: 15 },
        { id: "西红柿", group: 3, radius: 15 },
        { id: "土豆", group: 3, radius: 15 },
      ],
      links: [
        { source: "猪肉", target: "五花肉", value: 3 },
        { source: "五花肉", target: "红烧肉", value: 5 },
        { source: "牛肉", target: "番茄土豆牛腩", value: 4 },
        { source: "西红柿", target: "番茄土豆牛腩", value: 2 },
        { source: "土豆", target: "番茄土豆牛腩", value: 2 },
        { source: "鸡肉", target: "照烧鸡腿", value: 4 },
      ]
    };

    const svg = d3.select(containerRef.current).append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

    const color = d3.scaleOrdinal(["#A69080", "#B5838D", "#6D8B74", "#C9A96E"]);

    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("collide", d3.forceCollide().radius((d: any) => d.radius + 10))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    const link = svg.append("g")
      .attr("stroke", "#C4B5A5")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", (d: any) => Math.sqrt(d.value));

    const node = svg.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => color(d.group))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .call(drag(simulation) as any);

    const labels = svg.append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text((d: any) => d.id)
      .attr("font-size", 12)
      .attr("fill", "#2C2825")
      .attr("dx", 0)
      .attr("dy", (d: any) => d.radius + 12)
      .attr("text-anchor", "middle");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
      
      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

  }, []);

  function drag(simulation: any) {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  return (
    <div className="h-full flex flex-col animate-fade-in relative pt-4">
      <div className="absolute top-0 left-0 bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-[#E8E0D8] z-10">
        <h2 className="text-xl font-serif text-[#2C2825]">食材宇宙</h2>
        <p className="text-sm text-[#A69080]">拖拽节点交互 • 展现125道菜品的内在关联</p>
      </div>
      <div className="bg-white rounded-3xl border border-[#E8E0D8] overflow-hidden flex-1 relative shadow-inner" ref={containerRef}>
        {/* D3 Canvas here */}
      </div>
    </div>
  );
}
