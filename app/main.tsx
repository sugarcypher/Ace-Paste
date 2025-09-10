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
} from 'lucide-react-native';
import { router } from 'expo-router';
import { detectInvisibleCharacters, stripInvisibleCharacters } from '@/utils/invisibleCharacters';
import type { DetectionResult } from '@/types/detection';
import { useSecurity } from '@/contexts/SecurityContext';

export default function MainScreen() {
  const { securitySettings } = useSecurity();
  const [inputText, setInputText] = useState('');
  const [cleanedText, setCleanedText] = useState('');
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const processText = useCallback((text: string) => {
    if (!text) {
      setCleanedText('');
      setDetectionResult(null);
      return;
    }

    const result = detectInvisibleCharacters(text);
    const cleaned = stripInvisibleCharacters(text);
    
    setDetectionResult(result);
    setCleanedText(cleaned);

    if (result.totalCount > 0) {
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
  }, [fadeAnim]);

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

  const stats = useMemo(() => {
    if (!detectionResult) return null;
    
    return Object.entries(detectionResult.categories)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a);
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
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qnz0c0lks242k1if54ftq' }}
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
                <TouchableOpacity 
                  onPress={handlePaste}
                  style={styles.pasteButton}
                >
                  <Text style={styles.pasteButtonText}>Paste</Text>
                </TouchableOpacity>
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

            {/* Detection Results */}
            {detectionResult && detectionResult.totalCount > 0 && (
              <Animated.View 
                style={[
                  styles.detectionCard,
                  { opacity: fadeAnim }
                ]}
              >
                <View style={styles.detectionHeader}>
                  <AlertCircle color="#F59E0B" size={20} />
                  <Text style={styles.detectionTitle}>
                    Found {detectionResult.totalCount} invisible character{detectionResult.totalCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.statsGrid}>
                  {stats?.map(([category, count]) => (
                    <View key={category} style={styles.statItem}>
                      <Text style={styles.statCount}>{count}</Text>
                      <Text style={styles.statLabel}>
                        {category.replace(/_/g, ' ').toLowerCase()}
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
});