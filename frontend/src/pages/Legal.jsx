import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, FileText, Lock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const LEGAL_DOCUMENTS = {
  privacy: {
    title: "Privacy Policy",
    icon: <Lock className="w-8 h-8" />,
    lastUpdated: "January 2024",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold mb-3">Privacy Policy</h2>
          <p className="text-gray-600">
            Marthington ("we," "our," or "us") operates the Marthington platform. 
            This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">1. Information Collection and Use</h3>
          <p className="text-gray-600 mb-3">
            We collect several different types of information for various purposes to provide and improve our service to you.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong>Personal Data:</strong> Name, email address, phone number, and national identification numbers (NIN)</li>
            <li><strong>Identity Verification Data:</strong> Biometric data, government-issued IDs, and verification records</li>
            <li><strong>Financial Data:</strong> Wallet transactions, payment history, and billing information</li>
            <li><strong>Technical Data:</strong> IP address, browser type, operating system, and usage patterns</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">2. How We Use Your Information</h3>
          <p className="text-gray-600 mb-3">We use collected data for various purposes:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>To verify your identity and provide verification services</li>
            <li>To process your requests and manage your account</li>
            <li>To provide customer support and respond to your inquiries</li>
            <li>To improve and optimize our services</li>
            <li>To comply with legal obligations and regulatory requirements</li>
            <li>To detect and prevent fraud and security incidents</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">3. Data Security</h3>
          <p className="text-gray-600 mb-3">
            The security of your data is important to us but remember that no method of transmission over the Internet or electronic storage is 100% secure. 
            While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Our Security Measures:</h4>
            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
              <li>End-to-end TLS 1.3 encryption for all data in transit</li>
              <li>Advanced encryption standards (AES-256) for data at rest</li>
              <li>Regular security audits and penetration testing</li>
              <li>Strict access controls and role-based permissions</li>
              <li>Multi-factor authentication for admin accounts</li>
            </ul>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">4. NDPR Compliance</h3>
          <p className="text-gray-600">
            We comply with the Nigeria Data Protection Regulation (NDPR). Your personal data will not be shared with third parties 
            without your explicit consent, except as required by law or for the purposes of providing our services with trusted partners who are 
            also NDPR compliant.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">5. Your Rights</h3>
          <p className="text-gray-600 mb-3">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Access your personal data</li>
            <li>Rectify inaccurate or incomplete data</li>
            <li>Request deletion of your data (subject to legal obligations)</li>
            <li>Withdraw consent at any time</li>
            <li>Lodge a complaint with the NDPR</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">6. Contact Us</h3>
          <p className="text-gray-600">
            If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
          </p>
          <div className="mt-3 p-4 bg-gray-100 rounded-lg">
            <p><strong>Email:</strong> privacy@xcombinator.com</p>
            <p><strong>Phone:</strong> +234 817 973 6442</p>
          </div>
        </section>
      </div>
    )
  },
  terms: {
    title: "Terms of Service",
    icon: <FileText className="w-8 h-8" />,
    lastUpdated: "January 2024",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold mb-3">Terms of Service</h2>
          <p className="text-gray-600">
            These Terms of Service ("Terms") govern your use of the Marthington platform and services. 
            By accessing or using our service, you agree to be bound by these Terms.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">1. Use License</h3>
          <p className="text-gray-600">
            Permission is granted to temporarily download one copy of the materials (information or software) on Marthington's platform for personal, 
            non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600 mt-3">
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software contained on the platform</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">2. Disclaimer of Warranties</h3>
          <p className="text-gray-600">
            The materials on Marthington's platform are provided on an 'as is' basis. Marthington makes no warranties, 
            expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, 
            implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">3. Limitations of Liability</h3>
          <p className="text-gray-600">
            In no event shall Marthington or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, 
            or due to business interruption) arising out of the use or inability to use the materials on Marthington's platform, 
            even if Marthington or a representative has been notified orally or in writing of the possibility of such damage.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">4. Accuracy of Materials</h3>
          <p className="text-gray-600">
            The materials appearing on Marthington's platform could include technical, typographical, or photographic errors. 
            Marthington does not warrant that any of the materials on its platform are accurate, complete, or current. 
            Marthington may make changes to the materials contained on its platform at any time without notice.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">5. User Responsibilities</h3>
          <p className="text-gray-600 mb-3">You agree to:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Provide accurate and complete information</li>
            <li>Maintain the confidentiality of your account credentials</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not engage in fraudulent or illegal activities</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">6. Governing Law</h3>
          <p className="text-gray-600">
            These Terms and Conditions are governed by and construed in accordance with the laws of the Federal Republic of Nigeria, 
            and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">7. Contact Information</h3>
          <p className="text-gray-600">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="mt-3 p-4 bg-gray-100 rounded-lg">
            <p><strong>Email:</strong> legal@xcombinator.com</p>
            <p><strong>Phone:</strong> +234 817 973 6442</p>
          </div>
        </section>
      </div>
    )
  },
  compliance: {
    title: "Compliance & NDPR",
    icon: <CheckCircle className="w-8 h-8" />,
    lastUpdated: "January 2024",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold mb-3">Compliance & NDPR Statement</h2>
          <p className="text-gray-600">
            Marthington is committed to maintaining the highest standards of data protection and regulatory compliance.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Nigeria Data Protection Regulation (NDPR) Compliance</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
            <p className="font-semibold text-green-900 mb-2">✓ NDPR Registered Data Processor</p>
            <p className="text-gray-700">
              Marthington complies with all provisions of the Nigeria Data Protection Regulation and maintains full transparency 
              in our data handling practices.
            </p>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Key Compliance Areas</h3>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <strong>Data Minimization:</strong>
                <p className="text-gray-600 text-sm">We only collect data necessary for our services</p>
              </div>
            </li>
            <li className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <strong>Purpose Limitation:</strong>
                <p className="text-gray-600 text-sm">Data is used only for stated purposes</p>
              </div>
            </li>
            <li className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <strong>Data Integrity:</strong>
                <p className="text-gray-600 text-sm">We ensure accuracy and keep data up-to-date</p>
              </div>
            </li>
            <li className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <strong>Confidentiality:</strong>
                <p className="text-gray-600 text-sm">Data is protected with industry-leading encryption</p>
              </div>
            </li>
            <li className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <strong>Availability:</strong>
                <p className="text-gray-600 text-sm">99.9% uptime SLA with redundant systems</p>
              </div>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Regular Audits & Assessments</h3>
          <p className="text-gray-600">
            Marthington undergoes quarterly security audits and annual compliance reviews to ensure ongoing adherence to NDPR 
            and international data protection standards.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Data Breach Notification</h3>
          <p className="text-gray-600">
            In the unlikely event of a data breach, we will notify affected individuals within 72 hours and cooperate fully 
            with regulatory authorities as required by law.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Contact Our Compliance Officer</h3>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p><strong>Data Protection Officer:</strong> dpo@xcombinator.com</p>
            <p><strong>Compliance Team:</strong> compliance@xcombinator.com</p>
          </div>
        </section>
      </div>
    )
  },
  security: {
    title: "Security Statement",
    icon: <Shield className="w-8 h-8" />,
    lastUpdated: "January 2024",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold mb-3">Security Statement</h2>
          <p className="text-gray-600">
            At Marthington, security is at the core of everything we do. We implement enterprise-grade security measures 
            to protect your sensitive identity and financial data.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Infrastructure Security</h3>
          <ul className="space-y-2 text-gray-600">
            <li><strong>TLS 1.3 Encryption:</strong> All data in transit is encrypted with TLS 1.3</li>
            <li><strong>HSTS Headers:</strong> Browsers only connect via secure HTTPS channels</li>
            <li><strong>CORS Protection:</strong> Strict cross-origin policies prevent unauthorized access</li>
            <li><strong>DDoS Protection:</strong> Enterprise-grade DDoS mitigation via Cloudflare</li>
            <li><strong>WAF (Web Application Firewall):</strong> Advanced protection against common attacks</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Data Protection</h3>
          <ul className="space-y-2 text-gray-600">
            <li><strong>AES-256 Encryption:</strong> All sensitive data encrypted at rest</li>
            <li><strong>Database Security:</strong> Role-based access controls (RBAC) and audit logging</li>
            <li><strong>Sensitive Field Masking:</strong> NIN and identity numbers are masked in admin views</li>
            <li><strong>Secure Backups:</strong> Regular encrypted backups with geographic redundancy</li>
            <li><strong>Data Retention:</strong> Automatic purging of old logs per retention policy</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Application Security</h3>
          <ul className="space-y-2 text-gray-600">
            <li><strong>Authentication:</strong> OAuth 2.0 and JWT tokens with secure storage</li>
            <li><strong>Rate Limiting:</strong> Protection against brute force and API abuse</li>
            <li><strong>Input Validation:</strong> Comprehensive validation and sanitization</li>
            <li><strong>SQL Injection Prevention:</strong> Parameterized queries and ORM frameworks</li>
            <li><strong>XSS Protection:</strong> Content Security Policy headers and output encoding</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Monitoring & Response</h3>
          <ul className="space-y-2 text-gray-600">
            <li><strong>24/7 Security Monitoring:</strong> Real-time threat detection and alerting</li>
            <li><strong>Incident Response:</strong> Rapid response team with documented procedures</li>
            <li><strong>Security Logging:</strong> Comprehensive audit trails for compliance</li>
            <li><strong>Penetration Testing:</strong> Annual third-party security assessments</li>
            <li><strong>Vulnerability Management:</strong> Regular scanning and prompt patching</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-3">Reporting Security Issues</h3>
          <p className="text-gray-600 mb-3">
            If you discover a security vulnerability, please report it responsibly to:
          </p>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p><strong>Security Team:</strong> security@xcombinator.com</p>
            <p className="text-sm text-gray-600 mt-2">
              Please do not publicly disclose security issues. We'll acknowledge your report within 24 hours 
              and work with you on a resolution.
            </p>
          </div>
        </section>
      </div>
    )
  }
};

export default function Legal() {
  const { docType = "privacy" } = useParams();
  const doc = LEGAL_DOCUMENTS[docType] || LEGAL_DOCUMENTS.privacy;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-blue-600">{doc.icon}</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{doc.title}</h1>
              <p className="text-sm text-gray-500">Last updated: {doc.lastUpdated}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            {Object.entries(LEGAL_DOCUMENTS).map(([key, item]) => (
              <Link
                key={key}
                to={`/legal/${key}`}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition ${
                  docType === key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {doc.content}
        </div>
      </div>

      {/* Security Note */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex gap-4">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Your Privacy Matters</h3>
              <p className="text-sm text-blue-800">
                We take your privacy and security seriously. All your personal data is encrypted, stored securely, 
                and handled in compliance with NDPR regulations. Questions? Contact our privacy team at privacy@xcombinator.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
