/**
 * Professional Email Templates for ZoomJudge
 * Mobile-responsive designs with ZoomJudge branding
 */

export interface EmailTemplate {
  templateId: string;
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
}

// ZoomJudge brand colors and styling
const BRAND_COLORS = {
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  dark: '#343a40',
  light: '#f8f9fa',
  white: '#ffffff',
};

// Common CSS styles for email templates
const EMAIL_STYLES = `
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 20px !important; }
      .content { padding: 20px !important; }
      .button { width: 100% !important; display: block !important; text-align: center !important; }
      .two-column { width: 100% !important; display: block !important; }
      h1 { font-size: 24px !important; }
      h2 { font-size: 20px !important; }
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
    }
    
    .header {
      background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, #0056b3 100%);
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    
    .logo {
      color: ${BRAND_COLORS.white};
      font-size: 28px;
      font-weight: bold;
      text-decoration: none;
      margin: 0;
    }
    
    .content {
      background: ${BRAND_COLORS.white};
      padding: 40px 30px;
      border-left: 1px solid #e9ecef;
      border-right: 1px solid #e9ecef;
    }
    
    .footer {
      background: ${BRAND_COLORS.light};
      padding: 30px 20px;
      text-align: center;
      border-radius: 0 0 8px 8px;
      border: 1px solid #e9ecef;
      border-top: none;
    }
    
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: ${BRAND_COLORS.primary};
      color: ${BRAND_COLORS.white} !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      transition: background-color 0.3s ease;
      text-align: center;
    }
    
    .button:hover {
      background: #0056b3 !important;
      color: ${BRAND_COLORS.white} !important;
    }

    .button-secondary {
      background: ${BRAND_COLORS.secondary};
    }

    .button-secondary:hover {
      background: #5a6268;
    }

    .button-success {
      background: ${BRAND_COLORS.success};
      color: white;
    }

    .button-success:hover {
      background: #218838;
      color: white;
    }
    
    .feature-box {
      background: ${BRAND_COLORS.light};
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid ${BRAND_COLORS.primary};
    }
    
    .stats-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    
    .divider {
      height: 1px;
      background: #e9ecef;
      margin: 30px 0;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: ${BRAND_COLORS.secondary};
      text-decoration: none;
    }
    
    .unsubscribe {
      font-size: 14px;
      color: ${BRAND_COLORS.secondary};
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #e9ecef;
    }

    .unsubscribe a {
      color: ${BRAND_COLORS.primary};
      text-decoration: underline;
    }
  </style>
`;

// Base template structure
const createBaseTemplate = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{{subject}}</title>
  ${EMAIL_STYLES}
