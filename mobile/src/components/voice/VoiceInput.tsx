import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

interface Props {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}

export default function VoiceInput({ isRecording, onPress, disabled, size = 52 }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      // Pulse animation while recording
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      // Ripple wave
      const wave = Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      pulse.start();
      wave.start();
      return () => {
        pulse.stop();
        wave.stop();
        pulseAnim.setValue(1);
        waveAnim.setValue(0);
      };
    }
  }, [isRecording]);

  const rippleScale = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const rippleOpacity = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.wrapper, { width: size, height: size }]}
    >
      {/* Ripple effect when recording */}
      {isRecording && (
        <Animated.View
          style={[
            styles.ripple,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />
      )}

      {/* Mic button */}
      <Animated.View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isRecording ? '#ef4444' : '#111827',
            transform: [{ scale: pulseAnim }],
          },
          disabled && styles.disabled,
        ]}
      >
        <MicIcon size={size * 0.44} color="#fff" />
      </Animated.View>
    </TouchableOpacity>
  );
}

function MicIcon({ size, color }: { size: number; color: string }) {
  // Simple SVG-like mic using View composition
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Mic capsule */}
      <View
        style={{
          width: size * 0.4,
          height: size * 0.6,
          borderRadius: size * 0.2,
          backgroundColor: color,
          marginBottom: size * 0.05,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    backgroundColor: '#ef4444',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  disabled: { opacity: 0.4 },
});
