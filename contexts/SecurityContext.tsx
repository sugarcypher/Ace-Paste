import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export interface SecuritySettings {
  dataRetention: 'none' | 'session' | 'persistent';
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  encryptionLevel: 'standard' | 'enhanced';
  networkLogging: boolean;
  biometricProtection: boolean;
  autoLockEnabled: boolean;
  autoLockTimeout: number;
}

export interface SecurityContextType {
  hasAcceptedTerms: boolean;
  securitySettings: SecuritySettings;
  isLoading: boolean;
  acceptTerms: () => Promise<void>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  dataRetention: 'none',
  analyticsEnabled: false,
  crashReportingEnabled: false,
  encryptionLevel: 'enhanced',
  networkLogging: false,
  biometricProtection: false,
  autoLockEnabled: false,
  autoLockTimeout: 300,
};

const STORAGE_KEYS = {
  TERMS_ACCEPTED: '@ace_paste_terms_accepted',
  SECURITY_SETTINGS: '@ace_paste_security_settings',
};

export const [SecurityProvider, useSecurity] = createContextHook(() => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean>(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      setIsLoading(true);
      
      const [termsAccepted, storedSettings] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED),
        AsyncStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS),
      ]);

      if (termsAccepted === 'true') {
        setHasAcceptedTerms(true);
      }

      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSecuritySettings({ ...DEFAULT_SECURITY_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Failed to load stored security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acceptTerms = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, 'true');
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error('Failed to save terms acceptance:', error);
      throw error;
    }
  }, []);

  const updateSecuritySettings = useCallback(async (newSettings: Partial<SecuritySettings>) => {
    try {
      const updatedSettings = { ...securitySettings, ...newSettings };
      await AsyncStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(updatedSettings));
      setSecuritySettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update security settings:', error);
      throw error;
    }
  }, [securitySettings]);

  const resetToDefaults = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.TERMS_ACCEPTED, STORAGE_KEYS.SECURITY_SETTINGS]);
      setHasAcceptedTerms(false);
      setSecuritySettings(DEFAULT_SECURITY_SETTINGS);
    } catch (error) {
      console.error('Failed to reset security settings:', error);
      throw error;
    }
  }, []);

  return useMemo(() => ({
    hasAcceptedTerms,
    securitySettings,
    isLoading,
    acceptTerms,
    updateSecuritySettings,
    resetToDefaults,
  }), [hasAcceptedTerms, securitySettings, isLoading, acceptTerms, updateSecuritySettings, resetToDefaults]);
});