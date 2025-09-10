import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SecurityProvider } from "@/contexts/SecurityContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="privacy-agreement" 
        options={{ 
          headerShown: false,
          presentation: "modal"
        }} 
      />
      <Stack.Screen 
        name="main" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="subscription" 
        options={{ 
          headerShown: false,
          presentation: "modal"
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SecurityProvider>
          <SubscriptionProvider>
            <GestureHandlerRootView style={styles.container}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </SubscriptionProvider>
        </SecurityProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});