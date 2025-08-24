// Convex authentication configuration
// Requires NEXT_PUBLIC_CLERK_FRONTEND_API_URL environment variable to be set
export default {
    providers: [
      {
        domain: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL,
        applicationID: "convex",
      },
    ]
  };