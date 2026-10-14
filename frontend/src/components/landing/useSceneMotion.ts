// Motion for the landing illustrations that CSS alone cannot express:
//
// - Anything marked `.mover` follows its dashed path (data-segs="pathId:from:to …",
//   percentages of a data-dur-second loop), optionally turning along it.
// - Each `path.trail` inside a mask is drawn over the same stretch of time, so the
//   dashed line appears behind the thing travelling it, like a trail.
// - Scenes that are off-screen pause.
//
// Movers and trails are built from the same eased walk along each path, so they
// stay together. The keyframes go into one <style> that is removed on unmount.
import { useLayoutEffect, type RefObject } from 'react';

const STEPS = 20;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const pct = (from: number, to: number, i: number) => (from + ((to - from) * i) / STEPS).toFixed(2);

export function useSceneMotion(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const css: string[] = [];

    el.querySelectorAll<SVGPathElement>('path.trail').forEach((p, n) => {
      const from = Number(p.dataset.from), to = Number(p.dataset.to), name = `lps-trail-${n}`;
      const kf = [`0%, ${from}% { stroke-dashoffset: 1; }`];
      for (let i = 1; i <= STEPS; i++) kf.push(`${pct(from, to, i)}% { stroke-dashoffset: ${(1 - ease(i / STEPS)).toFixed(4)}; }`);
      kf.push('96% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 1; }');
      css.push(`@keyframes ${name} { ${kf.join(' ')} }`);
      p.style.animation = `${name} ${p.dataset.dur}s linear infinite`;
    });

    el.querySelectorAll<SVGGElement>('.mover').forEach((g, n) => {
      const [ox, oy] = (g.dataset.offset ?? '0,0').split(',').map(Number);
      const turn = g.dataset.rotate === '1';
      const at = (path: SVGPathElement, l: number) => {
        const len = path.getTotalLength();
        const q = path.getPointAtLength(Math.min(len, Math.max(0, l)));
        const a = path.getPointAtLength(Math.max(0, l - 1)), b = path.getPointAtLength(Math.min(len, l + 1));
        const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        return `translate(${(q.x + ox).toFixed(1)}px, ${(q.y + oy).toFixed(1)}px)` + (turn ? ` rotate(${angle.toFixed(1)}deg)` : '');
      };
      const kf: string[] = [];
      let last = '';
      (g.dataset.segs ?? '').split(' ').forEach((seg, k) => {
        const [id, f, t] = seg.split(':');
        const path = el.querySelector<SVGPathElement>(`#${id}`);
        if (!path) return;
        const from = Number(f), to = Number(t), len = path.getTotalLength();
        kf.push(`${k === 0 ? '0%, ' : ''}${from}% { transform: ${at(path, 0)}; }`);
        for (let i = 1; i <= STEPS; i++) {
          last = at(path, len * ease(i / STEPS));
          kf.push(`${pct(from, to, i)}% { transform: ${last}; }`);
        }
      });
      (g.dataset.tail ?? '').split(' ').filter(Boolean).forEach(step => {
        const [p, tx, ty] = step.split(':');
        last = `translate(${tx}px, ${ty}px)`;
        kf.push(`${p}% { transform: ${last}; }`);
      });
      kf.push(`100% { transform: ${last}; }`);
      css.push(`@keyframes lps-mover-${n} { ${kf.join(' ')} }`);
      // The resting position is the end of the trip, which is also what reduced motion shows.
      g.style.transform = last;
      g.style.animation = `lps-mover-${n} ${g.dataset.dur}s linear infinite`;
    });

    const style = document.createElement('style');
    style.textContent = css.join('\n');
    document.head.appendChild(style);

    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        entries => entries.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting)),
        { rootMargin: '80px' },
      );
      el.querySelectorAll('.lp-art').forEach(s => io!.observe(s));
    }

    return () => {
      io?.disconnect();
      style.remove();
    };
  }, [root]);
}
