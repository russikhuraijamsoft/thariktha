/**
 * Security audit logger
 * Logs all security-relevant events for compliance and monitoring.
 */

type SecurityEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'ACCESS_DENIED'
  | 'PRIVILEGE_ESCALATION_ATTEMPT'
  | 'VALIDATION_FAILURE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_ACTIVITY';

interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  roleId?: string;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  details: string;
  timestamp: string;
}

class SecurityLogger {
  private logBuffer: SecurityEvent[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;

  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    // Log to console
    console.log(`[SECURITY] ${fullEvent.type}: ${fullEvent.details} | User: ${fullEvent.userId || 'anonymous'} | IP: ${fullEvent.ip}`);

    // Buffer for batch processing
    this.logBuffer.push(fullEvent);
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  /**
   * Flush buffered logs to persistent storage
   * In production, this would write to a SIEM or log aggregation service
   */
  flush(): void {
    if (this.logBuffer.length === 0) return;

    // In production, send to external logging service
    // For now, just clear the buffer
    this.logBuffer = [];
  }

  /**
   * Get recent security events (for admin dashboard)
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.logBuffer.slice(-limit);
  }
}

export const securityLogger = new SecurityLogger();
