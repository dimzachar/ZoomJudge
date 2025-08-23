"use client"

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/service-worker'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}
