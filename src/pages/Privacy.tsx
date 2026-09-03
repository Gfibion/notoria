import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";

const UPDATED = "3 September 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <SEO
        title="Privacy Policy"
        path="/privacy"
        description="How Novaryn handles your notes, tasks, optional encrypted cloud backups, support tickets and donations. Local-first by default."
        keywords="Novaryn privacy policy, local-first notes privacy, encrypted backup privacy"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-5 py-10 space-y-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>
          </div>

          <Section title="1. Summary">
            <p>
              Novaryn is a local-first note and task application. By default, everything you write —
              notes, workspaces, categories, hashtags, images, PDFs, tasks and projects — is stored in
              your own browser or device storage. It is not uploaded anywhere unless you deliberately
              use a feature that sends data out, namely cloud backup, the contact/support page, or a
              donation.
            </p>
          </Section>

          <Section title="2. Data stored on your device">
            <p>
              The app uses your browser's local database (WatermelonDB over IndexedDB) plus
              <code className="mx-1">localStorage</code> for settings. This includes note content and
              formatting, workspaces and subcategories, hashtags, embedded images, cached PDFs you chose
              to keep offline, tasks, projects and modules, theme/font/layout preferences, and Safe
              Folder items.
            </p>
            <p>
              Safe Folder notes are protected by a PIN you choose. Only a PBKDF2-SHA256 hash and salt of
              that PIN are stored locally — the PIN itself is never stored and never leaves your device.
              The PIN controls access within the app; it does not encrypt the underlying local database.
            </p>
            <p>
              Clearing your browser data, uninstalling the app, or wiping the device deletes this data.
              We cannot recover it for you unless you made a cloud backup.
            </p>
          </Section>

          <Section title="3. Optional cloud backup">
            <p>
              Cloud backup is opt-in. When you create a Cloud ID, notes are encrypted on your device
              before they are sent. The server stores only ciphertext and a one-way hash of your Cloud
              ID, along with technical fields such as note identifiers and timestamps needed to order
              and replace backups. Your Cloud ID and the encryption key derived from it never leave your
              device in plaintext.
            </p>
            <p>
              Because of this design, we cannot read your backed-up notes and we cannot recover your
              Cloud ID if you lose it. Losing the Cloud ID means the corresponding backup can no longer
              be decrypted by anyone, including us. You can delete your cloud backup from within the
              app at any time.
            </p>
            <p>
              Where your device supports it, the Cloud ID can be protected with WebAuthn
              (biometrics or device PIN). That verification happens locally against your device's
              secure key store; we do not receive your biometric data.
            </p>
          </Section>

          <Section title="4. Support tickets">
            <p>
              When you open a ticket on the Contact page, we store the reason, subject, message content,
              ticket number, status, timestamps, and an optional contact email if you provide one. An
              email address is optional; without it we can only reply inside the ticket thread.
            </p>
            <p>
              To limit abuse we store a salted one-way hash of your IP address for rate-limiting
              purposes (a small number of tickets per hour). The raw IP address is not stored with the
              ticket.
            </p>
            <p>
              Tickets are readable by the site administrators so they can respond. Please do not paste
              passwords, Cloud IDs, or Safe Folder PINs into a ticket.
            </p>
          </Section>

          <Section title="5. Donations and payments">
            <p>
              Voluntary support payments are processed by Paystack. When you make a payment, you provide
              an email address and amount in the app; card, bank and mobile-money details are entered on
              Paystack's own secure checkout and are never seen, handled, or stored by Novaryn. We
              retain only the payment reference, amount, currency, status, email and timestamp returned
              by Paystack so that support totals can be verified.
            </p>
          </Section>

          <Section title="6. Analytics and advertising">
            <p>
              Novaryn does not include third-party analytics, advertising SDKs, or cross-site tracking
              pixels. There are no marketing cookies. The application does not sell or share personal
              data with advertisers.
            </p>
          </Section>

          <Section title="7. Administrator features">
            <p>
              Administrator accounts (limited to two) sign in with email and password plus device-bound
              passkey/biometric verification. For administration, we store the admin account identifier,
              device identifiers, browser user-agent strings, passkey public-key credentials, and
              sign-in timestamps. Administrators can see aggregate statistics such as backup counts and
              user counts, and support tickets — they cannot read your encrypted note contents.
            </p>
            <p>
              The AI assistant is currently an internal pilot restricted to administrator devices. It is
              not enabled for general users, and user notes are not sent to any AI provider through
              normal app usage.
            </p>
          </Section>

          <Section title="8. Service providers">
            <p>
              Backend hosting, database, authentication and serverless functions are provided by Lovable
              Cloud (built on Supabase infrastructure). Payments are processed by Paystack. These
              providers process only the limited data described above on our behalf.
            </p>
          </Section>

          <Section title="9. Retention">
            <p>
              Local data stays on your device until you delete it; trashed notes are removed
              automatically after 30 days. Cloud backups remain until you overwrite or delete them.
              Support tickets and payment records are retained for as long as needed to provide support
              and keep accurate records.
            </p>
          </Section>

          <Section title="10. Your choices">
            <p>
              You can use Novaryn entirely offline without creating any account or Cloud ID. You can
              export your notes to PDF or TXT, delete individual notes, delete your cloud backup, and
              clear all local data through your browser or device settings. For requests relating to a
              support ticket or a payment record, contact us through the Contact page and reference the
              ticket number or payment reference.
            </p>
          </Section>

          <Section title="11. Children">
            <p>Novaryn is intended for general professional use and is not directed at children under 13.</p>
          </Section>

          <Section title="12. Changes and contact">
            <p>
              If this policy changes materially, the updated date above will change. Questions about
              privacy can be sent through the{" "}
              <Link to="/contact" className="text-primary underline underline-offset-4">Contact page</Link>.
            </p>
          </Section>

          <div className="pt-4 border-t border-border text-sm">
            <Link to="/terms" className="text-primary underline underline-offset-4">Terms of Service</Link>
          </div>
        </main>
      </div>
    </>
  );
}
