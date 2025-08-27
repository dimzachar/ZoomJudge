"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, GitBranch, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { BillingLimitModal, useBillingLimitModal } from '@/components/billing-limit-modal';
import { debugLog, debugError } from '@/lib/debug-logger';
import { TIER_LIMITS } from '@/lib/tier-permissions';

// Form validation schema
const evaluationFormSchema = z.object({
  repoUrl: z.string()
    .url('Please enter a valid URL')
    .refine(
      (url) => {
        const githubCommitPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/commit\/[a-f0-9]{7,40}\/?$/;
        return githubCommitPattern.test(url);
      },
      'Must be a valid GitHub commit URL (https://github.com/username/repository/commit/commit-hash)'
    ),
  courseType: z.string().min(1, 'Please select a course type'),
});

type EvaluationFormData = z.infer<typeof evaluationFormSchema>;

// Course color mapping
const getCourseColor = (courseId: string) => {
  const colors: Record<string, string> = {
    'data-engineering': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'machine-learning': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800',
    'llm-zoomcamp': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'mlops': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    'stock-markets': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800',
  };
  return colors[courseId] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 border-gray-200 dark:border-gray-800';
};



interface EvaluationFormProps {
  onSubmissionSuccess?: (evaluationId: string, data: { repoUrl: string; courseType: string }, results?: any) => void;
}

