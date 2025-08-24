import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Privacy Policy - ZoomJudge',
  description: 'Privacy Policy for ZoomJudge AI-powered repository evaluation platform.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-2">Personal Information</h3>
            <p>
              When you create an account, we collect information such as your name, email address, and authentication details 
              provided through our authentication service (Clerk).
            </p>
            
            <h3 className="text-xl font-medium mb-2 mt-4">Repository Data</h3>
            <p>
              When you submit a GitHub repository for evaluation, we temporarily access and analyze the repository's public content, 
              including code files, documentation, and project structure.
            </p>

            <h3 className="text-xl font-medium mb-2 mt-4">Usage Data</h3>
            <p>
              We collect information about how you use our Service, including evaluation history, feature usage, and performance metrics.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6">
              <li>To provide and maintain our Service</li>
              <li>To process repository evaluations and generate reports</li>
              <li>To communicate with you about your account and our services</li>
              <li>To improve our AI models and evaluation algorithms</li>
              <li>To detect and prevent fraud and abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Data Storage and Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information. 
              Your data is stored securely using industry-standard encryption and access controls.
            </p>
            <p className="mt-4">
              Repository data is processed temporarily for evaluation purposes and is not permanently stored unless required 
              for providing our services to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
            <p>We do not sell, trade, or otherwise transfer your personal information to third parties except:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>With your explicit consent</li>
              <li>To trusted service providers who assist us in operating our Service</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a business transfer or acquisition</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
            <p>Our Service integrates with third-party services including:</p>
            <ul className="list-disc pl-6 mt-2">
              <li><strong>Clerk:</strong> For authentication and user management</li>
              <li><strong>GitHub:</strong> For repository access and analysis</li>
              <li><strong>OpenRouter:</strong> For AI model access</li>
              <li><strong>Convex:</strong> For data storage and real-time functionality</li>
            </ul>
            <p className="mt-4">
              These services have their own privacy policies, and we encourage you to review them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Export your evaluation history and data</li>
              <li>Opt out of marketing communications</li>
              <li>Request information about how your data is processed</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, 
              and provide personalized content. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services and comply with legal obligations. 
              You can request deletion of your account and data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p>
              Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information 
              from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
              Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@zoomjudge.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
