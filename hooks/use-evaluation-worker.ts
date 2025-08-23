import { useEffect, useRef, useState } from 'react'
import { EvaluationWorker } from '@/lib/web-workers/evaluation-worker'

export function useEvaluationWorker() {
  const workerRef = useRef<EvaluationWorker | null>(null)
  const [isWorkerReady, setIsWorkerReady] = useState(false)

  useEffect(() => {
    // Initialize worker
    workerRef.current = new EvaluationWorker()
    setIsWorkerReady(true)

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  const processFiles = async (files: any[]) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized')
    }
    return workerRef.current.processFiles(files)
  }

  const analyzeCode = async (files: any[]) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized')
    }
    return workerRef.current.analyzeCode(files)
  }

  const generateSignature = async (files: any[]) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized')
    }
    return workerRef.current.generateSignature(files)
  }

  return {
    isWorkerReady,
    processFiles,
    analyzeCode,
    generateSignature,
  }
}
