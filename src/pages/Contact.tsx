import { useState, type FormEvent } from "react";
import PageHero from "../components/PageHero";
import "./Contact.css";

export default function Contact() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <main>
      <PageHero
        eyebrow="Contact"
        title="Ready to Connect with the digivistaUS Team?"
        description="Tell us about your ecommerce, Amazon, or digital initiative. We’ll follow up with next steps."
      />
      <section className="section">
        <div className="container contact-layout">
          <form className="contact-form" onSubmit={onSubmit}>
            {sent ? (
              <div className="form-success">
                <h2>Thanks — you’re in.</h2>
                <p>
                  A digivistaUS specialist will review your note and reach out shortly.
                </p>
              </div>
            ) : (
              <>
                <div className="field-row">
                  <label>
                    First name
                    <input name="firstName" required />
                  </label>
                  <label>
                    Last name
                    <input name="lastName" required />
                  </label>
                </div>
                <label>
                  Work email
                  <input type="email" name="email" required />
                </label>
                <label>
                  Company
                  <input name="company" required />
                </label>
                <label>
                  I’m interested in
                  <select name="interest" defaultValue="amazon">
                    <option value="amazon">Amazon Services</option>
                    <option value="ecommerce">Ecommerce Development</option>
                    <option value="marketing">Digital Marketing</option>
                    <option value="integrations">Integrations</option>
                    <option value="data">Data Management</option>
                    <option value="b2b">B2B Portals</option>
                    <option value="ai">AI Traction</option>
                    <option value="other">Something else</option>
                  </select>
                </label>
                <label>
                  How can we help?
                  <textarea name="message" rows={5} required />
                </label>
                <button type="submit" className="btn btn-primary">
                  Send Message
                </button>
              </>
            )}
          </form>
          <aside className="contact-aside">
            <h2>What happens next</h2>
            <ol>
              <li>We review your goals and current stack.</li>
              <li>We schedule a discovery conversation.</li>
              <li>You get a clear recommended path — project, audit, or retainer.</li>
            </ol>
            <div className="contact-note">
              <strong>Prefer email?</strong>
              <p>hello@digivistaus.com</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
