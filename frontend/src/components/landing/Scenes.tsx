// The landing page's illustrations: flat people, in eustatement's palette,
// each telling one part of how a statement travels. They loop on their own;
// what moves along a dashed line, and the line itself, are set up by
// useSceneMotion, which also pauses any scene that is off-screen.
//
// Every scene must read on its own when paused or with reduced motion on —
// the motion adds to the story, it does not carry it.

const STARS = 12;

/** A ring of twelve stars, as on the EU flag. */
function EuRing({ cx, cy, r, dot, className }: { cx: number; cy: number; r: number; dot: number; className?: string }) {
  return (
    <g className={className}>
      {Array.from({ length: STARS }, (_, i) => {
        const a = (i / STARS) * Math.PI * 2;
        return <circle key={i} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={dot / 2 + 0.4} className="f-gold" />;
      })}
    </g>
  );
}

/** A toothed wheel with a hub — the automatic checks. */
function Gear({ cx, cy, r, className }: { cx: number; cy: number; r: number; className: string }) {
  const teeth = Math.round(r / 2.2) + 2;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const rr = i % 2 ? r * 0.78 : r;
    for (const k of [i, i + 1]) {
      const a = (k / (teeth * 2)) * Math.PI * 2;
      points.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
    }
  }
  return (
    <g className={className}>
      <path d={`M${points.join('L')}Z`} className="f-accd" />
      <circle cx={cx} cy={cy} r={r * 0.32} className="f-acc" />
    </g>
  );
}

/** Faces and hair, drawn around a head centre at 0,0 with radius 15. Render once per page. */
export function SceneDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="lp-face" overflow="visible">
          <circle cx="-5" cy="0" r="1.8" fill="var(--face)"/><circle cx="5" cy="0" r="1.8" fill="var(--face)"/>
          <path d="M-3.6 5.5 Q0 8.6 3.6 5.5" fill="none" stroke="var(--face)" strokeWidth="1.5" strokeLinecap="round"/>
        </symbol>
        <symbol id="lp-hair-short" overflow="visible"><path fill="currentColor" d="M-16 -1 A16 16 0 0 1 16 -3 Q9 -12 -1 -8 Q-11 -6 -13 7 Z"/></symbol>
        <symbol id="lp-hair-long-back" overflow="visible"><path fill="currentColor" d="M-17 -2 A17 17 0 0 1 17 -2 L19 31 Q0 37 -19 31 Z"/></symbol>
        <symbol id="lp-hair-long-front" overflow="visible"><path fill="currentColor" d="M-15.6 -1 A15.6 15.6 0 0 1 15.6 -1 Q8 -10 0 -7 Q-8 -10 -15.6 -1Z"/></symbol>
        <symbol id="lp-hair-bun-back" overflow="visible"><circle cx="0" cy="-19" r="8" fill="currentColor"/></symbol>
        <symbol id="lp-hair-bun-front" overflow="visible"><path fill="currentColor" d="M-15.6 0 A15.6 15.6 0 0 1 15.6 0 Q8 -9 0 -8 Q-8 -9 -15.6 0Z"/></symbol>
      </defs>
    </svg>
  );
}

