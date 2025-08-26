/**
 * Tests for email validation utilities
 */

import {
  validateEmailAddress,
  validateEmailTemplate,
  validateTemplateContent,
  validateEmailSendOptions,
  validateEmailCampaign,
  validateBulkEmailRecipients,
  checkSpamScore,
} from '../email-validation';

describe('Email Validation', () => {
  describe('validateEmailAddress', () => {
    test('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
      ];

      validEmails.forEach(email => {
        const result = validateEmailAddress(email);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedEmail).toBe(email.toLowerCase());
      });
    });

    test('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        '',
        'user name@domain.com',
      ];

      invalidEmails.forEach(email => {
        const result = validateEmailAddress(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should sanitize email addresses', () => {
      const testCases = [
        { input: 'TEST@EXAMPLE.COM', expected: 'test@example.com' },
        { input: '  user@domain.com  ', expected: 'user@domain.com' },
        { input: 'User.Name@Domain.COM', expected: 'user.name@domain.com' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = validateEmailAddress(input);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedEmail).toBe(expected);
      });
    });
  });

  describe('validateEmailTemplate', () => {
    const validTemplate = {
      templateId: 'welcome-email',
      name: 'Welcome Email',
      description: 'Welcome email for new users',
      subject: 'Welcome to {{appName}}!',
      htmlContent: '<html><body><h1>Welcome {{userName}}!</h1><p>Visit {{appUrl}} - {{currentYear}}</p></body></html>',
      textContent: 'Welcome {{userName}}! Visit {{appUrl}} - {{currentYear}}',
      variables: ['userName'],
    };

    test('should validate correct email template', () => {
      const result = validateEmailTemplate(validTemplate);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedTemplate).toBeDefined();
    });

    test('should reject template with invalid templateId', () => {
      const invalidTemplate = { ...validTemplate, templateId: 'Invalid Template ID!' };
      const result = validateEmailTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Template ID can only contain'));
    });

    test('should reject template with missing required fields', () => {
      const invalidTemplate = { ...validTemplate, name: '' };
      const result = validateEmailTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Template name is required'));
    });

    test('should reject template with content too long', () => {
      const invalidTemplate = { 
        ...validTemplate, 
        htmlContent: 'x'.repeat(100001) 
      };
      const result = validateEmailTemplate(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('HTML content too long'));
    });
  });

  describe('validateTemplateContent', () => {
    test('should validate safe template content', () => {
      const safeTemplate = {
        htmlContent: '<html><body><h1>Welcome {{userName}}!</h1><p>Visit {{appUrl}} - {{currentYear}} {{appName}}</p><img src="logo.png" alt="Logo" style="max-width: 100%"></body></html>',
        textContent: 'Welcome {{userName}}! Visit {{appUrl}} - {{currentYear}} {{appName}}',
        variables: ['userName'],
      };

      const result = validateTemplateContent(safeTemplate);
      expect(result.isValid).toBe(true);
    });

    test('should reject template with dangerous HTML', () => {
      const dangerousTemplate = {
        htmlContent: '<html><body><script>alert("xss")</script><h1>Welcome {{userName}}!</h1><p>{{appUrl}} {{currentYear}} {{appName}}</p></body></html>',
        textContent: 'Welcome {{userName}}! {{appUrl}} {{currentYear}} {{appName}}',
        variables: ['userName'],
      };

      const result = validateTemplateContent(dangerousTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('dangerous elements')]));
    });

    test('should reject template missing required variables', () => {
      const incompleteTemplate = {
        htmlContent: '<html><body><h1>Welcome {{userName}}!</h1></body></html>',
        textContent: 'Welcome {{userName}}!',
        variables: ['userName'],
      };

      const result = validateTemplateContent(incompleteTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('Missing required template variables')]));
    });

    test('should reject template with undefined variables', () => {
      const undefinedVarTemplate = {
        htmlContent: '<html><body><h1>Welcome {{userName}}!</h1><p>{{undefinedVar}} {{appUrl}} {{currentYear}} {{appName}}</p></body></html>',
        textContent: 'Welcome {{userName}}! {{appUrl}} {{currentYear}} {{appName}}',
        variables: ['userName'],
      };

      const result = validateTemplateContent(undefinedVarTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('Undefined template variables')]));
    });
  });

  describe('validateEmailSendOptions', () => {
    test('should validate correct send options', () => {
      const validOptions = {
        to: 'test@example.com',
        templateId: 'welcome',
        variables: { userName: 'John Doe' },
      };

      const result = validateEmailSendOptions(validOptions);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedOptions).toBeDefined();
    });

    test('should validate multiple recipients', () => {
      const validOptions = {
        to: ['test1@example.com', 'test2@example.com'],
        templateId: 'welcome',
        variables: { userName: 'John Doe' },
      };

      const result = validateEmailSendOptions(validOptions);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid recipient email', () => {
      const invalidOptions = {
        to: 'invalid-email',
        templateId: 'welcome',
      };

      const result = validateEmailSendOptions(invalidOptions);
      expect(result.isValid).toBe(false);
    });

    test('should reject too many recipients', () => {
      const invalidOptions = {
        to: Array.from({ length: 101 }, (_, i) => `user${i}@example.com`),
        templateId: 'welcome',
      };

      const result = validateEmailSendOptions(invalidOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Too many recipients'));
    });
  });

  describe('validateBulkEmailRecipients', () => {
    test('should validate correct recipient list', () => {
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const result = validateBulkEmailRecipients(recipients);
      
      expect(result.isValid).toBe(true);
      expect(result.validRecipients).toHaveLength(3);
    });

    test('should filter out invalid emails', () => {
      const recipients = ['user1@example.com', 'invalid-email', 'user3@example.com'];
      const result = validateBulkEmailRecipients(recipients);
      
      expect(result.isValid).toBe(false);
      expect(result.validRecipients).toHaveLength(2);
      expect(result.errors).toContain(expect.stringContaining('Invalid email at index 1'));
    });

    test('should detect duplicate emails', () => {
      const recipients = ['user1@example.com', 'user2@example.com', 'user1@example.com'];
      const result = validateBulkEmailRecipients(recipients);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('Duplicate email addresses')]));
    });

    test('should reject empty recipient list', () => {
      const result = validateBulkEmailRecipients([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining(['No recipients provided']));
    });

    test('should reject too many recipients', () => {
      const recipients = Array.from({ length: 1001 }, (_, i) => `user${i}@example.com`);
      const result = validateBulkEmailRecipients(recipients);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining(['Too many recipients (max 1000)']));
    });
  });

  describe('checkSpamScore', () => {
    test('should give low score for clean content', () => {
      const subject = 'Welcome to ZoomJudge';
      const htmlContent = '<html><body><h1>Welcome!</h1><p>Thank you for joining our platform.</p></body></html>';
      const textContent = 'Welcome! Thank you for joining our platform.';

      const result = checkSpamScore(subject, htmlContent, textContent);
      expect(result.score).toBeLessThan(3);
    });

    test('should detect spam trigger words', () => {
      const subject = 'FREE URGENT OFFER!!!';
      const htmlContent = '<html><body><h1>FREE MONEY!</h1><p>CLICK HERE NOW!</p></body></html>';

      const result = checkSpamScore(subject, htmlContent);
      expect(result.score).toBeGreaterThan(3);
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('spam trigger words')]));
    });

    test('should detect excessive capitalization', () => {
      const subject = 'Welcome';
      const htmlContent = '<html><body><h1>WELCOME TO OUR AMAZING PLATFORM!</h1><p>THIS IS THE BEST SERVICE EVER!</p></body></html>';

      const result = checkSpamScore(subject, htmlContent);
      expect(result.score).toBeGreaterThan(1);
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('capital letters')]));
    });

    test('should warn about missing text version', () => {
      const subject = 'Welcome';
      const htmlContent = '<html><body><h1>Welcome!</h1></body></html>';

      const result = checkSpamScore(subject, htmlContent);
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Missing plain text version')]));
    });

    test('should warn about long subject line', () => {
      const subject = 'This is a very long subject line that exceeds the recommended length for email subjects';
      const htmlContent = '<html><body><h1>Welcome!</h1></body></html>';

      const result = checkSpamScore(subject, htmlContent);
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Subject line is too long')]));
    });
  });
});
