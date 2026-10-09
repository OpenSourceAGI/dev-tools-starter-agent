import Link from "next/link";
import { APP_EMAIL, LAST_REVISED_DATE, APP_NAME } from "@/lib/constants";

export const metadata = {
  title: `${APP_NAME} Terms of Service`,
};

export default function TermsPage({ params }: { params: { lang: string } }) {
  return (
    <main className="max-w-[800px] mx-auto p-8 pb-12 mb-12 mt-8 font-sans text-gray-800 leading-relaxed font-[Lato] bg-white rounded-xl shadow-sm border">
      <div className="mb-8 pt-4">
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-gray-50 text-gray-600 rounded-md border border-gray-200 text-sm font-medium hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          Back to Home
        </Link>
      </div>

      <h1 className="my-4 text-3xl font-bold text-gray-800 font-variant-caps">
        {APP_NAME} Terms of Service
      </h1>
      <p className="my-4">
        <strong>Revised Date: {LAST_REVISED_DATE}</strong>
      </p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        1. Introduction
      </h2>
      <p className="my-4">
        These Terms of Service (&quot;Terms&quot;) govern your use of {APP_NAME}
        &apos;s products and services, along with any associated apps, software,
        and websites (together, our &quot;Services&quot;). These Terms are a
        contract between you and {APP_NAME}, and they include our Acceptable Use
        Policy. By accessing our Services, you agree to these Terms.
      </p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        2. Artificial Intelligence Ethical Use Policy
      </h2>
      <ul className="list-disc pl-5 my-4 m-1 p-1">
        <li className="mb-4">
          <h4 className="font-bold text-lg mt-2 font-variant-caps text-gray-700">
            Trust, But Verify Outputs
          </h4>
          <ul className="list-decimal pl-5 mt-2 space-y-2">
            <li>
              Artificial intelligence and large language models (LLMs) are
              frontier technologies that are still improving in accuracy,
              reliability and safety. When you use our Services, you acknowledge
              and agree:
            </li>
            <li>
              Outputs may not always be accurate and may contain material
              inaccuracies even if they appear accurate because of their level
              of detail or specificity.
            </li>
            <li>
              You should not rely on any Outputs without independently
              confirming their accuracy.
            </li>
            <li>
              The Services and any Outputs may not reflect correct, current, or
              complete information.
            </li>
          </ul>
        </li>
        <li className="mb-4">
          <h4 className="font-bold text-lg mt-2 font-variant-caps text-gray-700">
            Don&apos;t compromise the privacy of others, including:
          </h4>
          <ul className="list-decimal pl-5 mt-2 space-y-2">
            <li>
              Collecting, processing, disclosing, inferring or generating
              personal data without complying with applicable legal requirements
            </li>
            <li>
              Using biometric systems for identification or assessment,
              including facial recognition
            </li>
            <li>
              Facilitating spyware, communications surveillance, or unauthorized
              monitoring of individuals
            </li>
          </ul>
        </li>
        <li className="mb-4">
          <h4 className="font-bold text-lg mt-2 font-variant-caps text-gray-700">
            Don&apos;t perform or facilitate activities that may significantly
            impair the safety, wellbeing, or rights of others, including:
          </h4>
          <ul className="list-decimal pl-5 mt-2 space-y-2">
            <li>
              Providing tailored legal, medical/health, or financial advice
              without review by a qualified professional and disclosure of the
              use of AI assistance and its potential limitations
            </li>
            <li>
              Making high-stakes automated decisions in domains that affect an
              individual&apos;s safety, rights or well-being
            </li>
            <li>Facilitating real money gambling or payday lending</li>
            <li>
              Engaging in political campaigning or lobbying, including
              generating campaign materials personalized to or targeted at
              specific demographics
            </li>
            <li>Deterring people from participation in democratic processes</li>
          </ul>
        </li>
        <li className="mb-4">
          <h4 className="font-bold text-lg mt-2 font-variant-caps text-gray-700">
            Don&apos;t misuse our platform to cause harm by intentionally
            deceiving or misleading others, including:
          </h4>
          <ul className="list-decimal pl-5 mt-2 space-y-2">
            <li>
              Generating or promoting disinformation, misinformation, or false
              online engagement
            </li>
            <li>
              Impersonating another individual or organization without consent
              or legal right
            </li>
            <li>Engaging in or promoting academic dishonesty</li>
            <li>
              Failing to ensure that automated systems disclose to people that
              they are interacting with AI, unless it&apos;s obvious from the
              context
            </li>
          </ul>
        </li>
      </ul>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        3. Account creation and access
      </h2>

      <p className="my-4">
        <strong>Your {APP_NAME} Account:</strong> To access our Services, we may
        ask you to create an Account. You agree to provide correct, current, and
        complete Account information. You may not share your Account login
        information with anyone else. You are responsible for all activity
        occurring under your Account.
      </p>

      <p className="my-4">
        You may close your Account at any time by contacting us at {APP_EMAIL}.
      </p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        4. Use of our Services
      </h2>
      <p className="my-4">
        You may access and use our Services only in compliance with our Terms,
        our Acceptable Use Policy, and any guidelines or supplemental terms we
        may post on the Services (the &quot;Permitted Use&quot;).
      </p>

      <p className="my-4">
        You may not access or use, or help another person to access or use, our
        Services in any manner that violates these Terms or applicable laws.
      </p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        5. Prompts, Outputs, and Materials
      </h2>
      <p className="my-4">
        You may be allowed to submit text or other materials to our Services for
        processing (we call these &quot;Prompts&quot;). Our Services may
        generate responses based on your Prompts (we call these
        &quot;Outputs&quot;). Prompts and Outputs collectively are
        &quot;Materials.&quot;
      </p>

      <p className="my-4">
        You are responsible for all Prompts you submit to our Services. By
        submitting Prompts, you represent and warrant that you have all
        necessary rights and permissions.
      </p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        6. Feedback
      </h2>
      <p className="my-4">
        If you provide Feedback to us, you agree that we may use the Feedback
        however we choose without any obligation or payment to you.
      </p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        7. Disclaimer of warranties and limitations of liability
      </h2>

      <p className="my-4">
        The services are provided &quot;as is&quot; and &quot;as available&quot;
        without warranties of any kind. {APP_NAME} disclaims all warranties,
        express or implied.
      </p>

      <p className="my-4">
        To the fullest extent permissible under applicable law, {APP_NAME} shall
        not be liable for any indirect, incidental, special, consequential, or
        punitive damages, or any loss of profits or revenues.
      </p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        8. Changes to these terms
      </h2>
      <p className="my-4">
        We may revise and update these Terms at our discretion. If you continue
        to access the Services after we post the updated Terms, you agree to the
        updated Terms.
      </p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        9. Termination
      </h2>
      <p className="my-4">
        We may suspend or terminate your access to the Services at any time if
        we believe that you have breached these Terms, or if we must do so to
        comply with law.
      </p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-700 font-variant-caps">
        10. Contact Us
      </h2>
      <p className="my-4">
        If you have any questions about these Terms of Service, please contact
        us at:{" "}
        <a href={`mailto:${APP_EMAIL}`} className="text-blue-600 hover:underline">
          {APP_EMAIL}
        </a>
      </p>
    </main>
  );
}
