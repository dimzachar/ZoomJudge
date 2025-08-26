/**
 * Tests for EmailService
 */

import { EmailService } from '../EmailService';

// Mock the Resend module
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

// Mock the configuration service
jest.mock('../../config/ConfigurationService', () => ({
  ConfigurationService: {
    getInstance: jest.fn(() => ({
      getEmailConfig: jest.fn(() => ({
        resend: {
          enabled: true,
          apiKey: 'test-api-key',
          fromEmail: 'test@zoomjudge.com',
          fromDomain: 'zoomjudge.com',
        },
      })),
      getSiteConfig: jest.fn(() => ({
        name: 'ZoomJudge',
        url: 'https://zoomjudge.com',
      })),
    })),
  },
}));

describe('EmailService', () => {
  let emailService: EmailService;
  let mockResendSend: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create new instance
    emailService = new EmailService();
    
    // Get the mocked send function
    const { Resend } = require('resend');
    const mockResendInstance = new Resend();
    mockResendSend = mockResendInstance.emails.send;
  });

  describe('Email Validation', () => {
    test('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
      ];

      validEmails.forEach(email => {
        const result = emailService.validateEmail(email);
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
        const result = emailService.validateEmail(email);
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
        const result = emailService.validateEmail(input);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedEmail).toBe(expected);
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should allow emails within rate limit', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' } });

      // Send multiple emails within limit
      for (let i = 0; i < 5; i++) {
        const result = await emailService.sendTemplatedEmail({
          to: 'test@example.com',
          templateId: 'welcome',
          variables: { userName: 'Test User' },
        });
        expect(result.success).toBe(true);
      }
    });

    test('should reject emails when rate limit exceeded', async () => {
      // Mock the rate limit to be very low for testing
      const originalRateLimit = (emailService as any).RATE_LIMIT_COUNT;
      (emailService as any).RATE_LIMIT_COUNT = 2;

      mockResendSend.mockResolvedValue({ data: { id: 'test-id' } });

      // Send emails up to limit
      for (let i = 0; i < 2; i++) {
        const result = await emailService.sendTemplatedEmail({
          to: 'test@example.com',
          templateId: 'welcome',
          variables: { userName: 'Test User' },
        });
        expect(result.success).toBe(true);
      }

      // Next email should be rate limited
      const result = await emailService.sendTemplatedEmail({
        to: 'test@example.com',
        templateId: 'welcome',
        variables: { userName: 'Test User' },
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');

      // Restore original rate limit
      (emailService as any).RATE_LIMIT_COUNT = originalRateLimit;
    });
  });

  describe('Template Processing', () => {
    test('should process template variables correctly', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' } });

      const result = await emailService.sendTemplatedEmail({
        to: 'test@example.com',
        templateId: 'welcome',
        variables: { userName: 'John Doe' },
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('ZoomJudge'),
          html: expect.stringContaining('John Doe'),
        })
      );
    });

    test('should handle missing template gracefully', async () => {
      const result = await emailService.sendTemplatedEmail({
        to: 'test@example.com',
        templateId: 'non-existent-template',
        variables: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });
  });

  describe('Error Handling', () => {
    test('should handle Resend API errors gracefully', async () => {
      mockResendSend.mockRejectedValue(new Error('API Error'));

      const result = await emailService.sendTemplatedEmail({
        to: 'test@example.com',
        templateId: 'welcome',
        variables: { userName: 'Test User' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    test('should handle service unavailability', async () => {
      // Mock service as unavailable
      jest.spyOn(emailService, 'isAvailable').mockResolvedValue(false);

      const result = await emailService.sendTemplatedEmail({
        to: 'test@example.com',
        templateId: 'welcome',
        variables: { userName: 'Test User' },
      });

      expect(result).toEqual({
        success: false,
        error: 'Email service not available - Resend not configured',
      });
    });
  });

  describe('Convenience Methods', () => {
    test('should send welcome email correctly', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' } });

      const result = await emailService.sendWelcomeEmail('test@example.com', 'John Doe');

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['test@example.com'],
          subject: expect.stringContaining('Welcome'),
          html: expect.stringContaining('John Doe'),
        })
      );
    });

    test('should send feedback request email correctly', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' } });

      const result = await emailService.sendFeedbackRequestEmail('test@example.com', 'John Doe');

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['test@example.com'],
          subject: expect.stringContaining('feedback'),
          html: expect.stringContaining('John Doe'),
        })
      );
    });

    test('should send product update email correctly', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' } });

      const result = await emailService.sendProductUpdateEmail(
        'test@example.com',
        'John Doe',
        'New Feature',
        'We added a new feature'
      );

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['test@example.com'],
          subject: expect.stringContaining('New Feature'),
          html: expect.stringContaining('We added a new feature'),
        })
      );
    });
  });

  describe('Bulk Email', () => {
    test('should send bulk emails with proper batching', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'test-id' } });

      const recipients = Array.from({ length: 25 }, (_, i) => `user${i}@example.com`);
      const results = await emailService.sendBulkEmail(recipients, 'welcome', { userName: 'User' });

      expect(results).toHaveLength(25);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockResendSend).toHaveBeenCalledTimes(25);
    });

    test('should handle bulk email failures gracefully', async () => {
      // Mock some failures
      mockResendSend
        .mockResolvedValueOnce({ data: { id: 'test-id-1' } })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ data: { id: 'test-id-3' } });

      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const results = await emailService.sendBulkEmail(recipients, 'welcome', { userName: 'User' });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
});