/** Hero: she fills in the statement on her phone; the form beside her is her screen, blown up. */
export function HeroScene() {
  return (
    <svg className="lp-art" viewBox="0 0 520 420" role="img" aria-label="A buyer fills in the end-user statement on her phone. The form, shown large beside her, fills in field by field; each field gets a green tick, a shield appears when her identity is verified, and the statement is sent.">
      <path className="f-blob" d="M58 250 C38 150 130 58 252 68 C372 78 482 120 492 232 C502 342 402 402 270 394 C140 386 78 342 58 250Z"/>
      <ellipse cx="310" cy="400" rx="205" ry="9" className="f-shadow"/>

      {/* her screen, blown up */}
      <path className="zoom" d="M164 268 L200 46 M164 306 L200 358"/>
      <g className="float-b">
        <rect x="200" y="46" width="262" height="312" rx="18" className="f-s2 s-line"/>
        <text x="224" y="78" className="t-cap">END-USER STATEMENT</text>
        <rect x="224" y="88" width="214" height="1.5" className="f-line"/>

        <text x="224" y="116" className="t-lab">Contact</text>
        <rect x="224" y="124" width="178" height="24" rx="6" className="f-s1 s-line"/>
        <rect x="233" y="134" width="108" height="5" rx="2.5" className="f-mid type h-type1"/>
        <g transform="translate(426 136)"><g className="pop h-tick1"><circle r="11" className="f-green"/><path className="glyph" d="M-5 0l3.5 3.5 6.5-7"/></g></g>

        <text x="224" y="168" className="t-lab">Company · VAT</text>
        <rect x="224" y="176" width="178" height="24" rx="6" className="f-s1 s-line"/>
        <rect x="233" y="186" width="132" height="5" rx="2.5" className="f-mid type h-type2"/>
        <g transform="translate(426 188)"><g className="pop h-tick2"><circle r="11" className="f-green"/><path className="glyph" d="M-5 0l3.5 3.5 6.5-7"/></g></g>

        <text x="224" y="220" className="t-lab">Substance</text>
        <rect x="224" y="228" width="178" height="24" rx="6" className="f-s1 s-line"/>
        <rect x="233" y="238" width="86" height="5" rx="2.5" className="f-mid type h-type3"/>
        <g transform="translate(426 240)"><g className="pop h-tick3"><circle r="11" className="f-green"/><path className="glyph" d="M-5 0l3.5 3.5 6.5-7"/></g></g>

        <text x="224" y="272" className="t-lab">Identity</text>
        <rect x="224" y="280" width="178" height="24" rx="6" className="f-s1 s-line"/>
        <rect x="232" y="285" width="11" height="14" rx="2" className="f-pass"/><circle cx="237.5" cy="291" r="2.6" className="f-gold"/>
        <rect x="250" y="290" width="70" height="5" rx="2.5" className="f-mid type h-type4"/>
        <g transform="translate(426 292)"><g className="pop h-tick4"><circle r="11" className="f-green"/><path className="glyph" d="M-5 0l3.5 3.5 6.5-7"/></g></g>

        {/* the field she is on */}
        <rect x="221" y="121" width="184" height="30" rx="8" fill="none" className="s-acc h-focus" strokeWidth="2"/>

        <g className="pop h-press">
          <rect x="224" y="318" width="214" height="26" rx="8" className="f-acc"/>
          <text x="331" y="335" textAnchor="middle" className="t-lab t-dark" style={{ fontSize: "10.5px", fontWeight: 700 }}>Send statement →</text>
        </g>
      </g>
      <mask id="lp-h-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="420">
          <path id="lp-h-route" d="M440 331 C470 322 492 284 500 236" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" className="trail" data-from="61" data-to="76" data-dur="7"/>
        </mask>
      <path className="dash" d="M440 331 C470 322 492 284 500 236" mask="url(#lp-h-mask)"/>
      <g className="mover" data-segs="lp-h-route:61:76" data-dur="7" data-rotate="1"><g className="h-plane"><path d="M12 0 L-10 -8 L-4 0 L-10 8 Z" className="f-paper"/><path d="M12 0 L-4 0 L-10 8 Z" className="f-pl"/></g></g>

      {/* shield: identity verified */}
      <g transform="translate(486 292)"><g className="pop h-tick4"><g className="float">
        <path d="M0 -22 L18 -14 V2 C18 14 9 21 0 25 C-9 21 -18 14 -18 2 V-14Z" className="f-acc"/>
        <path d="M-7 1 l4.5 4.5 L8 -5" fill="none" stroke="var(--bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </g></g></g>
      <EuRing className="spin" cx={478} cy={88} r={22} dot={3.2} />
      <g transform="translate(70 400)">
        <path d="M-15 -30 h30 l-4 30 h-22z" className="f-accd"/>
        <ellipse cx="-9" cy="-50" rx="7" ry="18" transform="rotate(-24 -9 -50)" className="f-leaf"/>
        <ellipse cx="9" cy="-52" rx="7" ry="19" transform="rotate(22 9 -52)" className="f-leaf"/>
        <ellipse cx="0" cy="-58" rx="6" ry="20" className="f-leaf"/>
      </g>
      <g transform="translate(110 150)"><path className="f-acc twinkle" d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2Z"/></g>
      <g transform="translate(486 196)"><path className="f-gold twinkle d1" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z"/></g>
      <g transform="translate(262 28)"><path className="f-acc twinkle d2" d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5Z"/></g>

      {/* buyer on her phone */}
      <g transform="translate(140 398)">
        <ellipse cx="0" cy="2" rx="34" ry="6" className="f-shadow"/>
        <rect x="-15" y="-80" width="13" height="76" rx="5" className="f-navy"/>
        <rect x="2" y="-80" width="13" height="76" rx="5" className="f-navy"/>
        <path d="M-19 -6h17v6h-21a4 4 0 0 1 4-6z" className="f-shoe"/>
        <path d="M2 -6h17a4 4 0 0 1 4 6h-21z" className="f-shoe"/>
        <use href="#lp-hair-long-back" x="0" y="-165" className="c-h1"/>
        <path d="M-22 -138 Q0 -146 22 -138 L25 -74 H-25Z" className="f-acc"/>
        <rect x="-5" y="-152" width="10" height="16" className="f-sk2"/>
        <circle cx="0" cy="-165" r="15" className="f-sk2"/>
        <use href="#lp-face" x="0" y="-163"/>
        <use href="#lp-hair-long-front" x="0" y="-165" className="c-h1"/>
        {/* her hands hold the phone from behind; we see its back and camera */}
        <path d="M-18 -134 L-18 -110 L2 -106" className="arm s-acc"/><circle cx="2" cy="-106" r="5.5" className="f-sk2"/>
        <path d="M18 -134 L30 -114 L25 -106" className="arm s-acc"/>
        <g className="h-thumb"><circle cx="25" cy="-106" r="5.5" className="f-sk2"/></g>
        <rect x="3" y="-130" width="22" height="38" rx="5" className="f-navy s-line"/>
        <rect x="6" y="-127" width="9" height="13" rx="3" className="f-s1"/>
        <circle cx="10.5" cy="-123.5" r="2.2" className="f-bg" stroke="var(--mid)" strokeWidth="0.8"/><circle cx="10.5" cy="-117.5" r="2.2" className="f-bg" stroke="var(--mid)" strokeWidth="0.8"/>
        <circle cx="14" cy="-104" r="2" className="f-line"/>
      </g>
    </svg>
  );
}

