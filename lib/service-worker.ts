/**
 * Service Worker Registration for ZoomJudge
 * Handles caching strategies for improved performance
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Only register in production
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service Worker registered successfully:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, notify user
              console.log('New content available, please refresh.');
              
              // Optionally show a notification to the user
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('ZoomJudge Update Available', {
                  body: 'New content is available. Please refresh the page.',
                  icon: '/icon.svg',
                });
              }
            }
          });
        }
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.unregister();
    })
    .catch((error) => {
      console.error('Service Worker unregistration failed:', error);
    });
}
