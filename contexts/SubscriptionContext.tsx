import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { trpc } from '@/lib/trpc';

// Simple storage interface for subscription data
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      return await AsyncStorage.default.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
};

export type SubscriptionTier = 'free' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial' | 'none';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    dailyProcessing: number;
    maxFileSize: number;
    batchProcessing: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    customIntegrations: boolean;
    auditLogs: boolean;
    ssoIntegration: boolean;
  };
  popular?: boolean;
}

export interface UserSubscription {
  id: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  usage: {
    dailyProcessingCount: number;
    lastResetDate: string;
  };
}

export interface SubscriptionContextType {
  subscription: UserSubscription | null;
  plans: SubscriptionPlan[];
  currentPlan: SubscriptionPlan | null;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  canUseFeature: (feature: keyof SubscriptionPlan['limits']) => boolean;
  getRemainingUsage: () => number;
  subscribe: (planId: string) => Promise<{ success: boolean; paymentUrl?: string; error?: string }>;
  cancelSubscription: () => Promise<void>;
  restoreSubscription: () => Promise<void>;
  incrementUsage: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    tier: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      'Basic invisible character detection',
      'Up to 10 text cleanings per day',
      'Standard security',
      'Community support'
    ],
    limits: {
      dailyProcessing: 10,
      maxFileSize: 1024, // 1KB
      batchProcessing: false,
      apiAccess: false,
      prioritySupport: false,
      customIntegrations: false,
      auditLogs: false,
      ssoIntegration: false,
    }
  },
  {
    id: 'professional_monthly',
    tier: 'professional',
    name: 'Professional',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    popular: true,
    features: [
      'Advanced character detection',
      'Unlimited text processing',
      'Batch processing up to 100 files',
      'Enhanced security (AES-256)',
      'Priority email support',
      'Export audit logs',
      'API access (1000 calls/month)'
    ],
    limits: {
      dailyProcessing: -1, // unlimited
      maxFileSize: 10485760, // 10MB
      batchProcessing: true,
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: false,
      auditLogs: true,
      ssoIntegration: false,
    }
  },
  {
    id: 'professional_yearly',
    tier: 'professional',
    name: 'Professional (Annual)',
    price: 99.99,
    currency: 'USD',
    interval: 'year',
    features: [
      'Advanced character detection',
      'Unlimited text processing',
      'Batch processing up to 100 files',
      'Enhanced security (AES-256)',
      'Priority email support',
      'Export audit logs',
      'API access (1000 calls/month)',
      '2 months free'
    ],
    limits: {
      dailyProcessing: -1,
      maxFileSize: 10485760,
      batchProcessing: true,
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: false,
      auditLogs: true,
      ssoIntegration: false,
    }
  },
  {
    id: 'enterprise_monthly',
    tier: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'All Professional features',
      'Unlimited batch processing',
      'Custom integrations',
      'SSO integration',
      'Dedicated account manager',
      'SLA guarantee (99.9% uptime)',
      'Advanced audit logs',
      'API access (unlimited)',
      'White-label options'
    ],
    limits: {
      dailyProcessing: -1,
      maxFileSize: 104857600, // 100MB
      batchProcessing: true,
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: true,
      auditLogs: true,
      ssoIntegration: true,
    }
  },
  {
    id: 'enterprise_yearly',
    tier: 'enterprise',
    name: 'Enterprise (Annual)',
    price: 499.99,
    currency: 'USD',
    interval: 'year',
    features: [
      'All Professional features',
      'Unlimited batch processing',
      'Custom integrations',
      'SSO integration',
      'Dedicated account manager',
      'SLA guarantee (99.9% uptime)',
      'Advanced audit logs',
      'API access (unlimited)',
      'White-label options',
      '2 months free'
    ],
    limits: {
      dailyProcessing: -1,
      maxFileSize: 104857600,
      batchProcessing: true,
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: true,
      auditLogs: true,
      ssoIntegration: true,
    }
  }
];

const STORAGE_KEYS = {
  SUBSCRIPTION: '@ace_paste_subscription',
  USAGE: '@ace_paste_usage',
};

