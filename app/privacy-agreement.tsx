import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Lock,
  Eye,
  Database,
  Wifi,
  Fingerprint,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react-native';
import { useSecurity, type SecuritySettings } from '@/contexts/SecurityContext';

interface SecurityOption {
  key: keyof SecuritySettings;
  title: string;
  description: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  type: 'boolean' | 'select';
  options?: { value: any; label: string; description: string }[];
  recommended?: any;
  enterprise?: boolean;
}

const SECURITY_OPTIONS: SecurityOption[] = [
  {
    key: 'dataRetention',
    title: 'Data Retention Policy',
    description: 'How long should processed text be stored',
    icon: Database,
    type: 'select',
    options: [
      { value: 'none', label: 'No Storage', description: 'Text is never stored (most secure)' },
      { value: 'session', label: 'Session Only', description: 'Cleared when app closes' },
      { value: 'persistent', label: 'Persistent', description: 'Stored until manually cleared' },
    ],
    recommended: 'none',
    enterprise: true,
  },
  {
    key: 'encryptionLevel',
    title: 'Encryption Level',
    description: 'Security level for data protection',
    icon: Lock,
    type: 'select',
    options: [
      { value: 'standard', label: 'Standard', description: 'AES-128 encryption' },
      { value: 'enhanced', label: 'Enhanced', description: 'AES-256 with key derivation' },
    ],
    recommended: 'enhanced',
    enterprise: true,
  },
  {
    key: 'analyticsEnabled',
    title: 'Usage Analytics',
    description: 'Anonymous usage statistics for app improvement',
    icon: Eye,
    type: 'boolean',
    recommended: false,
  },
  {
    key: 'crashReportingEnabled',
    title: 'Crash Reporting',
    description: 'Automatic crash reports to improve stability',
    icon: AlertTriangle,
    type: 'boolean',
    recommended: false,
  },
  {
    key: 'networkLogging',
    title: 'Network Activity Logging',
    description: 'Log network requests for debugging',
    icon: Wifi,
    type: 'boolean',
    recommended: false,
    enterprise: true,
  },
  {
    key: 'biometricProtection',
    title: 'Biometric Protection',
    description: 'Require fingerprint/face ID to access app',
    icon: Fingerprint,
    type: 'boolean',
    recommended: false,
    enterprise: true,
  },
  {
    key: 'autoLockEnabled',
    title: 'Auto-Lock',
    description: 'Automatically lock app after inactivity',
    icon: Clock,
    type: 'boolean',
    recommended: false,
    enterprise: true,
  },
];

