// Paint and motion for the landing illustrations (Scenes.tsx). Everything is
// scoped under .lp-art; colours come from the tokens on .lp-root.
//
// The route (RouteScene) runs on a 13-second loop: the robot gets about three
// and a half seconds to read the statement.
export const sceneStyles = `
/* Each scene fills its box */
.lp-art { display: block; width: 100%; height: auto; }
.lp-art.route-card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 20px 20px 24px; }
.lp-art .route-svg { display: block; width: 100%; height: auto; }
/* The four steps under the route; each bar lights up with its station */
.lp-art .steps { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.lp-art .steps li { display: grid; gap: 4px; padding-top: 12px; position: relative; min-width: 0; }
.lp-art .steps li::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--line); border-radius: 2px; }
.lp-art .steps .bar { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--accent); border-radius: 2px; opacity: 0; }
.lp-art .steps b { font-size: 15px; font-weight: 600; color: var(--text); }
.lp-art .steps span { font-size: 14px; line-height: 1.55; color: var(--mid); }
.lp-art .steps .n { font-size: 12px; font-weight: 700; color: var(--accent); letter-spacing: 0.1em; font-variant-numeric: tabular-nums; }
@media (max-width: 860px) { .lp-art .steps { grid-template-columns: 1fr 1fr; row-gap: 16px; } }
/* On a phone the four stations would be tiny side by side. The drawing is
   shown 2.5 times as wide and the view follows the statement from station to
   station, on the same 13-second loop. */
@keyframes lps-r-cam { 0%, 10.15% { transform: translateX(0); } 22.85%, 49.23% { transform: translateX(-17.5%); } 61.92%, 74.62% { transform: translateX(-42.5%); } 87.31%, 96% { transform: translateX(-60%); } 100% { transform: translateX(0); } }
@media (max-width: 640px) {
  .lp-art.route-card { overflow: hidden; }
  .lp-art .route-svg { width: 250%; max-width: none; animation: lps-r-cam 13s ease-in-out infinite; }
}
@media (max-width: 640px) and (prefers-reduced-motion: reduce) {
  .lp-art .route-svg { width: 100%; }
}
/* ---------- SVG paint ---------- */
.lp-art .f-s1 { fill: var(--surface); }
.lp-art .f-s2 { fill: var(--surface-2); }
.lp-art .f-line { fill: var(--line); }
.lp-art .f-blob { fill: var(--blob); }
.lp-art .f-acc { fill: var(--accent); }
.lp-art .f-accd { fill: var(--accent-deep); }
.lp-art .f-soft { fill: var(--accent-soft); }
.lp-art .f-green { fill: var(--green); }
.lp-art .f-amber { fill: var(--amber); }
.lp-art .f-red { fill: var(--red); }
.lp-art .f-paper { fill: var(--paper); }
.lp-art .f-pl { fill: var(--paper-line); }
.lp-art .f-mid { fill: var(--mid); }
.lp-art .f-leaf { fill: var(--leaf); }
.lp-art .f-sk1 { fill: var(--skin-1); }
.lp-art .f-sk2 { fill: var(--skin-2); }
.lp-art .f-sk3 { fill: var(--skin-3); }
.lp-art .f-navy { fill: var(--navy); }
.lp-art .f-shoe { fill: var(--shoe); }
.lp-art .f-pass { fill: var(--passport); }
.lp-art .f-gold { fill: var(--gold); }
.lp-art .f-shadow { fill: var(--shadow); }
.lp-art .f-bg { fill: var(--bg); }
.lp-art .c-h1 { color: var(--hair-1); }
.lp-art .c-h2 { color: var(--hair-2); }
.lp-art .s-line { stroke: var(--line); stroke-width: 1.5; }
.lp-art .s-acc { stroke: var(--accent); }
.lp-art .s-accd { stroke: var(--accent-deep); }
.lp-art .s-green { stroke: var(--green); }
.lp-art .s-red { stroke: var(--red); }
.lp-art .s-text { stroke: var(--text); }
.lp-art .arm { fill: none; stroke-width: 11; stroke-linecap: round; stroke-linejoin: round; }
.lp-art .glyph { fill: none; stroke: var(--bg); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.lp-art .icon { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.lp-art .dash { fill: none; stroke: var(--mid); stroke-opacity: 0.55; stroke-width: 2; stroke-dasharray: 6 9; }
.lp-art .zoom { fill: none; stroke: var(--mid); stroke-opacity: 0.35; stroke-width: 1.5; stroke-dasharray: 3 5; }
.lp-art text { font-family: var(--sans); }
.lp-art .t-cap { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; fill: var(--mid); }
.lp-art .t-lab { font-size: 11px; font-weight: 600; fill: var(--text); }
.lp-art .t-sub { font-size: 10px; fill: var(--mid); }
.lp-art .t-row { font-size: 13px; font-weight: 600; fill: var(--text); }
.lp-art .t-chip { font-size: 7.5px; font-weight: 800; letter-spacing: 0.08em; }
.lp-art .t-pill { font-size: 10px; font-weight: 600; fill: var(--text); }
.lp-art .t-dark { fill: var(--bg); }
.lp-art .t-white { fill: #fff; }
.lp-art .t-green { fill: var(--green); }
.lp-art .t-acc { fill: var(--accent); }
.lp-art .t-amber { fill: var(--amber); }
.lp-art .pill { fill: var(--bg); stroke: var(--line); stroke-width: 1.5; }
/* ---------- Motion ---------- */
.lp-art .pop { transform-box: fill-box; transform-origin: center; }
.lp-art.paused, .lp-art.paused * { animation-play-state: paused !important; }
@keyframes lps-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes lps-spin { to { transform: rotate(360deg); } }
@keyframes lps-spin-back { to { transform: rotate(-360deg); } }
@keyframes lps-twinkle { 0%, 100% { opacity: 0.25; transform: scale(0.6); } 50% { opacity: 1; transform: scale(1); } }
@keyframes lps-flow { to { stroke-dashoffset: -30; } }
.lp-art .float { animation: lps-float 4s ease-in-out infinite; }
.lp-art .float-b { animation: lps-float 5s ease-in-out -2s infinite; }
.lp-art .spin { transform-box: fill-box; transform-origin: center; animation: lps-spin 30s linear infinite; }
.lp-art .gear-a { transform-box: fill-box; transform-origin: center; animation: lps-spin 6s linear infinite; }
.lp-art .gear-b { transform-box: fill-box; transform-origin: center; animation: lps-spin-back 4.5s linear infinite; }
.lp-art .twinkle { transform-box: fill-box; transform-origin: center; animation: lps-twinkle 2.6s ease-in-out infinite; }
.lp-art .twinkle.d1 { animation-delay: -0.9s; }
.lp-art .twinkle.d2 { animation-delay: -1.7s; }
.lp-art .flow { animation: lps-flow 1.4s linear infinite; }
/* Hero: she types on her phone; the form is her screen, blown up. 7s */
@keyframes lps-h-type1 { 0%, 2% { transform: scaleX(0); } 10%, 90% { transform: scaleX(1); } 95%, 100% { transform: scaleX(0); } }
@keyframes lps-h-type2 { 0%, 14% { transform: scaleX(0); } 22%, 90% { transform: scaleX(1); } 95%, 100% { transform: scaleX(0); } }
@keyframes lps-h-type3 { 0%, 26% { transform: scaleX(0); } 34%, 90% { transform: scaleX(1); } 95%, 100% { transform: scaleX(0); } }
@keyframes lps-h-type4 { 0%, 38% { transform: scaleX(0); } 46%, 90% { transform: scaleX(1); } 95%, 100% { transform: scaleX(0); } }
@keyframes lps-h-tick1 { 0%, 10% { transform: scale(0); } 13% { transform: scale(1.2); } 15%, 90% { transform: scale(1); } 95%, 100% { transform: scale(0); } }
@keyframes lps-h-tick2 { 0%, 22% { transform: scale(0); } 25% { transform: scale(1.2); } 27%, 90% { transform: scale(1); } 95%, 100% { transform: scale(0); } }
@keyframes lps-h-tick3 { 0%, 34% { transform: scale(0); } 37% { transform: scale(1.2); } 39%, 90% { transform: scale(1); } 95%, 100% { transform: scale(0); } }
@keyframes lps-h-tick4 { 0%, 46% { transform: scale(0); } 49% { transform: scale(1.2); } 51%, 90% { transform: scale(1); } 95%, 100% { transform: scale(0); } }
@keyframes lps-h-focus { 0%, 12% { opacity: 1; transform: translateY(0); } 14%, 24% { transform: translateY(52px); } 26%, 36% { transform: translateY(104px); } 38%, 50% { opacity: 1; transform: translateY(156px); } 53%, 97% { opacity: 0; transform: translateY(156px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes lps-h-press { 0%, 56% { transform: scale(1); } 58% { transform: scale(0.93); } 61%, 100% { transform: scale(1); } }
@keyframes lps-h-plane { 0%, 59% { opacity: 0; } 61%, 76% { opacity: 1; } 80%, 100% { opacity: 0; } }
@keyframes lps-h-thumb { 0%, 2%, 6%, 10%, 14%, 18%, 22%, 26%, 30%, 34%, 38%, 42%, 46% { transform: translateY(0); } 4%, 8%, 12%, 16%, 20%, 24%, 28%, 32%, 36%, 40%, 44% { transform: translateY(-3px); } 48%, 100% { transform: translateY(0); } }
.lp-art .type { transform-box: fill-box; transform-origin: left center; }
.lp-art .h-type1 { animation: lps-h-type1 7s ease-out infinite; }
.lp-art .h-type2 { animation: lps-h-type2 7s ease-out infinite; }
.lp-art .h-type3 { animation: lps-h-type3 7s ease-out infinite; }
.lp-art .h-type4 { animation: lps-h-type4 7s ease-out infinite; }
.lp-art .h-tick1 { animation: lps-h-tick1 7s infinite; }
.lp-art .h-tick2 { animation: lps-h-tick2 7s infinite; }
.lp-art .h-tick3 { animation: lps-h-tick3 7s infinite; }
.lp-art .h-tick4 { animation: lps-h-tick4 7s infinite; }
.lp-art .h-focus { opacity: 0; animation: lps-h-focus 7s ease-in-out infinite; }
.lp-art .h-press { animation: lps-h-press 7s infinite; }
.lp-art .h-plane { opacity: 0; animation: lps-h-plane 7s infinite; }
.lp-art .h-thumb { animation: lps-h-thumb 7s infinite; }
@keyframes lps-r-doc { 0%, 9.31% { opacity: 0; } 10.58%, 22% { opacity: 1; } 23.86%, 47.2% { opacity: 0; } 49.65%, 61.08% { opacity: 1; } 62.35%, 100% { opacity: 0; } }
@keyframes lps-r-popup { 0%, 61.08% { transform: scale(0); } 63.19% { transform: scale(1.08); } 64.46%, 96.62% { transform: scale(1); } 99.15%, 100% { transform: scale(0); } }
.lp-art .r-popup { animation: lps-r-popup 13s infinite; }
/* Each line's label shows once the statement has made that hop. */
@keyframes lps-r-pill1 { 0%, 22% { opacity: 0; transform: translateY(4px); } 25.89%, 96.62% { opacity: 1; transform: translateY(0); } 99.15%, 100% { opacity: 0; } }
@keyframes lps-r-pill2 { 0%, 61.08% { opacity: 0; transform: translateY(4px); } 63.19%, 96.62% { opacity: 1; transform: translateY(0); } 99.15%, 100% { opacity: 0; } }
@keyframes lps-r-pill3 { 0%, 86.46% { opacity: 0; transform: translateY(4px); } 88.58%, 96.62% { opacity: 1; transform: translateY(0); } 99.15%, 100% { opacity: 0; } }
.lp-art .r-pill1 { animation: lps-r-pill1 13s infinite; }
.lp-art .r-pill2 { animation: lps-r-pill2 13s infinite; }
.lp-art .r-pill3 { animation: lps-r-pill3 13s infinite; }
@keyframes lps-r-env { 0%, 73.77% { opacity: 0; transform: scale(1); } 74.62%, 87.31% { opacity: 1; transform: scale(1); } 90.69% { opacity: 1; transform: scale(0.45); } 92.38%, 100% { opacity: 0; transform: scale(0.45); } }
@keyframes lps-r-win1 { 0%, 10.15% { opacity: 1; } 12.69%, 97.46% { opacity: 0; } 100% { opacity: 1; } }
@keyframes lps-r-win2 { 0%, 20.31% { opacity: 0; } 22.85%, 49.23% { opacity: 1; } 51.77%, 100% { opacity: 0; } }
@keyframes lps-r-win3 { 0%, 59.38% { opacity: 0; } 61.92%, 74.62% { opacity: 1; } 77.15%, 100% { opacity: 0; } }
@keyframes lps-r-win4 { 0%, 84.77% { opacity: 0; } 87.31%, 97.46% { opacity: 1; } 100% { opacity: 0; } }
@keyframes lps-r-typing { 0%, 0.85%, 3.38%, 5.92%, 8.46% { transform: translateY(0); } 2.12%, 4.65%, 7.19% { transform: translateY(-3px); } 10.15%, 100% { transform: translateY(0); } }
@keyframes lps-r-ck1 { 0%, 24.88% { transform: scale(0); } 28.93% { transform: scale(1.25); } 31.98%, 96.62% { transform: scale(1); } 99.15%, 100% { transform: scale(0); } }
@keyframes lps-r-ck2 { 0%, 30.96% { transform: scale(0); } 35.02% { transform: scale(1.25); } 38.07%, 96.62% { transform: scale(1); } 99.15%, 100% { transform: scale(0); } }
@keyframes lps-r-ck3 { 0%, 37.05% { transform: scale(0); } 41.11% { transform: scale(1.25); } 44.16%, 96.62% { transform: scale(1); } 99.15%, 100% { transform: scale(0); } }
@keyframes lps-r-ck4 { 0%, 43.14% { transform: scale(0); } 47.2% { transform: scale(1.25); } 49.65%, 96.62% { transform: scale(1); } 99.15%, 100% { transform: scale(0); } }
@keyframes lps-r-beam { 0%, 22% { opacity: 0; transform: rotate(0deg); } 24.88% { opacity: 1; transform: rotate(0deg); } 29.95% { transform: rotate(-25.5deg); } 36.04% { transform: rotate(-56.7deg); } 42.13%, 49.23% { opacity: 1; transform: rotate(-79.9deg); } 50.92%, 100% { opacity: 0; transform: rotate(-79.9deg); } }
@keyframes lps-r-eye { 0%, 22.85% { transform: translateX(0); } 26.91%, 50.08% { transform: translateX(-2px); } 51.77%, 100% { transform: translateX(0); } }
@keyframes lps-r-mark { 0%, 67.85% { opacity: 0; } 68.27%, 96.62% { opacity: 1; } 99.15%, 100% { opacity: 0; } }
@keyframes lps-r-bubble { 0%, 89.85% { transform: scale(0); } 91.54% { transform: scale(1.12); } 92.81%, 97.46% { transform: scale(1); } 99.58%, 100% { transform: scale(0); } }
@keyframes lps-r-glow { 0%, 89% { opacity: 0.25; } 90.69%, 97.46% { opacity: 1; } 100% { opacity: 0.25; } }
.lp-art .r-doc { animation: lps-r-doc 13s infinite; }
.lp-art .r-env { opacity: 0; transform-box: fill-box; transform-origin: center; animation: lps-r-env 13s infinite; }
.lp-art .r-win1 { animation: lps-r-win1 13s infinite; }
.lp-art .r-win2 { animation: lps-r-win2 13s infinite; }
.lp-art .r-win3 { animation: lps-r-win3 13s infinite; }
.lp-art .r-win4 { animation: lps-r-win4 13s infinite; }
.lp-art .ring { opacity: 0; }
@keyframes lps-typing-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.45; } 30% { transform: translateY(-4px); opacity: 1; } }
.lp-art .typing-dot { animation: lps-typing-dot 0.9s ease-in-out infinite; }
.lp-art .typing-dot.d2 { animation-delay: 0.15s; }
.lp-art .typing-dot.d3 { animation-delay: 0.3s; }
.lp-art .r-typing { animation: lps-r-typing 13s infinite; }
.lp-art .r-typing.late { animation-delay: -0.15s; }
.lp-art .r-ck1 { animation: lps-r-ck1 13s infinite; }
.lp-art .r-ck2 { animation: lps-r-ck2 13s infinite; }
.lp-art .r-ck3 { animation: lps-r-ck3 13s infinite; }
.lp-art .r-ck4 { animation: lps-r-ck4 13s infinite; }
.lp-art .r-beam { transform-origin: 440px 217px; animation: lps-r-beam 13s ease-in-out infinite; }
.lp-art .r-eye { animation: lps-r-eye 13s infinite; }
@keyframes lps-r-cursor { 0%, 61.92% { opacity: 0; transform: translate(704px, 214px); } 63.62% { opacity: 1; } 67% { transform: translate(678px, 178px) scale(1); } 67.85% { transform: translate(678px, 178px) scale(0.85); } 68.69% { transform: translate(678px, 178px) scale(1); } 72.92% { opacity: 1; transform: translate(678px, 178px); } 74.62%, 100% { opacity: 0; transform: translate(678px, 178px); } }
@keyframes lps-r-btn { 0%, 67.42% { transform: scale(1); } 67.85% { transform: scale(0.92); } 69.12%, 100% { transform: scale(1); } }
@keyframes lps-r-pending { 0%, 67.85% { opacity: 1; } 68.27%, 96.62% { opacity: 0; } 99.15%, 100% { opacity: 1; } }
.lp-art .r-cursor { opacity: 0; animation: lps-r-cursor 13s ease-in-out infinite; }
.lp-art .r-btn { animation: lps-r-btn 13s infinite; }
.lp-art .r-pending { opacity: 0; animation: lps-r-pending 13s infinite; }
.lp-art .r-approved { animation: lps-r-mark 13s infinite; }
.lp-art .r-bubble { animation: lps-r-bubble 13s infinite; }
.lp-art .r-glow { opacity: 1; animation: lps-r-glow 13s infinite; }
/* Identity: phone, the verification provider, and the card the seller receives. 10s */
@keyframes lps-q-flash { 0% { opacity: 0; } 3% { opacity: 0.9; } 7%, 100% { opacity: 0; } }
@keyframes lps-q-photo { 0%, 5% { opacity: 0; } 7%, 22% { opacity: 1; } 25%, 100% { opacity: 0; } }
@keyframes lps-q-pulse { 0%, 22% { transform: scale(1); } 25% { transform: scale(1.08); } 29%, 100% { transform: scale(1); } }
@keyframes lps-q-scan { 0%, 25% { opacity: 0; transform: translateY(0); } 26% { opacity: 1; } 36% { opacity: 1; transform: translateY(64px); } 37%, 100% { opacity: 0; transform: translateY(64px); } }
@keyframes lps-q-ok { 0%, 36% { transform: scale(0); } 38% { transform: scale(1.18); } 40%, 96% { transform: scale(1); } 99%, 100% { transform: scale(0); } }
@keyframes lps-q-bit1 { 0%, 40% { opacity: 0; transform: translate(0, 0) rotate(0deg); } 42% { opacity: 1; } 52%, 100% { opacity: 0; transform: translate(-26px, -30px) rotate(-40deg); } }
@keyframes lps-q-bit2 { 0%, 40% { opacity: 0; transform: translate(0, 0) rotate(0deg); } 42% { opacity: 1; } 52%, 100% { opacity: 0; transform: translate(28px, -26px) rotate(35deg); } }
@keyframes lps-q-bit3 { 0%, 40% { opacity: 0; transform: translate(0, 0) rotate(0deg); } 42% { opacity: 1; } 52%, 100% { opacity: 0; transform: translate(4px, -40px) rotate(15deg); } }
@keyframes lps-q-gone { 0%, 42% { opacity: 0; } 46%, 96% { opacity: 1; } 99%, 100% { opacity: 0; } }
@keyframes lps-q-res { 0%, 49% { opacity: 0; } 51%, 60% { opacity: 1; } 62%, 100% { opacity: 0; } }
@keyframes lps-q-card { 0%, 60% { transform: scale(0); } 63% { transform: scale(1.05); } 65%, 96% { transform: scale(1); } 99%, 100% { transform: scale(0); } }
.lp-art .q-flash { opacity: 0; animation: lps-q-flash 10s infinite; }
.lp-art .q-photo { opacity: 0; animation: lps-q-photo 10s infinite; }
.lp-art .q-pulse { animation: lps-q-pulse 10s infinite; }
.lp-art .q-scan { opacity: 0; animation: lps-q-scan 10s linear infinite; }
.lp-art .q-ok { animation: lps-q-ok 10s infinite; }
.lp-art .q-bit { opacity: 0; }
.lp-art .q-bit.b1 { animation: lps-q-bit1 10s ease-out infinite; }
.lp-art .q-bit.b2 { animation: lps-q-bit2 10s ease-out infinite; }
.lp-art .q-bit.b3 { animation: lps-q-bit3 10s ease-out infinite; }
.lp-art .q-gone { animation: lps-q-gone 10s infinite; }
.lp-art .q-res { opacity: 0; animation: lps-q-res 10s infinite; }
.lp-art .q-card { animation: lps-q-card 10s infinite; }
/* Checks: the magnifier reads each row; one row raises a flag with its reason. 8s */
@keyframes lps-c-mag { 0% { opacity: 0; transform: translateY(0); } 3% { opacity: 1; transform: translateY(0); } 10% { transform: translateY(0); } 16%, 26% { transform: translateY(60px); } 32%, 42% { transform: translateY(120px); } 48%, 64% { opacity: 1; transform: translateY(180px); } 70%, 99.9% { opacity: 0; transform: translateY(180px); } 100% { opacity: 0; transform: translateY(0); } }
@keyframes lps-c-ck1 { 0%, 5% { transform: scale(0); } 8% { transform: scale(1.22); } 10%, 90% { transform: scale(1); } 95%, 100% { transform: scale(0); } }
@keyframes lps-c-ck2 { 0%, 21% { transform: scale(0); } 24% { transform: scale(1.22); } 26%, 90% { transform: scale(1); } 95%, 100% { transform: scale(0); } }
@keyframes lps-c-ck3 { 0%, 37% { transform: scale(0); } 40% { transform: scale(1.22); } 42%, 90% { transform: scale(1); } 95%, 100% { transform: scale(0); } }
@keyframes lps-c-ck4 { 0%, 53% { transform: scale(0); } 56% { transform: scale(1.22); } 58%, 90% { transform: scale(1); } 95%, 100% { transform: scale(0); } }
@keyframes lps-c-subA { 0%, 38% { opacity: 1; } 41%, 92% { opacity: 0; } 96%, 100% { opacity: 1; } }
@keyframes lps-c-subB { 0%, 38% { opacity: 0; } 41%, 92% { opacity: 1; } 96%, 100% { opacity: 0; } }
@keyframes lps-c-point { 0%, 38% { transform: rotate(10deg); } 44%, 88% { transform: rotate(0deg); } 96%, 100% { transform: rotate(10deg); } }
.lp-art .c-mag { animation: lps-c-mag 8s ease-in-out infinite; }
@keyframes lps-c-scan { 0%, 100% { transform: translateX(-14px) rotate(-4deg); } 50% { transform: translateX(14px) rotate(4deg); } }
.lp-art .c-scan { animation: lps-c-scan 1.33s ease-in-out infinite; }
@keyframes lps-c-scan-inv { 0%, 100% { transform: scale(0.8) rotate(4deg) scale(1.6) translateX(14px); } 50% { transform: scale(0.8) rotate(-4deg) scale(1.6) translateX(-14px); } }
@keyframes lps-c-mag-inv { 0%, 10% { transform: translateY(0); } 16%, 26% { transform: translateY(-60px); } 32%, 42% { transform: translateY(-120px); } 48%, 99.9% { transform: translateY(-180px); } 100% { transform: translateY(0); } }
.lp-art .c-scan-inv { transform: scale(0.8) scale(1.6) translateX(14px); animation: lps-c-scan-inv 1.33s ease-in-out infinite; }
.lp-art .c-mag-inv { animation: lps-c-mag-inv 8s ease-in-out infinite; }
.lp-art .c-ck1 { animation: lps-c-ck1 8s infinite; }
.lp-art .c-ck2 { animation: lps-c-ck2 8s infinite; }
.lp-art .c-ck3 { animation: lps-c-ck3 8s infinite; }
.lp-art .c-ck4 { animation: lps-c-ck4 8s infinite; }
.lp-art .c-subA { opacity: 0; animation: lps-c-subA 8s infinite; }
.lp-art .c-subB { animation: lps-c-subB 8s infinite; }
.lp-art .c-point { transform-origin: 450.5px 220.8px; animation: lps-c-point 8s ease-in-out infinite; }
/* Decide: a flag lands in her queue, she thinks, stamps, the buyer is mailed. 9s */
@keyframes lps-d-think { 0%, 27% { transform: scale(0); } 30% { transform: scale(1.12); } 32%, 48% { transform: scale(1); } 51%, 100% { transform: scale(0); } }
@keyframes lps-d-mark { 0%, 55.5% { opacity: 0; } 56%, 96% { opacity: 1; } 99%, 100% { opacity: 0; } }
@keyframes lps-d-pending { 0%, 55.5% { opacity: 1; } 56%, 97% { opacity: 0; } 100% { opacity: 1; } }
@keyframes lps-d-mail { 0%, 61.5% { opacity: 0; } 62.5%, 84% { opacity: 1; } 87%, 100% { opacity: 0; } }
@keyframes lps-d-card { 0%, 23% { transform: scale(0); } 26% { transform: scale(1.06); } 28%, 96% { transform: scale(1); } 99%, 100% { transform: scale(0); } }
.lp-art .d-card { animation: lps-d-card 9s infinite; }
/* The statement arrives as an envelope, then opens into the flag the checks raised. */
@keyframes lps-d-flag-env { 0%, 3.5% { opacity: 0; transform: scale(1); } 4.5%, 26% { opacity: 1; transform: scale(1); } 29%, 100% { opacity: 0; transform: scale(0.4); } }
@keyframes lps-d-flag-chip { 0%, 27% { opacity: 0; transform: scale(0.4); } 30% { opacity: 1; transform: scale(1.18); } 32%, 96% { opacity: 1; transform: scale(1); } 99%, 100% { opacity: 0; transform: scale(1); } }
.lp-art .d-flag-env { opacity: 0; animation: lps-d-flag-env 9s ease-in-out infinite; }
.lp-art .d-flag-chip { animation: lps-d-flag-chip 9s ease-out infinite; }
@keyframes lps-d-bubble { 0%, 85% { transform: scale(0); } 87% { transform: scale(1.12); } 88.5%, 96% { transform: scale(1); } 99%, 100% { transform: scale(0); } }
@keyframes lps-d-glow { 0%, 84% { opacity: 0.25; } 86%, 96% { opacity: 1; } 100% { opacity: 0.25; } }
.lp-art .d-think { transform: scale(0); animation: lps-d-think 9s infinite; }
@keyframes lps-d-cursor { 0%, 48% { opacity: 0; transform: translate(318px, 176px); } 50% { opacity: 1; } 54% { transform: translate(206px, 110px) scale(1); } 55% { transform: translate(206px, 110px) scale(0.85); } 56% { opacity: 1; transform: translate(206px, 110px) scale(1); } 58%, 100% { opacity: 0; transform: translate(206px, 110px); } }
@keyframes lps-d-btn { 0%, 54.5% { transform: scale(1); } 55% { transform: scale(0.92); } 56.5%, 100% { transform: scale(1); } }
@keyframes lps-d-click { 0%, 54% { transform: translateY(0); } 55% { transform: translateY(1.5px); } 56.5%, 100% { transform: translateY(0); } }
.lp-art .d-cursor { opacity: 0; animation: lps-d-cursor 9s ease-in-out infinite; }
.lp-art .d-btn { animation: lps-d-btn 9s infinite; }
.lp-art .d-click { animation: lps-d-click 9s infinite; }
.lp-art .d-pending { opacity: 0; animation: lps-d-pending 9s infinite; }
.lp-art .d-approved { animation: lps-d-mark 9s infinite; }
.lp-art .d-mail { opacity: 0; animation: lps-d-mail 9s infinite; }
.lp-art .d-bubble { animation: lps-d-bubble 9s infinite; }
.lp-art .d-glow { opacity: 1; animation: lps-d-glow 9s infinite; }
/* 404: the link flies from her phone to where the form should be; only its outline is there. 8s */
.lp-art .n-frame { fill: none; stroke: var(--mid); stroke-opacity: 0.6; stroke-width: 2; stroke-dasharray: 8 7; }
.lp-art .n-ghost { fill: none; stroke: var(--line); stroke-width: 1.5; stroke-dasharray: 5 5; }
@keyframes lps-n-plane { 0%, 8% { opacity: 0; } 10%, 90% { opacity: 1; } 94%, 100% { opacity: 0; } }
@keyframes lps-n-q { 0%, 42% { transform: scale(0); } 45% { transform: scale(1.18); } 47%, 90% { transform: scale(1); } 94%, 100% { transform: scale(0); } }
@keyframes lps-n-think { 0%, 52% { transform: scale(0); } 55% { transform: scale(1.12); } 57%, 90% { transform: scale(1); } 94%, 100% { transform: scale(0); } }
@keyframes lps-n-thumb { 0%, 3%, 7%, 100% { transform: translateY(0); } 5% { transform: translateY(-3px); } }
.lp-art .n-plane { animation: lps-n-plane 8s infinite; }
.lp-art .n-q { animation: lps-n-q 8s infinite; }
.lp-art .n-think { animation: lps-n-think 8s infinite; }
.lp-art .n-thumb { animation: lps-n-thumb 8s infinite; }
/* Reduced motion: every scene rests on its finished frame, which carries the story on its own. */
@media (prefers-reduced-motion: reduce) {
    .lp-art, .lp-art * { animation: none !important; }
    .lp-art .r-token, .lp-art .ring { display: none; }
  }
`;
