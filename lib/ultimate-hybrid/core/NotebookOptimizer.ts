/**
 * Notebook Optimizer - Intelligently optimizes Jupyter notebooks for LLM evaluation
 * Reduces token usage while preserving essential information for assessment
 */

export interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string[];
  outputs?: any[];
  execution_count?: number;
  metadata?: any;
}

export interface NotebookContent {
  cells: NotebookCell[];
  metadata: any;
  nbformat: number;
  nbformat_minor: number;
}

export interface CodeFunction {
  name: string;
  definition: string;
  cellIndex: number;
  fullCode?: string;
  type?: 'function' | 'class';
}

export interface NotebookComponents {
  summary: string;
  keyFunctions: CodeFunction[];
  imports: string[];
  mainLogic: string[];
  errors: string[];
  outputs: string[];
  structure: any;
}

export interface OptimizedNotebook {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  content: string;
  metadata: any;
}

export interface CourseData {
  courseId: string;
  courseName: string;
  rubric?: string;
}

export class NotebookOptimizer {
  private maxTokensPerNotebook = 8000; // Configurable limit
  private maxCellOutputSize = 500; // Max tokens for cell output

  async optimizeNotebook(
    notebookPath: string, 
    notebookContent: string,
    courseContext: CourseData
  ): Promise<OptimizedNotebook | null> {
    try {
      // Check if content is truncated
      if (notebookContent.includes('[File truncated due to size limits]')) {
        console.warn(`Notebook ${notebookPath} is truncated, applying alternative optimization`);
        return this.optimizeTruncatedNotebook(notebookPath, notebookContent, courseContext);
      }
      
      const parsedNotebook: NotebookContent = JSON.parse(notebookContent);
      
      // Strategy 1: Clean and analyze the notebook structure
      const cleanedNotebook = await this.cleanNotebook(parsedNotebook);
      
      // Strategy 2: Extract key components with smart selection
      const keyComponents = await this.extractKeyComponents(cleanedNotebook, courseContext);
      
      // Strategy 3: Create a summary with essential code
      const optimizedContent = await this.createOptimizedContent(keyComponents, courseContext);
      
      return {
        originalSize: this.estimateTokens(notebookContent),
        optimizedSize: this.estimateTokens(optimizedContent),
        compressionRatio: this.calculateCompression(notebookContent, optimizedContent),
        content: optimizedContent,
        metadata: this.extractMetadata(cleanedNotebook)
      };
    } catch (error) {
      console.error(`Error optimizing notebook ${notebookPath}:`, error);
      // Try alternative optimization for malformed content
      return this.optimizeTruncatedNotebook(notebookPath, notebookContent, courseContext);
    }
  }

  private async cleanNotebook(notebook: NotebookContent): Promise<NotebookContent> {
    const cleanedCells = notebook.cells.map(cell => {
      if (cell.cell_type === 'code') {
        return {
          ...cell,
          // Remove all outputs except error messages
          outputs: this.filterOutputs(cell.outputs),
          // Keep execution count for flow understanding
          execution_count: cell.execution_count
        };
      }
      return cell;
    });

    return { ...notebook, cells: cleanedCells };
  }

  private filterOutputs(outputs: any[] | undefined): any[] {
    if (!outputs) return [];
    
    return outputs.filter(output => {
      // Keep error outputs - they're important for evaluation
      if (output.output_type === 'error') return true;
      
      // Keep small text outputs (like print statements)
      if (output.output_type === 'stream' && 
          output.text && this.estimateTokens(output.text) < 100) return true;
      
      // Remove large outputs, images, plots
      return false;
    }).map(output => {
      // Truncate long outputs
      if (output.text && this.estimateTokens(output.text) > this.maxCellOutputSize) {
        return {
          ...output,
          text: this.truncateOutput(output.text),
          truncated: true
        };
      }
      return output;
    });
  }