/** One statement from form to answer, with the four steps under it. */
export function RouteScene() {
  return (
    <div className="lp-art route-card">
      <svg className="route-svg" viewBox="0 0 1000 310" role="img" aria-label="A statement travels from the buyer at a laptop, past a robot that runs the checks, to a reviewer who approves it, and lands as an email on the buyer's phone.">
        <circle cx="125" cy="205" r="84" className="f-blob"/><circle cx="375" cy="205" r="84" className="f-blob"/>
        <circle cx="625" cy="205" r="84" className="f-blob"/><circle cx="875" cy="205" r="84" className="f-blob"/>
        <circle cx="125" cy="205" r="84" fill="none" className="s-acc ring r-win1" strokeWidth="2"/>
        <circle cx="375" cy="205" r="84" fill="none" className="s-acc ring r-win2" strokeWidth="2"/>
        <circle cx="625" cy="205" r="84" fill="none" className="s-acc ring r-win3" strokeWidth="2"/>
        <circle cx="875" cy="205" r="84" fill="none" className="s-acc ring r-win4" strokeWidth="2"/>
        <mask id="lp-r-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="310">
          <path id="lp-r-s1" d="M125,105 C210,30 290,30 375,105" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" className="trail" data-from="10.15" data-to="22.85" data-dur="13"/>
          <path id="lp-r-s2" d="M375,105 C460,30 540,30 625,105" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" className="trail" data-from="49.23" data-to="61.92" data-dur="13"/>
          <path id="lp-r-s3" d="M625,105 C710,30 790,30 875,105" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" className="trail" data-from="74.62" data-to="87.31" data-dur="13"/>
        </mask>
        <path className="dash flow" d="M125,105 C210,30 290,30 375,105 C460,30 540,30 625,105 C710,30 790,30 875,105" mask="url(#lp-r-mask)"/>
        <g className="r-pill1"><rect x="215" y="62" width="70" height="20" rx="10" className="pill"/><text x="250" y="75.5" textAnchor="middle" className="t-pill">statement</text></g>
        <g className="r-pill2"><rect x="450" y="62" width="100" height="20" rx="10" className="pill"/><text x="500" y="75.5" textAnchor="middle" className="t-pill">+ check results</text></g>
        <g className="r-pill3"><rect x="704" y="62" width="92" height="20" rx="10" className="pill"/><text x="750" y="75.5" textAnchor="middle" className="t-pill">decision, mailed</text></g>
        <ellipse cx="125" cy="292" rx="80" ry="6" className="f-shadow"/><ellipse cx="385" cy="292" rx="66" ry="6" className="f-shadow"/>
        <ellipse cx="625" cy="292" rx="80" ry="6" className="f-shadow"/><ellipse cx="863" cy="292" rx="36" ry="6" className="f-shadow"/>

        {/* 1 · buyer at a laptop; her hands type behind the screen */}
        <g transform="translate(125 152) scale(0.93)"><use href="#lp-hair-long-back" className="c-h2"/></g>
        <g className="r-typing"><path d="M104 186 L97 212 L106 230" className="arm s-acc"/><circle cx="107" cy="231" r="5" className="f-sk1"/></g>
        <g className="r-typing late"><path d="M146 186 L153 212 L144 230" className="arm s-acc"/><circle cx="143" cy="231" r="5" className="f-sk1"/></g>
        <path d="M101 238 L104 182 Q125 173 146 182 L149 238Z" className="f-acc"/>
        <rect x="120" y="162" width="10" height="16" className="f-sk1"/>
        <circle cx="125" cy="152" r="14" className="f-sk1"/>
        <g transform="translate(125 154) scale(0.93)"><use href="#lp-face"/></g>
        <g transform="translate(125 152) scale(0.93)"><use href="#lp-hair-long-front" className="c-h2"/></g>
        <rect x="94" y="194" width="62" height="42" rx="4" className="f-s2 s-line"/><circle cx="125" cy="214" r="4" className="f-line"/>
        <g className="r-win1">
          <rect x="146" y="120" width="40" height="20" rx="10" className="f-s2" stroke="var(--line)" strokeWidth="1.5"/>
          <circle cx="157" cy="130" r="2.6" className="f-mid typing-dot"/><circle cx="166" cy="130" r="2.6" className="f-mid typing-dot d2"/><circle cx="175" cy="130" r="2.6" className="f-mid typing-dot d3"/>
        </g>
        <rect x="55" y="236" width="140" height="8" rx="3" className="f-line"/>
        <rect x="66" y="244" width="6" height="46" className="f-line"/><rect x="178" y="244" width="6" height="46" className="f-line"/>

        {/* 2 · a robot reads the statement */}
        <rect x="320" y="150" width="90" height="138" rx="8" className="f-s2 s-line"/>
        <rect x="350" y="142" width="30" height="14" rx="4" className="f-mid"/>
        <text x="332" y="181.5" className="t-lab" style={{ fontSize: "10px" }}>Substance</text>
        <text x="332" y="209.5" className="t-lab" style={{ fontSize: "10px" }}>VAT</text>
        <text x="332" y="237.5" className="t-lab" style={{ fontSize: "10px" }}>Stated use</text>
        <text x="332" y="265.5" className="t-lab" style={{ fontSize: "10px" }}>Age 18+</text>
        <g transform="translate(394 178)"><g className="pop r-ck1"><circle r="7.5" className="f-green"/><path className="glyph" d="M-3.4 0l2.4 2.4 4.4-4.8" strokeWidth="2"/></g></g>
        <g transform="translate(394 206)"><g className="pop r-ck2"><circle r="7.5" className="f-green"/><path className="glyph" d="M-3.4 0l2.4 2.4 4.4-4.8" strokeWidth="2"/></g></g>
        <g transform="translate(394 234)"><g className="pop r-ck3"><circle r="7.5" className="f-amber"/><path className="glyph" d="M-2.6 4V-4 M-2.6 -4h5.4l-1.4 2 1.4 2h-5.4" strokeWidth="1.6"/></g></g>
        <g transform="translate(394 262)"><g className="pop r-ck4"><circle r="7.5" className="f-green"/><path className="glyph" d="M-3.4 0l2.4 2.4 4.4-4.8" strokeWidth="2"/></g></g>
        <g className="r-beam"><path d="M440 217 L382 172 L382 184 Z" className="f-acc" fillOpacity="0.28"/></g>
        <rect x="437" y="278" width="7" height="12" className="f-line"/><rect x="449" y="278" width="7" height="12" className="f-line"/>
        <path d="M430 248 L422 262" className="arm s-accd" strokeWidth="7"/><path d="M462 248 L470 262" className="arm s-accd" strokeWidth="7"/>
        <rect x="430" y="238" width="32" height="42" rx="7" className="f-s2 s-line"/>
        <circle cx="446" cy="256" r="3.5" className="f-acc"/>
        <path d="M446 204 V194" className="s-text" strokeWidth="2" strokeLinecap="round"/><circle cx="446" cy="192" r="3.5" className="f-acc"/>
        <rect x="428" y="204" width="36" height="28" rx="9" className="f-accd"/>
        <rect x="432" y="210" width="28" height="14" rx="6" className="f-bg"/>
        <g className="r-eye"><circle cx="440" cy="217" r="3" className="f-acc"/><circle cx="451" cy="217" r="3" className="f-acc"/></g>

        {/* 3 · reviewer approves it in the dashboard */}
        <g transform="translate(595 152) scale(0.93)"><use href="#lp-hair-bun-back" className="c-h1"/></g>
        <path d="M574 186 L567 212 L576 230" className="arm s-accd"/><path d="M616 186 L623 212 L614 230" className="arm s-accd"/>
        <path d="M571 238 L574 182 Q595 173 616 182 L619 238Z" className="f-accd"/>
        <rect x="590" y="162" width="10" height="16" className="f-sk3"/>
        <circle cx="595" cy="152" r="14" className="f-sk3"/>
        <g transform="translate(595 154) scale(0.93)"><use href="#lp-face"/></g>
        <g transform="translate(595 152) scale(0.93)"><use href="#lp-hair-bun-front" className="c-h1"/></g>
        <rect x="564" y="194" width="62" height="42" rx="4" className="f-s2 s-line"/><circle cx="595" cy="214" r="4" className="f-line"/>
        <g className="pop r-popup">
        <rect x="636" y="136" width="74" height="60" rx="8" className="f-s2 s-line"/>
        <g className="r-pending"><rect x="644" y="145" width="58" height="13" rx="6.5" className="f-amber"/><text x="673" y="154" textAnchor="middle" className="t-chip t-dark" style={{ fontSize: "6.5px" }}>PENDING</text></g>
        <g className="r-approved"><rect x="644" y="145" width="58" height="13" rx="6.5" className="f-green"/><text x="673" y="154" textAnchor="middle" className="t-chip t-dark" style={{ fontSize: "6.5px" }}>APPROVED</text></g>
        <g className="pop r-btn"><rect x="644" y="166" width="58" height="20" rx="6" className="f-green"/><text x="673" y="179" textAnchor="middle" className="t-chip t-dark">APPROVE</text></g>
        </g>
        <g className="r-cursor"><path d="M0 0 L0 15 L4 11 L7 17 L9.5 16 L6.5 10 L12 10 Z" className="f-paper" stroke="var(--bg)" strokeWidth="1"/></g>
        <rect x="545" y="236" width="160" height="8" rx="3" className="f-line"/>
        <rect x="556" y="244" width="6" height="46" className="f-line"/><rect x="688" y="244" width="6" height="46" className="f-line"/>

        {/* 4 · the email lands on the buyer's phone */}
        <g transform="translate(863 290) scale(0.93)">
          <rect x="-15" y="-80" width="13" height="76" rx="5" className="f-navy"/><rect x="2" y="-80" width="13" height="76" rx="5" className="f-navy"/>
          <path d="M-19 -6h17v6h-21a4 4 0 0 1 4-6z" className="f-shoe"/><path d="M2 -6h17a4 4 0 0 1 4 6h-21z" className="f-shoe"/>
          <use href="#lp-hair-long-back" x="0" y="-165" className="c-h2"/>
          <path d="M-18 -134 L-28 -106 L-20 -90" className="arm s-acc"/><circle cx="-20" cy="-88" r="5.5" className="f-sk1"/>
          <path d="M-22 -138 Q0 -146 22 -138 L25 -74 H-25Z" className="f-acc"/>
          <rect x="-5" y="-152" width="10" height="16" className="f-sk1"/>
          <circle cx="0" cy="-165" r="15" className="f-sk1"/>
          <use href="#lp-face" x="0" y="-163"/>
          <use href="#lp-hair-long-front" x="0" y="-165" className="c-h2"/>
          <path d="M18 -134 L30 -114 L23 -106" className="arm s-acc"/><circle cx="23" cy="-105" r="5.5" className="f-sk1"/>
          <rect x="4" y="-124" width="18" height="30" rx="4" className="f-navy s-line"/>
          <rect x="7" y="-121" width="7" height="10" rx="2.5" className="f-s1"/><circle cx="10.5" cy="-118.5" r="1.7" className="f-bg"/><circle cx="10.5" cy="-114" r="1.7" className="f-bg"/>
          <rect x="0" y="-128" width="26" height="38" rx="7" fill="none" stroke="var(--accent)" strokeWidth="2" className="r-glow"/>
        </g>
        <g transform="translate(920 112)"><g className="pop r-bubble">
          <rect x="-40" y="-14" width="80" height="28" rx="14" className="f-s2" stroke="var(--green)" strokeWidth="1.6"/>
          <text x="0" y="4.5" textAnchor="middle" className="t-lab t-green">✓ Approved</text>
        </g></g>

        {/* the travelling statement */}
        <g className="r-token mover" data-segs="lp-r-s1:10.15:22.85 lp-r-s2:49.23:61.92 lp-r-s3:74.62:87.31" data-dur="13" data-offset="0,-105" data-tail="90.69:875:83">
          <g className="r-doc">
            <rect x="-12" y="90" width="24" height="30" rx="3" className="f-paper"/>
            <rect x="-7" y="97" width="14" height="2.5" rx="1" className="f-pl"/><rect x="-7" y="103" width="14" height="2.5" rx="1" className="f-pl"/><rect x="-7" y="109" width="9" height="2.5" rx="1" className="f-pl"/>
          </g>
          <g className="r-env">
            <rect x="-16" y="94" width="32" height="22" rx="3" className="f-paper"/>
            <path d="M-16 96 L0 108 L16 96" fill="none" stroke="var(--paper-line)" strokeWidth="2" strokeLinejoin="round"/>
          </g>
        </g>
      </svg>

      <ol className="steps">
        <li><i className="bar" style={{ animation: "lps-r-win1 13s infinite" }}></i><span className="n">1</span><b>The buyer fills in your form</b><span>On your link or embedded in your shop, in their own language.</span></li>
        <li><i className="bar" style={{ animation: "lps-r-win2 13s infinite" }}></i><span className="n">2</span><b>Checks run on their own</b><span>Substance, VAT, stated use and identity, in seconds.</span></li>
        <li><i className="bar" style={{ animation: "lps-r-win3 13s infinite" }}></i><span className="n">3</span><b>Your team decides</b><span>Approve or deny with a reason, in one dashboard.</span></li>
        <li><i className="bar" style={{ animation: "lps-r-win4 13s infinite" }}></i><span className="n">4</span><b>The buyer gets the answer</b><span>By email, with a PDF copy when it is approved.</span></li>
      </ol>
    </div>
  );
}