export function EvaluationForm({ onSubmissionSuccess }: EvaluationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const courses = useQuery(api.courses.getActiveCourses);
  const currentUsage = useQuery(api.userUsage.getCurrentUsage);
  const canPerformEvaluation = useQuery(api.userUsage.canPerformEvaluation);
  const submitEvaluation = useAction(api.evaluationWorkflow.submitEvaluation);
  const { isOpen: isBillingModalOpen, showModal: showBillingModal, hideModal: hideBillingModal } = useBillingLimitModal();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationFormSchema),
    defaultValues: {
      repoUrl: '',
      courseType: '',
    },
  });

  const watchedCourseType = watch('courseType');

  // Check if user is at billing limit
  const isAtLimit = canPerformEvaluation && !canPerformEvaluation.canEvaluate;
  const userTier = currentUsage?.subscriptionTier || 'free';

  // Calculate tier limits using centralized config
  const monthlyLimit = TIER_LIMITS[userTier as keyof typeof TIER_LIMITS]?.evaluationsPerMonth || TIER_LIMITS.free.evaluationsPerMonth;
  const currentCount = currentUsage?.evaluationsCount || 0;

  const onSubmit = async (data: EvaluationFormData) => {
    debugLog('=== EVALUATION FORM SUBMIT DEBUG START ===');
    debugLog('Form data submitted - Course:', data.courseType, 'Repo URL provided:', !!data.repoUrl);

    setIsSubmitting(true);

    try {
      debugLog('=== CALLING CONVEX ACTION ===');
      const submissionPayload = {
        repoUrl: data.repoUrl,
        courseType: data.courseType,
      };
      debugLog('Submission payload prepared - Course:', submissionPayload.courseType);

      // Submit evaluation using Convex action (now synchronous)
      const result = await submitEvaluation(submissionPayload);
      // Note: Result data not logged for security (contains detailed feedback)
      debugLog('Convex action completed - Status:', result.status);

      if (result.status === "completed" && result.results) {
        toast.success('Evaluation completed successfully!', {
          description: `Your repository scored ${result.results.totalScore}/${result.results.maxScore} points.`,
        });

        // Reset form
        reset();

        // Call success callback with results
        if (onSubmissionSuccess && result.evaluationId) {
          debugLog('Calling success callback with evaluation ID and cached results');
          onSubmissionSuccess(result.evaluationId, data, result.results);
        }
      } else if (result.status === "failed") {
        // Show user-friendly error messages
        let errorMessage = 'Please try again later.';
        if (result.error?.includes('404') || result.error?.includes('not found')) {
          errorMessage = 'Repository not found or is private. Please check the URL and make sure the repository is public.';
        } else if (result.error?.includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (result.error?.includes('network') || result.error?.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (result.error?.includes('API') || result.error?.includes('model')) {
          errorMessage = 'AI service temporarily unavailable. Please try again in a few minutes.';
        }

        toast.error('Evaluation failed', {
          description: errorMessage,
        });
      } else {
        toast.success('Evaluation submitted successfully!', {
          description: 'Your repository is now being analyzed. You\'ll receive results shortly.',
        });

        // Reset form
        reset();

        // Call success callback
        if (onSubmissionSuccess && result.evaluationId) {
          debugLog('Calling success callback with evaluation ID');
          // Pass cached results if available (when status is completed)
          const resultsToPass = result.status === 'completed' ? result.results : undefined;
          onSubmissionSuccess(result.evaluationId, data, resultsToPass);
        }
      }

      debugLog('=== EVALUATION FORM SUBMIT DEBUG END ===');
    } catch (error) {
      debugError('=== EVALUATION FORM SUBMIT ERROR ===');
      debugError('Failed to submit evaluation:', error instanceof Error ? error.message : 'Unknown error');
      // Note: Error details not logged for security

      // Check if this is a billing limit error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isBillingError = errorMessage.includes('Billing limit exceeded') ||
                            errorMessage.includes('Monthly limit') ||
                            errorMessage.includes('evaluations reached');

      if (isBillingError) {
        // Show billing limit modal for better UX
        showBillingModal();
      } else {
        // Show generic error for other issues
        toast.error('Failed to submit evaluation', {
          description: errorMessage.includes('AI service') ?
            'AI service temporarily unavailable. Please try again in a few minutes.' :
            'Please try again later.',
        });
      }

      console.error('=== EVALUATION FORM SUBMIT ERROR END ===');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCourseSelect = (courseId: string) => {
    setValue('courseType', courseId, { shouldValidate: true });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <GitBranch className="h-4 w-4 sm:h-5 sm:w-5" />
          Evaluate Repository
        </CardTitle>
        <CardDescription className="text-sm">
          Submit your GitHub repository for AI-powered evaluation and feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Billing Limit Warning */}
        {isAtLimit && (
          <Alert variant="destructive" className="mb-4 sm:mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-sm sm:text-base">Monthly evaluation limit reached</p>
                <p className="text-sm">
                  You've used all {monthlyLimit} evaluations for your {userTier} plan this month.
                  {userTier === 'free' && ' Upgrade to get more evaluations or wait for your limit to reset next month.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={showBillingModal}
                    className="w-full sm:w-auto min-h-[44px]"
                  >
                    View Options
                  </Button>
                  {userTier === 'free' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('/dashboard/billing#pricing-plans', '_blank')}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Near Limit Warning */}
        {!isAtLimit && currentCount >= monthlyLimit * 0.8 && userTier === 'free' && (
          <Alert className="mb-4 sm:mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-yellow-800 dark:text-yellow-200 text-sm sm:text-base">
                  You're close to your monthly limit
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  You have {monthlyLimit - currentCount} evaluations remaining this month.
                  Consider upgrading for unlimited evaluations.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-900/20 w-full sm:w-auto min-h-[44px]"
                  onClick={() => window.open('/dashboard/billing#pricing-plans', '_blank')}
                >
                  View Plans
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {/* Repository URL Input */}
          <div className="space-y-2">
            <Label htmlFor="repoUrl" className="text-sm sm:text-base">GitHub Commit URL</Label>
            <Input
              id="repoUrl"
              type="url"
              placeholder="https://github.com/username/repository/commit/abc123..."
              {...register('repoUrl')}
              className={`min-h-[44px] text-sm sm:text-base ${errors.repoUrl ? 'border-red-500' : ''}`}
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Please provide a commit-specific URL. This ensures consistent evaluation results and prevents duplicate processing of the same code.
            </p>
            {errors.repoUrl && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{errors.repoUrl.message}</AlertDescription>
              </Alert>
            )}
            {!errors.repoUrl && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>How to get a commit URL:</strong>
                  <br />
                  1. Go to your GitHub repository
                  <br />
                  2. Click on "Commits" or the commit count
                  <br />
                  3. Click on the specific commit you want to evaluate
                  <br />
                  4. Copy the URL from your browser
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Course Selection */}
          <div className="space-y-3">
            <Label className="text-sm sm:text-base">Course Type</Label>
            {courses === undefined ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 w-20 sm:w-24 bg-muted rounded-md animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {courses.map((course: Doc<"courses">) => (
                  <button
                    key={course.courseId}
                    type="button"
                    className={`
                      px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] flex items-center
                      ${watchedCourseType === course.courseId
                        ? getCourseColor(course.courseId)
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                      }
                    `}
                    onClick={() => handleCourseSelect(course.courseId)}
                  >
                    <span className="truncate">{course.courseId}</span>
                    {watchedCourseType === course.courseId && (
                      <CheckCircle className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    )}
                  </button>
                ))}
                <input
                  type="hidden"
                  value={watchedCourseType}
                  {...register('courseType')}
                />
              </div>
            )}
            {errors.courseType && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{errors.courseType.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full min-h-[44px] text-sm sm:text-base"
            disabled={isSubmitting || isAtLimit}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Evaluating Repository...</span>
                <span className="sm:hidden">Evaluating...</span>
              </>
            ) : isAtLimit ? (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Monthly Limit Reached</span>
                <span className="sm:hidden">Limit Reached</span>
              </>
            ) : (
              <>
                <GitBranch className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Start Evaluation</span>
                <span className="sm:hidden">Start</span>
              </>
            )}
          </Button>
        </form>

        {/* Info Alert
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Evaluations typically take 2-5 minutes to complete. You'll be notified when your results are ready.
          </AlertDescription>
        </Alert> */}
      </CardContent>

      {/* Billing Limit Modal */}
      <BillingLimitModal
        isOpen={isBillingModalOpen}
        onClose={hideBillingModal}
        userTier={userTier as 'free' | 'starter' | 'pro' | 'enterprise'}
        currentUsage={currentCount}
        monthlyLimit={monthlyLimit}
        resetDate={currentUsage?.resetAt ? new Date(currentUsage.resetAt) : undefined}
      />
    </Card>
  );
}
