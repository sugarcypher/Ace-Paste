import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { 
  Copy, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  FileText,
  Settings,
  Camera,
  Sliders,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { detectAllIssues, cleanText } from '@/utils/invisibleCharacters';
import type { DetectionResult, CleaningOptions, ScanResult, WordExchange, VarianceSettings } from '@/types/detection';
import { useSecurity } from '@/contexts/SecurityContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import ScanModal from '@/components/ScanModal';

export default function MainScreen() {
  const { securitySettings } = useSecurity();
  const { 
    subscription, 
    currentPlan, 
    hasActiveSubscription, 
    getRemainingUsage, 
    incrementUsage 
  } = useSubscription();
  const [inputText, setInputText] = useState('');
  const [cleanedText, setCleanedText] = useState('');
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({
    invisibleChars: true,
    markdownHeaders: false,
    markdownBold: false,
    repeatingChars: false,
    formattingLines: false,
    extraWhitespace: false,
    wordExchanges: false,
  });
  const [wordExchanges, setWordExchanges] = useState<WordExchange[]>([
    { id: '1', badWord: '', goodWord: '', enabled: true },
    { id: '2', badWord: '', goodWord: '', enabled: true },
    { id: '3', badWord: '', goodWord: '', enabled: true },
  ]);
  const [varianceSettings, setVarianceSettings] = useState<VarianceSettings>({
    enabled: false,
    synonymVariation: false,
    caseVariation: true,
    pluralVariation: true,
  });
  const fadeAnim = useState(new Animated.Value(0))[0];

  const processText = useCallback(async (text: string) => {
    if (!text) {
      setCleanedText('');
      setDetectionResult(null);
      return;
    }

    // Check usage limits
    const canProcess = await incrementUsage();
    if (!canProcess) {
      Alert.alert(
        'Usage Limit Reached',
        'You have reached your daily processing limit. Upgrade to continue using ACE Paste.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => router.push('/subscription')
          }
        ]
      );
      return;
    }

    const result = detectAllIssues(text, cleaningOptions, wordExchanges);
    const cleaned = cleanText(text, cleaningOptions, wordExchanges, varianceSettings);
    
    setDetectionResult(result);
    setCleanedText(cleaned);

    const totalIssues = result.totalCount + 
      (result.additionalCleaning ? Object.values(result.additionalCleaning).reduce((a, b) => a + b, 0) : 0);

    if (totalIssues > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fadeAnim, incrementUsage, cleaningOptions]);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    processText(text);
  }, [processText]);

  const handleCopy = useCallback(async () => {
    if (!cleanedText) {
      Alert.alert('Nothing to copy', 'Please enter some text first');
      return;
    }

    try {
      await Clipboard.setStringAsync(cleanedText);
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      Alert.alert('Copy failed', 'Unable to copy text to clipboard');
    }
  }, [cleanedText]);

  const handleClear = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setInputText('');
    setCleanedText('');
    setDetectionResult(null);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        handleInputChange(text);
        if (Platform.OS !== 'web') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      Alert.alert('Paste failed', 'Unable to paste from clipboard');
    }
  }, [handleInputChange]);

  const handleSettings = useCallback(() => {
    router.push('/privacy-agreement');
  }, []);

  const handleUpgrade = useCallback(() => {
    router.push('/subscription');
  }, []);

  const handleScan = useCallback(() => {
    setShowScanModal(true);
  }, []);

  const handleScanComplete = useCallback((result: ScanResult) => {
    if (result.text) {
      handleInputChange(result.text);
    }
  }, [handleInputChange]);

  const toggleOption = useCallback((option: keyof CleaningOptions) => {
    setCleaningOptions(prev => {
      const newOptions = {
        ...prev,
        [option]: !prev[option],
      };
      
      // Re-process text with new options if we have input
      if (inputText) {
        setTimeout(() => {
          const result = detectAllIssues(inputText, newOptions, wordExchanges);
          const cleaned = cleanText(inputText, newOptions, wordExchanges, varianceSettings);
          setDetectionResult(result);
          setCleanedText(cleaned);
        }, 0);
      }
      
      return newOptions;
    });
  }, [inputText]);

  const toggleOptionsPanel = useCallback(() => {
    setShowOptions(prev => !prev);
  }, []);

  const addWordExchange = useCallback(() => {
    const newId = Date.now().toString();
    setWordExchanges(prev => [...prev, { id: newId, badWord: '', goodWord: '', enabled: true }]);
  }, []);

  const removeWordExchange = useCallback((id: string) => {
    setWordExchanges(prev => prev.filter(ex => ex.id !== id));
  }, []);

  const updateWordExchange = useCallback((id: string, field: keyof WordExchange, value: string | boolean) => {
    setWordExchanges(prev => prev.map(ex => 
      ex.id === id ? { ...ex, [field]: value } : ex
    ));
    
    // Re-process text if we have input
    if (inputText) {
      setTimeout(() => {
        const updatedExchanges = wordExchanges.map(ex => 
          ex.id === id ? { ...ex, [field]: value } : ex
        );
        const result = detectAllIssues(inputText, cleaningOptions, updatedExchanges);
        const cleaned = cleanText(inputText, cleaningOptions, updatedExchanges, varianceSettings);
        setDetectionResult(result);
        setCleanedText(cleaned);
      }, 0);
    }
  }, [inputText, cleaningOptions, wordExchanges, varianceSettings]);

  const toggleVarianceSetting = useCallback((setting: keyof VarianceSettings) => {
    setVarianceSettings(prev => {
      const newSettings = { ...prev, [setting]: !prev[setting] };
      
      // Re-process text if we have input
      if (inputText) {
        setTimeout(() => {
          const result = detectAllIssues(inputText, cleaningOptions, wordExchanges);
          const cleaned = cleanText(inputText, cleaningOptions, wordExchanges, newSettings);
          setDetectionResult(result);
          setCleanedText(cleaned);
        }, 0);
      }
      
      return newSettings;
    });
  }, [inputText, cleaningOptions, wordExchanges]);

  const resetWordExchanges = useCallback(() => {
    setWordExchanges([
      { id: '1', badWord: '', goodWord: '', enabled: true },
      { id: '2', badWord: '', goodWord: '', enabled: true },
      { id: '3', badWord: '', goodWord: '', enabled: true },
    ]);
    
    // Re-process text if we have input
    if (inputText) {
      setTimeout(() => {
        const result = detectAllIssues(inputText, cleaningOptions, []);
        const cleaned = cleanText(inputText, cleaningOptions, [], varianceSettings);
        setDetectionResult(result);
        setCleanedText(cleaned);
      }, 0);
    }
  }, [inputText, cleaningOptions, varianceSettings]);

  const stats = useMemo(() => {
    if (!detectionResult) return null;
    
    const invisibleStats = Object.entries(detectionResult.categories)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({ category, count, type: 'invisible' as const }));
    
    const additionalStats = detectionResult.additionalCleaning 
      ? Object.entries(detectionResult.additionalCleaning)
          .filter(([_, count]) => count > 0)
          .map(([category, count]) => ({ category, count, type: 'additional' as const }))
      : [];
    
    return [...invisibleStats, ...additionalStats]
      .sort((a, b) => b.count - a.count);
  }, [detectionResult]);

  const characterDifference = inputText.length - cleanedText.length;

  return (
    <LinearGradient
      colors={['#0A0E27', '#1A1B3A']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Image 
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qmt9oso62gen3dc5p09i7' }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <TouchableOpacity 
                  onPress={handleSettings}
                  style={styles.settingsButton}
                >
                  <Settings color="#60A5FA" size={24} />
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>
                Remove invisible tracking characters from your text
              </Text>
              
              {/* Subscription Status */}
              <View style={styles.subscriptionStatus}>
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.planName}>
                    {currentPlan?.name || 'Free Plan'}
                  </Text>
                  {subscription?.status === 'trial' && (
                    <Text style={styles.trialText}>
                      Trial: {subscription.trialEnd ? Math.max(0, Math.ceil((subscription.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0} days left
                    </Text>
                  )}
                  <Text style={styles.usageText}>
                    {getRemainingUsage() === -1 ? 'Unlimited' : `${getRemainingUsage()} uses left today`}
                  </Text>
                </View>
                {!hasActiveSubscription && (
                  <TouchableOpacity 
                    style={styles.upgradeButton}
                    onPress={handleUpgrade}
                  >
                    <Text style={styles.upgradeButtonText}>Upgrade</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Security Status */}
              <View style={styles.securityStatus}>
                <View style={styles.securityIndicator}>
                  <CheckCircle color="#F59E0B" size={16} />
                  <Text style={styles.securityText}>
                    {securitySettings.encryptionLevel === 'enhanced' ? 'AES-256' : 'AES-128'} Encrypted
                  </Text>
                </View>
                <View style={styles.securityIndicator}>
                  <CheckCircle color="#F59E0B" size={16} />
                  <Text style={styles.securityText}>
                    {securitySettings.dataRetention === 'none' ? 'No Storage' : 
                     securitySettings.dataRetention === 'session' ? 'Session Only' : 'Persistent'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Input Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <FileText color="#60A5FA" size={20} />
                <Text style={styles.sectionTitle}>Original Text</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    onPress={handleScan}
                    style={styles.actionButton}
                  >
                    <Camera color="#60A5FA" size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={toggleOptionsPanel}
                    style={[styles.actionButton, showOptions && styles.actionButtonActive]}
                  >
                    <Sliders color="#60A5FA" size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handlePaste}
                    style={styles.pasteButton}
                  >
                    <Text style={styles.pasteButtonText}>Paste</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  placeholder="Paste your text here..."
                  placeholderTextColor="#475569"
                  value={inputText}
                  onChangeText={handleInputChange}
                  textAlignVertical="top"
                />
                {inputText.length > 0 && (
                  <Text style={styles.charCount}>
                    {inputText.length} characters
                  </Text>
                )}
              </View>
            </View>

            {/* Cleaning Options */}
            {showOptions && (
              <View style={styles.optionsPanel}>
                <Text style={styles.optionsPanelTitle}>Cleaning Options</Text>
                <View style={styles.optionsGrid}>
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => toggleOption('invisibleChars')}
                  >
                    <View style={[styles.checkbox, cleaningOptions.invisibleChars && styles.checkboxActive]}>
                      {cleaningOptions.invisibleChars && <CheckCircle color="#FFFFFF" size={16} />}
                    </View>
                    <Text style={styles.optionLabel}>Invisible Characters</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => toggleOption('markdownHeaders')}
                  >
                    <View style={[styles.checkbox, cleaningOptions.markdownHeaders && styles.checkboxActive]}>
                      {cleaningOptions.markdownHeaders && <CheckCircle color="#FFFFFF" size={16} />}
                    </View>
                    <Text style={styles.optionLabel}>Markdown Headers (##)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => toggleOption('markdownBold')}
                  >
                    <View style={[styles.checkbox, cleaningOptions.markdownBold && styles.checkboxActive]}>
                      {cleaningOptions.markdownBold && <CheckCircle color="#FFFFFF" size={16} />}
                    </View>
                    <Text style={styles.optionLabel}>Bold Formatting (**)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => toggleOption('repeatingChars')}
                  >
                    <View style={[styles.checkbox, cleaningOptions.repeatingChars && styles.checkboxActive]}>
                      {cleaningOptions.repeatingChars && <CheckCircle color="#FFFFFF" size={16} />}
                    </View>
                    <Text style={styles.optionLabel}>Repeating Characters (***)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => toggleOption('formattingLines')}
                  >
                    <View style={[styles.checkbox, cleaningOptions.formattingLines && styles.checkboxActive]}>
                      {cleaningOptions.formattingLines && <CheckCircle color="#FFFFFF" size={16} />}
                    </View>
                    <Text style={styles.optionLabel}>Formatting Lines (---)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => toggleOption('extraWhitespace')}
                  >
                    <View style={[styles.checkbox, cleaningOptions.extraWhitespace && styles.checkboxActive]}>
                      {cleaningOptions.extraWhitespace && <CheckCircle color="#FFFFFF" size={16} />}
                    </View>
                    <Text style={styles.optionLabel}>Extra Whitespace</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => toggleOption('wordExchanges')}
                  >
                    <View style={[styles.checkbox, cleaningOptions.wordExchanges && styles.checkboxActive]}>
                      {cleaningOptions.wordExchanges && <CheckCircle color="#FFFFFF" size={16} />}
                    </View>
                    <Text style={styles.optionLabel}>Word Exchanges</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Word Exchanges Section */}
                {cleaningOptions.wordExchanges && (
                  <View style={styles.wordExchangesSection}>
                    <View style={styles.wordExchangesHeader}>
                      <Text style={styles.wordExchangesTitle}>Word Exchanges</Text>
                      <View style={styles.wordExchangesActions}>
                        <TouchableOpacity 
                          onPress={resetWordExchanges}
                          style={styles.resetButton}
                        >
                          <RotateCcw color="#94A3B8" size={16} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={addWordExchange}
                          style={styles.addButton}
                        >
                          <Plus color="#60A5FA" size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {wordExchanges.map((exchange) => (
                      <View key={exchange.id} style={styles.wordExchangeItem}>
                        <View style={styles.wordExchangeRow}>
                          <TouchableOpacity 
                            style={styles.exchangeCheckbox}
                            onPress={() => updateWordExchange(exchange.id, 'enabled', !exchange.enabled)}
                          >
                            <View style={[styles.checkbox, exchange.enabled && styles.checkboxActive]}>
                              {exchange.enabled && <CheckCircle color="#FFFFFF" size={12} />}
                            </View>
                          </TouchableOpacity>
                          
                          <View style={styles.wordInputs}>
                            <TextInput
                              style={styles.wordInput}
                              placeholder="Bad word"
                              placeholderTextColor="#64748B"
                              value={exchange.badWord}
                              onChangeText={(text) => updateWordExchange(exchange.id, 'badWord', text)}
                            />
                            <Text style={styles.arrowText}>→</Text>
                            <TextInput
                              style={styles.wordInput}
                              placeholder="Good word"
                              placeholderTextColor="#64748B"
                              value={exchange.goodWord}
                              onChangeText={(text) => updateWordExchange(exchange.id, 'goodWord', text)}
                            />
                          </View>
                          
                          {wordExchanges.length > 1 && (
                            <TouchableOpacity 
                              onPress={() => removeWordExchange(exchange.id)}
                              style={styles.removeButton}
                            >
                              <Minus color="#EF4444" size={16} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                    
                    {/* Variance Settings */}
                    <View style={styles.varianceSection}>
                      <Text style={styles.varianceTitle}>Variance Settings</Text>
                      <View style={styles.varianceOptions}>
                        <TouchableOpacity 
                          style={styles.varianceItem}
                          onPress={() => toggleVarianceSetting('enabled')}
                        >
                          <View style={[styles.checkbox, varianceSettings.enabled && styles.checkboxActive]}>
                            {varianceSettings.enabled && <CheckCircle color="#FFFFFF" size={12} />}
                          </View>
                          <Text style={styles.varianceLabel}>Enable Variations</Text>
                        </TouchableOpacity>
                        
                        {varianceSettings.enabled && (
                          <>
                            <TouchableOpacity 
                              style={styles.varianceItem}
                              onPress={() => toggleVarianceSetting('caseVariation')}
                            >
                              <View style={[styles.checkbox, varianceSettings.caseVariation && styles.checkboxActive]}>
                                {varianceSettings.caseVariation && <CheckCircle color="#FFFFFF" size={12} />}
                              </View>
                              <Text style={styles.varianceLabel}>Case Variations</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                              style={styles.varianceItem}
                              onPress={() => toggleVarianceSetting('pluralVariation')}
                            >
                              <View style={[styles.checkbox, varianceSettings.pluralVariation && styles.checkboxActive]}>
                                {varianceSettings.pluralVariation && <CheckCircle color="#FFFFFF" size={12} />}
                              </View>
                              <Text style={styles.varianceLabel}>Plural Variations</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Detection Results */}
            {detectionResult && (detectionResult.totalCount > 0 || 
              (detectionResult.additionalCleaning && Object.values(detectionResult.additionalCleaning).some(count => count > 0))
            ) && (
              <Animated.View 
                style={[
                  styles.detectionCard,
                  { opacity: fadeAnim }
                ]}
              >
                <View style={styles.detectionHeader}>
                  <AlertCircle color="#F59E0B" size={20} />
                  <Text style={styles.detectionTitle}>
                    Found {stats?.reduce((total, stat) => total + stat.count, 0) || 0} issue{(stats?.reduce((total, stat) => total + stat.count, 0) || 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.statsGrid}>
                  {stats?.map((stat) => (
                    <View key={stat.category} style={styles.statItem}>
                      <Text style={styles.statCount}>{stat.count}</Text>
                      <Text style={styles.statLabel}>
                        {stat.category.replace(/_/g, ' ').toLowerCase()}
                      </Text>
                    </View>
                  ))}
                </View>
                {characterDifference > 0 && (
                  <Text style={styles.differenceText}>
                    {characterDifference} character{characterDifference !== 1 ? 's' : ''} will be removed
                  </Text>
                )}
              </Animated.View>
            )}

            {/* Clean Text Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CheckCircle color="#F59E0B" size={20} />
                <Text style={styles.sectionTitle}>Cleaned Text</Text>
                {cleanedText.length > 0 && (
                  <Text style={styles.cleanCharCount}>
                    {cleanedText.length} characters
                  </Text>
                )}
              </View>
              <View style={styles.outputContainer}>
                <TextInput
                  style={[styles.textInput, styles.outputText]}
                  multiline
                  editable={false}
                  value={cleanedText}
                  placeholder="Clean text will appear here..."
                  placeholderTextColor="#475569"
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.clearButton]}
                onPress={handleClear}
                disabled={!inputText}
              >
                <Trash2 color="#EF4444" size={20} />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.copyButton,
                  copySuccess && styles.copyButtonSuccess
                ]}
                onPress={handleCopy}
                disabled={!cleanedText}
              >
                <Copy color="#FFFFFF" size={20} />
                <Text style={styles.copyButtonText}>
                  {copySuccess ? 'Copied!' : 'Copy Clean Text'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info Footer */}
            <View style={styles.infoFooter}>
              <Text style={styles.infoText}>
                This tool removes zero-width characters, bidirectional marks, variation selectors, and other invisible Unicode characters commonly used for tracking.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        
        <ScanModal 
          visible={showScanModal}
          onClose={() => setShowScanModal(false)}
          onScanComplete={handleScanComplete}
        />
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  settingsButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
  subscriptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  subscriptionInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#60A5FA',
    marginBottom: 2,
  },
  trialText: {
    fontSize: 12,
    color: '#F59E0B',
    marginBottom: 2,
  },
  usageText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  securityStatus: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#E2E8F0',
    flex: 1,
  },
  pasteButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  pasteButtonText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  inputContainer: {
    backgroundColor: '#1A1B3A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#60A5FA',
    minHeight: 150,
    position: 'relative',
  },
  outputContainer: {
    backgroundColor: '#1A1B3A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    minHeight: 150,
    position: 'relative',
  },
  textInput: {
    padding: 16,
    fontSize: 16,
    color: '#F1F5F9',
    minHeight: 150,
    maxHeight: 300,
  },
  outputText: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 12,
    color: '#64748B',
  },
  cleanCharCount: {
    fontSize: 14,
    color: '#F59E0B',
  },
  detectionCard: {
    backgroundColor: '#1A1B3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  detectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    backgroundColor: '#0A0E27',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'capitalize' as const,
  },
  differenceText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic' as const,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  clearButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  copyButton: {
    backgroundColor: '#60A5FA',
  },
  copyButtonSuccess: {
    backgroundColor: '#F59E0B',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  infoFooter: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(96, 165, 250, 0.3)',
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderColor: '#60A5FA',
  },
  optionsPanel: {
    backgroundColor: '#1A1B3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  optionsPanelTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#E2E8F0',
    marginBottom: 16,
  },
  optionsGrid: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#60A5FA',
    borderColor: '#60A5FA',
  },
  optionLabel: {
    fontSize: 14,
    color: '#E2E8F0',
    flex: 1,
  },
  wordExchangesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(96, 165, 250, 0.2)',
  },
  wordExchangesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  wordExchangesTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E2E8F0',
  },
  wordExchangesActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordExchangeItem: {
    marginBottom: 8,
  },
  wordExchangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exchangeCheckbox: {
    padding: 4,
  },
  wordInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordInput: {
    flex: 1,
    backgroundColor: '#0A0E27',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#F1F5F9',
  },
  arrowText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600' as const,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  varianceSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(96, 165, 250, 0.1)',
  },
  varianceTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#94A3B8',
    marginBottom: 8,
  },
  varianceOptions: {
    gap: 6,
  },
  varianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  varianceLabel: {
    fontSize: 12,
    color: '#E2E8F0',
  },
});