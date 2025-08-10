// Super simple console logger - no file operations, no Node.js APIs!

class SimpleLogger {
  private currentEvaluationId: string | null = null;

  setCurrentEvaluation(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
    console.log(`🔍 [EVAL] Starting evaluation: ${evaluationId}`);
  }

  async logGeneral(phase: string, level: string, message: string, data?: any) {
    const evalId = this.currentEvaluationId || 'unknown';
    console.log(`📝 [${level}] [${phase}] ${message} (Eval: ${evalId})`);
    if (data) {
      console.log(`   📊 Data:`, data);
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

    console.log(`🤖 [LLM] Model: ${model} | Eval: ${evalId}`);
    console.log(`📤 [LLM] Request Payload:`, requestPayload);
    console.log(`📥 [LLM] Response:`, response);

    if (usage) {
      console.log(`📊 [LLM] Token Usage: ${usage.prompt_tokens} + ${usage.completion_tokens} = ${usage.total_tokens} tokens`);
    }

    if (finishReason) {
      console.log(`🏁 [LLM] Finish Reason: ${finishReason}`);
    }

    if (error) {
      console.error(`❌ [LLM] Error: ${error}`);
    }
  }

  async logWebSearch(query: string, results: any[], error?: string) {
    const evalId = this.currentEvaluationId || 'unknown';

    console.log(`🔍 [SEARCH] Query: "${query}" | Eval: ${evalId}`);
    console.log(`📋 [SEARCH] Results (${results.length} items):`, results);

    if (error) {
      console.error(`❌ [SEARCH] Error: ${error}`);
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
    console.log(`\n📋 [SUMMARY] ===============================================`);
    console.log(`📋 [SUMMARY] Evaluation ${evaluationId} - Status: ${status}`);
    console.log(`📋 [SUMMARY] Repository: ${repoUrl}`);
    console.log(`📋 [SUMMARY] Course: ${course}`);
    console.log(`📋 [SUMMARY] Timestamp: ${new Date().toISOString()}`);

    if (results) {
      console.log(`📋 [SUMMARY] Results:`, results);
    }

    if (error) {
      console.error(`📋 [SUMMARY] Error: ${error}`);
    }

    console.log(`📋 [SUMMARY] ===============================================\n`);
  }
}

// Export singleton instance
export const evaluationLogger = new SimpleLogger();
