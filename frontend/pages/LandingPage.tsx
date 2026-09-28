import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { Wordmark } from '../src/components/Mark.tsx';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  useDocumentTitle('EU Statement — Compliant end-user statements');
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (prefersReduced) {
        gsap.set('.lp-reveal, .lp-hero-card, .lp-w > span, .lp-chapter', { opacity: 1, y: 0, x: 0 });
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
        .from('.lp-hero-card', { y: 60, opacity: 0, rotateX: 12, duration: 1.1, ease: 'power4.out' }, '-=0.7')
        .from('.lp-hero-card .lp-mock-row', { opacity: 0, x: -12, stagger: 0.07, duration: 0.4 }, '-=0.6');

      /* Floating idle motion on the hero card */
      gsap.to('.lp-hero-card', {
        y: -12, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6,
      });

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
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
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

      /* Chapter 2: badges pop in */
      gsap.from('.lp-check-item', {
        scale: 0.85, opacity: 0, stagger: 0.14, duration: 0.45, ease: 'back.out(2)',
        scrollTrigger: { trigger: '.lp-checks-card', start: 'top 70%', once: true },
      });

      /* Chapter 3: approve interaction — PENDING flips to APPROVED */
      const approveTl = gsap.timeline({
        scrollTrigger: { trigger: '.lp-dash-card', start: 'top 60%', once: true },
        delay: 0.4,
      });
      approveTl
        .to('.lp-cursor', { opacity: 1, duration: 0.3 })
        .to('.lp-cursor', { x: 0, y: 0, duration: 0.9, ease: 'power2.inOut' })
        .to('.lp-btn-approve', { scale: 0.92, duration: 0.1 }, '+=0.1')
        .to('.lp-btn-approve', { scale: 1, duration: 0.15 })
        .to('.lp-badge-pending', { opacity: 0, scale: 0.8, duration: 0.25 }, '-=0.05')
        .to('.lp-badge-approved', { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, '-=0.1')
        .to('.lp-cursor', { opacity: 0, duration: 0.4, delay: 0.3 });

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
      <style>{styles}</style>
      <div className="lp-root" ref={root}>

        {/* ============ NAV ============ */}
        <nav className="lp-nav">
          <Wordmark size={20} textClassName="lp-brand" accentClassName="lp-brand-accent" />
          <div className="lp-nav-right">
            <Link to="/login" className="lp-nav-link">Sign in</Link>
            <Link to="/register" className="lp-nav-cta">Get started</Link>
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
                <Link to="/register" className="lp-btn-primary">Register your company</Link>
                <a href="#how" className="lp-btn-secondary">See how it works</a>
              </div>
            </div>

            {/* Floating mock form card */}
            <div className="lp-hero-card" aria-hidden="true">
              <div className="lp-mock-head">
                <span className="lp-mock-tag">OFFICIAL DOCUMENT</span>
                <span className="lp-mock-title">End-User Statement</span>
              </div>
              <div className="lp-mock-row"><span className="lp-mock-label">01 · CONTACT</span><span className="lp-mock-line" style={{ width: '70%' }} /></div>
              <div className="lp-mock-row"><span className="lp-mock-label">02 · COMPANY</span><span className="lp-mock-line" style={{ width: '55%' }} /></div>
              <div className="lp-mock-row"><span className="lp-mock-label">03 · SUBSTANCES</span><span className="lp-mock-line" style={{ width: '62%' }} /></div>
              <div className="lp-mock-row">
                <span className="lp-mock-label">04 · IDENTITY</span>
                <span className="lp-mock-pill lp-mock-pill--green">✓ ID VERIFIED</span>
              </div>
              <div className="lp-mock-row">
                <span className="lp-mock-label">VAT / VIES</span>
                <span className="lp-mock-pill lp-mock-pill--green">VALID</span>
              </div>
              <div className="lp-mock-footer"><span className="lp-mock-send">SEND STATEMENT →</span></div>
            </div>
          </div>

          <div className="lp-scroll-hint" aria-hidden="true">scroll<span className="lp-scroll-line" /></div>
        </header>

        {/* ============ STATS ============ */}
        <section className="lp-stats lp-reveal">
          <div className="lp-stat"><span className="lp-stat-num" data-count="100" data-suffix="%">0</span><span className="lp-stat-label">Document photos never reach this platform</span></div>
          <div className="lp-stat"><span className="lp-stat-num" data-count="2" data-suffix="s">0</span><span className="lp-stat-label">Automatic VIES VAT validation</span></div>
          <div className="lp-stat"><span className="lp-stat-num" data-count="18" data-suffix="mo">0</span><span className="lp-stat-label">Auto-deletion retention policy</span></div>
        </section>

        {/* ============ STORYLINE ============ */}
        <main id="how" className="lp-story">
          <div className="lp-story-head lp-reveal">
            <span className="lp-eyebrow">HOW IT WORKS</span>
            <h2 className="lp-h2">From submission to decision<br />in three steps</h2>
          </div>

          {/* Chapter 1 — Collect */}
          <section className="lp-chapter">
            <div className="lp-chapter-text">
              <span className="lp-chapter-num">01</span>
              <h3 className="lp-h3">Share your form link</h3>
              <p className="lp-body">
                Every company gets a unique URL — <code className="lp-code">/your-company</code>,
                or the same form embedded straight into your own website. Customers fill in
                contact, company and substance details, then verify their passport or ID card
                in a secure window from our verification provider.
              </p>
            </div>
            <div className="lp-chapter-visual">
              <div className="lp-visual-card">
                <div className="lp-url-bar"><span className="lp-url-dot" /><span className="lp-url-dot" /><span className="lp-url-dot" /><span className="lp-url-text">eustatement.com/<b>acme-chem</b></span></div>
                <div className="lp-form-mini">
                  <div className="lp-fm-field"><span className="lp-fm-label">EMAIL *</span><span className="lp-fm-input" /></div>
                  <div className="lp-fm-field"><span className="lp-fm-label">VAT NUMBER *</span><span className="lp-fm-input" /></div>
                  <div className="lp-fm-field"><span className="lp-fm-label">IDENTITY DOCUMENT *</span>
                    <span className="lp-fm-upload">📷 Verified in a secure window — photos never reach us</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 2 — Verify */}
          <section className="lp-chapter lp-chapter--flip">
            <div className="lp-chapter-text">
              <span className="lp-chapter-num">02</span>
              <h3 className="lp-h3">Verification runs itself</h3>
              <p className="lp-body">
                VAT numbers are checked live against the EU VIES registry. Passports and ID
                cards are verified by Didit — document authenticity, liveness and face match —
                on their hosted flow, so the images never touch this platform. Every result is
                a flag for your reviewer: nothing is approved or denied automatically.
              </p>
            </div>
            <div className="lp-chapter-visual">
              <div className="lp-visual-card lp-checks-card">
                <div className="lp-check-item lp-check-item--ok"><span className="lp-check-ico">✓</span><div><b>VIES — VALID</b><span>NL8045.36.273.B01 · checked live</span></div></div>
                <div className="lp-check-item lp-check-item--ok"><span className="lp-check-ico">✓</span><div><b>DOCUMENT — APPROVED</b><span>Passport · NL · authenticity verified</span></div></div>
                <div className="lp-check-item lp-check-item--ok"><span className="lp-check-ico">✓</span><div><b>LIVENESS &amp; FACE MATCH — PASSED</b><span>selfie matched to the document photo</span></div></div>
                <div className="lp-check-item lp-check-item--muted"><span className="lp-check-ico">🔒</span><div><b>SESSION PURGED</b><span>images deleted at the provider once the result is in</span></div></div>
              </div>
            </div>
          </section>

          {/* Chapter 3 — Decide */}
          <section className="lp-chapter">
            <div className="lp-chapter-text">
              <span className="lp-chapter-num">03</span>
              <h3 className="lp-h3">Approve or deny in one click</h3>
              <p className="lp-body">
                Your team reviews everything in a shared dashboard with role-based access —
                Owners, Employee+ and Employees each see exactly what they should.
                Applicants are notified by email automatically.
              </p>
            </div>
            <div className="lp-chapter-visual">
              <div className="lp-visual-card lp-dash-card">
                <div className="lp-dash-tabs"><span className="lp-dash-tab lp-dash-tab--on">Pending 1</span><span className="lp-dash-tab">Approved 12</span><span className="lp-dash-tab">Denied 3</span></div>
                <div className="lp-dash-row">
                  <div className="lp-dash-cell"><b>ORD-2481</b><span>Acme Chemicals BV</span></div>
                  <div className="lp-dash-cell lp-dash-cell--badges">
                    <span className="lp-mock-pill lp-mock-pill--green">VIES VALID</span>
                    <span className="lp-badge-stack">
                      <span className="lp-mock-pill lp-mock-pill--amber lp-badge-pending">PENDING</span>
                      <span className="lp-mock-pill lp-mock-pill--green lp-badge-approved">APPROVED</span>
                    </span>
                  </div>
                  <div className="lp-dash-cell lp-dash-cell--actions">
                    <span className="lp-btn-approve">Approve</span>
                    <span className="lp-btn-deny">Deny</span>
                    <span className="lp-cursor" aria-hidden="true">▲</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ============ FEATURES ============ */}
        <section className="lp-features-wrap">
          <div className="lp-story-head lp-reveal">
            <span className="lp-eyebrow">BUILT FOR COMPLIANCE TEAMS</span>
            <h2 className="lp-h2">Everything you need, nothing you don't</h2>
          </div>
          <div className="lp-features">
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon">🛡</div><h3>Privacy by design</h3><p>Document photos never reach this platform, and the provider's session is deleted once the result is stored. Only the minimum fields required under GDPR are kept, auto-deleted after 18 months.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon">👥</div><h3>Team roles &amp; invites</h3><p>Invite teammates by email. Owners manage members, Employee+ reviews submissions, Employees view decisions.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon">🧩</div><h3>Embed it on your site</h3><p>Copy one snippet and the form runs inside your own website. Customers never leave your page, and their answers still come straight to us.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon">⚖️</div><h3>Fail-closed approval</h3><p>Approve stays locked while any check is red. Waiving one needs a written reason, stored against the reviewer's name — nothing is ever decided automatically.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon">✉️</div><h3>Email notifications</h3><p>Applicants are kept in the loop at every step: received, approved or denied with a reason.</p></div>
            <div className="lp-feature-card lp-reveal"><div className="lp-feature-icon">🔍</div><h3>Precursor screening</h3><p>Every substance is resolved through PubChem and read against the Annexes of Reg. (EU) 2019/1148, quoting the limit value that applies.</p></div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="lp-cta lp-reveal">
          <div className="lp-cta-inner">
            <h2 className="lp-cta-title">Start collecting statements today</h2>
            <p className="lp-cta-sub">Register your company, share your form link, and review your first submission in minutes.</p>
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-btn-primary lp-btn-lg">Register your company</Link>
              <Link to="/login" className="lp-btn-secondary lp-btn-lg">Sign in</Link>
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer className="lp-footer">
          <span className="lp-brand lp-brand--small">eu<span className="lp-brand-accent">statement</span></span>
          <span className="lp-footer-copy">© {new Date().getFullYear()} eustatement — end-user statement management</span>
        </footer>

      </div>
    </>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  html, body { background: #0b0d13; font-family: 'Inter', system-ui, sans-serif; }
  ::selection { background: rgba(91,156,246,0.35); }

  .lp-root { background: #0b0d13; color: #f0f2f8; overflow-x: hidden; }

  /* ===== NAV ===== */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 2rem;
    background: rgba(11,13,19,0.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .lp-brand { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: #f0f2f8; }
  .lp-brand-accent { color: #5b9cf6; }
  .lp-brand--small { font-size: 14px; }
  .lp-nav-right { display: flex; align-items: center; gap: 1.25rem; }
  .lp-nav-link { font-size: 13px; font-weight: 500; color: #8b93a5; text-decoration: none; transition: color 0.15s; }
  .lp-nav-link:hover { color: #f0f2f8; }
  .lp-nav-cta {
    font-size: 13px; font-weight: 600; color: #fff; text-decoration: none;
    background: #1a3160; padding: 8px 16px; border-radius: 8px; transition: background 0.2s;
  }
  .lp-nav-cta:hover { background: #254a8f; }

  /* ===== HERO ===== */
  .lp-hero {
    position: relative; min-height: 100vh;
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
  .lp-orb-a { width: 480px; height: 480px; top: -10%; left: -8%; background: rgba(26,49,96,0.55); }
  .lp-orb-b { width: 420px; height: 420px; bottom: -16%; right: -6%; background: rgba(91,156,246,0.16); }

  .lp-hero-inner {
    position: relative; z-index: 1;
    display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 3.5rem; align-items: center;
    max-width: 1120px; margin: 0 auto; width: 100%;
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
  .lp-hero-sub { font-size: 16px; color: #8b93a5; max-width: 460px; line-height: 1.7; margin-bottom: 2.25rem; }
  .lp-hero-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .lp-btn-primary {
    font-size: 13px; font-weight: 600; color: #fff; text-decoration: none;
    background: linear-gradient(135deg, #254a8f, #1a3160); border-radius: 10px; padding: 13px 24px;
    border: 1px solid transparent;
    box-shadow: 0 8px 24px rgba(26,49,96,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
    transition: transform 0.15s, box-shadow 0.2s;
  }
  .lp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(37,74,143,0.55), inset 0 1px 0 rgba(255,255,255,0.1); }
  .lp-btn-secondary {
    font-size: 13px; font-weight: 500; color: #b6bdca; text-decoration: none;
    border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; padding: 13px 24px;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
  }
  .lp-btn-secondary:hover { border-color: rgba(255,255,255,0.3); color: #f0f2f8; background: rgba(255,255,255,0.03); }
  .lp-btn-lg { padding: 15px 30px; font-size: 14px; }

  /* Hero mock card */
  .lp-hero-card {
    background: linear-gradient(160deg, #161a25, #11141d);
    border: 1px solid rgba(255,255,255,0.09); border-radius: 18px; padding: 1.6rem;
    box-shadow: 0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(91,156,246,0.05);
    transform-style: preserve-3d; perspective: 800px;
  }
  .lp-mock-head { display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.25rem; }
  .lp-mock-tag {
    align-self: flex-start; font-size: 8px; font-weight: 700; letter-spacing: 0.18em;
    color: #f04e5e; border: 1px solid rgba(240,78,94,0.4); padding: 3px 9px; border-radius: 3px;
  }
  .lp-mock-title { font-size: 20px; font-weight: 700; color: #8eb8f8; letter-spacing: -0.01em; }
  .lp-mock-row {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: 0.7rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .lp-mock-label { font-size: 9px; font-weight: 600; letter-spacing: 0.14em; color: #5d6577; white-space: nowrap; }
  .lp-mock-line { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.08); }
  .lp-mock-pill {
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em; padding: 3px 10px; border-radius: 100px; white-space: nowrap;
  }
  .lp-mock-pill--green { color: #3ecf8e; background: rgba(62,207,142,0.1); border: 1px solid rgba(62,207,142,0.3); }
  .lp-mock-pill--amber { color: #e8b54a; background: rgba(232,181,74,0.1); border: 1px solid rgba(232,181,74,0.3); }
  .lp-mock-footer { display: flex; justify-content: flex-end; padding-top: 1.1rem; }
  .lp-mock-send {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: #fff;
    background: #1a3160; padding: 9px 18px; border-radius: 8px;
  }

  .lp-scroll-hint {
    position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%);
    font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #4e566e;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .lp-scroll-line { width: 1px; height: 36px; background: linear-gradient(#4e566e, transparent); display: block; }

  /* ===== STATS ===== */
  .lp-stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
    max-width: 1000px; margin: 0 auto; padding: 2rem;
    border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .lp-stat { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
  .lp-stat-num { font-size: clamp(30px, 4vw, 44px); font-weight: 800; letter-spacing: -0.03em; color: #5b9cf6; }
  .lp-stat-label { font-size: 12px; color: #6b7485; max-width: 200px; line-height: 1.5; }

  /* ===== STORY ===== */
  .lp-story { max-width: 1060px; margin: 0 auto; padding: 7rem 2rem 3rem; }
  .lp-story-head { text-align: center; margin-bottom: 5rem; }
  .lp-eyebrow {
    font-size: 10px; font-weight: 700; letter-spacing: 0.22em; color: #5b9cf6;
    display: block; margin-bottom: 1rem;
  }
  .lp-h2 { font-size: clamp(26px, 4vw, 40px); font-weight: 800; letter-spacing: -0.025em; line-height: 1.18; }
  .lp-h3 { font-size: clamp(20px, 2.6vw, 27px); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.9rem; }
  .lp-body { font-size: 14.5px; color: #8b93a5; line-height: 1.75; max-width: 420px; }
  .lp-code {
    font-family: 'SF Mono', Menlo, monospace; font-size: 12.5px; color: #8eb8f8;
    background: rgba(91,156,246,0.1); padding: 2px 7px; border-radius: 5px;
  }

  .lp-chapter {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;
    padding: 3.5rem 0;
  }
  .lp-chapter--flip .lp-chapter-text { order: 2; }
  .lp-chapter--flip .lp-chapter-visual { order: 1; }
  .lp-chapter-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px;
    font-size: 13px; font-weight: 700; color: #5b9cf6;
    background: rgba(91,156,246,0.1); border: 1px solid rgba(91,156,246,0.25);
    margin-bottom: 1.1rem;
  }

  .lp-visual-card {
    background: linear-gradient(160deg, #151926, #10131c);
    border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.4rem;
    box-shadow: 0 30px 70px rgba(0,0,0,0.45);
  }

  /* Chapter 1 visual */
  .lp-url-bar {
    display: flex; align-items: center; gap: 6px;
    background: #0c0f16; border: 1px solid rgba(255,255,255,0.07); border-radius: 9px;
    padding: 9px 12px; margin-bottom: 1.1rem;
  }
  .lp-url-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.12); }
  .lp-url-text { font-family: 'SF Mono', Menlo, monospace; font-size: 11px; color: #6b7485; margin-left: 8px; }
  .lp-url-text b { color: #8eb8f8; font-weight: 600; }
  .lp-form-mini { display: flex; flex-direction: column; gap: 0.9rem; }
  .lp-fm-field { display: flex; flex-direction: column; gap: 6px; }
  .lp-fm-label { font-size: 9px; font-weight: 600; letter-spacing: 0.13em; color: #5d6577; }
  .lp-fm-input { height: 34px; border-radius: 8px; background: #0c0f16; border: 1px solid rgba(255,255,255,0.08); }
  .lp-fm-upload {
    font-size: 11.5px; color: #8b93a5; border: 1.5px dashed rgba(255,255,255,0.14);
    border-radius: 8px; padding: 12px 14px;
  }

  /* Chapter 2 visual */
  .lp-checks-card { display: flex; flex-direction: column; gap: 0.7rem; }
  .lp-check-item {
    display: flex; align-items: center; gap: 12px;
    background: #0c0f16; border: 1px solid rgba(62,207,142,0.18); border-radius: 10px; padding: 11px 14px;
  }
  .lp-check-item b { display: block; font-size: 11px; letter-spacing: 0.07em; color: #e8eaf0; }
  .lp-check-item span:not(.lp-check-ico) { display: block; font-size: 10.5px; color: #5d6577; margin-top: 2px; }
  .lp-check-ico {
    flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 13px; color: #3ecf8e; background: rgba(62,207,142,0.1);
  }
  .lp-check-item--muted { border-color: rgba(255,255,255,0.08); }
  .lp-check-item--muted .lp-check-ico { color: #8b93a5; background: rgba(255,255,255,0.05); font-size: 11px; }

  /* Chapter 3 visual */
  .lp-dash-tabs { display: flex; gap: 6px; margin-bottom: 1rem; }
  .lp-dash-tab {
    font-size: 10.5px; font-weight: 600; color: #6b7485;
    border: 1px solid rgba(255,255,255,0.08); border-radius: 100px; padding: 5px 13px;
  }
  .lp-dash-tab--on { color: #f0f2f8; background: rgba(255,255,255,0.06); }
  .lp-dash-row {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    background: #0c0f16; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 13px 15px;
  }
  .lp-dash-cell b { display: block; font-size: 12.5px; color: #f0f2f8; }
  .lp-dash-cell span:not(.lp-mock-pill) { font-size: 10.5px; color: #5d6577; }
  .lp-dash-cell--badges { display: flex; align-items: center; gap: 8px; }
  .lp-badge-stack { position: relative; display: inline-flex; }
  .lp-badge-approved { position: absolute; inset: 0; opacity: 0; transform: scale(0.8); display: inline-flex; align-items: center; justify-content: center; }
  .lp-dash-cell--actions { position: relative; display: flex; gap: 8px; }
  .lp-btn-approve, .lp-btn-deny {
    font-size: 11px; font-weight: 600; border-radius: 100px; padding: 6px 15px; display: inline-block;
  }
  .lp-btn-approve { color: #3ecf8e; border: 1px solid rgba(62,207,142,0.4); background: rgba(62,207,142,0.08); }
  .lp-btn-deny { color: #f04e5e; border: 1px solid rgba(240,78,94,0.35); background: rgba(240,78,94,0.07); }
  .lp-cursor {
    position: absolute; left: 18px; top: 30px; opacity: 0;
    transform: translate(70px, 50px) rotate(-15deg);
    font-size: 14px; color: #f0f2f8; pointer-events: none;
    text-shadow: 0 2px 8px rgba(0,0,0,0.6);
  }

  /* ===== FEATURES ===== */
  .lp-features-wrap { max-width: 1060px; margin: 0 auto; padding: 5rem 2rem; }
  .lp-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .lp-feature-card {
    background: linear-gradient(160deg, #151926, #10131c);
    border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.6rem 1.4rem;
    transition: border-color 0.25s, transform 0.25s;
  }
  .lp-feature-card:hover { border-color: rgba(91,156,246,0.3); transform: translateY(-3px); }
  .lp-feature-icon { font-size: 19px; margin-bottom: 0.9rem; }
  .lp-feature-card h3 { font-size: 14.5px; font-weight: 700; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
  .lp-feature-card p { font-size: 12.5px; color: #6b7485; line-height: 1.65; }

  /* ===== CTA ===== */
  .lp-cta { padding: 3rem 2rem 7rem; }
  .lp-cta-inner {
    max-width: 880px; margin: 0 auto; text-align: center;
    background:
      radial-gradient(ellipse 70% 120% at 50% -20%, rgba(91,156,246,0.16), transparent 60%),
      linear-gradient(160deg, #151926, #0e1119);
    border: 1px solid rgba(91,156,246,0.18); border-radius: 22px;
    padding: 4.5rem 2rem;
  }
  .lp-cta-title { font-size: clamp(24px, 3.6vw, 36px); font-weight: 800; letter-spacing: -0.025em; margin-bottom: 0.8rem; }
  .lp-cta-sub { font-size: 14px; color: #8b93a5; margin-bottom: 2.25rem; }
  .lp-cta .lp-hero-actions { justify-content: center; }

  /* ===== FOOTER ===== */
  .lp-footer {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    max-width: 1060px; margin: 0 auto; padding: 1.75rem 2rem;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .lp-footer-copy { font-size: 11.5px; color: #4e566e; }

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
    .lp-dash-row { flex-direction: column; align-items: flex-start; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
  }
`;
