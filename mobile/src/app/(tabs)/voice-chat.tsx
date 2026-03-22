import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../lib/auth';
import VoiceInput from '../../components/voice/VoiceInput';
import TranscriptionReview from '../../components/voice/TranscriptionReview';
import SindhiTTSNotice from '../../components/voice/SindhiTTSNotice';
import { useAudioRecorder } from '../../lib/hooks/useAudioRecorder';
import { useAudioPlayback } from '../../lib/hooks/useAudioPlayback';
import { VoiceConversationLoop } from '../../lib/voice-conversation-loop';

interface ConversationTurn {
  id: string;
  role: 'user' | 'agent';
  text: string;
  language: string;
  audioUrl?: string;
}

const isRTLLanguage = (lang: string) => ['urdu', 'sindhi', 'ur', 'sd'].includes(lang.toLowerCase());

export default function VoiceChatScreen() {
  const { user, authToken } = useAuth() as any;
  const { isRecording, audioUri, duration, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const { playFromUrl, stop: stopPlayback, isPlaying } = useAudioPlayback();

  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [loopState, setLoopState] = useState<string>('idle');
  const [showReview, setShowReview] = useState(false);
  const [pendingTranscription, setPendingTranscription] = useState<{ text: string; language: string; confidence: number; isRTL: boolean } | null>(null);
  const [showSindhiNotice, setShowSindhiNotice] = useState(false);
  const [sindhiNoticeShown, setSindhiNoticeShown] = useState(false);
  const loopRef = useRef<VoiceConversationLoop | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user || !authToken) return;
    loopRef.current = new VoiceConversationLoop(
      {
        onStateChange: (state) => setLoopState(state),
        onTranscription: (text, language) => {
          addTurn('user', text, language);
        },
        onAgentResponse: (text, audioUrl) => {
          addTurn('agent', text, 'unknown', audioUrl);
          if (audioUrl) playFromUrl(audioUrl);
          // Sindhi TTS notice
          if (!sindhiNoticeShown) {
            // Will be shown if last user turn was in Sindhi
          }
        },
        onError: (error) => {
          setLoopState('error:' + error);
        },
      },
      {
        domainId: user?.domain_id ?? '',
        authToken: authToken ?? '',
      }
    );
    return () => loopRef.current?.stop();
  }, [user, authToken]);

  useEffect(() => {
    if (audioUri && loopRef.current) {
      loopRef.current.startCycle(audioUri);
    }
  }, [audioUri]);

  const addTurn = (role: 'user' | 'agent', text: string, language: string, audioUrl?: string) => {
    setTurns((prev) => [
      ...prev,
      { id: `${Date.now()}`, role, text, language, audioUrl },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleMicPress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await stopPlayback();
      resetRecording();
      await startRecording();
    }
  };

  const handleEndSession = () => {
    loopRef.current?.stop();
    setTurns([]);
    setLoopState('idle');
  };

  const getStatusText = () => {
    if (isRecording) return `Recording… ${Math.round(duration / 1000)}s`;
    if (loopState === 'transcribing') return 'Transcribing…';
    if (loopState === 'thinking') return 'Thinking…';
    if (isPlaying) return 'Speaking…';
    if (turns.length === 0) return 'Tap mic to start';
    return 'Tap mic to continue';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice Conversation</Text>
        {turns.length > 0 && (
          <TouchableOpacity onPress={handleEndSession} style={styles.endBtn}>
            <Text style={styles.endBtnText}>End</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sindhi TTS notice */}
      <SindhiTTSNotice
        visible={showSindhiNotice}
        onDismiss={() => {
          setShowSindhiNotice(false);
          setSindhiNoticeShown(true);
        }}
      />

      {/* Conversation transcript */}
      <ScrollView
        ref={scrollRef}
        style={styles.transcript}
        contentContainerStyle={styles.transcriptContent}
      >
        {turns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎙</Text>
            <Text style={styles.emptyTitle}>Voice Conversation</Text>
            <Text style={styles.emptySubtitle}>
              Ask questions in English, Urdu, or Sindhi.{'\n'}
              The agent will respond in the same language.
            </Text>
          </View>
        ) : (
          turns.map((turn) => {
            const rtl = isRTLLanguage(turn.language);
            return (
              <View
                key={turn.id}
                style={[
                  styles.turnBubble,
                  turn.role === 'user' ? styles.userBubble : styles.agentBubble,
                ]}
              >
                <Text style={styles.turnRole}>
                  {turn.role === 'user' ? 'You' : 'Agent'}
                </Text>
                <Text
                  style={[styles.turnText, rtl && styles.rtlText]}
                >
                  {turn.text}
                </Text>
                {turn.audioUrl && turn.role === 'agent' && (
                  <TouchableOpacity
                    onPress={() => playFromUrl(turn.audioUrl!)}
                    style={styles.replayBtn}
                  >
                    <Text style={styles.replayBtnText}>▶ Replay</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Status bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      {/* Mic control */}
      <View style={styles.micRow}>
        <VoiceInput
          isRecording={isRecording}
          onPress={handleMicPress}
          disabled={loopState === 'transcribing' || loopState === 'thinking'}
          size={72}
        />
      </View>

      {/* Transcription review */}
      {pendingTranscription && (
        <TranscriptionReview
          visible={showReview}
          text={pendingTranscription.text}
          language={pendingTranscription.language}
          confidence={pendingTranscription.confidence}
          isRTL={pendingTranscription.isRTL}
          onConfirm={(text) => {
            setShowReview(false);
            setPendingTranscription(null);
          }}
          onReRecord={() => {
            setShowReview(false);
            setPendingTranscription(null);
            resetRecording();
          }}
          onDismiss={() => {
            setShowReview(false);
            setPendingTranscription(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  endBtn: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  endBtnText: { color: '#d1d5db', fontSize: 13, fontWeight: '500' },
  transcript: { flex: 1 },
  transcriptContent: { padding: 16, gap: 10 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: '#6b7280', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  turnBubble: { maxWidth: '80%', borderRadius: 14, padding: 14 },
  userBubble: { backgroundColor: '#1d4ed8', alignSelf: 'flex-end' },
  agentBubble: { backgroundColor: '#1f2937', alignSelf: 'flex-start' },
  turnRole: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  turnText: { color: '#fff', fontSize: 14, lineHeight: 22 },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  replayBtn: { marginTop: 8, alignSelf: 'flex-start' },
  replayBtnText: { color: '#93c5fd', fontSize: 12, fontWeight: '500' },
  statusBar: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  statusText: { color: '#9ca3af', fontSize: 13 },
  micRow: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#1f2937',
  },
});
