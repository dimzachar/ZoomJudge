/**
 * Web Worker for heavy evaluation computations
 * Offloads CPU-intensive tasks from the main thread
 */

// Types for worker communication
export interface EvaluationTask {
  type: 'PROCESS_FILES' | 'ANALYZE_CODE' | 'GENERATE_SIGNATURE'
  payload: any
  id: string
}

export interface EvaluationResult {
  type: 'SUCCESS' | 'ERROR'
  payload: any
  id: string
}

// Worker script content
const workerScript = `
  // File processing utilities
  function processFiles(files) {
    const processed = files.map(file => {
      // Simulate heavy processing
      const analysis = {
        name: file.name,
        size: file.content?.length || 0,
        complexity: calculateComplexity(file.content || ''),
        dependencies: extractDependencies(file.content || ''),
      }
      return analysis
    })
    return processed
  }

  function calculateComplexity(content) {
    // Simple complexity calculation
    const lines = content.split('\\n').length
    const functions = (content.match(/function|=>|class/g) || []).length
    const conditionals = (content.match(/if|switch|for|while/g) || []).length
    
    return {
      lines,
      functions,
      conditionals,
      score: lines + functions * 2 + conditionals * 1.5
    }
  }

  function extractDependencies(content) {
    const imports = content.match(/import.*from.*['"]([^'"]+)['"]/g) || []
    const requires = content.match(/require\\(['"]([^'"]+)['"]\\)/g) || []
    
    return [...imports, ...requires].map(dep => {
      const match = dep.match(/['"]([^'"]+)['"]/)
      return match ? match[1] : ''
    }).filter(Boolean)
  }

  function generateSignature(files) {
    const technologies = new Set()
    const patterns = new Set()
    let totalSize = 0

    files.forEach(file => {
      totalSize += file.content?.length || 0
      
      // Detect technologies
      if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        technologies.add('TypeScript')
      }
      if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
        technologies.add('JavaScript')
      }
      if (file.name.endsWith('.py')) {
        technologies.add('Python')
      }
      if (file.name === 'package.json') {
        technologies.add('Node.js')
      }
      if (file.name === 'requirements.txt') {
        technologies.add('Python')
      }
      
      // Detect patterns
      const content = file.content || ''
      if (content.includes('import React')) {
        patterns.add('React')
      }
      if (content.includes('from flask')) {
        patterns.add('Flask')
      }
      if (content.includes('import pandas')) {
        patterns.add('Data Science')
      }
    })

    return {
      technologies: Array.from(technologies),
      patterns: Array.from(patterns),
      sizeCategory: totalSize > 100000 ? 'large' : totalSize > 10000 ? 'medium' : 'small',
      fileCount: files.length
    }
  }

  // Message handler
  self.onmessage = function(e) {
    const { type, payload, id } = e.data

    try {
      let result
      
      switch (type) {
        case 'PROCESS_FILES':
          result = processFiles(payload.files)
          break
        case 'ANALYZE_CODE':
          result = payload.files.map(file => ({
            ...file,
            analysis: calculateComplexity(file.content || '')
          }))
          break
        case 'GENERATE_SIGNATURE':
          result = generateSignature(payload.files)
          break
        default:
          throw new Error('Unknown task type: ' + type)
      }

      self.postMessage({
        type: 'SUCCESS',
        payload: result,
        id
      })
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        payload: { message: error.message },
        id
      })
    }
  }
`

// Worker manager class
export class EvaluationWorker {
  private worker: Worker | null = null
  private tasks = new Map<string, { resolve: Function; reject: Function }>()

  constructor() {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      this.initWorker()
    }
  }

  private initWorker() {
    try {
      const blob = new Blob([workerScript], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      this.worker = new Worker(workerUrl)
      
      this.worker.onmessage = (e) => {
        const { type, payload, id } = e.data as EvaluationResult
        const task = this.tasks.get(id)
        
        if (task) {
          this.tasks.delete(id)
          if (type === 'SUCCESS') {
            task.resolve(payload)
          } else {
            task.reject(new Error(payload.message))
          }
        }
      }

      this.worker.onerror = (error) => {
        console.error('Worker error:', error)
      }
    } catch (error) {
      console.warn('Failed to create worker:', error)
    }
  }

  async processFiles(files: any[]): Promise<any> {
    return this.executeTask('PROCESS_FILES', { files })
  }

  async analyzeCode(files: any[]): Promise<any> {
    return this.executeTask('ANALYZE_CODE', { files })
  }

  async generateSignature(files: any[]): Promise<any> {
    return this.executeTask('GENERATE_SIGNATURE', { files })
  }

  private executeTask(type: EvaluationTask['type'], payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback to main thread if worker not available
        reject(new Error('Worker not available'))
        return
      }

      const id = Math.random().toString(36).substr(2, 9)
      this.tasks.set(id, { resolve, reject })

      this.worker.postMessage({ type, payload, id })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.tasks.has(id)) {
          this.tasks.delete(id)
          reject(new Error('Worker task timeout'))
        }
      }, 30000)
    })
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.tasks.clear()
  }
}
