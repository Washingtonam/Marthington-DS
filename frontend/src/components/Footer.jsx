import { Mail, MessageCircle, Phone, Shield, Lock, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useBranding } from "../context/BrandingContext";

export default function Footer({ className = "" }) {
  const { businessName, businessTagline } = useBranding();
  return (
    <footer
      className={`border-t py-12 px-6 text-[var(--footer-text)] ${className}`}
      style={{
        background: "linear-gradient(115deg, var(--footer-from), var(--footer-to))",
        borderTopColor: "var(--footer-border)",
      }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Company Info */}
        <div>
          <h3 className="font-bold text-lg mb-4">{businessName}</h3>
          <p className="text-sm text-[var(--footer-muted)]">
            {businessTagline}. Professional identity verification and business registration platform.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            System Operational
          </div>
        </div>

        {/* Legal Links */}
        <div>
          <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/legal/privacy" className="text-[var(--footer-muted)] hover:text-[var(--footer-text)] transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/legal/terms" className="text-[var(--footer-muted)] hover:text-[var(--footer-text)] transition">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/legal/compliance" className="text-[var(--footer-muted)] hover:text-[var(--footer-text)] transition">
                Compliance & NDPR
              </Link>
            </li>
            <li>
              <Link to="/legal/security" className="text-[var(--footer-muted)] hover:text-[var(--footer-text)] transition">
                Security Statement
              </Link>
            </li>
          </ul>
        </div>

        {/* Support & Contact */}
        <div>
          <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest">Support</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-[var(--footer-muted)]">
              <Mail className="w-4 h-4" />
              <a href="mailto:support@marthington.com" className="hover:text-[var(--footer-text)] transition">
                support@marthington.com
              </a>
            </li>
            <li className="flex items-center gap-2 text-[var(--footer-muted)]">
              <Phone className="w-4 h-4" />
              <a href="tel:+2348073200555" className="hover:text-[var(--footer-text)] transition">
                +234 807 320 0555
              </a>
            </li>
            <li className="flex items-center gap-2 text-[var(--footer-muted)]">
              <MessageCircle className="w-4 h-4" />
              <a href="https://wa.me/2348073200555" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--footer-text)] transition">
                WhatsApp Support
              </a>
            </li>
          </ul>
        </div>

        {/* Trust Badges */}
        <div>
          <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest">Security</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[var(--accent-text)]">
              <Lock className="w-4 h-4" />
              <span>SSL/TLS Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--accent-text)]">
              <Shield className="w-4 h-4" />
              <span>NDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--accent-text)]">
              <Heart className="w-4 h-4" />
              <span>HSTS Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Privacy Note */}
      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t" style={{ borderColor: "var(--footer-border)" }}>
        <div className="rounded-lg p-4 text-xs" style={{ backgroundColor: "var(--footer-panel)", color: "var(--footer-muted)" }}>
          <p className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[var(--accent-text)]" />
            <span className="font-semibold">Privacy & Security Assurance</span>
          </p>
          <p>
            Your data is encrypted in transit using TLS 1.3 and stored securely. We comply with NDPR (Nigeria Data Protection Regulation) 
            and undergo regular security audits. Your financial and identity information is handled with the highest level of 
            confidentiality. For detailed information, visit our <Link to="/legal/privacy" className="font-semibold text-[var(--accent-text)] hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto mt-8 text-center text-xs text-[var(--footer-muted)]">
        <p>&copy; {new Date().getFullYear()} {businessName}. All rights reserved. | Built with professional-grade security standards.</p>
      </div>
    </footer>
  );
}
