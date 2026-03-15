import { Wallet, Share2, Globe, AtSign, Send } from 'lucide-react';

// ─── Data ──────────────────────────────────────────────────────────────────

const companyLinks = [
  { label: 'About Us', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Blog', href: '#' },
  { label: 'Press Kit', href: '#' },
];

const productLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Security', href: '#' },
  { label: 'Enterprise', href: '#' },
];

const socialLinks = [
  { icon: Share2, label: 'Share', href: '#' },
  { icon: Globe, label: 'Website', href: '#' },
  { icon: AtSign, label: 'Email', href: '#' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Cookie Policy', href: '#' },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function LinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="font-bold text-slate-900 mb-6">{title}</h4>
      <ul className="space-y-4 text-sm text-gray-500">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="hover:text-primary transition-colors">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterForm() {
  return (
    <div>
      <h4 className="font-bold text-slate-900 mb-6">Subscribe to Newsletter</h4>
      <p className="text-sm text-gray-500 mb-4">Get the latest financial tips and app updates.</p>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Email address"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button
          className="bg-primary text-slate-900 p-2 rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
          aria-label="Subscribe"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────

export default function FooterSection() {
  return (
    <footer id="contact" className="bg-white pt-20 pb-10 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Wallet className="text-slate-900 w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                STRUKIN
              </span>
            </a>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Misi kami adalah mendemokratisasi akses ke alat manajemen keuangan berkualitas untuk
              semua orang.
            </p>
            <div className="flex gap-4">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary transition-all bg-slate-50"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <LinkColumn title="Company" links={companyLinks} />
          <LinkColumn title="Product" links={productLinks} />
          <NewsletterForm />

        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © 2024 STRUKIN. All rights reserved. Built for financial freedom.
          </p>
          <div className="flex gap-6 text-xs text-gray-500">
            {legalLinks.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-slate-800 transition-colors">
                {link.label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
