const surfacePins: Array<{ cx: number; cy: number; r: number; delay: number }> = [
  { cx: 318, cy: 198, r: 3.2, delay: 0 },
  { cx: 215, cy: 312, r: 2.6, delay: 0.6 },
  { cx: 352, cy: 296, r: 2.4, delay: 1.1 },
  { cx: 198, cy: 232, r: 2.2, delay: 1.6 },
  { cx: 286, cy: 360, r: 2.4, delay: 0.3 },
  { cx: 244, cy: 178, r: 2.0, delay: 1.9 },
];

export function HomeGlobeVisual() {
  return (
    <div className="home-globe-visual" aria-hidden="true">
      <div className="home-globe-aura" />
      <svg
        className="home-globe-svg"
        viewBox="0 0 520 520"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="hg-sphere-fill" cx="42%" cy="38%" r="68%">
            <stop offset="0%" stopColor="rgba(73,181,106,0.22)" />
            <stop offset="38%" stopColor="rgba(18,53,90,0.55)" />
            <stop offset="100%" stopColor="rgba(2,10,22,0.95)" />
          </radialGradient>

          <radialGradient id="hg-sphere-rim" cx="50%" cy="50%" r="50%">
            <stop offset="86%" stopColor="rgba(120,220,160,0)" />
            <stop offset="98%" stopColor="rgba(120,220,160,0.45)" />
            <stop offset="100%" stopColor="rgba(120,220,160,0)" />
          </radialGradient>

          <linearGradient id="hg-orbit-fade-a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(120,220,160,0)" />
            <stop offset="55%" stopColor="rgba(120,220,160,0.85)" />
            <stop offset="100%" stopColor="rgba(120,220,160,0)" />
          </linearGradient>

          <linearGradient id="hg-orbit-fade-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(120,220,205,0)" />
            <stop offset="55%" stopColor="rgba(120,220,205,0.55)" />
            <stop offset="100%" stopColor="rgba(120,220,205,0)" />
          </linearGradient>

          <radialGradient id="hg-node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(180,255,210,1)" />
            <stop offset="40%" stopColor="rgba(76,199,130,0.85)" />
            <stop offset="100%" stopColor="rgba(76,199,130,0)" />
          </radialGradient>
        </defs>

        <g className="hg-spin hg-spin-c">
          <circle
            cx="260"
            cy="260"
            r="246"
            fill="none"
            stroke="rgba(221,248,232,0.14)"
            strokeWidth="1"
            strokeDasharray="1 7"
          />
        </g>

        <g className="hg-spin hg-spin-b">
          <circle
            cx="260"
            cy="260"
            r="222"
            fill="none"
            stroke="url(#hg-orbit-fade-b)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="210 700"
          />
          <circle cx="482" cy="260" r="3.6" fill="rgba(180,255,210,0.95)" />
          <circle cx="482" cy="260" r="9" fill="url(#hg-node-glow)" opacity="0.75" />
        </g>

        <g className="hg-spin hg-spin-a">
          <circle
            cx="260"
            cy="260"
            r="200"
            fill="none"
            stroke="url(#hg-orbit-fade-a)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="80 700"
          />
          <circle cx="460" cy="260" r="4.4" fill="rgba(190,255,215,1)" />
          <circle cx="460" cy="260" r="11" fill="url(#hg-node-glow)" opacity="0.85" />
        </g>

        <g className="hg-globe">
          <circle cx="260" cy="260" r="160" fill="url(#hg-sphere-fill)" />
          <circle cx="260" cy="260" r="160" fill="url(#hg-sphere-rim)" />

          <g className="hg-graticule">
            <ellipse cx="260" cy="260" rx="160" ry="46" />
            <ellipse cx="260" cy="260" rx="160" ry="96" />
            <ellipse cx="260" cy="260" rx="160" ry="132" />
            <line x1="100" y1="260" x2="420" y2="260" />

            <ellipse cx="260" cy="260" rx="46" ry="160" />
            <ellipse cx="260" cy="260" rx="96" ry="160" />
            <ellipse cx="260" cy="260" rx="132" ry="160" />
            <line x1="260" y1="100" x2="260" y2="420" />
          </g>

          <circle
            cx="260"
            cy="260"
            r="160"
            fill="none"
            stroke="rgba(180,255,210,0.55)"
            strokeWidth="1.2"
          />

          <g className="hg-pins">
            {surfacePins.map((pin, idx) => (
              <g
                key={idx}
                className="hg-pin"
                style={{ animationDelay: `${pin.delay}s` }}
              >
                <circle cx={pin.cx} cy={pin.cy} r={pin.r * 2.6} fill="url(#hg-node-glow)" />
                <circle cx={pin.cx} cy={pin.cy} r={pin.r} fill="rgba(200,255,215,1)" />
              </g>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