</head>
<body style="margin: 0; padding: 20px; background-color: #f4f4f4;">
  <div class="email-container">
    <div class="header">
      <h1 class="logo">🔍 ZoomJudge</h1>
      <p style="color: ${BRAND_COLORS.white}; margin: 10px 0 0 0; opacity: 0.9;">
        AI-Powered Code Evaluation Platform
      </p>
    </div>
    
    <div class="content">
      ${content}
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 15px 0; color: ${BRAND_COLORS.secondary};">
        <strong>ZoomJudge</strong> - Elevating Code Quality Through AI
      </p>
      
      <div class="social-links">
        <a href="{{appUrl}}/dashboard">Dashboard</a>
        <a href="{{appUrl}}/changelog">Changelog</a>
        <a href="{{appUrl}}/privacy">Privacy</a>
        <a href="{{appUrl}}/terms">Terms</a>
      </div>
      
      <div class="unsubscribe">
        <p>
          © {{currentYear}} ZoomJudge. All rights reserved.<br>
          <a href="{{appUrl}}/unsubscribe?email={{recipientEmail}}">Unsubscribe</a> | 
          <a href="{{appUrl}}/preferences?email={{recipientEmail}}">Email Preferences</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    templateId: 'welcome',
    name: 'Welcome Email',
    description: 'Welcome new users to ZoomJudge',
    subject: 'Welcome to ZoomJudge! 🎉 Your AI Code Evaluation Journey Begins',
    htmlContent: createBaseTemplate(`
      <h1 style="color: ${BRAND_COLORS.dark}; margin-bottom: 10px;">
        Welcome to ZoomJudge, {{userName}}! 🎉
      </h1>
      
      <p style="font-size: 16px; margin-bottom: 25px;">
        Thank you for joining our community of developers who are passionate about code quality. 
        ZoomJudge uses advanced AI to help you evaluate and improve your coding projects.
      </p>
      
      <div class="feature-box">
        <h3 style="color: ${BRAND_COLORS.primary}; margin-top: 0;">🚀 Get Started in 3 Easy Steps</h3>
        <ol style="margin: 15px 0; padding-left: 20px;">
          <li><strong>Connect Your Repository:</strong> Link your GitHub repository for evaluation</li>
          <li><strong>Choose Your Course:</strong> Select from Data Engineering, Machine Learning, or other tracks</li>
          <li><strong>Get AI Feedback:</strong> Receive detailed analysis and improvement suggestions</li>
        </ol>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{appUrl}}/dashboard" class="button">
          🎯 Start Your First Evaluation
        </a>
      </div>
      
      <div class="stats-box">
        <h3 style="margin-top: 0; color: ${BRAND_COLORS.dark};">📊 What You'll Get</h3>
        <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
          <div style="margin: 10px;">
            <strong style="font-size: 24px; color: ${BRAND_COLORS.primary};">AI-Powered</strong><br>
            <span style="color: ${BRAND_COLORS.secondary};">Code Analysis</span>
          </div>
          <div style="margin: 10px;">
            <strong style="font-size: 24px; color: ${BRAND_COLORS.success};">Detailed</strong><br>
            <span style="color: ${BRAND_COLORS.secondary};">Feedback Reports</span>
          </div>
          <div style="margin: 10px;">
            <strong style="font-size: 24px; color: ${BRAND_COLORS.warning};">Improvement</strong><br>
            <span style="color: ${BRAND_COLORS.secondary};">Suggestions</span>
          </div>
        </div>
      </div>
      
      <p style="margin-top: 30px;">
        Need help getting started? Our support team is here to assist you.
        Visit your <a href="{{appUrl}}/dashboard" style="color: ${BRAND_COLORS.primary};">Dashboard</a>.
      </p>
      
      <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_COLORS.secondary};">
          <strong>Email Preferences</strong>
        </p>
        <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.secondary};">
          You can <a href="{{appUrl}}/unsubscribe?email={{recipientEmail}}" style="color: ${BRAND_COLORS.primary}; text-decoration: underline;">unsubscribe</a>
          or <a href="{{appUrl}}/preferences?email={{recipientEmail}}" style="color: ${BRAND_COLORS.primary}; text-decoration: underline;">manage your email preferences</a> at any time.
        </p>
      </div>

      <p style="margin-bottom: 0;">
        Happy coding!<br>
        <strong>The ZoomJudge Team</strong>
      </p>
    `),
    textContent: `Welcome to ZoomJudge, {{userName}}!

Thank you for joining our community of developers who are passionate about code quality. ZoomJudge uses advanced AI to help you evaluate and improve your coding projects.

Get Started in 3 Easy Steps:
1. Connect Your Repository: Link your GitHub repository for evaluation
2. Choose Your Course: Select from Data Engineering, Machine Learning, or other tracks  
3. Get AI Feedback: Receive detailed analysis and improvement suggestions

Start your first evaluation: {{appUrl}}/dashboard

What You'll Get:
- AI-Powered Code Analysis
- Detailed Feedback Reports  
- Improvement Suggestions

Need help getting started? Our support team is here to assist you. Visit your Dashboard: {{appUrl}}/dashboard

Happy coding!
The ZoomJudge Team

© {{currentYear}} ZoomJudge. All rights reserved.
Unsubscribe: {{appUrl}}/unsubscribe?email={{recipientEmail}}`,
    variables: ['userName', 'appUrl', 'currentYear', 'recipientEmail'],
  },

  'feedback-request': {
    templateId: 'feedback-request',
    name: 'Feedback Request',
    description: 'Request feedback from users after they have used the platform',
    subject: 'How is ZoomJudge working for you? 🤔 Your feedback shapes our future',
    htmlContent: createBaseTemplate(`
      <h1 style="color: ${BRAND_COLORS.dark}; margin-bottom: 10px;">
        How is ZoomJudge working for you, {{userName}}? 🤔
      </h1>
      
      <p style="font-size: 16px; margin-bottom: 25px;">
        You've been using ZoomJudge for a while now, and we'd love to hear about your experience. 
        Your feedback directly influences what we build next!
      </p>
      
      <div class="feature-box">
        <h3 style="color: ${BRAND_COLORS.primary}; margin-top: 0;">💭 We'd love to know:</h3>
        <ul style="margin: 15px 0; padding-left: 20px;">
          <li>What features are working well for you?</li>
          <li>What could we improve or fix?</li>
          <li>What new features would be most valuable?</li>
          <li>How has ZoomJudge impacted your development workflow?</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{feedbackUrl}}" class="button button-success">
          📝 Share Your Feedback (2 minutes)
        </a>
      </div>
      
      
      <p style="margin-top: 30px;">
        Your insights help us build a better platform for the entire developer community. 
        Every piece of feedback is read by our team and considered in our product roadmap.
      </p>
      
      <p style="margin-bottom: 0;">
        Thank you for being part of the ZoomJudge community!<br>
        <strong>The ZoomJudge Team</strong>
      </p>
    `),
    textContent: `How is ZoomJudge working for you, {{userName}}?

You've been using ZoomJudge for a while now, and we'd love to hear about your experience. Your feedback directly influences what we build next!

We'd love to know:
- What features are working well for you?
- What could we improve or fix?
- What new features would be most valuable?
- How has ZoomJudge impacted your development workflow?

Share your feedback (2 minutes): {{feedbackUrl}}


Your insights help us build a better platform for the entire developer community. Every piece of feedback is read by our team and considered in our product roadmap.

Thank you for being part of the ZoomJudge community!
The ZoomJudge Team

© {{currentYear}} ZoomJudge. All rights reserved.
Unsubscribe: {{appUrl}}/unsubscribe?email={{recipientEmail}}`,
    variables: ['userName', 'feedbackUrl', 'appUrl', 'currentYear', 'recipientEmail'],
  },

  'product-update': {
    templateId: 'product-update',
    name: 'Product Update',
    description: 'Notify users about new features and improvements',
    subject: "What's New in ZoomJudge ✨ {{updateTitle}}",
    htmlContent: createBaseTemplate(`
      <h1 style="color: ${BRAND_COLORS.dark}; margin-bottom: 10px;">
        What's New in ZoomJudge ✨
      </h1>

      <p style="font-size: 16px; margin-bottom: 25px;">
        Hi {{userName}}, we've been busy building new features based on your feedback and the community's needs!
      </p>

      <div class="feature-box">
        <h2 style="color: ${BRAND_COLORS.primary}; margin-top: 0;">🚀 {{updateTitle}}</h2>
        <p style="margin-bottom: 0; font-size: 16px;">{{updateDescription}}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{appUrl}}/dashboard" class="button">
          🎯 Try It Now
        </a>
        <a href="{{changelogUrl}}" class="button button-secondary" style="margin-left: 10px;">
          📋 View Full Changelog
        </a>
      </div>



      <p style="margin-top: 30px;">
        Have ideas for future improvements? We'd love to hear them!
      </p>

      <p style="margin-bottom: 0;">
        Keep coding and improving!<br>
        <strong>The ZoomJudge Team</strong>
      </p>
    `),
    textContent: `What's New in ZoomJudge

Hi {{userName}}, we've been busy building new features based on your feedback and the community's needs!

🚀 {{updateTitle}}
{{updateDescription}}

Try it now: {{appUrl}}/dashboard
View full changelog: {{changelogUrl}}

Have ideas for future improvements? We'd love to hear them!

Keep coding and improving!
The ZoomJudge Team

© {{currentYear}} ZoomJudge. All rights reserved.
Unsubscribe: {{appUrl}}/unsubscribe?email={{recipientEmail}}`,
    variables: ['userName', 'updateTitle', 'updateDescription', 'changelogUrl', 'appUrl', 'currentYear', 'recipientEmail'],
  },

  'evaluation-complete': {
    templateId: 'evaluation-complete',
    name: 'Evaluation Complete',
    description: 'Notify users when their code evaluation is complete',
    subject: '✅ Your {{courseName}} evaluation is ready - Score: {{score}}/{{maxScore}}',
    htmlContent: createBaseTemplate(`
      <h1 style="color: ${BRAND_COLORS.dark}; margin-bottom: 10px;">
        Your Evaluation is Complete! ✅
      </h1>

      <p style="font-size: 16px; margin-bottom: 25px;">
        Hi {{userName}}, great news! We've finished evaluating your <strong>{{repositoryName}}</strong> repository
        for the {{courseName}} course.
      </p>

      <div class="stats-box">
        <h2 style="margin-top: 0; color: ${BRAND_COLORS.dark};">📊 Your Results</h2>
        <div style="text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: ${BRAND_COLORS.primary}; margin: 20px 0;">
            {{score}}/{{maxScore}}
          </div>
          <div style="font-size: 18px; color: ${BRAND_COLORS.secondary};">
            {{scorePercentage}}% - {{scoreGrade}}
          </div>
        </div>
      </div>

      <div class="feature-box">
        <h3 style="color: ${BRAND_COLORS.primary}; margin-top: 0;">🎯 Key Highlights</h3>
        <p style="margin-bottom: 15px;">{{summaryFeedback}}</p>
        <ul style="margin: 15px 0; padding-left: 20px;">
          <li><strong>Strengths:</strong> {{topStrengths}}</li>
          <li><strong>Areas for Improvement:</strong> {{improvementAreas}}</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{evaluationUrl}}" class="button">
          📋 View Detailed Report
        </a>
        <a href="{{appUrl}}/dashboard" class="button button-secondary" style="margin-left: 10px;">
          🏠 Back to Dashboard
        </a>
      </div>

      <p style="margin-top: 30px;">
        Want to improve your score? Review the detailed feedback in your
        <a href="{{appUrl}}/dashboard" style="color: ${BRAND_COLORS.primary};">dashboard</a>
        or submit an updated version of your repository.
      </p>

      <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_COLORS.secondary};">
          <strong>Email Preferences</strong>
        </p>
        <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.secondary};">
          You can <a href="{{appUrl}}/unsubscribe?email={{recipientEmail}}" style="color: ${BRAND_COLORS.primary}; text-decoration: underline;">unsubscribe</a>
          or <a href="{{appUrl}}/preferences?email={{recipientEmail}}" style="color: ${BRAND_COLORS.primary}; text-decoration: underline;">manage your email preferences</a> at any time.
        </p>
      </div>

      <p style="margin-bottom: 0;">
        Keep up the great work!<br>
        <strong>The ZoomJudge Team</strong>
      </p>
    `),
    textContent: `Your Evaluation is Complete!

Hi {{userName}}, great news! We've finished evaluating your {{repositoryName}} repository for the {{courseName}} course.

Your Results:
Score: {{score}}/{{maxScore}} ({{scorePercentage}}% - {{scoreGrade}})

Key Highlights:
{{summaryFeedback}}

- Strengths: {{topStrengths}}
- Areas for Improvement: {{improvementAreas}}

View detailed report: {{evaluationUrl}}
Back to dashboard: {{appUrl}}/dashboard

Want to improve your score? Review the detailed feedback in your dashboard: {{appUrl}}/dashboard

Keep up the great work!
The ZoomJudge Team

© {{currentYear}} ZoomJudge. All rights reserved.
Unsubscribe: {{appUrl}}/unsubscribe?email={{recipientEmail}}`,
    variables: ['userName', 'repositoryName', 'courseName', 'score', 'maxScore', 'scorePercentage', 'scoreGrade', 'summaryFeedback', 'topStrengths', 'improvementAreas', 'evaluationUrl', 'appUrl', 'currentYear', 'recipientEmail'],
  },
};
