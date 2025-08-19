// Super simple console logger - no file operations, no Node.js APIs!

class SimpleLogger {
  private currentEvaluationId: string | null = null;
  private isEnabled: boolean;

  constructor() {
    // Check environment variable to enable/disable logging
    this.isEnabled = process.env.SIMPLE_LOGGER_ENABLED === 'true';
  }

  private log(message: string, data?: any) {
    if (!this.isEnabled) return;
    console.log(message);
    if (data) {
      console.log(data);
    }
  }

  private error(message: string, data?: any) {
    if (!this.isEnabled) return;
    console.error(message);
    if (data) {
      console.error(data);
    }
  }

  setCurrentEvaluation(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
    this.log(`🔍 [EVAL] Starting evaluation: ${evaluationId}`);
  }

  async logGeneral(phase: string, level: string, message: string, data?: any) {
    const evalId = this.currentEvaluationId || 'unknown';
    this.log(`📝 [${level}] [${phase}] ${message} (Eval: ${evalId})`);
    if (data) {
      this.log(`   📊 Data:`, data);
    }
  }

  async logLLMRequest(
    model: string,
    prompt: string,
    requestPayload: any,
    response: any,
    usage?: any,
    finishReason?: string,
    error?: string
  ) {
    const evalId = this.currentEvaluationId || 'unknown';

    this.log(`🤖 [LLM] Model: ${model} | Eval: ${evalId}`);
    this.log(`📤 [LLM] Request Payload:`, requestPayload);
    this.log(`📥 [LLM] Response:`, response);

    if (usage) {
      this.log(`📊 [LLM] Token Usage: ${usage.prompt_tokens} + ${usage.completion_tokens} = ${usage.total_tokens} tokens`);
    }

    if (finishReason) {
      this.log(`🏁 [LLM] Finish Reason: ${finishReason}`);
    }

    if (error) {
      this.error(`❌ [LLM] Error: ${error}`);
    }
  }

  async logWebSearch(query: string, results: any[], error?: string) {
    const evalId = this.currentEvaluationId || 'unknown';

    this.log(`🔍 [SEARCH] Query: "${query}" | Eval: ${evalId}`);
    this.log(`📋 [SEARCH] Results (${results.length} items):`, results);

    if (error) {
      this.error(`❌ [SEARCH] Error: ${error}`);
    }
  }

  async createEvaluationSummary(
    evaluationId: string,
    repoUrl: string,
    course: string,
    status: string,
    results?: any,
    error?: string
  ) {
    this.log(`\n📋 [SUMMARY] ===============================================`);
    this.log(`📋 [SUMMARY] Evaluation ${evaluationId} - Status: ${status}`);
    this.log(`📋 [SUMMARY] Repository: ${repoUrl}`);
    this.log(`📋 [SUMMARY] Course: ${course}`);
    this.log(`📋 [SUMMARY] Timestamp: ${new Date().toISOString()}`);

    if (results) {
      this.log(`📋 [SUMMARY] Results:`, results);
    }

    if (error) {
      this.error(`📋 [SUMMARY] Error: ${error}`);
    }

    this.log(`📋 [SUMMARY] ===============================================\n`);
  }
}

// Export singleton instance
export const evaluationLogger = new SimpleLogger();
