import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import {
  getSubscriptionProcedure,
  createSubscriptionProcedure,
  cancelSubscriptionProcedure,
  restoreSubscriptionProcedure,
  incrementUsageProcedure,
} from "./routes/subscription/subscription";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  subscription: createTRPCRouter({
    getSubscription: getSubscriptionProcedure,
    createSubscription: createSubscriptionProcedure,
    cancelSubscription: cancelSubscriptionProcedure,
    restoreSubscription: restoreSubscriptionProcedure,
    incrementUsage: incrementUsageProcedure,
  }),
});

export type AppRouter = typeof appRouter;