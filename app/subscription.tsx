import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Crown,
  Check,
  Star,
  Shield,
  Zap,
  Users,
  ArrowRight,
  X,
} from 'lucide-react-native';
import { useSubscription, type SubscriptionPlan } from '@/contexts/SubscriptionContext';

export default function SubscriptionScreen() {
  const { 
    subscription, 
    plans, 
    currentPlan, 
    hasActiveSubscription, 
    subscribe, 
    getRemainingUsage 
  } = useSubscription();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = useCallback(async (planId: string) => {
    if (planId === 'free') {
      router.back();
      return;
    }

    try {
      setIsSubscribing(true);
      setSelectedPlan(planId);
      
      const result = await subscribe(planId);
      
      if (result.success) {
        Alert.alert(
          'Subscription Successful!',
          'Welcome to ACE Paste Premium. You now have access to all premium features.',
          [
            {
              text: 'Continue',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Subscription Failed',
          'error' in result ? result.error || 'Unable to process subscription. Please try again.' : 'Unable to process subscription. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubscribing(false);
      setSelectedPlan(null);
    }
  }, [subscribe]);

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentPlan?.id === plan.id;
    const isPopular = plan.popular;
    const isYearly = plan.interval === 'year';
    const monthlyPrice = isYearly ? plan.price / 12 : plan.price;
    const savings = isYearly ? Math.round(((plan.price / 12) - (plans.find(p => p.tier === plan.tier && p.interval === 'month')?.price || 0)) * 12) : 0;

    return (
      <View key={plan.id} style={[styles.planCard, isPopular && styles.popularPlan]}>
        {isPopular && (
          <View style={styles.popularBadge}>
            <Star color="#FFFFFF" size={16} />
            <Text style={styles.popularBadgeText}>Most Popular</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planName}>{plan.name}</Text>
            {plan.tier === 'enterprise' && (
              <Crown color="#F59E0B" size={24} />
            )}
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              ${plan.price === 0 ? '0' : monthlyPrice.toFixed(2)}
            </Text>
            <Text style={styles.priceInterval}>
              {plan.price === 0 ? 'Free' : '/month'}
            </Text>
          </View>
          
          {isYearly && savings > 0 && (
            <Text style={styles.savings}>
              Save ${Math.abs(savings)} per year
            </Text>
          )}
          
          {isCurrentPlan && (
            <View style={styles.currentPlanBadge}>
              <Check color="#F59E0B" size={16} />
              <Text style={styles.currentPlanText}>Current Plan</Text>
            </View>
          )}
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check color="#F59E0B" size={16} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            isCurrentPlan && styles.currentPlanButton,
            (isSubscribing && selectedPlan === plan.id) && styles.loadingButton,
          ]}
          onPress={() => handleSubscribe(plan.id)}
          disabled={isCurrentPlan || (isSubscribing && selectedPlan === plan.id)}
        >
          {isSubscribing && selectedPlan === plan.id ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={[
                styles.subscribeButtonText,
                isCurrentPlan && styles.currentPlanButtonText,
              ]}>
                {isCurrentPlan ? 'Current Plan' : plan.price === 0 ? 'Continue with Free' : 'Subscribe'}
              </Text>
              {!isCurrentPlan && <ArrowRight color="#FFFFFF" size={20} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const remainingUsage = getRemainingUsage();
  const isTrialActive = subscription?.status === 'trial';
  const trialDaysLeft = subscription?.trialEnd 
    ? Math.max(0, Math.ceil((subscription.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <LinearGradient colors={['#0A0E27', '#1A1B3A']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X color="#94A3B8" size={24} />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              <Image 
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qmt9oso62gen3dc5p09i7' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            <Text style={styles.headerTitle}>Choose Your Plan</Text>
            <Text style={styles.headerSubtitle}>
              Unlock the full power of ACE Paste with enterprise-grade security
            </Text>
          </View>

          {/* Current Status */}
          {hasActiveSubscription && (
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Shield color="#F59E0B" size={20} />
                <Text style={styles.statusTitle}>
                  {isTrialActive ? 'Free Trial Active' : 'Subscription Active'}
                </Text>
              </View>
              
              <View style={styles.statusDetails}>
                {isTrialActive && (
                  <Text style={styles.statusText}>
                    {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining in your free trial
                  </Text>
                )}
                
                {remainingUsage !== -1 && (
                  <Text style={styles.statusText}>
                    {remainingUsage} text processing{remainingUsage !== 1 ? 's' : ''} remaining today
                  </Text>
                )}
                
                {remainingUsage === -1 && (
                  <Text style={styles.statusText}>
                    Unlimited text processing
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Features Highlight */}
          <View style={styles.featuresHighlight}>
            <Text style={styles.featuresTitle}>Why Upgrade?</Text>
            
            <View style={styles.highlightGrid}>
              <View style={styles.highlightItem}>
                <Zap color="#F59E0B" size={24} />
                <Text style={styles.highlightText}>Unlimited Processing</Text>
              </View>
              
              <View style={styles.highlightItem}>
                <Shield color="#F59E0B" size={24} />
                <Text style={styles.highlightText}>Enhanced Security</Text>
              </View>
              
              <View style={styles.highlightItem}>
                <Users color="#F59E0B" size={24} />
                <Text style={styles.highlightText}>Priority Support</Text>
              </View>
              
              <View style={styles.highlightItem}>
                <Crown color="#F59E0B" size={24} />
                <Text style={styles.highlightText}>Enterprise Features</Text>
              </View>
            </View>
          </View>

          {/* Pricing Plans */}
          <View style={styles.plansContainer}>
            <Text style={styles.plansTitle}>Subscription Plans</Text>
            
            {plans.map(renderPlanCard)}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              All plans include 7-day free trial • Cancel anytime • Secure payment processing
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 32,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 0,
    padding: 8,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  statusCard: {
    backgroundColor: '#1A1B3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  statusDetails: {
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  featuresHighlight: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 16,
  },
  highlightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  highlightItem: {
    alignItems: 'center',
    width: '40%',
    minWidth: 120,
  },
  highlightText: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 8,
  },
  plansContainer: {
    marginBottom: 32,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#1A1B3A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    position: 'relative',
  },
  popularPlan: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    right: 20,
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'center',
    maxWidth: 140,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#F1F5F9',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#F59E0B',
  },
  priceInterval: {
    fontSize: 16,
    color: '#94A3B8',
  },
  savings: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600' as const,
    marginTop: 4,
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  currentPlanText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#CBD5E1',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#60A5FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  currentPlanButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  loadingButton: {
    backgroundColor: '#94A3B8',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  currentPlanButtonText: {
    color: '#F59E0B',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(96, 165, 250, 0.3)',
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});