/** Identity: the photos go to the verification provider and are deleted there; the seller only gets the result. */
export function IdentityScene() {
  return (
    <svg className="lp-art" viewBox="0 0 520 360" role="img" aria-label="A phone takes a selfie of the buyer holding her passport. The photo goes to the identity-verification provider, which checks it and then deletes it. The seller only receives a card: verified, the name, the document type and a masked document number.">
      <path className="f-blob" d="M40 210 C30 120 110 50 220 54 C330 58 470 70 492 180 C512 290 410 340 270 338 C130 336 50 300 40 210Z"/>
      <ellipse cx="120" cy="316" rx="50" ry="6" className="f-shadow"/>

      <mask id="lp-q-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="360">
        <path id="lp-q-r1" d="M174 185 L250 185" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" className="trail" data-from="6" data-to="22" data-dur="10"/>
        <path id="lp-q-r2" d="M330 185 L372 185" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" className="trail" data-from="50" data-to="60" data-dur="10"/>
      </mask>
      <path className="dash flow" d="M174 185 L250 185" mask="url(#lp-q-mask)"/>
      <path className="dash flow" d="M330 185 L372 185" mask="url(#lp-q-mask)"/>

      {/* the buyer's phone: a selfie with her passport */}
      <g className="float-b">
        <rect x="70" y="80" width="100" height="212" rx="18" className="f-navy s-line"/>
        <rect x="78" y="92" width="84" height="188" rx="11" className="f-s2"/>
        {/* selfie: head, neck and shoulders join up; her hand comes up from below holding the passport */}
        <g transform="translate(120 156) scale(1.3)"><use href="#lp-hair-long-back" className="c-h2"/></g>
        <rect x="114" y="168" width="12" height="26" rx="3" className="f-sk1"/>
        <path d="M82 236 C82 206 94 194 110 189 L130 189 C146 194 158 206 158 236 Z" className="f-acc"/>
        <path d="M113.5 189 L120 199 L126.5 189 Z" className="f-sk1"/>
        <circle cx="120" cy="156" r="19.5" className="f-sk1"/>
        <circle cx="100.5" cy="158" r="3.2" className="f-sk1"/><circle cx="139.5" cy="158" r="3.2" className="f-sk1"/>
        <g transform="translate(120 159) scale(1.3)"><use href="#lp-face"/></g>
        <g transform="translate(120 156) scale(1.3)"><use href="#lp-hair-long-front" className="c-h2"/></g>
        <path d="M156 240 L148 230 L139 222" className="arm s-acc" strokeWidth="12"/>
        <rect x="128" y="188" width="26" height="34" rx="3" className="f-pass"/>
        <circle cx="141" cy="201" r="5" fill="none" stroke="var(--gold)" strokeWidth="1.6"/><rect x="135" y="211" width="12" height="2" rx="1" className="f-gold"/>
        <circle cx="138" cy="221" r="6" className="f-sk1"/>
        <path d="M90 136 V126 H100 M140 126 H150 V136 M90 186 V196 H100 M150 186 V196 H140" fill="none" className="s-acc" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="106" y="97" width="28" height="6" rx="3" className="f-navy"/>
        <rect x="78" y="236" width="84" height="44" className="f-s2"/>
        <circle cx="120" cy="260" r="11" className="f-paper"/><circle cx="120" cy="260" r="8" fill="none" stroke="var(--surface-2)" strokeWidth="1.5"/>
        <rect x="78" y="92" width="84" height="188" rx="11" className="f-paper q-flash"/>
      </g>

      {/* the verification provider */}
      <g transform="translate(290 185)"><g className="pop q-pulse">
        <path d="M0 -42 L34 -28 V0 C34 25 18 38 0 44 C-18 38 -34 25 -34 0 V-28Z" className="f-accd"/>
        <circle cx="0" cy="-8" r="9" className="f-pl"/><path d="M-15 20 a15 12 0 0 1 30 0z" className="f-pl"/>
      </g></g>
      <rect x="262" y="152" width="56" height="2.5" rx="1" className="f-acc q-scan"/>
      <g transform="translate(320 150)"><g className="pop q-ok"><circle r="11" className="f-green"/><path className="glyph" d="M-5 0l3.5 3.5 6.5-7"/></g></g>
      <g transform="translate(290 185)">
        <rect x="-7" y="-5" width="10" height="8" rx="1.5" className="f-paper q-bit b1"/>
        <rect x="0" y="-6" width="9" height="7" rx="1.5" className="f-pass q-bit b2"/>
        <rect x="-4" y="-2" width="8" height="8" rx="1.5" className="f-pl q-bit b3"/>
      </g>
      <text x="290" y="250" textAnchor="middle" className="t-lab">ID check</text>
      <text x="290" y="266" textAnchor="middle" className="t-sub q-gone">photos deleted</text>

      {/* what the seller receives */}
      <g className="pop q-card">
        <rect x="378" y="130" width="128" height="112" rx="12" className="f-paper"/>
        <circle cx="398" cy="152" r="10" className="f-green"/><path d="M393.5 152 l3 3 5.5-6" fill="none" stroke="var(--paper)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="414" y="156.5" style={{ fontSize: "13px", fontWeight: 800 }} fill="#12141a">Verified</text>
        <rect x="390" y="171" width="104" height="1.2" className="f-pl"/>
        <text x="390" y="192" style={{ fontSize: "12px", fontWeight: 600 }} fill="#12141a">Jane Doe</text>
        <text x="390" y="210" style={{ fontSize: "10.5px" }} fill="#5a6070">Passport · NL</text>
        <text x="390" y="227" style={{ fontSize: "10.5px", fontVariantNumeric: "tabular-nums" }} fill="#5a6070">No. ••••• 4821</text>
      </g>

      {/* travellers */}
      <g className="mover" data-segs="lp-q-r1:6:22" data-dur="10"><g className="q-photo"><rect x="-15" y="-11" width="30" height="22" rx="3" className="f-paper"/><circle cx="-6" cy="-2" r="4" className="f-pl"/><rect x="2" y="-6" width="9" height="12" rx="1.5" className="f-pass"/></g></g>
      <g className="mover" data-segs="lp-q-r2:50:60" data-dur="10"><g className="q-res"><rect x="-14" y="-10" width="28" height="20" rx="4" className="f-paper"/><circle cx="-5" cy="0" r="5" className="f-green"/><path d="M-7.2 0 l1.6 1.6 3 -3.2" fill="none" stroke="var(--paper)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></g></g>
    </svg>
  );
}