export default function PrivacyAgreementScreen() {
  const { securitySettings, acceptTerms, updateSecuritySettings } = useSecurity();
  const [localSettings, setLocalSettings] = useState<SecuritySettings>(securitySettings);
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);

  const handleSettingChange = useCallback((key: keyof SecuritySettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleAcceptTerms = useCallback(async () => {
    if (!hasReadTerms) {
      console.warn('Terms not read - please scroll through the complete agreement');
      return;
    }

    try {
      setIsAccepting(true);
      await updateSecuritySettings(localSettings);
      await acceptTerms();
      router.replace('/main');
    } catch {
      console.error('Failed to save settings');
    } finally {
      setIsAccepting(false);
    }
  }, [hasReadTerms, localSettings, acceptTerms, updateSecuritySettings]);

  const renderSecurityOption = (option: SecurityOption) => {
    const IconComponent = option.icon;
    const currentValue = localSettings[option.key];
    const isRecommended = currentValue === option.recommended;

    return (
      <View key={option.key} style={styles.optionCard}>
        <View style={styles.optionHeader}>
          <View style={styles.optionTitleRow}>
            <IconComponent color="#F59E0B" size={20} />
            <Text style={styles.optionTitle}>{option.title}</Text>
            {option.enterprise && (
              <View style={styles.enterpriseBadge}>
                <Text style={styles.enterpriseBadgeText}>ENT</Text>
              </View>
            )}
            {isRecommended && (
              <View style={styles.recommendedBadge}>
                <CheckCircle color="#F59E0B" size={16} />
              </View>
            )}
          </View>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>

        {option.type === 'boolean' ? (
          <Switch
            value={currentValue as boolean}
            onValueChange={(value) => handleSettingChange(option.key, value)}
            trackColor={{ false: '#374151', true: '#60A5FA' }}
            thumbColor={currentValue ? '#FFFFFF' : '#9CA3AF'}
          />
        ) : (
          <View style={styles.selectContainer}>
            {option.options?.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.selectOption,
                  currentValue === opt.value && styles.selectOptionActive,
                ]}
                onPress={() => handleSettingChange(option.key, opt.value)}
              >
                <View style={styles.selectOptionContent}>
                  <Text style={[
                    styles.selectOptionLabel,
                    currentValue === opt.value && styles.selectOptionLabelActive,
                  ]}>
                    {opt.label}
                  </Text>
                  <Text style={[
                    styles.selectOptionDescription,
                    currentValue === opt.value && styles.selectOptionDescriptionActive,
                  ]}>
                    {opt.description}
                  </Text>
                </View>
                {currentValue === opt.value && (
                  <CheckCircle color="#60A5FA" size={20} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#0A0E27', '#1A1B3A']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
            if (isNearBottom && !hasReadTerms) {
              setHasReadTerms(true);
            }
          }}
          scrollEventThrottle={100}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qnz0c0lks242k1if54ftq' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.headerTitle}>Privacy & Security Agreement</Text>
            <Text style={styles.headerSubtitle}>
              Enterprise-grade security for your sensitive data
            </Text>
          </View>

          {/* Privacy Policy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy Policy</Text>
            <View style={styles.policyCard}>
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Data Processing:</Text> ACE Paste processes text locally on your device to detect and remove invisible tracking characters. No text content is transmitted to external servers unless explicitly configured.
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Data Collection:</Text> We collect only the minimum data necessary for app functionality. This includes usage statistics (if enabled), crash reports (if enabled), and security logs (if enabled).
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Data Storage:</Text> All processed text is handled according to your selected data retention policy. By default, no text is stored permanently.
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Encryption:</Text> All stored data is encrypted using industry-standard AES encryption. Enhanced mode uses AES-256 with PBKDF2 key derivation.
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Third Parties:</Text> We do not share your data with third parties except as required by law or with your explicit consent.
              </Text>
            </View>
          </View>

          {/* Security Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security Configuration</Text>
            <Text style={styles.sectionDescription}>
              Configure security settings according to your organization&apos;s requirements
            </Text>
            
            {SECURITY_OPTIONS.map(renderSecurityOption)}
          </View>

          {/* Terms of Service */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms of Service</Text>
            <View style={styles.policyCard}>
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Acceptable Use:</Text> ACE Paste is designed for legitimate text processing needs. Users are responsible for ensuring compliance with applicable laws and regulations.
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Liability:</Text> ACE Paste is provided &quot;as is&quot; without warranties. Users assume responsibility for data backup and security practices.
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Updates:</Text> Security updates may be applied automatically to maintain protection against emerging threats.
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Compliance:</Text> This application is designed to meet enterprise security standards including SOC 2, ISO 27001, and GDPR requirements.
              </Text>
            </View>
          </View>

          {/* Compliance Badges */}
          <View style={styles.complianceSection}>
            <Text style={styles.complianceTitle}>Security Compliance</Text>
            <View style={styles.complianceBadges}>
              <View style={styles.complianceBadge}>
                <Text style={styles.complianceBadgeText}>SOC 2</Text>
              </View>
              <View style={styles.complianceBadge}>
                <Text style={styles.complianceBadgeText}>ISO 27001</Text>
              </View>
              <View style={styles.complianceBadge}>
                <Text style={styles.complianceBadgeText}>GDPR</Text>
              </View>
              <View style={styles.complianceBadge}>
                <Text style={styles.complianceBadgeText}>CCPA</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Accept Button */}
        <View style={styles.acceptContainer}>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              (!hasReadTerms || isAccepting) && styles.acceptButtonDisabled,
            ]}
            onPress={handleAcceptTerms}
            disabled={!hasReadTerms || isAccepting}
          >
            {isAccepting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.acceptButtonText}>
                  Accept Terms & Continue
                </Text>
                <ArrowRight color="#FFFFFF" size={20} />
              </>
            )}
          </TouchableOpacity>
          
          {!hasReadTerms && (
            <Text style={styles.readPrompt}>
              Please scroll to read the complete agreement
            </Text>
          )}
        </View>
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
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#F1F5F9',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  policyCard: {
    backgroundColor: '#1A1B3A',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  policyText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
    marginBottom: 16,
  },
  policyBold: {
    fontWeight: '600' as const,
    color: '#F1F5F9',
  },
  optionCard: {
    backgroundColor: '#1A1B3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  optionHeader: {
    marginBottom: 12,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#F1F5F9',
    flex: 1,
  },
  enterpriseBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  enterpriseBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  recommendedBadge: {
    marginLeft: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#94A3B8',
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0A0E27',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  selectOptionActive: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  selectOptionContent: {
    flex: 1,
  },
  selectOptionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#CBD5E1',
    marginBottom: 2,
  },
  selectOptionLabelActive: {
    color: '#F1F5F9',
  },
  selectOptionDescription: {
    fontSize: 12,
    color: '#94A3B8',
  },
  selectOptionDescriptionActive: {
    color: '#CBD5E1',
  },
  complianceSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  complianceTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#94A3B8',
    marginBottom: 12,
  },
  complianceBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  complianceBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  complianceBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  acceptContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0A0E27',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(96, 165, 250, 0.3)',
  },
  acceptButton: {
    backgroundColor: '#60A5FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: '#374151',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  readPrompt: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});