function createTrialSubscription(): UserSubscription {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  return {
    id: 'trial_' + Date.now(),
    planId: 'professional_monthly',
    status: 'trial',
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    cancelAtPeriodEnd: false,
    trialEnd,
    usage: {
      dailyProcessingCount: 0,
      lastResetDate: now.toISOString().split('T')[0],
    }
  };
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // tRPC queries
  const subscriptionQuery = trpc.subscription.getSubscription.useQuery(undefined, {
    enabled: false, // We'll trigger this manually
  });

  const subscribeMutation = trpc.subscription.createSubscription.useMutation();
  const cancelMutation = trpc.subscription.cancelSubscription.useMutation();
  const restoreMutation = trpc.subscription.restoreSubscription.useMutation();
  const usageMutation = trpc.subscription.incrementUsage.useMutation();

  const loadSubscriptionData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Try to load from local storage first
      const storedSubscription = await storage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      
      if (storedSubscription) {
        const parsed = JSON.parse(storedSubscription);
        // Convert date strings back to Date objects
        parsed.currentPeriodStart = new Date(parsed.currentPeriodStart);
        parsed.currentPeriodEnd = new Date(parsed.currentPeriodEnd);
        if (parsed.trialEnd) {
          parsed.trialEnd = new Date(parsed.trialEnd);
        }
        setSubscription(parsed);
      } else {
        // No subscription found, create trial
        const trialSubscription = createTrialSubscription();
        setSubscription(trialSubscription);
        await storage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(trialSubscription));
      }
      
      // Sync with server in background
      try {
        await subscriptionQuery.refetch();
        if (subscriptionQuery.data) {
          setSubscription(subscriptionQuery.data);
          await storage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(subscriptionQuery.data));
        }
      } catch (error) {
        console.log('Failed to sync subscription with server:', error);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      // Fallback to trial
      const trialSubscription = createTrialSubscription();
      setSubscription(trialSubscription);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionQuery]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const refreshSubscription = useCallback(async () => {
    try {
      await subscriptionQuery.refetch();
      if (subscriptionQuery.data) {
        setSubscription(subscriptionQuery.data);
        await storage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(subscriptionQuery.data));
      }
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
    }
  }, [subscriptionQuery]);

  const subscribe = useCallback(async (planId: string) => {
    try {
      const result = await subscribeMutation.mutateAsync({ planId });
      if (result.success && result.subscription) {
        setSubscription(result.subscription);
        await storage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(result.subscription));
      }
      return result;
    } catch (error) {
      console.error('Subscription failed:', error);
      return { success: false, error: 'Subscription failed' };
    }
  }, [subscribeMutation]);

  const cancelSubscription = useCallback(async () => {
    if (!subscription) return;
    
    try {
      await cancelMutation.mutateAsync({ subscriptionId: subscription.id });
      const updatedSubscription = { ...subscription, cancelAtPeriodEnd: true };
      setSubscription(updatedSubscription);
      await storage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updatedSubscription));
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }, [subscription, cancelMutation]);

  const restoreSubscription = useCallback(async () => {
    if (!subscription) return;
    
    try {
      await restoreMutation.mutateAsync({ subscriptionId: subscription.id });
      const updatedSubscription = { ...subscription, cancelAtPeriodEnd: false };
      setSubscription(updatedSubscription);
      await storage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updatedSubscription));
    } catch (error) {
      console.error('Failed to restore subscription:', error);
      throw error;
    }
  }, [subscription, restoreMutation]);

  const incrementUsage = useCallback(async () => {
    if (!subscription) return false;
    
    const today = new Date().toISOString().split('T')[0];
    let updatedSubscription = { ...subscription };
    
    // Reset daily count if it's a new day
    if (updatedSubscription.usage.lastResetDate !== today) {
      updatedSubscription.usage.dailyProcessingCount = 0;
      updatedSubscription.usage.lastResetDate = today;
    }
    
    const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
    if (!currentPlan) return false;
    
    // Check if user has reached daily limit
    if (currentPlan.limits.dailyProcessing !== -1 && 
        updatedSubscription.usage.dailyProcessingCount >= currentPlan.limits.dailyProcessing) {
      return false;
    }
    
    // Increment usage
    updatedSubscription.usage.dailyProcessingCount++;
    setSubscription(updatedSubscription);
    await storage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updatedSubscription));
    
    // Sync with server
    try {
      await usageMutation.mutateAsync({ subscriptionId: subscription.id });
    } catch (error) {
      console.log('Failed to sync usage with server:', error);
    }
    
    return true;
  }, [subscription, usageMutation]);

  const currentPlan = useMemo(() => {
    if (!subscription) return null;
    return SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId) || null;
  }, [subscription]);

  const hasActiveSubscription = useMemo(() => {
    if (!subscription) return false;
    
    const now = new Date();
    return (
      subscription.status === 'active' || 
      (subscription.status === 'trial' && subscription.trialEnd && subscription.trialEnd > now)
    ) && subscription.currentPeriodEnd > now;
  }, [subscription]);

  const canUseFeature = useCallback((feature: keyof SubscriptionPlan['limits']) => {
    if (!currentPlan || !hasActiveSubscription) {
      // Free tier limitations
      const freePlan = SUBSCRIPTION_PLANS.find(p => p.id === 'free');
      return freePlan ? freePlan.limits[feature] : false;
    }
    
    return currentPlan.limits[feature];
  }, [currentPlan, hasActiveSubscription]);

  const getRemainingUsage = useCallback(() => {
    if (!subscription || !currentPlan) return 0;
    
    if (currentPlan.limits.dailyProcessing === -1) return -1; // unlimited
    
    const today = new Date().toISOString().split('T')[0];
    const currentCount = subscription.usage.lastResetDate === today 
      ? subscription.usage.dailyProcessingCount 
      : 0;
    
    return Math.max(0, currentPlan.limits.dailyProcessing - currentCount);
  }, [subscription, currentPlan]);

  return useMemo(() => ({
    subscription,
    plans: SUBSCRIPTION_PLANS,
    currentPlan,
    isLoading,
    hasActiveSubscription,
    canUseFeature,
    getRemainingUsage,
    subscribe,
    cancelSubscription,
    restoreSubscription,
    incrementUsage,
    refreshSubscription,
  }), [
    subscription,
    currentPlan,
    isLoading,
    hasActiveSubscription,
    canUseFeature,
    getRemainingUsage,
    subscribe,
    cancelSubscription,
    restoreSubscription,
    incrementUsage,
    refreshSubscription,
  ]);
});