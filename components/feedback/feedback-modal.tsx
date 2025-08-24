"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { feedbackSchema, type FeedbackFormData } from "@/lib/validation/feedback-schemas"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  defaultType?: "bug" | "feature" | "general"
  evaluationId?: string
}

export function FeedbackModal({ isOpen, onClose, defaultType = "general", evaluationId }: FeedbackModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitFeedback = useMutation(api.feedback.submitFeedback)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: defaultType,
      title: "",
      description: "",
    },
  })

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true)

    try {
      const result = await submitFeedback({
        ...data,
        context: {
          page: window.location.pathname,
          userAgent: navigator.userAgent,
          evaluationId: evaluationId,
        }
      })

      if (result.success) {
        toast.success("Feedback submitted successfully!")
        reset()
        onClose()
      } else {
        // Handle error from the result object
        const errorMessage = result.error || "Unknown error occurred"

        if (errorMessage.includes("Rate limit exceeded")) {
          toast.error("Rate limit exceeded", {
            description: "You can submit a maximum of 5 feedback items per day. Please try again tomorrow.",
          })
        } else if (errorMessage.includes("Not authenticated")) {
          toast.error("Authentication required", {
            description: "Please sign in to submit feedback.",
          })
        } else {
          toast.error("Failed to submit feedback", {
            description: errorMessage,
          })
        }
      }
    } catch (error: any) {
      // Handle unexpected errors (network issues, etc.)
      console.error("Feedback submission error:", error)
      toast.error("Failed to submit feedback", {
        description: "Please try again. If the problem persists, contact support.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Feedback Type</Label>
            <RadioGroup
              defaultValue={defaultType}
              onValueChange={(value) => setValue("type", value as any)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bug" id="bug" />
                <Label htmlFor="bug">Bug Report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="feature" id="feature" />
                <Label htmlFor="feature">Feature Request</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="general" id="general" />
                <Label htmlFor="general">General Feedback</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of your feedback"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide details about your feedback"
              rows={4}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
