/**
 * AI Interaction screen — multilingual RTL-aware conversation.
 * Supports English, Urdu (RTL), Sindhi (RTL) text input with auto-detection.
 * Voice input via VoiceInput component + TranscriptionReview overlay.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../lib/auth';
import VoiceInput from '../../components/voice/VoiceInput';
import TranscriptionReview from '../../components/voice/TranscriptionReview';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:8000';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  language: string;
  isRtl: boolean;
  sources?: Array<{ confidence: number; text?: string }>;
  cached?: boolean;
}

// Lightweight RTL detection: check for Arabic Unicode range
const hasArabicScript = (text: string) => /[\u0600-\u06FF\uFB50-\uFDFF]/.test(text);

interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
}

export default function InteractScreen() {
  const { accessToken, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const listRef = useRef<FlatList>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const isRtlInput = hasArabicScript(input);

  const handleInputChange = (text: string) => {
    setInput(text);
    // Update detected language indicator in real time
    if (hasArabicScript(text)) {
      // Sindhi check — heuristic based on unique Sindhi chars
      if (/[ڄڃڻڙ]/.test(text)) setDetectedLang('sindhi');
      else setDetectedLang('urdu');
    } else {
      setDetectedLang(text.length > 0 ? 'english' : null);
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setDetectedLang(null);
    setSending(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      language: detectedLang ?? 'english',
      isRtl: hasArabicScript(text),
    };
    setMessages((m) => [...m, userMsg]);

    try {
      const res = await fetch(`${API_BASE}/api/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: text,
          language_hint: userMsg.language,
          session_id: sessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Request failed');
      }

      if (data.session_id && !sessionId) setSessionId(data.session_id);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        sender: 'ai',
        language: data.response_language,
        isRtl: data.is_rtl,
        sources: data.rag_sources,
        cached: data.cached,
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${err.message}`,
        sender: 'ai',
        language: 'english',
        isRtl: false,
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, sending, detectedLang, sessionId, accessToken]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.userText : styles.aiText,
            item.isRtl && styles.rtlText,
          ]}
          textBreakStrategy="simple"
        >
          {item.text}
        </Text>
        {item.sources && item.sources.length > 0 && (
          <Text style={styles.sourceHint}>
            {item.sources.length} source{item.sources.length > 1 ? 's' : ''} |{' '}
            min confidence: {Math.min(...item.sources.map((s) => s.confidence)).toFixed(2)}
          </Text>
        )}
        {item.cached && <Text style={styles.cachedBadge}>⚡ cached</Text>}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Start a conversation</Text>
            <Text style={styles.emptyHint}>
              Type in English, اردو, or سنڌي — auto-detected
            </Text>
          </View>
        }
      />

      {/* Language indicator */}
      {detectedLang && (
        <View style={styles.langIndicator}>
          <Text style={styles.langText}>
            {detectedLang === 'urdu' ? '🇵🇰 Urdu' : detectedLang === 'sindhi' ? '🌟 Sindhi' : '🇬🇧 English'}
          </Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isRtlInput && styles.rtlInput]}
          value={input}
          onChangeText={handleInputChange}
          placeholder="Type your message..."
          multiline
          maxLength={2000}
          textAlign={isRtlInput ? 'right' : 'left'}
        />
        {/* Voice input mic button */}
        <VoiceInput
          isRecording={isRecording}
          onPress={() => setIsRecording((r) => !r)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Transcription review overlay */}
      <TranscriptionReview
        visible={!!transcription}
        text={transcription?.text ?? ''}
        confidence={transcription?.confidence ?? 0}
        language={transcription?.language ?? 'english'}
        isRTL={hasArabicScript(transcription?.text ?? '')}
        onConfirm={(text) => {
          setInput(text);
          handleInputChange(text);
          setTranscription(null);
        }}
        onReRecord={() => setTranscription(null)}
        onDismiss={() => setTranscription(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  messageList: { padding: 16, gap: 12 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1a1a2e' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#222' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  sourceHint: { fontSize: 11, color: '#aaa', marginTop: 4 },
  cachedBadge: { fontSize: 11, color: '#7f8c8d', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, color: '#999', fontWeight: '500' },
  emptyHint: { fontSize: 13, color: '#bbb', marginTop: 8, textAlign: 'center' },
  langIndicator: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langText: { fontSize: 12, color: '#2980b9' },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 15,
  },
  rtlInput: { textAlign: 'right' },
  sendBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#fff', fontSize: 16 },
});
