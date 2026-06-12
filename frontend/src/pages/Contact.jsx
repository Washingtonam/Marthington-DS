import React from "react";

export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="text-slate-600 mb-6">Have a question or need help? Reach out via WhatsApp or email and we'll get back to you shortly.</p>

      <div className="bg-white dark:bg-[#0B1220] border rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-semibold">WhatsApp</h2>
          <a href="https://wa.me/2348179736442" target="_blank" rel="noreferrer" className="text-green-600">Chat on WhatsApp</a>
        </div>

        <div>
          <h2 className="font-semibold">Email</h2>
          <a href="mailto:support@yourdomain.com" className="text-blue-600">support@yourdomain.com</a>
        </div>

        <div>
          <h2 className="font-semibold">Call</h2>
          <a href="tel:+2348179736442" className="text-slate-700">+234 817 973 6442</a>
        </div>
      </div>
    </div>
  );
}
