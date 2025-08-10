"use client";

import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  FileText,
  Calendar,
  Trash2,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

interface EvaluationResultsProps {
  limit?: number;
}

export function EvaluationResults({ limit = 10 }: EvaluationResultsProps) {
  const evaluations = useQuery(api.evaluations.getUserEvaluations, { limit });
  const stats = useQuery(api.evaluations.getUserEvaluationStats);

  if (evaluations === undefined || stats === undefined) {
    return <EvaluationResultsSkeleton />;
  }

  if (evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No evaluations yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Submit your first GitHub repository to get started with AI-powered evaluation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processing + stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.averageScore > 0 ? `${Math.round(stats.averageScore)}%` : '-'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evaluations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Evaluations</CardTitle>
          <CardDescription>
            Your latest repository evaluations and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <EvaluationCard key={evaluation._id} evaluation={evaluation} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: any }) {
  const deleteEvaluation = useMutation(api.evaluations.deleteEvaluation);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this evaluation?')) {
      return;
    }

    try {
      await deleteEvaluation({ evaluationId: evaluation._id });
      toast.success('Evaluation deleted successfully');
    } catch (error) {
      toast.error('Failed to delete evaluation');
      console.error('Delete error:', error);
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getCourseColor = (course: string) => {
    const colors: Record<string, string> = {
      'data-engineering': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'machine-learning': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'llm-zoomcamp': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'mlops': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'stock-markets': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[course] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium">{evaluation.repoOwner}/{evaluation.repoName}</h3>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-6 w-6 p-0"
            >
              <a
                href={evaluation.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDistanceToNow(new Date(evaluation.createdAt), { addSuffix: true })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={getCourseColor(evaluation.course)}>
            {evaluation.course}
          </Badge>
          <Badge variant="secondary" className={getStatusColor(evaluation.status)}>
            <span className="flex items-center gap-1">
              {getStatusIcon(evaluation.status)}
              {evaluation.status}
            </span>
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {evaluation.status === 'completed' && evaluation.results && (
        <div className="mt-3 p-3 bg-muted/30 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Score</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {evaluation.totalScore}/{evaluation.maxScore}
                <span className="text-sm text-muted-foreground ml-1">
                  ({Math.round((evaluation.totalScore / evaluation.maxScore) * 100)}%)
                </span>
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/evaluation/${evaluation._id}`}>
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Link>
              </Button>
            </div>
          </div>
          {evaluation.results.overallFeedback && (
            <p className="text-sm text-muted-foreground">
              {evaluation.results.overallFeedback}
            </p>
          )}
        </div>
      )}

      {evaluation.status === 'failed' && evaluation.errorMessage && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {evaluation.errorMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function EvaluationResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evaluations List Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
