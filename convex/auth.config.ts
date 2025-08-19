export default {
    providers: [
      {
        domain: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL || "https://ample-satyr-59.clerk.accounts.dev",
        applicationID: "convex",
      },
    ]
  };