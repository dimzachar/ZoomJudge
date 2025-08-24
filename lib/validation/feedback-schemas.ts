import { z } from "zod"

export const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "general"], {
    message: "Please select a feedback type",
  }),
  title: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
})

export type FeedbackFormData = z.infer<typeof feedbackSchema>
