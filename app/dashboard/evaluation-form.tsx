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
import { toast } from 'sonner';

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
  onSubmissionSuccess?: (evaluationId: string, data: { repoUrl: string; courseType: string }) => void;
}

export function EvaluationForm({ onSubmissionSuccess }: EvaluationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const courses = useQuery(api.courses.getActiveCourses);
  const submitEvaluation = useAction(api.evaluationWorkflow.submitEvaluation);

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

  const onSubmit = async (data: EvaluationFormData) => {
    console.log('=== EVALUATION FORM SUBMIT DEBUG START ===');
    console.log('Form data submitted:', JSON.stringify(data, null, 2));

    setIsSubmitting(true);

    try {
      console.log('=== CALLING CONVEX ACTION ===');
      const submissionPayload = {
        repoUrl: data.repoUrl,
        courseType: data.courseType,
      };
      console.log('Submission payload:', JSON.stringify(submissionPayload, null, 2));

      // Submit evaluation using Convex action (now synchronous)
      const result = await submitEvaluation(submissionPayload);
      console.log('Convex action result:', JSON.stringify(result, null, 2));

      if (result.status === "completed" && result.results) {
        toast.success('Evaluation completed successfully!', {
          description: `Your repository scored ${result.results.totalScore}/${result.results.maxScore} points.`,
        });

        // Reset form
        reset();

        // Call success callback with results
        if (onSubmissionSuccess && result.evaluationId) {
          console.log(`Calling success callback with evaluation ID: ${result.evaluationId}`);
          onSubmissionSuccess(result.evaluationId, data);
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
          console.log(`Calling success callback with evaluation ID: ${result.evaluationId}`);
          onSubmissionSuccess(result.evaluationId, data);
        }
      }

      console.log('=== EVALUATION FORM SUBMIT DEBUG END ===');
    } catch (error) {
      console.error('=== EVALUATION FORM SUBMIT ERROR ===');
      console.error('Failed to submit evaluation:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });

      toast.error('Failed to submit evaluation', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Evaluate Repository
        </CardTitle>
        <CardDescription>
          Submit your GitHub repository for AI-powered evaluation and feedback
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Repository URL Input */}
          <div className="space-y-2">
            <Label htmlFor="repoUrl">GitHub Commit URL</Label>
            <Input
              id="repoUrl"
              type="url"
              placeholder="https://github.com/username/repository/commit/abc123..."
              {...register('repoUrl')}
              className={errors.repoUrl ? 'border-red-500' : ''}
            />
            <p className="text-sm text-muted-foreground">
              Please provide a commit-specific URL. This ensures consistent evaluation results and prevents duplicate processing of the same code.
            </p>
            {errors.repoUrl && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{errors.repoUrl.message}</AlertDescription>
              </Alert>
            )}
            {!errors.repoUrl && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
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
            <Label>Course Type</Label>
            {courses === undefined ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 w-24 bg-muted rounded-md animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {courses.map((course) => (
                  <button
                    key={course.courseId}
                    type="button"
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${watchedCourseType === course.courseId
                        ? getCourseColor(course.courseId)
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                      }
                    `}
                    onClick={() => handleCourseSelect(course.courseId)}
                  >
                    {course.courseId}
                    {watchedCourseType === course.courseId && (
                      <CheckCircle className="ml-2 h-4 w-4 inline" />
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
                <AlertDescription>{errors.courseType.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Evaluating Repository...
              </>
            ) : (
              <>
                <GitBranch className="mr-2 h-4 w-4" />
                Start Evaluation
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
    </Card>
  );
}
