/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as adminAPI from "../adminAPI.js";
import type * as adminUtils from "../adminUtils.js";
import type * as courses from "../courses.js";
import type * as emails from "../emails.js";
import type * as evaluationWorkflow from "../evaluationWorkflow.js";
import type * as evaluations from "../evaluations.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as hybridCache from "../hybridCache.js";
import type * as migrations_removeWeightField from "../migrations/removeWeightField.js";
import type * as paymentAttemptTypes from "../paymentAttemptTypes.js";
import type * as paymentAttempts from "../paymentAttempts.js";
import type * as securityAudit from "../securityAudit.js";
import type * as setup from "../setup.js";
import type * as subscriptions from "../subscriptions.js";
import type * as userPreferences from "../userPreferences.js";
import type * as userUsage from "../userUsage.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adminAPI: typeof adminAPI;
  adminUtils: typeof adminUtils;
  courses: typeof courses;
  emails: typeof emails;
  evaluationWorkflow: typeof evaluationWorkflow;
  evaluations: typeof evaluations;
  feedback: typeof feedback;
  http: typeof http;
  hybridCache: typeof hybridCache;
  "migrations/removeWeightField": typeof migrations_removeWeightField;
  paymentAttemptTypes: typeof paymentAttemptTypes;
  paymentAttempts: typeof paymentAttempts;
  securityAudit: typeof securityAudit;
  setup: typeof setup;
  subscriptions: typeof subscriptions;
  userPreferences: typeof userPreferences;
  userUsage: typeof userUsage;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
