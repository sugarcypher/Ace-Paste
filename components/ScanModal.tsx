import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Camera, RotateCcw, Check } from 'lucide-react-native';
import type { ScanResult } from '@/types/detection';

interface ScanModalProps {
  visible: boolean;
  onClose: () => void;
  onScanComplete: (result: ScanResult) => void;
}

export default function ScanModal({ visible, onClose, onScanComplete }: ScanModalProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const toggleCameraFacing = useCallback(() => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (!photo?.base64) {
        Alert.alert('Error', 'Failed to capture image');
        return;
      }

      // Process image with OCR API
      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'scan.jpg',
      } as any);

      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const result = await response.json();
      
      const scanResult: ScanResult = {
        text: result.text || '',
        confidence: 0.9, // Mock confidence for now
        language: result.language,
      };

      onScanComplete(scanResult);
      onClose();
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Scan Failed', 'Unable to process the image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onScanComplete, onClose]);

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <LinearGradient colors={['#0A0E27', '#1A1B3A']} style={styles.container}>
          <View style={styles.permissionContainer}>
            <Camera color="#60A5FA" size={64} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              ACE Paste needs camera access to scan text from images
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {Platform.OS !== 'web' ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
              style={styles.overlay}
            >
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                  <X color="#FFFFFF" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Text</Text>
                <TouchableOpacity style={styles.headerButton} onPress={toggleCameraFacing}>
                  <RotateCcw color="#FFFFFF" size={24} />
                </TouchableOpacity>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  Position text within the frame and tap capture
                </Text>
              </View>

              {/* Capture Button */}
              <View style={styles.captureContainer}>
                <TouchableOpacity
                  style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
                  onPress={takePicture}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" size="large" />
                  ) : (
                    <Check color="#FFFFFF" size={32} />
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </CameraView>
        ) : (
          <LinearGradient colors={['#0A0E27', '#1A1B3A']} style={styles.container}>
            <View style={styles.webFallback}>
              <Camera color="#60A5FA" size={64} />
              <Text style={styles.webFallbackTitle}>Camera Not Available</Text>
              <Text style={styles.webFallbackText}>
                Camera scanning is not available on web. Please use the mobile app.
              </Text>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  instructionsText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  captureContainer: {
    alignItems: 'center',
    paddingBottom: 60,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonDisabled: {
    backgroundColor: '#64748B',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#E2E8F0',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#60A5FA',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#E2E8F0',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  webFallbackText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
});