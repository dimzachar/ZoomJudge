/**
 * Console Override Utility
 * 
 * This module provides a way to globally disable console logging
 * based on environment variables while preserving the original
 * console functionality for development.
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
  info: console.info,
};

/**
 * Check if logging should be enabled
 */
function shouldEnableLogging(): boolean {
  // If SIMPLE_LOGGER_ENABLED is explicitly set, respect that setting
  if (process.env.SIMPLE_LOGGER_ENABLED !== undefined) {
    return process.env.SIMPLE_LOGGER_ENABLED === 'true';
  }

  // Otherwise, enable logging only in development
  return process.env.NODE_ENV === 'development';
}

/**
 * Override console methods to respect environment settings
 */
export function setupConsoleOverride() {
  const isEnabled = shouldEnableLogging();

  if (!isEnabled) {
    // Disable all console output except errors in production
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
    
    // Keep errors for critical issues
    console.error = originalConsole.error;
  } else {
    // Restore original console methods
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
  }
}

/**
 * Restore original console methods
 */
export function restoreConsole() {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
}

/**
 * Get current logging status
 */
export function isLoggingEnabled(): boolean {
  return shouldEnableLogging();
}

// Auto-setup on import (for convenience)
setupConsoleOverride();
