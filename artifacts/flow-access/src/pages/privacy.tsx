import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-8 cursor-pointer transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </div>
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: April 26, 2026
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              Welcome to Veo Flow API ("we", "our", "us"). We operate the website{" "}
              <a href="https://veoflowapi.com" className="text-purple-400 hover:underline">
                https://veoflowapi.com
              </a>{" "}
              and the official Veo Flow API browser extension (the "Extension").
              This Privacy Policy explains what information we collect, how we use it,
              and the choices you have regarding your data when you use our website,
              extension, or any related services (collectively, the "Service").
            </p>
            <p className="mt-3">
              By using the Service you agree to the collection and use of information
              in accordance with this Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <p>We collect only the minimum information needed to deliver the Service:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong className="text-white">Account information</strong> — your email
                address and a securely hashed password when you create an account.
              </li>
              <li>
                <strong className="text-white">Authentication data</strong> — an
                authentication token issued after sign-in is stored locally in your
                browser so you stay signed in. The token is also used by the Extension
                to securely connect your active workspace with your subscribed plan.
              </li>
              <li>
                <strong className="text-white">Subscription &amp; usage data</strong> —
                information about the plan you have purchased, your remaining credits,
                and basic usage logs (such as request counts and timestamps) needed to
                operate the Service and prevent abuse.
              </li>
              <li>
                <strong className="text-white">Payment information</strong> — payments
                are processed by trusted third-party payment providers. We do not store
                your full card details on our servers.
              </li>
              <li>
                <strong className="text-white">Technical data</strong> — limited
                technical information such as IP address, browser type, and timestamps
                used for security, diagnostics, and fraud prevention.
              </li>
            </ul>
            <p className="mt-3">
              We do <strong className="text-white">not</strong> collect personal
              browsing history, the content of pages you visit outside of the
              supported service domain, location data, health data, financial data
              beyond what is required for billing, or personal communications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>To create and manage your account.</li>
              <li>To authenticate you and keep your session active.</li>
              <li>To deliver the API service you have subscribed to and track your remaining credits.</li>
              <li>To process payments and renewals.</li>
              <li>To provide customer support and respond to your inquiries.</li>
              <li>To detect, prevent, and respond to fraud, abuse, or security incidents.</li>
              <li>To comply with legal obligations.</li>
              <li>To improve the Service and develop new features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. The Veo Flow API Browser Extension</h2>
            <p>
              The Veo Flow API browser extension is the official companion to the Veo
              Flow API service. Its single purpose is to securely connect your active
              browser workspace with your subscribed API plan.
            </p>
            <p className="mt-3">The Extension:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                Stores your authentication token locally on your device so you remain
                signed in.
              </li>
              <li>
                Communicates only with the official Veo Flow API endpoints and the
                supported workspace domain required for the service to function.
              </li>
              <li>
                Does not read, collect, or transmit your general browsing activity or
                the content of unrelated websites.
              </li>
              <li>
                Does not sell, rent, or share your data with advertisers or unrelated
                third parties.
              </li>
              <li>
                Does not include analytics, trackers, or remote code execution.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. How We Share Information</h2>
            <p>
              We do not sell your personal information. We only share data in the
              following limited circumstances:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong className="text-white">Service providers</strong> — trusted
                vendors that help us operate the Service (such as hosting providers
                and payment processors), under appropriate confidentiality
                obligations.
              </li>
              <li>
                <strong className="text-white">Legal compliance</strong> — when
                required by applicable law, regulation, legal process, or
                governmental request.
              </li>
              <li>
                <strong className="text-white">Protection of rights</strong> — to
                protect the rights, property, or safety of Veo Flow API, our users,
                or others.
              </li>
              <li>
                <strong className="text-white">Business transfers</strong> — in
                connection with a merger, acquisition, or sale of assets, subject to
                this Policy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Data Retention</h2>
            <p>
              We retain your account information for as long as your account remains
              active and as needed to provide the Service. You may request deletion
              of your account at any time by contacting us. Some information may be
              retained for a limited period after account deletion when required by
              law or for legitimate business purposes such as fraud prevention,
              dispute resolution, or financial record keeping.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. Security</h2>
            <p>
              We implement industry-standard administrative, technical, and physical
              safeguards designed to protect your information. Passwords are stored
              using strong one-way hashing, authentication tokens are signed and
              validated server-side, and communication with our servers is
              encrypted in transit using HTTPS. While we work hard to protect your
              data, no method of transmission or storage over the internet is 100%
              secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Your Rights</h2>
            <p>
              Depending on your location, you may have the following rights regarding
              your personal information:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>The right to access the personal data we hold about you.</li>
              <li>The right to request correction of inaccurate data.</li>
              <li>The right to request deletion of your data.</li>
              <li>The right to object to or restrict certain processing.</li>
              <li>The right to data portability.</li>
              <li>The right to withdraw consent at any time, where consent is the basis for processing.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at the email address
              listed below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Children's Privacy</h2>
            <p>
              The Service is not directed to children under the age of 13 (or the
              minimum age required in your jurisdiction). We do not knowingly
              collect personal information from children. If you believe a child has
              provided us with personal information, please contact us so we can
              remove it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. International Users</h2>
            <p>
              Our Service is operated globally. By using the Service, you understand
              that your information may be processed in countries other than your
              own, which may have different data protection rules than your
              jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">11. Third-Party Links</h2>
            <p>
              Our Service may contain links to third-party websites or services that
              are not operated by us. We are not responsible for the content or
              privacy practices of those third parties. We encourage you to review
              the privacy policies of every third-party site you visit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make
              material changes, we will update the "Last updated" date at the top of
              this page and, where appropriate, notify you through the Service. Your
              continued use of the Service after such updates constitutes acceptance
              of the revised Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">13. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or your personal data, please contact us:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                Email:{" "}
                <a
                  href="mailto:support@veoflowapi.com"
                  className="text-purple-400 hover:underline"
                >
                  support@veoflowapi.com
                </a>
              </li>
              <li>
                Website:{" "}
                <a
                  href="https://veoflowapi.com"
                  className="text-purple-400 hover:underline"
                >
                  https://veoflowapi.com
                </a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Veo Flow API. All rights reserved.
        </div>
      </div>
    </div>
  );
}
