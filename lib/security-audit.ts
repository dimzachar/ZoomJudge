/**
 * Security Audit Logging System
 * Provides comprehensive security event logging and monitoring
 */

/**
 * Security event types
 */
export type SecurityEventType =
  | 'validation_failure'
  | 'rate_limit_exceeded'
  | 'webhook_invalid'
  | 'auth_failure'
  | 'suspicious_activity'
  | 'config_error'
  | 'repository_access_denied'
  | 'file_access_attempt'
  | 'api_abuse_detected'
  | 'unauthorized_api_access'
  | 'billing_limit_exceeded';

/**
 * Security event interface
 */
export interface SecurityEvent {
  type: SecurityEventType;
  ip: string;
  userAgent?: string;
  userId?: string;
  details: Record<string, any>;
}

/**
 * Security log entry interface
 */
export interface SecurityLogEntry {
  timestamp: string;
  level: 'SECURITY';
  type: SecurityEventType;
  ip: string;
  userAgent?: string;
  userId?: string;
  details: Record<string, any>;
  requestId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Log a security event with proper formatting and routing
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const requestId = generateRequestId();
  const severity = getEventSeverity(event.type);
  
  const logEntry: SecurityLogEntry = {
    timestamp: new Date().toISOString(),
    level: 'SECURITY',
    type: event.type,
    ip: event.ip,
    userAgent: event.userAgent,
    userId: event.userId,
    details: sanitizeLogDetails(event.details),
    requestId,
    severity,
  };

  // Log to console with appropriate level
  const logLevel = severity === 'critical' ? 'error' : 
                   severity === 'high' ? 'error' :
                   severity === 'medium' ? 'warn' : 'info';
  
  console[logLevel](`[SECURITY] ${event.type}:`, logEntry);

  // Update metrics
  SecurityMetrics.getInstance().increment(`security_event_${event.type}`);
  SecurityMetrics.getInstance().increment(`security_severity_${severity}`);

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    sendToMonitoringService(logEntry).catch(error => {
      console.error('Failed to send security event to monitoring service:', error);
    });
  }
  
  // Store in memory for recent events (useful for debugging)
  RecentSecurityEvents.getInstance().addEvent(logEntry);
}

/**
 * Log suspicious activity with context
 */
export function logSuspiciousActivity(
  ip: string,
  activity: string,
  details: Record<string, any> = {},
  userAgent?: string,
  userId?: string
): void {
  logSecurityEvent({
    type: 'suspicious_activity',
    ip,
    userAgent,
    userId,
    details: {
      activity,
      ...details,
    },
  });
}

/**
 * Log API abuse detection
 */
export function logAPIAbuse(
  ip: string,
  endpoint: string,
  reason: string,
  details: Record<string, any> = {}
): void {
  logSecurityEvent({
    type: 'api_abuse_detected',
    ip,
    details: {
      endpoint,
      reason,
      ...details,
    },
  });
}

/**
 * Generate a unique request ID for correlation
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determine event severity based on type
 */
function getEventSeverity(type: SecurityEventType): 'low' | 'medium' | 'high' | 'critical' {
  switch (type) {
    case 'config_error':
      return 'critical';
    case 'auth_failure':
    case 'webhook_invalid':
    case 'api_abuse_detected':
    case 'unauthorized_api_access':
    case 'billing_limit_exceeded':
      return 'high';
    case 'rate_limit_exceeded':
    case 'suspicious_activity':
    case 'repository_access_denied':
      return 'medium';
    case 'validation_failure':
    case 'file_access_attempt':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Sanitize log details to remove sensitive information
 */
function sanitizeLogDetails(details: Record<string, any>): Record<string, any> {
  const sanitized = { ...details };
  
  // Remove or redact sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'key'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Truncate long strings
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = value.substring(0, 1000) + '... [TRUNCATED]';
    }
  }
  
  return sanitized;
}

/**
 * Send security event to external monitoring service
 */
async function sendToMonitoringService(logEntry: SecurityLogEntry): Promise<void> {
  // This would integrate with your monitoring service (e.g., DataDog, New Relic, etc.)
  // For now, we'll just log that we would send it
  console.debug('Would send to monitoring service:', {
    type: logEntry.type,
    severity: logEntry.severity,
    timestamp: logEntry.timestamp,
  });
}

/**
 * Security metrics tracking singleton
 */
export class SecurityMetrics {
  private static instance: SecurityMetrics;
  private metrics: Map<string, number> = new Map();
  private lastReset: Date = new Date();

  static getInstance(): SecurityMetrics {
    if (!SecurityMetrics.instance) {
      SecurityMetrics.instance = new SecurityMetrics();
    }
    return SecurityMetrics.instance;
  }

  increment(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  getMetric(metric: string): number {
    return this.metrics.get(metric) || 0;
  }

  reset(): void {
    this.metrics.clear();
    this.lastReset = new Date();
  }

  getLastReset(): Date {
    return this.lastReset;
  }

  // Get metrics for the last hour
  getHourlyMetrics(): Record<string, number> {
    // In a real implementation, this would track time-based metrics
    return this.getMetrics();
  }
}

/**
 * Recent security events storage (in-memory for debugging)
 */
class RecentSecurityEvents {
  private static instance: RecentSecurityEvents;
  private events: SecurityLogEntry[] = [];
  private maxEvents: number = 100;

  static getInstance(): RecentSecurityEvents {
    if (!RecentSecurityEvents.instance) {
      RecentSecurityEvents.instance = new RecentSecurityEvents();
    }
    return RecentSecurityEvents.instance;
  }

  addEvent(event: SecurityLogEntry): void {
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
  }

  getEvents(limit: number = 50): SecurityLogEntry[] {
    return this.events.slice(0, limit);
  }

  getEventsByType(type: SecurityEventType, limit: number = 20): SecurityLogEntry[] {
    return this.events
      .filter(event => event.type === type)
      .slice(0, limit);
  }

  getEventsByIP(ip: string, limit: number = 20): SecurityLogEntry[] {
    return this.events
      .filter(event => event.ip === ip)
      .slice(0, limit);
  }

  clear(): void {
    this.events = [];
  }
}

/**
 * Get recent security events (useful for debugging and monitoring)
 */
export function getRecentSecurityEvents(limit: number = 50): SecurityLogEntry[] {
  return RecentSecurityEvents.getInstance().getEvents(limit);
}

/**
 * Get security metrics summary
 */
export function getSecurityMetricsSummary(): {
  metrics: Record<string, number>;
  recentEvents: SecurityLogEntry[];
  lastReset: Date;
} {
  const metricsInstance = SecurityMetrics.getInstance();
  const eventsInstance = RecentSecurityEvents.getInstance();
  
  return {
    metrics: metricsInstance.getMetrics(),
    recentEvents: eventsInstance.getEvents(10),
    lastReset: metricsInstance.getLastReset(),
  };
}
