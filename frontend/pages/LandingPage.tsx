import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { Wordmark } from '../src/components/Mark.tsx';
import { SceneDefs, HeroScene, RouteScene, IdentityScene, ChecksScene, DecisionScene } from '../src/components/landing/Scenes.tsx';
import { sceneStyles } from '../src/components/landing/sceneStyles.ts';
import { carbonTokens } from '../src/components/landing/carbon.ts';
import { useSceneMotion } from '../src/components/landing/useSceneMotion.ts';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  useDocumentTitle('eustatement — Compliant end-user statements');
  const root = useRef<HTMLDivElement>(null);
  useSceneMotion(root);

  useLayoutEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        gsap.set('.lp-reveal, .lp-hero-art, .lp-w > span, .lp-chapter', { opacity: 1, y: 0, x: 0 });
        return;
      }

      /* ---------- Hero entrance ---------- */
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from('.lp-nav', { y: -24, opacity: 0, duration: 0.6 })
        .from('.lp-hero-tag', { y: 16, opacity: 0, duration: 0.5 }, '-=0.25')
        .from('.lp-w > span', { yPercent: 110, duration: 0.85, stagger: 0.08 }, '-=0.2')
        .from('.lp-hero-sub', { y: 18, opacity: 0, duration: 0.6 }, '-=0.45')
        .from('.lp-hero-copy .lp-hero-actions', { opacity: 0, duration: 0.5 }, '-=0.35')
        .from('.lp-hero-art', { y: 50, opacity: 0, duration: 1.1, ease: 'power4.out' }, '-=0.7');

      /* Glow orbs parallax */
      gsap.to('.lp-orb-a', {
        yPercent: 28, ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.lp-orb-b', {
        yPercent: -22, ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      /* ---------- Stats counters ---------- */
      gsap.utils.toArray<HTMLElement>('.lp-stat-num').forEach(el => {
        const target = Number(el.dataset.count ?? 0);
        const suffix = el.dataset.suffix ?? '';
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.6, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top bottom', once: true },
          onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; },
        });
      });

      /* ---------- Chapter reveals ---------- */
      gsap.utils.toArray<HTMLElement>('.lp-chapter').forEach(ch => {
        const text = ch.querySelector('.lp-chapter-text');
        const visual = ch.querySelector('.lp-chapter-visual');
        const tl = gsap.timeline({
          scrollTrigger: { trigger: ch, start: 'top 72%', once: true },
          defaults: { ease: 'power3.out' },
        });
        tl.from(text, { y: 40, opacity: 0, duration: 0.7 })
          .from(visual, { y: 50, opacity: 0, duration: 0.8 }, '-=0.45');
      });

      /* ---------- Generic reveals (features, CTA) ---------- */
      gsap.utils.toArray<HTMLElement>('.lp-reveal').forEach(el => {
        gsap.from(el, {
          y: 36, opacity: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <style>{styles + sceneStyles}</style>
      <div className="lp-root" ref={root}>
        <SceneDefs />

        {/* ============ NAV ============ */}
        <nav className="lp-nav">
          <Wordmark size={20} textClassName="lp-brand" />
          <div className="lp-nav-right">
            <Link to="/login" className="lp-nav-link">Sign in</Link>
            <Link to="/register" className="lp-nav-cta">Request access</Link>
          </div>
        </nav>

        {/* ============ HERO ============ */}
        <header className="lp-hero">
          <div className="lp-grid-bg" aria-hidden="true" />
          <div className="lp-orb lp-orb-a" aria-hidden="true" />
          <div className="lp-orb lp-orb-b" aria-hidden="true" />

          <div className="lp-hero-inner">
            <div className="lp-hero-copy">
              <div className="lp-hero-tag">END-USER STATEMENT PLATFORM</div>
              <h1 className="lp-hero-title">
                <span className="lp-w"><span>Collect.</span></span>{' '}
                <span className="lp-w"><span>Verify.</span></span>{' '}
                <span className="lp-w"><span className="lp-grad">Decide.</span></span>
              </h1>
              <p className="lp-hero-sub">
                The fastest way for regulated suppliers to collect end-user statements,
                verify identity &amp; VAT automatically, and approve or deny in one dashboard.
              </p>
              <div className="lp-hero-actions">
                <Link to="/register" className="lp-btn-primary">Request access</Link>
                <a href="#how" className="lp-btn-secondary">See how it works</a>
              </div>
            </div>

            {/* She fills in the statement on her phone */}
            <div className="lp-hero-art">
              <HeroScene />
            </div>
          </div>

          <a href="#how" className="lp-scroll-hint">
            How it works
            <svg className="lp-scroll-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </header>

        {/* ============ STATS ============ */}
        <section className="lp-stats">
          <div className="lp-stat"><span className="lp-stat-num" data-count="100" data-suffix="%">0</span><span className="lp-stat-label">Document photos never reach this platform</span></div>
          <div className="lp-stat"><span className="lp-stat-num" data-count="27">0</span><span className="lp-stat-label">EU countries, VAT numbers checked live in VIES</span></div>
          <div className="lp-stat"><span className="lp-stat-num" data-count="18" data-suffix="mo">0</span><span className="lp-stat-label">Auto-deletion retention policy</span></div>
        </section>

        {/* ============ STORYLINE ============ */}
        <main id="how" className="lp-story">
          <div className="lp-story-head lp-reveal">
            <span className="lp-eyebrow">HOW IT WORKS</span>
            <h2 className="lp-h2">One statement, from form to answer</h2>
            <p className="lp-story-sub">
              Follow a single order through eustatement. The buyer only fills in a form; everything after
              that happens on its own until your team decides.
            </p>
          </div>

          <div className="lp-route lp-reveal">
            <RouteScene />
          </div>

          {/* Identity */}
          <section className="lp-chapter">
            <div className="lp-chapter-text">
              <span className="lp-eyebrow">IDENTITY</span>
              <h3 className="lp-h3">Passport photos go to the verification provider, and nowhere else</h3>
              <p className="lp-body">
                The buyer photographs their passport or ID card and takes a selfie in a secure window from
                our identity-verification provider. You get the outcome and what is printed on the document. The photos never reach you or us.
              </p>
              <ul className="lp-facts">
                <li>The provider checks the document is genuine and belongs to the buyer</li>
                <li>The provider deletes the session, photos included, once the result is stored</li>
                <li>An ID showing the buyer is under 18 stops the statement from being sent</li>
              </ul>
            </div>
            <div className="lp-chapter-visual lp-art-card"><IdentityScene /></div>
          </section>

          {/* Checks */}
          <section className="lp-chapter lp-chapter--flip">
            <div className="lp-chapter-text">
              <span className="lp-eyebrow">CHECKS</span>
              <h3 className="lp-h3">Checks point. They never decide.</h3>
              <p className="lp-body">
                Every statement is read the moment it arrives. Anything unusual is flagged for your reviewer,
                with the reason next to it.
              </p>
              <ul className="lp-facts">
                <li>Substances against Annexes I and II of Regulation (EU) 2019/1148, by CAS number or by name in any EU language</li>
                <li>Company VAT numbers live in the EU VIES register</li>
                <li>The stated use screened for warning signs, translated on our own server when needed</li>
              </ul>
            </div>
            <div className="lp-chapter-visual lp-art-card"><ChecksScene /></div>
          </section>

          {/* Decision */}
          <section className="lp-chapter">
            <div className="lp-chapter-text">
              <span className="lp-eyebrow">DECISION</span>
              <h3 className="lp-h3">A person on your team makes the call</h3>
              <p className="lp-body">
                The checks hand their flags to a reviewer. Approve stays locked while a check is red;
                overriding one needs a written reason, stored with the reviewer’s name.
              </p>
              <ul className="lp-facts">
                <li>Approve or deny with a reason, in one shared dashboard</li>
                <li>The buyer is emailed the decision, with a PDF copy when approved</li>
                <li>Roles decide who may approve, override or only read</li>
                <li>Every approval and denial is recorded with who made it and when; owners can search it by reviewer, order or date</li>
              </ul>
            </div>
            <div className="lp-chapter-visual lp-art-card"><DecisionScene /></div>
          </section>
        </main>

        {/* ============ FEATURES ============ */}
        <section className="lp-features-wrap">
          <div className="lp-story-head lp-reveal">
            <span className="lp-eyebrow">BUILT FOR COMPLIANCE TEAMS</span>
            <h2 className="lp-h2">Everything you need, nothing you don't</h2>
          </div>
          <div className="lp-features">
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg></div><h3>Privacy by design</h3><p>Document photos never reach this platform, and the provider's session is deleted once the result is stored. Only the minimum fields required under GDPR are kept, auto-deleted after 18 months.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></div><h3>Team roles &amp; invites</h3><p>Invite teammates by email. Owners manage members, Reviewers decide on submissions, Viewers read the results.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></svg></div><h3>Embed it on your site</h3><p>Copy one snippet and the form runs inside your own website. Customers never leave your page, and their answers still come straight to us.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div><h3>Fail-closed approval</h3><p>Approve stays locked while any check is red. Waiving one needs a written reason, stored against the reviewer's name — nothing is ever decided automatically.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg></div><h3>Email notifications</h3><p>Applicants are kept in the loop at every step: received, approved or denied with a reason.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" /><path d="M6.453 15h11.094" /><path d="M8.5 2h7" /></svg></div><h3>Precursor screening</h3><p>Each substance is looked up by CAS number and name in PubChem, the public chemistry database of the US National Library of Medicine, and read against the Annexes of Reg. (EU) 2019/1148, quoting the limit value that applies.</p></div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="lp-cta lp-reveal">
          <div className="lp-cta-inner">
            <h2 className="lp-cta-title">Start collecting statements today</h2>
            <p className="lp-cta-sub">Request access, set up your form while we review it, and share the link once it is approved.</p>
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-btn-primary lp-btn-lg">Request access</Link>
              <Link to="/login" className="lp-btn-secondary lp-btn-lg">Sign in</Link>
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer className="lp-footer">
          <span className="lp-brand lp-brand--small">eustatement</span>
          <nav className="lp-footer-links" aria-label="Legal and documentation">
            <Link to="/docs">Docs</Link>
            <Link to="/how-it-works">For buyers</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/dpa">DPA</Link>
          </nav>
          <span className="lp-footer-copy">© {new Date().getFullYear()} eustatement — end-user statement management</span>
        </footer>

      </div>
    </>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  html, body { background: #0f0f10; font-family: 'Inter', system-ui, sans-serif; }
  ::selection { background: rgba(91,156,246,0.35); }

  /* Carbon: a neutral, faintly warm black (see carbon.ts). */
  .lp-root {
    ${carbonTokens}
    background: var(--bg); color: var(--text); overflow-x: hidden;
  }

  /* ===== NAV ===== */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 2rem;
    background: rgba(15,15,16,0.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .lp-brand { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
  .lp-brand-accent { color: #5b9cf6; }
  .lp-brand--small { font-size: 14px; }
  .lp-nav-right { display: flex; align-items: center; gap: 1.25rem; }
  .lp-nav-link { font-size: 15px; font-weight: 500; color: var(--mid); text-decoration: none; transition: color 0.15s; }
  .lp-nav-link:hover { color: var(--text); }
  .lp-nav-cta {
    font-size: 14px; font-weight: 700; color: #fff; text-decoration: none;
    background: var(--accent); padding: 10px 18px; border-radius: 8px; transition: background 0.2s;
  }
  .lp-nav-cta:hover { background: #74abf8; }

  /* ===== HERO ===== */
  .lp-hero {
    position: relative; min-height: min(88vh, 860px);
    display: flex; flex-direction: column; justify-content: center;
    padding: 7rem 2rem 4rem; overflow: hidden;
  }
  .lp-grid-bg {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%);
  }
  .lp-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
  .lp-orb-a { width: 480px; height: 480px; top: -10%; left: -8%; background: rgba(91,156,246,0.10); }
  .lp-orb-b { width: 420px; height: 420px; bottom: 12%; right: -6%; background: rgba(255,255,255,0.04); }

  .lp-hero-art { min-width: 0; }
  .lp-hero-copy { min-width: 0; }
  .lp-hero-inner {
    position: relative; z-index: 1;
    display: grid; grid-template-columns: 1fr 1.1fr; gap: 3rem; align-items: center;
    max-width: 1200px; margin: 0 auto; width: 100%;
  }
  .lp-hero-tag {
    display: inline-block;
    font-size: 10px; font-weight: 600; letter-spacing: 0.2em;
    color: #5b9cf6; background: rgba(91,156,246,0.1); border: 1px solid rgba(91,156,246,0.22);
    padding: 4px 14px; border-radius: 100px; margin-bottom: 1.5rem;
  }
  .lp-hero-title {
    font-size: clamp(40px, 6.5vw, 76px); font-weight: 800; line-height: 1.04;
    letter-spacing: -0.035em; margin-bottom: 1.5rem;
  }
  .lp-w { display: inline-block; overflow: hidden; vertical-align: bottom; }
  .lp-w > span { display: inline-block; }
  .lp-grad {
    background: linear-gradient(100deg, #5b9cf6 10%, #8eb8f8 50%, #3ecf8e 95%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .lp-hero-sub { font-size: 18px; color: var(--mid); max-width: 500px; line-height: 1.7; margin-bottom: 2.25rem; }
  .lp-hero-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .lp-btn-primary {
    font-size: 15px; font-weight: 700; color: #fff; text-decoration: none;
    background: var(--accent); border-radius: 10px; padding: 14px 26px;
    border: 1px solid transparent;
    box-shadow: 0 8px 24px rgba(91,156,246,0.18);
    transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
  }
  .lp-btn-primary:hover { transform: translateY(-1px); background: #74abf8; box-shadow: 0 12px 32px rgba(91,156,246,0.26); }
  .lp-btn-secondary {
    font-size: 15px; font-weight: 500; color: #c6c6c8; text-decoration: none;
    border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; padding: 14px 26px;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
  }
  .lp-btn-secondary:hover { border-color: rgba(255,255,255,0.3); color: var(--text); background: rgba(255,255,255,0.03); }
  .lp-btn-lg { padding: 16px 32px; font-size: 16px; }

  .lp-scroll-hint {
    position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
    font-size: 14px; font-weight: 600; color: var(--mid); text-decoration: none;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 8px 14px; border-radius: 10px; transition: color 0.15s;
  }
  .lp-scroll-hint:hover { color: var(--text); }
  .lp-scroll-hint:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .lp-scroll-chevron { animation: lp-nudge 1.8s ease-in-out infinite; }
  @keyframes lp-nudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }

  /* ===== STATS ===== */
  .lp-stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
    max-width: 1000px; margin: 0 auto; padding: 2rem;
    border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .lp-stat { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
  .lp-stat-num { font-size: clamp(30px, 4vw, 44px); font-weight: 800; letter-spacing: -0.03em; color: #5b9cf6; }
  .lp-stat-label { font-size: 14px; color: #8a8a8f; max-width: 200px; line-height: 1.5; }

  /* ===== STORY ===== */
  .lp-story { max-width: 1160px; margin: 0 auto; padding: 7rem 2rem 3rem; }
  .lp-story-head { text-align: center; margin-bottom: 5rem; }
  .lp-eyebrow {
    font-size: 12px; font-weight: 700; letter-spacing: 0.2em; color: #5b9cf6;
    display: block; margin-bottom: 1rem;
  }
  .lp-h2 { font-size: clamp(28px, 4.2vw, 46px); font-weight: 800; letter-spacing: -0.025em; line-height: 1.18; }
  .lp-h3 { font-size: clamp(22px, 2.8vw, 32px); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.9rem; }
  .lp-body { font-size: 16px; color: var(--mid); line-height: 1.7; max-width: 480px; }
  .lp-story-sub { font-size: 17px; color: var(--mid); line-height: 1.7; max-width: 560px; margin: 1rem auto 0; }
  .lp-route { margin-bottom: 3rem; }
  .lp-facts { list-style: none; display: grid; gap: 8px; margin-top: 1.25rem; font-size: 15px; color: var(--text); line-height: 1.55; max-width: 480px; }
  .lp-facts li { display: flex; gap: 10px; align-items: baseline; }
  .lp-facts li::before { content: ""; flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); transform: translateY(-2px); }
  .lp-chapter .lp-eyebrow { margin-bottom: 0.75rem; }
  .lp-art-card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }

  .lp-chapter {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;
    padding: 3.5rem 0;
  }
  .lp-chapter--flip .lp-chapter-text { order: 2; }
  .lp-chapter--flip .lp-chapter-visual { order: 1; }
  .lp-chapter-text { min-width: 0; }
  .lp-chapter-visual { min-width: 0; }
  /* ===== FEATURES ===== */
  .lp-features-wrap { max-width: 1160px; margin: 0 auto; padding: 5rem 2rem; }
  .lp-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .lp-feature-card {
    background: linear-gradient(160deg, #1a1a1c, #141415);
    border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.6rem 1.4rem;
    transition: border-color 0.25s, transform 0.25s;
  }
  .lp-feature-card:hover { border-color: rgba(91,156,246,0.3); transform: translateY(-3px); }
  .lp-feature-icon {
    width: 40px; height: 40px; border-radius: 10px; margin-bottom: 1rem;
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--accent); background: var(--accent-soft);
  }
  .lp-feature-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
  .lp-feature-card p { font-size: 14.5px; color: #8a8a8f; line-height: 1.65; }

  /* ===== CTA ===== */
  .lp-cta { padding: 3rem 2rem 7rem; }
  .lp-cta-inner {
    max-width: 880px; margin: 0 auto; text-align: center;
    background:
      radial-gradient(ellipse 70% 120% at 50% -20%, rgba(91,156,246,0.16), transparent 60%),
      linear-gradient(160deg, #1a1a1c, #121213);
    border: 1px solid rgba(91,156,246,0.18); border-radius: 22px;
    padding: 4.5rem 2rem;
  }
  .lp-cta-title { font-size: clamp(24px, 3.6vw, 36px); font-weight: 800; letter-spacing: -0.025em; margin-bottom: 0.8rem; }
  .lp-cta-sub { font-size: 16px; color: var(--mid); margin-bottom: 2.25rem; }
  .lp-cta .lp-hero-actions { justify-content: center; }

  /* ===== FOOTER ===== */
  .lp-footer {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    max-width: 1060px; margin: 0 auto; padding: 1.75rem 2rem;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .lp-footer-copy { font-size: 11.5px; color: #5e5e63; }
  .lp-footer-links { display: flex; flex-wrap: wrap; gap: 4px 6px; }
  .lp-footer-links a {
    font-size: 14px; color: #9a9a9f; text-decoration: none;
    padding: 10px 8px; border-radius: 6px; /* 44px-tall hit area with the line height */
    transition: color 150ms ease-out;
  }
  .lp-footer-links a:hover { color: var(--text); }
  .lp-footer-links a:focus-visible { outline: 2px solid #5b9cf6; outline-offset: 1px; }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 880px) {
    .lp-hero { padding: 6.5rem 1.25rem 5rem; min-height: auto; }
    .lp-hero-inner { grid-template-columns: 1fr; gap: 3rem; }
    .lp-hero-sub { max-width: none; }
    .lp-scroll-hint { display: none; }
    .lp-stats { grid-template-columns: 1fr; gap: 2rem; padding: 2.5rem 1.5rem; }
    .lp-story { padding: 4.5rem 1.25rem 2rem; }
    .lp-story-head { margin-bottom: 3rem; }
    .lp-chapter { grid-template-columns: 1fr; gap: 1.75rem; padding: 2.5rem 0; }
    .lp-chapter--flip .lp-chapter-text { order: 1; }
    .lp-chapter--flip .lp-chapter-visual { order: 2; }
    .lp-facts { max-width: none; }
    .lp-body { max-width: none; }
    .lp-features { grid-template-columns: 1fr; }
    .lp-features-wrap { padding: 3.5rem 1.25rem; }
    .lp-cta { padding: 2rem 1.25rem 4.5rem; }
    .lp-cta-inner { padding: 3rem 1.5rem; }
    .lp-nav { padding: 0.9rem 1.25rem; }
    .lp-footer { flex-direction: column; text-align: center; }
  }
  @media (max-width: 560px) {
    .lp-hero-title { font-size: clamp(34px, 11vw, 48px); }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .lp-scroll-chevron { animation: none; }
  }
`;
