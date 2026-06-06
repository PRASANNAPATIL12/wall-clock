import { memo } from 'react';

/**
 * Scene 8 — Footer (Credits Roll)
 *
 * Four columns (Product / Company / Legal / Connect), a small brand
 * mark, "Back to top" link, and a credit line in Special Elite to
 * rhyme with the Scene 1 typewriter tagline.
 *
 * The footer is intentionally calm — no big CTAs, no email capture,
 * no newsletter. The story is over.
 */
export const Scene8Footer = memo(function Scene8Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      id="scene-8"
      className="scene scene--footer"
      data-scene="8"
      aria-label="Footer"
    >
      <div className="footer-stage">

        {/* Brand mark */}
        <div className="footer-brand">
          <a href="/" className="footer-brand__name" aria-label="Focus Clock — home">
            Focus Clock
          </a>
          <p className="footer-brand__tagline">
            A quiet clock that respects your attention.
          </p>
        </div>

        {/* Four columns */}
        <nav className="footer-cols" aria-label="Footer navigation">
          <section className="footer-col">
            <h3 className="footer-col__title">Product</h3>
            <ul role="list">
              <li><a href="/app">Open the clock</a></li>
              <li><a href="/#scene-4">Features</a></li>
              <li><a href="/#scene-5">Roadmap</a></li>
              <li><a href="/#faq-heading">FAQ</a></li>
            </ul>
          </section>

          <section className="footer-col">
            <h3 className="footer-col__title">Company</h3>
            <ul role="list">
              <li><a href="mailto:prasannagoudasp12@gmail.com">Contact</a></li>
              <li><a href="https://github.com/PRASANNAPATIL12/wall-clock" rel="noopener noreferrer" target="_blank">GitHub</a></li>
            </ul>
          </section>

          <section className="footer-col">
            <h3 className="footer-col__title">Legal</h3>
            <ul role="list">
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
            </ul>
          </section>

          <section className="footer-col">
            <h3 className="footer-col__title">Connect</h3>
            <ul role="list">
              <li><a href="https://github.com/PRASANNAPATIL12/wall-clock" rel="noopener noreferrer" target="_blank">Source on GitHub</a></li>
              <li><a href="mailto:prasannagoudasp12@gmail.com">Email</a></li>
            </ul>
          </section>
        </nav>

        {/* Bottom bar — credits + copyright + back to top */}
        <div className="footer-bottom">
          <p className="footer-credit">
            © {year} Focus Clock. Built with care by Prasannagouda Patil.
          </p>
          <a
            href="#scene-1"
            className="footer-top-link"
            aria-label="Back to top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                 strokeLinejoin="round" aria-hidden="true">
              <path d="M18 15l-6-6-6 6" />
            </svg>
            <span>Back to top</span>
          </a>
        </div>

      </div>
    </footer>
  );
});
