import Link from 'next/link';
import { ShieldCheck, LockKeyhole, MessageCircle, Eye, Heart, Smartphone } from 'lucide-react';
import { SafeherPage } from '@/components/safeher-page';
export default function Page() {
  const cards = [
    {
      title: 'Protect your accounts',
      icon: LockKeyhole,
      text: 'Use unique passwords and two-step verification. Review recovery settings. If your device is monitored, changes may be noticed.',
      slug: 'digital-privacy',
    },
    {
      title: 'Handle harassment',
      icon: MessageCircle,
      text: 'Consider mute, block, or report tools if safe. Talk to someone you trust and choose a safer way to seek support.',
      slug: 'online-harassment',
    },
    {
      title: 'Respond to blackmail',
      icon: ShieldCheck,
      text: 'You deserve support. Avoid sharing more private material. Consider a trusted professional before actions that may alert the person.',
      slug: 'online-harassment',
    },
    {
      title: 'Recognize online grooming',
      icon: Eye,
      text: 'Pressure to keep secrets, share intimate images, or move to private chats can be warning signs. A trusted adult or professional can help.',
      slug: 'coercion',
    },
    {
      title: 'Understand digital consent',
      icon: Heart,
      text: 'Ask before sharing someone’s photo, messages, or location. Consent to create an image does not mean consent to publish it.',
      slug: 'consent',
    },
    {
      title: 'Choose what you share',
      icon: Smartphone,
      text: 'Review post visibility and location permissions. Keep passwords and verification codes private.',
      slug: 'digital-privacy',
    },
  ];
  return (
    <SafeherPage
      eyebrow="DIGITAL SAFETY CENTRE"
      title="Your online world. Your boundaries."
      intro="Practical steps to protect your information and find support when online spaces feel unsafe."
    >
      <div className="notice">
        Quick Exit opens Wikipedia immediately. It does not remove browser history, network records,
        screenshots, downloads, or other traces. SafeHer does not collect evidence or screenshots.
      </div>
      <div className="sh-grid">
        {cards.map((c) => (
          <Link key={c.title} href={'/learn/' + c.slug} className="sh-feature">
            <span className="sh-feature-icon mint">
              <c.icon />
            </span>
            <h2>{c.title}</h2>
            <p>{c.text}</p>
            <span className="sh-card-link">Read guidance →</span>
          </Link>
        ))}
      </div>
      <p className="sh-small">
        Guidance references{' '}
        <a href="https://www.unicef.org/stories/how-to-stop-cyberbullying">
          UNICEF’s cyberbullying resources
        </a>
        . Demonstration content · last reviewed 12 October 2026. Qualified support can help you
        consider the safety of individual actions.
      </p>
    </SafeherPage>
  );
}
