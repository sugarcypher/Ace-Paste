import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSecurity } from '@/contexts/SecurityContext';

export default function IndexScreen() {
  const { hasAcceptedTerms, isLoading } = useSecurity();

  useEffect(() => {
    if (!isLoading) {
      if (hasAcceptedTerms) {
        router.replace('/main');
      } else {
        router.replace('/privacy-agreement');
      }
    }
  }, [hasAcceptedTerms, isLoading]);

  return (
    <LinearGradient colors={['#0A0E27', '#1A1B3A']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#60A5FA" />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});