  private async extractKeyComponents(
    notebook: NotebookContent, 
    courseContext: CourseData
  ): Promise<NotebookComponents> {
    
    const components: NotebookComponents = {
      summary: await this.generateNotebookSummary(notebook),
      keyFunctions: this.extractKeyFunctions(notebook),
      imports: this.extractImports(notebook),
      mainLogic: this.extractMainLogic(notebook, courseContext),
      errors: this.extractErrors(notebook),
      outputs: this.extractKeyOutputs(notebook),
      structure: this.analyzeStructure(notebook)
    };

    return components;
  }

  private extractKeyFunctions(notebook: NotebookContent): CodeFunction[] {
    const functions: CodeFunction[] = [];
    
    notebook.cells.forEach((cell, index) => {
      if (cell.cell_type === 'code') {
        const code = cell.source.join('\n');
        
        // Extract function definitions
        const funcMatches = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\):/g);
        if (funcMatches) {
          funcMatches.forEach(funcDef => {
            functions.push({
              name: funcDef.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)/)?.[1] || 'unknown',
              definition: funcDef,
              cellIndex: index,
              fullCode: this.extractFunctionBody(code, funcDef)
            });
          });
        }

        // Extract class definitions
        const classMatches = code.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)[^:]*:/g);
        if (classMatches) {
          classMatches.forEach(classDef => {
            functions.push({
              name: classDef.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/)?.[1] || 'unknown',
              definition: classDef,
              cellIndex: index,
              type: 'class'
            });
          });
        }
      }
    });

    return functions;
  }

  private extractImports(notebook: NotebookContent): string[] {
    const imports: string[] = [];
    
    notebook.cells.forEach(cell => {
      if (cell.cell_type === 'code') {
        const code = cell.source.join('\n');
        
        // Extract import statements
        const importMatches = code.match(/^(import\s+[a-zA-Z_][a-zA-Z0-9_.]*|from\s+[a-zA-Z_][a-zA-Z0-9_.]*\s+import\s+.*)$/gm);
        if (importMatches) {
          imports.push(...importMatches);
        }
      }
    });

    return imports;
  }

  private extractMainLogic(notebook: NotebookContent, courseContext: CourseData): string[] {
    const mainLogicCells: string[] = [];
    let currentTokens = 0;
    
    // Prioritize cells based on course context
    const prioritizedCells = this.prioritizeCells(notebook.cells, courseContext);
    
    for (const { cell, priority } of prioritizedCells) {
      if (cell.cell_type === 'code') {
        const cellContent = cell.source.join('\n');
        const cellTokens = this.estimateTokens(cellContent);
        
        // Include high-priority cells even if they're large
        if (priority > 0.8 || (currentTokens + cellTokens < this.maxTokensPerNotebook)) {
          mainLogicCells.push(cellContent);
          currentTokens += cellTokens;
        } else if (priority > 0.5) {
          // Include summary of medium-priority cells
          mainLogicCells.push(`// Cell ${prioritizedCells.indexOf({ cell, priority })}: ${this.summarizeCell(cellContent)}`);
        }
      }
    }

    return mainLogicCells;
  }

  private prioritizeCells(cells: NotebookCell[], courseContext: CourseData): Array<{cell: NotebookCell, priority: number}> {
    return cells.map(cell => ({
      cell,
      priority: this.calculateCellPriority(cell, courseContext)
    })).sort((a, b) => b.priority - a.priority);
  }

  private calculateCellPriority(cell: NotebookCell, courseContext: CourseData): number {
    if (cell.cell_type !== 'code') return 0.3; // Markdown cells get medium priority
    
    const code = cell.source.join('\n');
    let priority = 0.5; // Base priority
    
    // Higher priority for cells with function definitions
    if (code.includes('def ') || code.includes('class ')) priority += 0.3;
    
    // Higher priority for cells with course-relevant keywords
    const courseKeywords = this.extractCourseKeywords(courseContext);
    courseKeywords.forEach(keyword => {
      if (code.toLowerCase().includes(keyword.toLowerCase())) priority += 0.1;
    });
    
    // Higher priority for cells with imports
    if (code.includes('import ') || code.includes('from ')) priority += 0.2;
    
    // Lower priority for cells with only variable assignments
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(code.trim())) priority -= 0.1;
    
    // Higher priority for cells with control structures
    if (code.includes('for ') || code.includes('while ') || code.includes('if ')) priority += 0.1;
    
    // Lower priority for very long cells (likely to be less focused)
    if (this.estimateTokens(code) > 1000) priority -= 0.2;
    
    return Math.min(1.0, Math.max(0.0, priority));
  }

  private async createOptimizedContent(
    components: NotebookComponents, 
    courseContext: CourseData
  ): Promise<string> {
    
    const sections = [
      `# Notebook Summary\n${components.summary}\n`,
      
      `# Key Imports\n${components.imports.join('\n')}\n`,
      
      `# Main Functions\n${components.keyFunctions.map(f => f.fullCode || f.definition).join('\n\n')}\n`,
      
      `# Core Logic\n${this.formatMainLogic(components.mainLogic)}\n`,
      
      components.errors.length > 0 ? `# Errors Found\n${components.errors.join('\n')}\n` : '',
      
      `# Key Outputs\n${components.outputs.join('\n')}\n`,
      
      `# Notebook Structure\n${this.formatStructure(components.structure)}`
    ];

    return sections.filter(s => s.trim()).join('\n');
  }

  private formatMainLogic(mainLogic: string[]): string {
    if (mainLogic.length === 0) return '';
    
    // Group related code snippets together for better continuity
    const groupedLogic: string[] = [];
    let currentGroup: string[] = [];
    
    for (const code of mainLogic) {
      // If current group is empty or the code seems related to the previous snippet
      if (currentGroup.length === 0 || this.areCodeSnippetsRelated(currentGroup[currentGroup.length - 1], code)) {
        currentGroup.push(code);
      } else {
        // Start a new group
        if (currentGroup.length > 0) {
          groupedLogic.push(currentGroup.join('\n\n'));
        }
        currentGroup = [code];
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groupedLogic.push(currentGroup.join('\n\n'));
    }
    
    return groupedLogic.slice(0, 5).join('\n\n# ---\n\n');
  }

  private areCodeSnippetsRelated(code1: string, code2: string): boolean {
    // Simple heuristic to determine if code snippets are related
    const lines1 = code1.split('\n').filter(line => line.trim() !== '');
    const lines2 = code2.split('\n').filter(line => line.trim() !== '');
    
    if (lines1.length === 0 || lines2.length === 0) return false;
    
    // Check if they share common variable names or function calls
    const lastLineOfFirst = lines1[lines1.length - 1];
    const firstLineOfSecond = lines2[0];
    
    // Look for variable assignments in first snippet and usage in second
    const varMatch = lastLineOfFirst.match(/^(\w+)\s*=/);
    if (varMatch) {
      const varName = varMatch[1];
      return firstLineOfSecond.includes(varName);
    }
    
    // Look for function calls that might be continued
    if (lastLineOfFirst.endsWith('\\') || firstLineOfSecond.startsWith('  ') || firstLineOfSecond.startsWith('\t')) {
      return true;
    }
    
    return false;
  }

  private async generateNotebookSummary(notebook: NotebookContent): Promise<string> {
    const stats = {
      totalCells: notebook.cells.length,
      codeCells: notebook.cells.filter(c => c.cell_type === 'code').length,
      markdownCells: notebook.cells.filter(c => c.cell_type === 'markdown').length,
      hasErrors: notebook.cells.some(c => c.outputs?.some(o => o.output_type === 'error')),
      mainTopics: this.extractTopics(notebook)
    };

    return `Jupyter notebook with ${stats.totalCells} cells (${stats.codeCells} code, ${stats.markdownCells} markdown). 
Topics: ${stats.mainTopics.join(', ')}. 
${stats.hasErrors ? 'Contains execution errors.' : 'No execution errors detected.'}`;
  }

  private extractTopics(notebook: NotebookContent): string[] {
    const topics = new Set<string>();
    
    notebook.cells.forEach(cell => {
      if (cell.cell_type === 'markdown') {
        // Extract topics from markdown headers
        const headers = cell.source.join('\n').match(/^#+\s+(.+)$/gm);
        headers?.forEach(header => {
          const topic = header.replace(/^#+\s+/, '').trim();
          if (topic.length < 50) topics.add(topic);
        });
      } else if (cell.cell_type === 'code') {
        // Extract topics from imports and function names
        const imports = cell.source.join('\n').match(/(?:from|import)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/g);
        imports?.forEach(imp => {
          const lib = imp.split(/\s+/).pop()?.split('.')[0];
          if (lib && ['pandas', 'numpy', 'matplotlib', 'sklearn', 'torch', 'tensorflow'].includes(lib)) {
            topics.add(lib);
          }
        });
      }
    });

    return Array.from(topics).slice(0, 5); // Top 5 topics
  }

  private extractErrors(notebook: NotebookContent): string[] {
    const errors: string[] = [];
    
    notebook.cells.forEach((cell, index) => {
      if (cell.outputs) {
        cell.outputs.forEach(output => {
          if (output.output_type === 'error') {
            errors.push(`Cell ${index}: ${output.ename}: ${output.evalue}`);
          }
        });
      }
    });

    return errors;
  }

  private extractKeyOutputs(notebook: NotebookContent): string[] {
    const outputs: string[] = [];
    
    notebook.cells.forEach((cell, index) => {
      if (cell.outputs) {
        cell.outputs.forEach(output => {
          if (output.output_type === 'stream' && output.text) {
            const text = Array.isArray(output.text) ? output.text.join('') : output.text;
            if (text.length > 0 && text.length < 500) {
              outputs.push(`Cell ${index} output: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
            }
          }
        });
      }
    });

    return outputs;
  }

  private analyzeStructure(notebook: NotebookContent): any {
    return {
      totalCells: notebook.cells.length,
      cellTypes: notebook.cells.reduce((acc, cell) => {
        acc[cell.cell_type] = (acc[cell.cell_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      codeCellsWithOutput: notebook.cells.filter(c => 
        c.cell_type === 'code' && c.outputs && c.outputs.length > 0
      ).length
    };
  }

  private formatStructure(structure: any): string {
    return JSON.stringify(structure, null, 2);
  }

  private extractFunctionBody(code: string, funcDef: string): string {
    const funcName = funcDef.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)/)?.[1];
    if (!funcName) return '';
    
    // More robust function body extraction
    const lines = code.split('\n');
    const funcStartLine = lines.findIndex(line => line.trim().startsWith(`def ${funcName}`));
    
    if (funcStartLine === -1) return funcDef; // Return just the definition if we can't find the body
    
    let funcBody = lines[funcStartLine] + '\n';
    let indentLevel = null;
    let inFunction = true;
    
    // Find the indentation level of the first line inside the function
    for (let i = funcStartLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') {
        funcBody += line + '\n';
        continue;
      }
      
      // Check if this line is less indented than the function definition
      const currentIndent = line.search(/\S/);
      if (indentLevel === null) {
        // First non-empty line inside function - set the indentation level
        if (currentIndent > lines[funcStartLine].search(/\S/)) {
          indentLevel = currentIndent;
          funcBody += line + '\n';
        } else {
          // No indented content found, function is empty
          break;
        }
      } else {
        // Check if we're still inside the function
        if (currentIndent < indentLevel && line.trim() !== '') {
          // Less indented line means we're exiting the function
          break;
        }
        funcBody += line + '\n';
      }
    }
    
    return funcBody.trim() || funcDef;
  }

  private summarizeCell(code: string): string {
    // Extract first line or first meaningful statement
    const lines = code.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
    if (lines.length === 0) return 'Empty cell';
    
    const firstLine = lines[0].trim();
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  }

  // Token estimation helper
  private estimateTokens(content: any): number {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return Math.ceil(text.length / 4); // Rough approximation
  }

  private truncateOutput(text: string): string {
    const maxChars = this.maxCellOutputSize * 4; // Reverse token estimation
    return text.substring(0, maxChars) + '... [truncated]';
  }

  private calculateCompression(original: string, optimized: string): number {
    const originalTokens = this.estimateTokens(original);
    const optimizedTokens = this.estimateTokens(optimized);
    return originalTokens > 0 ? (1 - optimizedTokens / originalTokens) : 0;
  }

  private extractMetadata(notebook: NotebookContent): any {
    return {
      language_info: notebook.metadata?.language_info,
      kernelspec: notebook.metadata?.kernelspec,
      nbformat: notebook.nbformat,
      nbformat_minor: notebook.nbformat_minor
    };
  }

  private extractCourseKeywords(courseContext: CourseData): string[] {
    // Extract relevant keywords from course rubric/context
    const keywords = [];
    
    if (courseContext.courseId.toLowerCase().includes('ml') || 
        courseContext.courseId.toLowerCase().includes('machine')) {
      keywords.push('train', 'model', 'predict', 'accuracy', 'sklearn', 'tensorflow', 'pytorch');
    }
    
    if (courseContext.courseId.toLowerCase().includes('data')) {
      keywords.push('pandas', 'numpy', 'matplotlib', 'plot', 'dataframe', 'analysis');
    }
    
    if (courseContext.courseId.toLowerCase().includes('mlops')) {
      keywords.push('pipeline', 'deployment', 'model', 'mlflow', 'docker', 'kubernetes');
    }
    
    // Add keywords from rubric
    if (courseContext.rubric) {
      const rubricWords = courseContext.rubric.toLowerCase().match(/\b[a-zA-Z]{4,}\b/g) || [];
      keywords.push(...rubricWords.slice(0, 10));
    }
    
    return keywords;
  }

  /**
   * Alternative optimization for truncated or malformed notebooks
   */
  private async optimizeTruncatedNotebook(
    notebookPath: string,
    notebookContent: string,
    courseContext: CourseData
  ): Promise<OptimizedNotebook | null> {
    try {
      console.log(`Applying alternative optimization for truncated notebook: ${notebookPath}`);
      
      // Extract what we can from the truncated content
      const summary = this.extractTruncatedNotebookSummary(notebookContent, notebookPath);
      
      // Create a simplified optimized content
      const optimizedContent = `# Truncated Notebook: ${notebookPath}

## Summary
${summary}

## Note
This notebook was truncated due to size limits during fetching. Only partial content is available for evaluation.

## Available Content
\`\`\`
${notebookContent.substring(0, 2000)}${notebookContent.length > 2000 ? '\n... [truncated]' : ''}
\`\`\``;
      
      return {
        originalSize: this.estimateTokens(notebookContent),
        optimizedSize: this.estimateTokens(optimizedContent),
        compressionRatio: this.calculateCompression(notebookContent, optimizedContent),
        content: optimizedContent,
        metadata: {
          truncated: true,
          originalSize: notebookContent.length
        }
      };
    } catch (error) {
      console.error(`Error in alternative optimization for ${notebookPath}:`, error);
      return null;
    }
  }

  /**
   * Extract summary from truncated notebook content
   */
  private extractTruncatedNotebookSummary(content: string, path: string): string {
    // Try to extract some basic information from the truncated content
    const lines = content.split('\n');
    const firstLines = lines.slice(0, 20);
    
    // Look for common notebook metadata patterns
    const metadataLines = firstLines.filter(line => 
      line.includes('kernelspec') || 
      line.includes('language_info') || 
      line.includes('nbformat')
    );
    
    // Look for markdown headers that might indicate content
    const headerLines = firstLines.filter(line => 
      line.trim().startsWith('#') && line.length > 10
    );
    
    return `Truncated notebook file (${content.length} characters).
Metadata detected: ${metadataLines.length > 0 ? 'Yes' : 'No'}.
Headers detected: ${headerLines.length} found.
This file was too large and was truncated during fetching.`;
  }
}