/** The checklist rows. Drawn twice: once on the clipboard and once, enlarged,
 *  inside the magnifier — a real second copy rather than an SVG <use>, because
 *  a <use> clone does not pick up the page's scoped styles (it rendered black)
 *  or run the rows' own animations. */
function ChecksRows() {
  return (
    <g>
      <g transform="translate(186 105)"><circle r="17" className="f-soft"/><path className="icon s-acc" d="M-4 -9 h8 M-2.5 -9 v6 l-6.5 10 a2 2 0 0 0 1.7 3 h14.6 a2 2 0 0 0 1.7 -3 l-6.5 -10 v-6"/></g>
      <text x="214" y="101" className="t-row">Substance</text><text x="214" y="117" className="t-sub">Annex I &amp; II, 2019/1148</text>
      <g transform="translate(186 165)"><circle r="17" className="f-soft"/><EuRing cx={0} cy={0} r={9} dot={1.7} /></g>
      <text x="214" y="161" className="t-row">VAT number</text><text x="214" y="177" className="t-sub">EU VIES register</text>
      <g transform="translate(186 225)"><circle r="17" className="f-soft"/><path className="icon s-acc" d="M-9 -7 h18 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 h-9 l-5 4 v-4 h-4 a2 2 0 0 1 -2 -2 v-9 a2 2 0 0 1 2 -2z"/></g>
      <text x="214" y="221" className="t-row">Intended use</text>
      <text x="214" y="237" className="t-sub c-subA">Screened for warning signs</text>
      <text x="214" y="237" className="t-sub t-amber c-subB" style={{ fontWeight: 600 }}>“…to make explosives”</text>
      <g transform="translate(186 285)"><circle r="17" className="f-soft"/><text x="0" y="4" textAnchor="middle" className="t-acc" style={{ fontSize: "11px", fontWeight: 800 }}>18+</text></g>
      <text x="214" y="281" className="t-row">Age</text><text x="214" y="297" className="t-sub">From the ID document</text>
      <rect x="170" y="134" width="222" height="1.5" className="f-line"/><rect x="170" y="194" width="222" height="1.5" className="f-line"/><rect x="170" y="254" width="222" height="1.5" className="f-line"/>

    </g>
  );
}

