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
import { Loader2, GitBranch, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

// Form validation schema
const evaluationFormSchema = z.object({
  repoUrl: z.string()
    .url('Please enter a valid URL')
    .refine(
      (url) => {
        const githubPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
        return githubPattern.test(url);
      },
      'Must be a valid GitHub repository URL (https://github.com/username/repository)'
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
  onSubmissionSuccess?: (evaluationId: string) => void;
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
    setIsSubmitting(true);

    try {
      // Submit evaluation using Convex action
      const result = await submitEvaluation({
        repoUrl: data.repoUrl,
        courseType: data.courseType,
      });

      toast.success('Evaluation submitted successfully!', {
        description: 'Your repository is now being analyzed. You\'ll receive results shortly.',
      });

      // Reset form
      reset();

      // Call success callback
      if (onSubmissionSuccess && result.evaluationId) {
        onSubmissionSuccess(result.evaluationId);
      }

    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      toast.error('Failed to submit evaluation', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
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
            <Label htmlFor="repoUrl">GitHub Repository URL</Label>
            <Input
              id="repoUrl"
              type="url"
              placeholder="https://github.com/username/repository"
              {...register('repoUrl')}
              className={errors.repoUrl ? 'border-red-500' : ''}
            />
            {errors.repoUrl && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{errors.repoUrl.message}</AlertDescription>
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
                Submitting Evaluation...
              </>
            ) : (
              <>
                <GitBranch className="mr-2 h-4 w-4" />
                Start Evaluation
              </>
            )}
          </Button>
        </form>

        {/* Info Alert */}
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Evaluations typically take 2-5 minutes to complete. You'll be notified when your results are ready.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
