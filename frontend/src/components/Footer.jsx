import { Mail, MessageCircle, Phone, Shield, Lock, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-black text-white py-12 px-6 border-t border-gray-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Company Info */}
        <div>
          <h3 className="font-bold text-lg mb-4">Marthington</h3>
          <p className="text-gray-400 text-sm">
            Professional identity verification and business registration platform.
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
              <Link to="/legal/privacy" className="text-gray-400 hover:text-white transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/legal/terms" className="text-gray-400 hover:text-white transition">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/legal/compliance" className="text-gray-400 hover:text-white transition">
                Compliance & NDPR
              </Link>
            </li>
            <li>
              <Link to="/legal/security" className="text-gray-400 hover:text-white transition">
                Security Statement
              </Link>
            </li>
          </ul>
        </div>

        {/* Support & Contact */}
        <div>
          <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest">Support</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-gray-400">
              <Mail className="w-4 h-4" />
              <a href="mailto:support@marthington.com" className="hover:text-white transition">
                support@marthington.com
              </a>
            </li>
            <li className="flex items-center gap-2 text-gray-400">
              <Phone className="w-4 h-4" />
              <a href="tel:+2348000000000" className="hover:text-white transition">
                +234 817 973 6442
              </a>
            </li>
            <li className="flex items-center gap-2 text-gray-400">
              <MessageCircle className="w-4 h-4" />
              <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                WhatsApp Support
              </a>
            </li>
          </ul>
        </div>

        {/* Trust Badges */}
        <div>
          <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest">Security</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <Lock className="w-4 h-4" />
              <span>SSL/TLS Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-400">
              <Shield className="w-4 h-4" />
              <span>NDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-400">
              <Heart className="w-4 h-4" />
              <span>HSTS Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Privacy Note */}
      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-800">
        <div className="bg-slate-800/50 rounded-lg p-4 text-xs text-gray-300">
          <p className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">Privacy & Security Assurance</span>
          </p>
          <p>
            Your data is encrypted in transit using TLS 1.3 and stored securely. We comply with NDPR (Nigeria Data Protection Regulation) 
            and undergo regular security audits. Your financial and identity information is handled with the highest level of 
            confidentiality. For detailed information, visit our <Link to="/legal/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto mt-8 text-center text-xs text-gray-500">
        <p>&copy; 2024 Marthington. All rights reserved. | Built with professional-grade security standards.</p>
      </div>
    </footer>
  );
}
