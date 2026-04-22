import { useState, useEffect, useMemo } from "react";

// ── constants ────────────────────────────────────────────────────────────────
const METER_CFG = [
  { key: "Cloud Data Movement",                   color: "#00d4ff" },
  { key: "Cloud Orchestration Activity Run",       color: "#7c3aed" },
  { key: "vCore",                                  color: "#f59e0b" },
  { key: "Cloud Pipeline Activity",                color: "#10b981" },
  { key: "Self Hosted Data Movement",              color: "#06b6d4" },
  { key: "Self Hosted Orchestration Activity Run", color: "#f97316" },
  { key: "Cloud Read Write Operations",            color: "#84cc16" },
];

const PALETTE = [
  { line: "#f59e0b" }, { line: "#06b6d4" }, { line: "#a78bfa" },
  { line: "#34d399" }, { line: "#fb7185" },
];

const fmt  = (n) => `$${Number(n).toFixed(2)}`;
const fmtK = (n) => n >= 100 ? `$${Number(n).toFixed(0)}` : `$${Number(n).toFixed(1)}`;

const W = 640, H = 230, PAD = { top: 20, right: 20, bottom: 40, left: 52 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

// ── SVG path helpers ─────────────────────────────────────────────────────────
function buildPath(values, maxY, dates) {
  const n = dates.length;
  const pts = values.map((v, i) => [
    PAD.left + (i / (n - 1)) * CW,
    PAD.top + CH - (v / maxY) * CH,
  ]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C ${cx} ${pts[i-1][1]}, ${cx} ${pts[i][1]}, ${pts[i][0]} ${pts[i][1]}`;
  }
  return { path: d, pts };
}

function buildAreaPath(values, maxY, dates) {
  const n = dates.length;
  const pts = values.map((v, i) => ({
    x: PAD.left + (i / (n - 1)) * CW,
    y: PAD.top + CH - (v / maxY) * CH,
  }));
  let d = `M ${pts[0].x} ${PAD.top + CH} L ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cx} ${pts[i-1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }
  d += ` L ${pts[pts.length - 1].x} ${PAD.top + CH} Z`;
  return d;
}

// ── Stacked bar (used inside AdfStackedChart) ────────────────────────────────
function StackedBar({ date, meters, maxVal, isSelected, onClick, dates }) {
  const BW = 640, BH = 160;
  const BP = { top: 24, right: 16, bottom: 40, left: 52 };
  const BCW = BW - BP.left - BP.right;
  const BCH = BH - BP.top - BP.bottom;
  const barW = BCW / dates.length;
  const idx  = dates.indexOf(date);
  const x0   = BP.left + idx * barW + barW * 0.15;
  const bw   = barW * 0.7;
  let yOff = 0;
  const segs = METER_CFG.map(({ key, color }) => {
    const val = meters[key] || 0;
    const h   = (val / maxVal) * BCH;
    const seg = { key, color, val, h, y: BP.top + BCH - yOff - h };
    yOff += h;
    return seg;
  }).filter(s => s.val > 0);
  const total = Object.values(meters).reduce((a, b) => a + b, 0);
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {isSelected && (
        <rect x={x0-2} y={BP.top-2} width={bw+4} height={BCH+4}
          fill="none" stroke="#ffffff22" strokeWidth="1" rx="2" />
      )}
      {segs.map(s => (
        <rect key={s.key} x={x0} y={s.y} width={bw}
          height={Math.max(s.h, 0.5)} fill={s.color} opacity={isSelected ? 1 : 0.78} />
      ))}
      <text x={x0 + bw / 2} y={BP.top - 6} fontSize="8.5"
        fill={isSelected ? "#e2e8f0" : "#475569"}
        textAnchor="middle" fontFamily="monospace">${total.toFixed(0)}</text>
    </g>
  );
}

// ── ADF stacked daily chart ──────────────────────────────────────────────────
function AdfStackedChart({ data, hoveredDate, setHoveredDate }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const { dates, labels, daily_meter, daily_total, adf_total } = data;

  const BW = 640, BH = 160;
  const BP = { top: 24, right: 16, bottom: 40, left: 52 };
  const BCW = BW - BP.left - BP.right;
  const BCH = BH - BP.top - BP.bottom;
  const maxVal  = Math.max(...dates.map(d => daily_total[d])) * 1.12;
  const yTicks  = [0, 75, 150, 225, 300].filter(v => v <= maxVal * 1.05);
  const focusDate = selectedDate || hoveredDate;

  return (
    <div style={{ background:"#0c1220", border:"1px solid #1a2540", borderRadius:10, padding:"14px 16px 10px", marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div>
          <span style={{ fontSize:12, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:1 }}>
            ADF Total · Daily Cost by Meter
          </span>
          <span style={{ fontSize:10, color:"#334155", marginLeft:10, fontFamily:"monospace" }}>
            7-day total: <span style={{ color:"#00d4ff" }}>${Number(adf_total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
          </span>
        </div>
        {selectedDate && (
          <button onClick={() => setSelectedDate(null)} style={{
            fontSize:9, color:"#475569", background:"none", border:"1px solid #1e293b",
            borderRadius:4, padding:"2px 8px", cursor:"pointer", fontFamily:"monospace"
          }}>✕ clear</button>
        )}
      </div>

      <svg width="100%" viewBox={`0 0 ${BW} ${BH}`} style={{ display:"block", cursor:"crosshair" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const svgX = ((e.clientX - rect.left) / rect.width) * BW;
          const idx  = Math.floor((svgX - BP.left) / (BCW / dates.length));
          if (idx >= 0 && idx < dates.length) setHoveredDate(dates[idx]);
        }}
        onMouseLeave={() => setHoveredDate(null)}
      >
        {/* Grid */}
        {yTicks.map(tick => {
          const y = BP.top + BCH - (tick / maxVal) * BCH;
          return (
            <g key={tick}>
              <line x1={BP.left} y1={y} x2={BP.left+BCW} y2={y} stroke="#0f1f35" strokeWidth="1" />
              <text x={BP.left-5} y={y+3} fontSize="8.5" fill="#334155" textAnchor="end" fontFamily="monospace">${tick}</text>
            </g>
          );
        })}

        {/* Bars */}
        {dates.map(d => (
          <StackedBar key={d} date={d} meters={daily_meter[d] || {}} maxVal={maxVal}
            isSelected={focusDate === d}
            onClick={() => setSelectedDate(selectedDate === d ? null : d)}
            dates={dates}
          />
        ))}

        {/* Hover highlight */}
        {hoveredDate && (() => {
          const barW = BCW / dates.length;
          const idx  = dates.indexOf(hoveredDate);
          const cx   = BP.left + idx * barW + barW / 2;
          return <line x1={cx} y1={BP.top} x2={cx} y2={BP.top+BCH} stroke="#ffffff10" strokeWidth={barW*0.7} />;
        })()}

        {/* X labels */}
        {dates.map((d, i) => {
          const barW = BCW / dates.length;
          const cx   = BP.left + i * barW + barW / 2;
          const [day, date] = labels[i].split(" · ");
          const isWeekend = day === "Sat" || day === "Sun";
          return (
            <g key={d}>
              <text x={cx} y={BH-20} fontSize="8.5" fill={isWeekend ? "#f59e0b" : "#64748b"}
                textAnchor="middle" fontFamily="monospace" fontWeight="700">{day}</text>
              <text x={cx} y={BH-7} fontSize="8" fill="#334155"
                textAnchor="middle" fontFamily="monospace">{date}</text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8, paddingTop:10, borderTop:"1px solid #0f1f35" }}>
        {METER_CFG.map(({ key, color }) => (
          <div key={key} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:8, height:8, borderRadius:1, background:color }} />
            <span style={{ fontSize:8.5, color:"#475569", fontFamily:"monospace" }}>{key}</span>
          </div>
        ))}
      </div>

      {/* Drill-down on hover/click */}
      {focusDate && (() => {
        const m = daily_meter[focusDate] || {};
        const total = daily_total[focusDate] || 0;
        return (
          <div style={{ marginTop:10, padding:"10px 12px", background:"#060d1a", border:"1px solid #1e293b", borderRadius:7 }}>
            <div style={{ fontSize:10, color:"#7c3aed", fontFamily:"monospace", marginBottom:8, fontWeight:600 }}>
              {labels[dates.indexOf(focusDate)]} — Total: ${Number(total).toFixed(2)}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:5 }}>
              {METER_CFG.filter(({ key }) => m[key] > 0).map(({ key, color }) => (
                <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:6, height:6, borderRadius:1, background:color }} />
                    <span style={{ fontSize:9, color:"#64748b", fontFamily:"monospace" }}>{key}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:8, color:"#334155", fontFamily:"monospace" }}>
                      {((m[key]/total)*100).toFixed(1)}%
                    </span>
                    <span style={{ fontSize:10, color, fontFamily:"monospace", fontWeight:700 }}>${m[key].toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Top 5 overlay chart ──────────────────────────────────────────────────────
function OverlayChart({ data, hoveredDate, setHoveredDate, activeKey, setActiveKey }) {
  const { dates, labels, pipelines, top5_keys } = data;
  const KEYS = top5_keys;
  const maxVal = Math.max(...KEYS.flatMap(k => pipelines[k].daily)) * 1.12;
  const yTicks = [0, 25, 50, 75, 100, 125].filter(v => v <= maxVal * 1.05);
  const hoverIdx = hoveredDate ? dates.indexOf(hoveredDate) : null;

  return (
    <div style={{ background:"#0c1220", border:"1px solid #1a2540", borderRadius:10, padding:"18px 16px 10px", marginBottom:20, position:"relative" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block", cursor:"crosshair" }}
        onMouseLeave={() => setHoveredDate(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const svgX = ((e.clientX - rect.left) / rect.width) * W;
          const idx  = Math.round(((svgX - PAD.left) / CW) * (dates.length - 1));
          if (idx >= 0 && idx < dates.length) setHoveredDate(dates[idx]);
        }}
      >
        <defs>
          {KEYS.map((k, i) => (
            <linearGradient key={k} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE[i].line} stopOpacity="0.25" />
              <stop offset="100%" stopColor={PALETTE[i].line} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {yTicks.map(tick => {
          const y = PAD.top + CH - (tick / maxVal) * CH;
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={y} x2={PAD.left+CW} y2={y} stroke="#0f1f35" strokeWidth="1" />
              <text x={PAD.left-6} y={y+4} fontSize="9" fill="#334155" textAnchor="end" fontFamily="monospace">{fmtK(tick)}</text>
            </g>
          );
        })}

        {/* X axis */}
        {dates.map((d, i) => {
          const x = PAD.left + (i / (dates.length - 1)) * CW;
          const [day, date] = labels[i].split(" · ");
          const isWeekend = day === "Sat" || day === "Sun";
          return (
            <g key={d}>
              <text x={x} y={H-16} fontSize="9" fill={isWeekend ? "#f59e0b" : "#64748b"}
                textAnchor="middle" fontFamily="monospace" fontWeight="700">{day}</text>
              <text x={x} y={H-4} fontSize="8" fill="#334155" textAnchor="middle" fontFamily="monospace">{date}</text>
            </g>
          );
        })}

        {/* Hover line */}
        {hoverIdx !== null && (
          <line x1={PAD.left+(hoverIdx/(dates.length-1))*CW} y1={PAD.top}
            x2={PAD.left+(hoverIdx/(dates.length-1))*CW} y2={PAD.top+CH}
            stroke="#ffffff18" strokeWidth="1" strokeDasharray="3 3" />
        )}

        {/* Area fills */}
        {KEYS.map((k, i) => {
          const isActive = activeKey === null || activeKey === k;
          return (
            <path key={k} d={buildAreaPath(pipelines[k].daily, maxVal, dates)}
              fill={`url(#grad${i})`} opacity={isActive ? 1 : 0.08}
              style={{ transition:"opacity 0.2s" }} />
          );
        })}

        {/* Lines + dots */}
        {KEYS.map((k, i) => {
          const isActive = activeKey === null || activeKey === k;
          const { path, pts } = buildPath(pipelines[k].daily, maxVal, dates);
          return (
            <g key={k} opacity={isActive ? 1 : 0.1} style={{ transition:"opacity 0.2s" }}>
              <path d={path} fill="none" stroke={PALETTE[i].line} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map(([x, y], di) => (
                pipelines[k].daily[di] > 0 && (
                  <circle key={di} cx={x} cy={y} r={hoverIdx === di ? 5 : 3}
                    fill={PALETTE[i].line} stroke={hoverIdx === di ? "#070c14" : "none"} strokeWidth="1.5"
                    style={{ transition:"r 0.1s" }} />
                )
              ))}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredDate && (
        <div style={{ position:"absolute", top:14, right:14, background:"#0a1525", border:"1px solid #1e3050",
          borderRadius:7, padding:"10px 14px", minWidth:200, pointerEvents:"none" }}>
          <div style={{ fontSize:10, color:"#64748b", marginBottom:8, letterSpacing:1 }}>
            {labels[dates.indexOf(hoveredDate)]}
          </div>
          {KEYS.map((k, i) => {
            const val = pipelines[k].daily[dates.indexOf(hoveredDate)];
            return (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5, opacity:val===0?0.3:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:8, height:2, background:PALETTE[i].line, borderRadius:1 }} />
                  <span style={{ fontSize:9, color:"#94a3b8", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {pipelines[k].short}
                  </span>
                </div>
                <span style={{ fontSize:10, color:val===0?"#334155":PALETTE[i].line, fontWeight:700 }}>
                  {val === 0 ? "—" : fmt(val)}
                </span>
              </div>
            );
          })}
          <div style={{ borderTop:"1px solid #1e3050", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:9, color:"#475569" }}>Total top-5</span>
            <span style={{ fontSize:10, color:"#f1f5f9", fontWeight:700 }}>
              {fmt(KEYS.reduce((s, k) => s + pipelines[k].daily[dates.indexOf(hoveredDate)], 0))}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:16 }}>
        {KEYS.map((k, i) => (
          <button key={k} onClick={() => setActiveKey(activeKey === k ? null : k)} style={{
            display:"flex", alignItems:"center", gap:8,
            background: activeKey === k ? "#0c1a2e" : "#0a1220",
            border:`1px solid ${activeKey===k?PALETTE[i].line:"#1a2540"}`,
            borderRadius:6, padding:"7px 12px", cursor:"pointer", transition:"all 0.15s"
          }}>
            <div style={{ width:18, height:2, background:PALETTE[i].line, borderRadius:1 }} />
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:9, color:"#94a3b8", fontFamily:"monospace" }}>{pipelines[k].short}</div>
              <div style={{ fontSize:11, color:PALETTE[i].line, fontWeight:700 }}>{fmt(pipelines[k].total7d)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Individual pipeline cards ────────────────────────────────────────────────
function IndividualCharts({ data }) {
  const { dates, labels, pipelines, top5_keys } = data;
  const KEYS = top5_keys;
  const SH = 152;
  const SP = { top:16, right:14, bottom:36, left:40 };
  const SCW = W - SP.left - SP.right;
  const SCH = SH - SP.top - SP.bottom;

  function sPt(v, idx, localMax) {
    return {
      x: SP.left + (idx / (dates.length - 1)) * SCW,
      y: SP.top + SCH - (v / localMax) * SCH,
    };
  }
  function sPath(vals, localMax) {
    const pts = vals.map((v, i) => sPt(v, i, localMax));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let j = 1; j < pts.length; j++) {
      const cx = (pts[j-1].x + pts[j].x) / 2;
      d += ` C ${cx} ${pts[j-1].y}, ${cx} ${pts[j].y}, ${pts[j].x} ${pts[j].y}`;
    }
    return d;
  }
  function sArea(vals, localMax) {
    const pts = vals.map((v, j) => sPt(v, j, localMax));
    let d = `M ${pts[0].x} ${SP.top+SCH} L ${pts[0].x} ${pts[0].y}`;
    for (let j = 1; j < pts.length; j++) {
      const cx = (pts[j-1].x + pts[j].x) / 2;
      d += ` C ${cx} ${pts[j-1].y}, ${cx} ${pts[j].y}, ${pts[j].x} ${pts[j].y}`;
    }
    d += ` L ${pts[pts.length-1].x} ${SP.top+SCH} Z`;
    return d;
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16, marginBottom:24 }}>
      {KEYS.map((k, i) => {
        const p = pipelines[k];
        const localMax = Math.max(...p.daily) * 1.18 || 1;
        return (
          <div key={k} style={{
            background:"#0c1220", border:`1px solid ${PALETTE[i].line}28`,
            borderRadius:10, padding:"14px 14px 8px", borderTop:`2px solid ${PALETTE[i].line}`,
          }}>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, color:PALETTE[i].line, letterSpacing:2, marginBottom:3 }}>
                #{i+1} · {((p.total7d / KEYS.reduce((s,k2)=>s+pipelines[k2].total7d,0))*100).toFixed(1)}% of top-5
              </div>
              <div style={{ fontSize:11, color:"#e2e8f0", fontFamily:"monospace" }}>{p.short}</div>
              <div style={{ fontSize:16, color:PALETTE[i].line, fontWeight:700, marginTop:2 }}>
                {fmt(p.total7d)} <span style={{ fontSize:9, color:"#475569" }}>7-day total</span>
              </div>
            </div>

            <svg width="100%" viewBox={`0 0 ${W} ${SH}`} style={{ display:"block" }}>
              <defs>
                <linearGradient id={`sg${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE[i].line} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={PALETTE[i].line} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map(pct => {
                const y = SP.top + SCH - pct * SCH;
                return (
                  <g key={pct}>
                    <line x1={SP.left} y1={y} x2={SP.left+SCW} y2={y} stroke="#0f1f35" strokeWidth="1" />
                    <text x={SP.left-4} y={y+3} fontSize="8" fill="#1e3a5f" textAnchor="end" fontFamily="monospace">
                      {fmtK(localMax * pct)}
                    </text>
                  </g>
                );
              })}
              {dates.map((d, j) => {
                const x = SP.left + (j / (dates.length - 1)) * SCW;
                const [day] = labels[j].split(" · ");
                const dateShort = labels[j].split("· ")[1]?.split(" ")[1];
                const isWeekend = day === "Sat" || day === "Sun";
                return (
                  <g key={d}>
                    <text x={x} y={SH-13} fontSize="7.5" fill={isWeekend?"#f59e0b":"#334155"}
                      textAnchor="middle" fontFamily="monospace" fontWeight="700">{day.slice(0,3)}</text>
                    <text x={x} y={SH-3} fontSize="7" fill="#1e3050"
                      textAnchor="middle" fontFamily="monospace">{dateShort}</text>
                  </g>
                );
              })}
              <path d={sArea(p.daily, localMax)} fill={`url(#sg${i})`} />
              <path d={sPath(p.cdm, localMax)} fill="none" stroke={PALETTE[i].line} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
              <path d={sPath(p.orch, localMax)} fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
              <path d={sPath(p.daily, localMax)} fill="none" stroke={PALETTE[i].line} strokeWidth="2" />
              {p.daily.map((v, j) => {
                if (v === 0) return null;
                const pt = sPt(v, j, localMax);
                return <circle key={j} cx={pt.x} cy={pt.y} r="3" fill={PALETTE[i].line} />;
              })}
            </svg>

            <div style={{ display:"grid", gridTemplateColumns:`repeat(${dates.length},1fr)`, gap:2, marginTop:6 }}>
              {p.daily.map((v, j) => (
                <div key={j} style={{ textAlign:"center" }}>
                  <div style={{ height:3, borderRadius:1, marginBottom:2,
                    background: v===0 ? "#1a2540" : PALETTE[i].line,
                    opacity: v===0 ? 1 : 0.4 + 0.6*(v/Math.max(...p.daily)) }} />
                  <div style={{ fontSize:8, color:v===0?"#1e3050":"#475569", fontFamily:"monospace" }}>
                    {v===0 ? "—" : fmtK(v).replace("$","")}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:12, marginTop:8, paddingTop:8, borderTop:"1px solid #0f1f35" }}>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:14, height:1.5, background:PALETTE[i].line, borderRadius:1 }} />
                <span style={{ fontSize:8, color:"#475569" }}>CDM ${p.cdm.reduce((a,b)=>a+b,0).toFixed(0)}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:14, height:1.5, background:"#7c3aed", borderRadius:1 }} />
                <span style={{ fontSize:8, color:"#475569" }}>Orch ${p.orch.reduce((a,b)=>a+b,0).toFixed(0)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const [view, setView]           = useState("overlay");

  useEffect(() => {
    fetch("./data.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ background:"#070c14", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:32, height:32, border:"2px solid #1e293b", borderTop:"2px solid #00d4ff",
          borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
        <div style={{ fontSize:11, color:"#475569", fontFamily:"monospace" }}>Loading dashboard…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ background:"#070c14", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#0c1220", border:"1px solid #f97316", borderRadius:10, padding:"24px 32px", textAlign:"center" }}>
        <div style={{ fontSize:14, color:"#f97316", fontFamily:"monospace", marginBottom:8 }}>⚠ Failed to load data.json</div>
        <div style={{ fontSize:11, color:"#475569", fontFamily:"monospace" }}>{error}</div>
        <div style={{ fontSize:10, color:"#334155", marginTop:12 }}>
          Run <code style={{ color:"#00d4ff" }}>python scripts/process_excel.py</code> to generate it.
        </div>
      </div>
    </div>
  );

  const { meta, dates, labels } = data;

  return (
    <div style={{ background:"#070c14", minHeight:"100vh", fontFamily:"'IBM Plex Mono','Courier New',monospace", color:"#e2e8f0", padding:"28px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <div style={{ width:2, height:20, background:"#f59e0b" }} />
          <span style={{ fontSize:9, color:"#475569", letterSpacing:3, textTransform:"uppercase" }}>
            df-dataplatform-nadara-prd · {meta.date_range}
          </span>
          <span style={{ fontSize:9, color:"#1e293b", marginLeft:"auto", fontFamily:"monospace" }}>
            generated {meta.generated} · {meta.source}
          </span>
        </div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#f1f5f9", letterSpacing:-0.5 }}>
          ADF Cost Dashboard · rg-dataplatform-prd
        </h1>
        <p style={{ margin:"4px 0 0", fontSize:11, color:"#475569" }}>
          7-day window · USD · Azure Data Factory v2
        </p>
      </div>

      {/* Stacked ADF chart */}
      <AdfStackedChart data={data} hoveredDate={hoveredDate} setHoveredDate={setHoveredDate} />

      {/* Divider */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ height:1, flex:1, background:"#1a2540" }} />
        <span style={{ fontSize:9, color:"#334155", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:2 }}>
          Top 5 Pipelines · Daily Evolution
        </span>
        <div style={{ height:1, flex:1, background:"#1a2540" }} />
      </div>

      {/* View toggle */}
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {[["overlay","Overlay"],["individual","Individual"]].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} style={{
            fontSize:10, padding:"5px 14px", borderRadius:4, cursor:"pointer",
            background: view===v ? "#f59e0b" : "transparent",
            color: view===v ? "#070c14" : "#475569",
            border:`1px solid ${view===v?"#f59e0b":"#1e293b"}`,
            fontFamily:"inherit", fontWeight:700, letterSpacing:1, transition:"all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {view === "overlay"
        ? <OverlayChart data={data} hoveredDate={hoveredDate} setHoveredDate={setHoveredDate}
            activeKey={activeKey} setActiveKey={setActiveKey} />
        : <IndividualCharts data={data} />
      }

      {/* Footer */}
      <div style={{ fontSize:9, color:"#1e293b", textAlign:"center", fontFamily:"monospace", paddingTop:8 }}>
        sub-dataplatform · rg-dataplatform-prd · source: {meta.source}
      </div>
    </div>
  );
}