/** Checks: each row is read; one raises a flag with its reason. */
export function ChecksScene() {
  return (
    <svg className="lp-art" viewBox="0 0 520 360" role="img" aria-label="A clipboard lists four checks: substance, VAT number, intended use and age. A magnifying glass reads each row; three get a green tick and intended use gets an amber flag with its reason. A reviewer points at the flag.">
      <path className="f-blob" d="M60 200 C40 110 120 40 250 44 C380 48 488 96 494 200 C500 300 400 344 260 340 C120 336 76 290 60 200Z"/>
      <ellipse cx="300" cy="338" rx="170" ry="7" className="f-shadow"/>

      <rect x="150" y="40" width="262" height="290" rx="16" className="f-s2 s-line"/>
      <rect x="236" y="28" width="90" height="26" rx="8" className="f-mid"/>
      <circle cx="281" cy="34" r="4" className="f-s2"/>

      <ChecksRows />

      <g transform="translate(378 105)"><g className="pop c-ck1"><circle r="13" className="f-green"/><path className="glyph" d="M-5.5 0l3.8 3.8 7-7.6"/></g></g>
      <g transform="translate(378 165)"><g className="pop c-ck2"><circle r="13" className="f-green"/><path className="glyph" d="M-5.5 0l3.8 3.8 7-7.6"/></g></g>
      <g transform="translate(378 225)"><g className="pop c-ck3"><circle r="13" className="f-amber"/><path className="glyph" d="M-4 6.5V-6.5 M-4 -6.5h8.5l-2 3.2 2 3.2h-8.5" strokeWidth="2.2"/></g></g>
      <g transform="translate(378 285)"><g className="pop c-ck4"><circle r="13" className="f-green"/><path className="glyph" d="M-5.5 0l3.8 3.8 7-7.6"/></g></g>

      {/* magnifier: brass-free, in the palette; it scans each row from side to side */}
      <clipPath id="lp-c-lens"><circle r="16"/></clipPath>
      <g className="c-mag"><g transform="translate(262 108)"><g className="c-scan"><g transform="scale(1.25)">
        <ellipse cx="6" cy="30" rx="18" ry="4" className="f-shadow" opacity="0.6"/>
        <g transform="rotate(-45)">
          <rect x="-4" y="18" width="8" height="8" rx="1.5" className="f-mid"/>
          <rect x="-6" y="25" width="12" height="30" rx="6" className="f-navy" stroke="var(--line)" strokeWidth="1.2"/>
          <rect x="-2" y="31" width="4" height="18" rx="2" className="f-accd"/>
        </g>
        {/* the glass shows the rows enlarged: undo the lens's own movement, scale, then draw the rows */}
        <g clipPath="url(#lp-c-lens)">
          <circle r="16" className="f-s2"/>
          <g className="c-scan-inv"><g className="c-mag-inv"><g transform="translate(-262 -108)"><ChecksRows /></g></g></g>
        </g>
        <circle r="18" fill="var(--paper)" fillOpacity="0.08"/>
        <circle r="18" fill="none" stroke="var(--accent-deep)" strokeWidth="6"/>
        <circle r="14.5" fill="none" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="1.2"/>
        <path d="M-10 -5 A11 11 0 0 1 -4 -11" fill="none" stroke="var(--paper)" strokeOpacity="0.85" strokeWidth="2.6" strokeLinecap="round"/>
        <circle cx="-11" cy="0.5" r="1.4" fill="var(--paper)" fillOpacity="0.85"/>
      </g></g></g></g>

      {/* reviewer, pointing at the flag once it appears */}
      <g transform="translate(466 336) scale(0.86)">
        <rect x="-15" y="-80" width="13" height="76" rx="5" className="f-navy"/><rect x="2" y="-80" width="13" height="76" rx="5" className="f-navy"/>
        <path d="M-19 -6h17v6h-21a4 4 0 0 1 4-6z" className="f-shoe"/><path d="M2 -6h17a4 4 0 0 1 4 6h-21z" className="f-shoe"/>
        <path d="M18 -134 L28 -106 L20 -90" className="arm s-accd"/><circle cx="20" cy="-88" r="5.5" className="f-sk3"/>
        <path d="M-22 -138 Q0 -146 22 -138 L25 -74 H-25Z" className="f-accd"/>
        <rect x="-5" y="-152" width="10" height="16" className="f-sk3"/>
        <circle cx="0" cy="-165" r="15" className="f-sk3"/>
        <use href="#lp-face" x="0" y="-163"/>
        <use href="#lp-hair-short" x="0" y="-165" className="c-h1"/>
      </g>
      <g className="c-point">
        <path d="M450.5 220.8 L424.7 227.7 L398 226" className="arm s-accd" strokeWidth="9.5"/><circle cx="397" cy="226" r="4.7" className="f-sk3"/>
      </g>
      <g transform="translate(470 54)"><path className="f-gold twinkle" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z"/></g>
    </svg>
  );
}

