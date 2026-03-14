import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useState } from "react";
import { secureStorageAdapter } from "@/lib/secureStorage";
import { AuthHelper } from "shared/lib/auth";

const authHelper = new AuthHelper(secureStorageAdapter);

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: string[];
  confidence?: number;
}

interface ChatInterfaceProps {
  sessionId?: string;
}

export function ChatInterface({ sessionId: initialSessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSessionId);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = await authHelper.getToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/rag/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: input,
          session_id: sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Query failed");
      }

      if (!sessionId) {
        setSessionId(data.session_id);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
        citations: data.citations,
        confidence: data.confidence,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Ask a legal question to get started</Text>
          </View>
        )}

        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.role === "user" ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.role === "user" ? styles.userText : styles.assistantText,
              ]}
            >
              {message.content}
            </Text>

            {message.citations && message.citations.length > 0 && (
              <View style={styles.citations}>
                <Text style={styles.citationsTitle}>Citations:</Text>
                {message.citations.map((citation, i) => (
                  <Text key={i} style={styles.citationItem}>
                    • {citation}
                  </Text>
                ))}
              </View>
            )}

            {message.confidence !== undefined && (
              <Text style={styles.confidence}>
                Confidence: {(message.confidence * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        ))}

        {loading && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <Text style={styles.assistantText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a legal question..."
          multiline
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (loading || !input.trim()) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={loading || !input.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#000",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: "#fff",
  },
  assistantText: {
    color: "#000",
  },
  citations: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  citationsTitle: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 4,
  },
  citationItem: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  confidence: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
