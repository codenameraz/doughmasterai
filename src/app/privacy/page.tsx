import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | DoughMaster AI',
  description: 'Privacy policy and data handling practices for DoughMaster AI',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      
      <section className="prose dark:prose-invert max-w-none">
        <h2>Introduction</h2>
        <p>
          DoughMaster AI ("we", "our", or "us") is committed to protecting your privacy. 
          This Privacy Policy explains how we collect, use, and safeguard your information 
          when you use our website and services.
        </p>

        <h2>Information We Collect</h2>
        <p>
          We collect information that you voluntarily provide to us when you:
        </p>
        <ul>
          <li>Use our dough calculator</li>
          <li>Subscribe to our newsletter</li>
          <li>Contact us through our website</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>
          We use the information we collect to:
        </p>
        <ul>
          <li>Provide and improve our dough calculation service</li>
          <li>Send you our newsletter if you've subscribed</li>
          <li>Analyze usage patterns to improve our website</li>
          <li>Respond to your inquiries</li>
        </ul>

        <h2>Data Storage</h2>
        <p>
          Your data is stored securely using industry-standard encryption and security measures. 
          We use Supabase for our database needs, which provides enterprise-grade security features.
        </p>

        <h2>Your Rights</h2>
        <p>
          You have the right to:
        </p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Withdraw consent for data processing</li>
        </ul>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:
          <br />
          <a href="mailto:privacy@doughmasterai.com" className="text-primary hover:underline">
            privacy@doughmasterai.com
          </a>
        </p>

        <h2>Updates to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes 
          by posting the new Privacy Policy on this page and updating the "Last Updated" date.
        </p>
        
        <p className="text-sm text-muted-foreground mt-8">
          Last Updated: March 20, 2024
        </p>
      </section>
    </div>
  );
} 