/** Decision: the flag lands in a reviewer's queue, she approves, the buyer is emailed. */
export function DecisionScene() {
  return (
    <svg className="lp-art" viewBox="0 0 520 360" role="img" aria-label="Automatic checks send an amber flag into the reviewer's queue. She thinks it over and clicks Approve, the queue switches from pending to approved, and an email lands on the buyer's phone.">
      <path className="f-blob" d="M36 196 C30 110 120 46 250 50 C380 54 486 96 494 196 C502 296 404 340 266 338 C128 336 42 282 36 196Z"/>
      <ellipse cx="265" cy="338" rx="150" ry="7" className="f-shadow"/><ellipse cx="462" cy="338" rx="30" ry="5" className="f-shadow"/>
      <Gear className="gear-a" cx={64} cy={92} r={20} />
      <Gear className="gear-b" cx={94} cy={124} r={13} />
      <text x="80" y="162" textAnchor="middle" className="t-sub">automatic checks</text>
      <mask id="lp-d-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="360">
        <path id="lp-d-route" d="M104 116 C160 70 220 70 284 80" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" className="trail" data-from="4" data-to="26" data-dur="9"/>
        <path id="lp-d-route2" d="M364 100 C440 100 506 196 478 246" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" className="trail" data-from="62" data-to="84" data-dur="9"/>
      </mask>
      <path className="dash flow" d="M104 116 C160 70 220 70 284 80" mask="url(#lp-d-mask)"/>
      <path className="dash flow" d="M364 100 C440 100 506 196 478 246" mask="url(#lp-d-mask)"/>

      {/* her queue, shown large */}
      <g className="pop d-card">
      <rect x="150" y="30" width="212" height="104" rx="12" className="f-s2 s-line"/>
      <g className="pop d-btn"><rect x="168" y="102" width="64" height="20" rx="6" className="f-green"/><text x="200" y="115" textAnchor="middle" className="t-chip t-dark">APPROVE</text></g>
      <rect x="240" y="102" width="52" height="20" rx="6" fill="none" className="s-line"/><text x="266" y="115" textAnchor="middle" className="t-chip" fill="var(--mid)">DENY</text>
      <text x="168" y="52" className="t-cap">REVIEW QUEUE</text>
      <rect x="168" y="60" width="176" height="1.5" className="f-line"/>
      <text x="168" y="84" className="t-lab">ORD-2481 · Acme</text>
      <g className="d-pending"><rect x="300" y="72" width="50" height="16" rx="8" className="f-amber"/><text x="325" y="82.5" textAnchor="middle" className="t-chip t-dark" style={{ fontSize: "6.5px" }}>PENDING</text></g>
      <g className="d-approved"><rect x="300" y="72" width="50" height="16" rx="8" className="f-green"/><text x="325" y="82.5" textAnchor="middle" className="t-chip t-dark" style={{ fontSize: "6.5px" }}>APPROVED</text></g>
      </g>

      {/* monitor, turned towards her */}
      <rect x="150" y="184" width="56" height="52" rx="4" className="f-s2 s-line"/>
      <rect x="160" y="196" width="36" height="2" rx="1" className="f-line"/><rect x="160" y="202" width="36" height="2" rx="1" className="f-line"/>
      <rect x="174" y="236" width="8" height="14" className="f-line"/><rect x="162" y="246" width="32" height="5" rx="2" className="f-line"/>

      {/* reviewer */}
      <path d="M232 196 L222 224 L228 246" className="arm s-acc"/>
      <path d="M226 250 L229 192 Q250 183 271 192 L274 250Z" className="f-acc"/>
      <rect x="245" y="172" width="10" height="16" className="f-sk2"/>
      <circle cx="250" cy="162" r="14" className="f-sk2"/>
      <g transform="translate(250 164) scale(0.93)"><use href="#lp-face"/></g>
      <g transform="translate(250 162) scale(0.93)"><use href="#lp-hair-short" className="c-h1"/></g>
      <circle cx="228" cy="246" r="5" className="f-sk2"/>
      <g transform="translate(212 152)"><g className="pop d-think">
        <circle r="16" className="f-s2" stroke="var(--line)" strokeWidth="1.5"/>
        <text x="0" y="6" textAnchor="middle" className="t-acc" style={{ fontSize: "17px", fontWeight: 800 }}>?</text>
        <circle cx="20" cy="18" r="4" className="f-s2" stroke="var(--line)" strokeWidth="1.5"/><circle cx="30" cy="28" r="2.5" className="f-s2" stroke="var(--line)" strokeWidth="1.5"/>
      </g></g>

      {/* her hand on the mouse; the cursor clicks Approve */}
      <path d="M268 196 L284 224 L298 242" className="arm s-acc"/>
      <rect x="292" y="241" width="18" height="9" rx="4.5" className="f-mid"/>
      <g className="d-click"><circle cx="299" cy="243" r="5" className="f-sk2"/></g>
      <g className="d-cursor"><path d="M0 0 L0 15 L4 11 L7 17 L9.5 16 L6.5 10 L12 10 Z" className="f-paper" stroke="var(--bg)" strokeWidth="1"/></g>
      <rect x="130" y="250" width="270" height="10" rx="3" className="f-line"/>
      <rect x="142" y="260" width="7" height="76" className="f-line"/><rect x="381" y="260" width="7" height="76" className="f-line"/>

      {/* buyer receiving the decision */}
      <g transform="translate(462 336) scale(0.8)">
        <rect x="-15" y="-80" width="13" height="76" rx="5" className="f-navy"/><rect x="2" y="-80" width="13" height="76" rx="5" className="f-navy"/>
        <path d="M-19 -6h17v6h-21a4 4 0 0 1 4-6z" className="f-shoe"/><path d="M2 -6h17a4 4 0 0 1 4 6h-21z" className="f-shoe"/>
        <use href="#lp-hair-long-back" x="0" y="-165" className="c-h2"/>
        <path d="M-18 -134 L-28 -106 L-20 -90" className="arm s-acc"/><circle cx="-20" cy="-88" r="5.5" className="f-sk1"/>
        <path d="M-22 -138 Q0 -146 22 -138 L25 -74 H-25Z" className="f-acc"/>
        <rect x="-5" y="-152" width="10" height="16" className="f-sk1"/>
        <circle cx="0" cy="-165" r="15" className="f-sk1"/>
        <use href="#lp-face" x="0" y="-163"/>
        <use href="#lp-hair-long-front" x="0" y="-165" className="c-h2"/>
        <path d="M18 -134 L30 -114 L23 -106" className="arm s-acc"/><circle cx="23" cy="-105" r="5.5" className="f-sk1"/>
        <rect x="4" y="-124" width="18" height="30" rx="4" className="f-navy s-line"/>
        <rect x="7" y="-121" width="7" height="10" rx="2.5" className="f-s1"/><circle cx="10.5" cy="-118.5" r="1.7" className="f-bg"/><circle cx="10.5" cy="-114" r="1.7" className="f-bg"/>
        <rect x="0" y="-128" width="26" height="38" rx="7" fill="none" stroke="var(--accent)" strokeWidth="2" className="d-glow"/>
      </g>
      <g transform="translate(466 172)"><g className="pop d-bubble">
        <rect x="-40" y="-13" width="80" height="26" rx="13" className="f-s2" stroke="var(--green)" strokeWidth="1.6"/>
        <text x="0" y="4" textAnchor="middle" className="t-lab t-green">✓ Approved</text>
      </g></g>

      {/* travellers */}
      <g className="mover" data-segs="lp-d-route:4:26" data-dur="9">
        <g className="pop d-flag-env"><rect x="-10" y="-13" width="20" height="26" rx="2.5" className="f-paper"/><rect x="-6" y="-7" width="12" height="2.2" rx="1" className="f-pl"/><rect x="-6" y="-2" width="12" height="2.2" rx="1" className="f-pl"/><rect x="-6" y="3" width="8" height="2.2" rx="1" className="f-pl"/></g>
        <g className="pop d-flag-chip"><rect x="-13" y="-10" width="26" height="20" rx="10" className="f-amber"/><path d="M-4 6 V-6 M-4 -6 h9 l-2 3 2 3 h-9" fill="none" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></g>
      </g>
      <g className="mover" data-segs="lp-d-route2:62:84" data-dur="9"><g className="d-mail"><rect x="-14" y="-10" width="28" height="20" rx="3" className="f-paper"/><path d="M-14 -8 L0 2 L14 -8" fill="none" stroke="var(--paper-line)" strokeWidth="2" strokeLinejoin="round"/></g></g>
      <g transform="translate(486 40)"><path className="f-acc twinkle d1" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z"/></g>
    </svg>
  );
}

