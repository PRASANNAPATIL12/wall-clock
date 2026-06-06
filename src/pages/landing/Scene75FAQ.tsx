import { memo, useEffect, useState } from 'react';

/**
 * Scene 7.5 — FAQ
 *
 * Six common questions in a clean accordion. Each is also rendered into
 * a `FAQPage` schema JSON-LD block for Google rich results.
 *
 * This is placed BEFORE the footer because:
 *   · Last thing users see before the credits roll
 *   · Catches "I almost converted but had one question" hesitations
 *   · FAQ schema lifts SEO for question-style queries
 */

interface QA {
  question: string;
  answer:   string;
}

const FAQS: readonly QA[] = [
  {
    question: 'Is Focus Clock free?',
    answer:
      'Yes. Focus Clock is free to use, with no ads, no tracking, and no data selling. ' +
      'Every feature on the landing page is included at no cost.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'No. The clock and focus ring work fully without an account. Sessions only persist ' +
      'across visits if you sign in — anonymous sessions are not saved.',
  },
  {
    question: 'Does it work offline?',
    answer:
      'The clock and focus timer run entirely in your browser, so they continue to work ' +
      'when you lose connectivity. Saving sessions to your account requires a connection.',
  },
  {
    question: 'How does focus tracking work?',
    answer:
      'You set a goal by clicking the ring three times: click 1 starts tracking, click 2 ' +
      'sets the end time, click 3 ends the session. Digital mode offers a Start Focus ' +
      'button with tag and duration pickers instead.',
  },
  {
    question: 'Can I export my data?',
    answer:
      'Yes. Signed-in users can export their entire session history as JSON at any time ' +
      'from Settings → Account. Your data belongs to you.',
  },
  {
    question: 'Why isn\'t this a Pomodoro timer?',
    answer:
      'Pomodoro imposes a fixed 25-minute structure on every task. Focus Clock observes ' +
      'your natural rhythm and records it. We believe experienced deep workers benefit ' +
      'more from data than from enforcement.',
  },
];

/* JSON-LD schema for Google FAQ rich results */
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type':    'FAQPage',
  mainEntity: FAQS.map((qa) => ({
    '@type': 'Question',
    name:    qa.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text:    qa.answer,
    },
  })),
};

export const Scene75FAQ = memo(function Scene75FAQ() {
  // Inject the JSON-LD schema into <head> on mount, remove on unmount
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id   = 'faq-schema';
    script.textContent = JSON.stringify(FAQ_SCHEMA);
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById('faq-schema');
      if (el) el.remove();
    };
  }, []);

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      id="scene-7-5"
      className="scene scene--faq"
      data-scene="7.5"
      aria-labelledby="faq-heading"
    >
      <div className="faq-stage">
        <p className="faq-eyebrow">Questions</p>
        <h2 className="faq-heading" id="faq-heading">
          Frequently asked.
        </h2>

        <ul className="faq-list" role="list">
          {FAQS.map((qa, i) => {
            const isOpen = openIdx === i;
            return (
              <li key={qa.question} className={`faq-item${isOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                >
                  <span>{qa.question}</span>
                  <span className="faq-q__chev" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                         strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
                <div
                  id={`faq-a-${i}`}
                  className="faq-a"
                  role="region"
                  aria-hidden={!isOpen}
                >
                  <p>{qa.answer}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
});
