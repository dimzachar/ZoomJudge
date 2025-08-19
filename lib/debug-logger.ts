/**
 * Debug Logger Utility
 * 
 * Provides simple debug logging functions that respect environment settings.
 * This module works in both browser and server environments.
 */

/**
 * Check if debug logging should be enabled
 */
function shouldEnableDebugLogging(): boolean {
  // Enable debug logging in development or when explicitly enabled
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.NODE_ENV === 'development' || 
      process.env.SIMPLE_LOGGER_ENABLED === 'true'
    );
  }
  
  // Fallback for browser environments - check if we're in development
  return typeof window !== 'undefined' && window.location?.hostname === 'localhost';
}

/**
 * Debug log function - only logs in development or when explicitly enabled
 */
export function debugLog(message: string, ...args: any[]): void {
  if (!shouldEnableDebugLogging()) return;
  
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG ${timestamp}] ${message}`, ...args);
}

/**
 * Debug error function - only logs in development or when explicitly enabled
 */
export function debugError(message: string, ...args: any[]): void {
  if (!shouldEnableDebugLogging()) return;
  
  const timestamp = new Date().toISOString();
  console.error(`[DEBUG ERROR ${timestamp}] ${message}`, ...args);
}

/**
 * Debug warn function - only logs in development or when explicitly enabled
 */
export function debugWarn(message: string, ...args: any[]): void {
  if (!shouldEnableDebugLogging()) return;
  
  const timestamp = new Date().toISOString();
  console.warn(`[DEBUG WARN ${timestamp}] ${message}`, ...args);
}

/**
 * Debug info function - only logs in development or when explicitly enabled
 */
export function debugInfo(message: string, ...args: any[]): void {
  if (!shouldEnableDebugLogging()) return;
  
  const timestamp = new Date().toISOString();
  console.info(`[DEBUG INFO ${timestamp}] ${message}`, ...args);
}

/**
 * Check if debug logging is currently enabled
 */
export function isDebugEnabled(): boolean {
  return shouldEnableDebugLogging();
}