/** 404: she follows the link from her phone, and where the form should be there is only its outline. */
export function LostScene() {
  return (
    <svg className="lp-art" viewBox="0 0 520 360" role="img" aria-label="A buyer taps a link on her phone. It travels along a dashed line to where the form should be, but there is only an empty outline with a question mark, and she is left wondering.">
      <path className="f-blob" d="M44 204 C34 118 120 50 246 52 C372 54 484 96 494 200 C504 302 402 344 266 340 C130 336 54 290 44 204Z"/>
      <ellipse cx="130" cy="338" rx="34" ry="6" className="f-shadow"/>
      <ellipse cx="375" cy="338" rx="118" ry="7" className="f-shadow"/>

      {/* where the form should be: only its outline, rows and all */}
      <g className="float-b">
        <rect x="270" y="50" width="210" height="250" rx="16" className="n-frame"/>
        <text x="294" y="82" className="t-cap">404</text>
        <rect x="294" y="92" width="162" height="1.5" className="f-line"/>
        <rect x="294" y="110" width="140" height="22" rx="6" className="n-ghost"/>
        <rect x="294" y="146" width="162" height="22" rx="6" className="n-ghost"/>
        <rect x="294" y="182" width="116" height="22" rx="6" className="n-ghost"/>
        <g transform="translate(375 252)"><g className="pop n-q">
          <circle r="24" className="f-soft"/>
          <circle r="24" fill="none" className="s-acc" strokeWidth="2"/>
          <text x="0" y="8" textAnchor="middle" className="t-acc" style={{ fontSize: "24px", fontWeight: 800 }}>?</text>
        </g></g>
      </g>

      {/* the link, from her phone to the empty outline */}
      <mask id="lp-n-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="360">
        <path id="lp-n-route" d="M162 200 C188 124 226 108 266 128" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" className="trail" data-from="10" data-to="40" data-dur="8"/>
      </mask>
      <path className="dash flow" d="M162 200 C188 124 226 108 266 128" mask="url(#lp-n-mask)"/>
      <g className="mover" data-segs="lp-n-route:10:40" data-dur="8" data-rotate="1"><g className="n-plane"><path d="M12 0 L-10 -8 L-4 0 L-10 8 Z" className="f-paper"/><path d="M12 0 L-4 0 L-10 8 Z" className="f-pl"/></g></g>

      <g transform="translate(45 336)">
        <path d="M-15 -30 h30 l-4 30 h-22z" className="f-accd"/>
        <ellipse cx="-9" cy="-50" rx="7" ry="18" transform="rotate(-24 -9 -50)" className="f-leaf"/>
        <ellipse cx="9" cy="-52" rx="7" ry="19" transform="rotate(22 9 -52)" className="f-leaf"/>
        <ellipse cx="0" cy="-58" rx="6" ry="20" className="f-leaf"/>
      </g>
      <g transform="translate(500 40)"><path className="f-gold twinkle" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z"/></g>
      <g transform="translate(222 46)"><path className="f-acc twinkle d1" d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5Z"/></g>

      {/* buyer on her phone; her hands hold it from behind, so we see its back */}
      <g transform="translate(130 336) scale(0.95)">
        <rect x="-15" y="-80" width="13" height="76" rx="5" className="f-navy"/>
        <rect x="2" y="-80" width="13" height="76" rx="5" className="f-navy"/>
        <path d="M-19 -6h17v6h-21a4 4 0 0 1 4-6z" className="f-shoe"/>
        <path d="M2 -6h17a4 4 0 0 1 4 6h-21z" className="f-shoe"/>
        <use href="#lp-hair-long-back" x="0" y="-165" className="c-h1"/>
        <path d="M-22 -138 Q0 -146 22 -138 L25 -74 H-25Z" className="f-acc"/>
        <rect x="-5" y="-152" width="10" height="16" className="f-sk2"/>
        <circle cx="0" cy="-165" r="15" className="f-sk2"/>
        <use href="#lp-face" x="0" y="-163"/>
        <use href="#lp-hair-long-front" x="0" y="-165" className="c-h1"/>
        <path d="M-18 -134 L-18 -110 L2 -106" className="arm s-acc"/><circle cx="2" cy="-106" r="5.5" className="f-sk2"/>
        <path d="M18 -134 L30 -114 L25 -106" className="arm s-acc"/>
        <g className="n-thumb"><circle cx="25" cy="-106" r="5.5" className="f-sk2"/></g>
        <rect x="3" y="-130" width="22" height="38" rx="5" className="f-navy s-line"/>
        <rect x="6" y="-127" width="9" height="13" rx="3" className="f-s1"/>
        <circle cx="10.5" cy="-123.5" r="2.2" className="f-bg" stroke="var(--mid)" strokeWidth="0.8"/><circle cx="10.5" cy="-117.5" r="2.2" className="f-bg" stroke="var(--mid)" strokeWidth="0.8"/>
        <circle cx="14" cy="-104" r="2" className="f-line"/>
      </g>
      <g transform="translate(86 126)"><g className="pop n-think">
        <circle r="16" className="f-s2" stroke="var(--line)" strokeWidth="1.5"/>
        <text x="0" y="6" textAnchor="middle" className="t-acc" style={{ fontSize: "17px", fontWeight: 800 }}>?</text>
        <circle cx="16" cy="20" r="4" className="f-s2" stroke="var(--line)" strokeWidth="1.5"/><circle cx="24" cy="30" r="2.5" className="f-s2" stroke="var(--line)" strokeWidth="1.5"/>
      </g></g>
    </svg>
  );
}
