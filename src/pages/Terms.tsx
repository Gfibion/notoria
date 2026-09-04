import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";

const UPDATED = "4 September 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <SEO
        title="Terms of Service"
        path="/terms"
        description="The terms that govern use of Novaryn — the local-first notes, tasks and thinking app with optional encrypted cloud backup and voluntary support payments."
        keywords="Novaryn terms of service, notes app terms, local-first app terms"
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
            <h1 className="text-3xl font-semibold text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>
          </div>

          <Section title="1. Agreement">
            <p>
              These Terms of Service govern your use of Novaryn, a local-first note-taking and task
              application available as a website and installable app. By using Novaryn you accept
              these terms. If you do not accept them, do not use the app.
            </p>
          </Section>

          <Section title="2. What Novaryn is">
            <p>
              Novaryn lets you create and organize notes, workspaces, categories, hashtags, tasks,
              projects and modules. Your content is stored locally on your own device by default. The
              app can be used entirely offline and does not require an account.
            </p>
          </Section>

          <Section title="3. Your content and your responsibilities">
            <p>
              You own your content. Because your notes and tasks live on your device, you are
              responsible for your own device security and for keeping backups. If you clear your
              browser data, uninstall the app, or lose your device without a cloud backup, your data
              cannot be recovered by us.
            </p>
            <p>
              You must not use Novaryn for unlawful purposes, to store or distribute content you have
              no right to, or to attempt to disrupt, probe, or gain unauthorized access to the
              service or its backend systems.
            </p>
          </Section>

          <Section title="4. Safe Folder">
            <p>
              The Safe Folder is protected by a PIN you choose. Only a cryptographic hash of the PIN
              is stored on your device. If you forget the PIN, the protected notes cannot be unlocked
              by us — there is no recovery mechanism. Choose a PIN you can remember.
            </p>
          </Section>

          <Section title="5. Cloud backup and your Cloud ID">
            <p>
              Cloud backup is optional. When you create a Cloud ID, your notes are encrypted on your
              device before being sent, and the server stores only ciphertext. Your Cloud ID is the
              only key to that backup: it is never transmitted in plaintext and cannot be recovered
              or reset by us. If you lose your Cloud ID, the backup is permanently undecryptable.
            </p>
            <p>
              You are responsible for keeping your Cloud ID safe. We are not liable for loss of data
              resulting from a lost Cloud ID, a forgotten Safe Folder PIN, or local data deletion.
            </p>
          </Section>

          <Section title="6. Support tickets">
            <p>
              The Contact page lets you open support tickets. You agree to provide accurate
              information and not to submit unlawful, abusive, or spam content, or secrets such as
              passwords, Cloud IDs, or Safe Folder PINs. To prevent abuse, ticket creation is
              rate-limited per IP address (stored only as a salted hash). We may decline to respond
              to abusive or bad-faith tickets.
            </p>
          </Section>

          <Section title="7. Donations and payments">
            <p>
              Support payments are voluntary and processed by Paystack. Payment details are entered
              on Paystack's secure checkout; Novaryn never sees or stores your card or bank details.
              Payments support the project and are not purchases of goods or services; they are
              generally non-refundable except where required by law or by Paystack's dispute
              processes.
            </p>
          </Section>

          <Section title="8. Administrator access">
            <p>
              Administrator accounts are limited to two and are restricted to the operators of the
              service. Admin features exist to operate and support the service (statistics, support
              tickets, FAQ publishing, backup-count visibility). Administrators cannot read your
              encrypted note contents. The AI assistant is an internal pilot on administrator devices
              only; user notes are not sent to any AI provider through normal app usage.
            </p>
          </Section>

          <Section title="9. Intellectual property">
            <p>
              The Novaryn name, logo, design, and software are the property of the project owner.
              Your notes, tasks, and other content remain yours. These terms grant you a personal,
              non-exclusive, non-transferable right to use the app; they do not transfer any
              ownership of the app to you.
            </p>
          </Section>

          <Section title="10. Availability and changes">
            <p>
              Novaryn is provided "as is" and "as available". Because the app works offline and
              stores data locally, most functionality does not depend on our servers; cloud backup,
              support tickets, and payments do. We may update, change, or discontinue features at any
              time. We do not guarantee uninterrupted availability of the hosted components.
            </p>
          </Section>

          <Section title="11. Disclaimers and limitation of liability">
            <p>
              To the maximum extent permitted by law, Novaryn is provided without warranties of any
              kind, express or implied, including warranties of merchantability, fitness for a
              particular purpose, and non-infringement.
            </p>
            <p>
              To the maximum extent permitted by law, we are not liable for indirect, incidental, or
              consequential damages, or for loss of data, profits, or goodwill arising from your use
              of the app — including data loss caused by clearing browser storage, device failure, a
              forgotten PIN, or a lost Cloud ID. Where liability cannot be excluded, it is limited to
              the amount you paid us, if any, in the twelve months preceding the claim.
            </p>
          </Section>

          <Section title="12. Changes to these terms">
            <p>
              If these terms change materially, the updated date above will change. Continued use of
              the app after a change constitutes acceptance of the updated terms.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              Questions about these terms can be sent through the{" "}
              <Link to="/contact" className="text-primary underline underline-offset-4">Contact page</Link>.
            </p>
          </Section>

          <div className="pt-4 border-t border-border text-sm">
            <Link to="/privacy" className="text-primary underline underline-offset-4">Privacy Policy</Link>
          </div>
        </main>
      </div>
    </>
  );
}
