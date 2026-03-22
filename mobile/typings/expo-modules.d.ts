/**
 * Type stubs for Expo packages not yet installed.
 * These allow TypeScript compilation to succeed while native modules are added incrementally.
 */

declare module 'expo-router' {
  export function useRouter(): {
    push: (path: string | object) => void;
    replace: (path: string | object) => void;
    back: () => void;
    navigate: (path: string | object) => void;
  };
  export function useLocalSearchParams<T extends Record<string, string> = Record<string, string>>(): Partial<T>;
  export function usePathname(): string;
  export function Link(props: { href: string; children: React.ReactNode; [key: string]: unknown }): JSX.Element;
  export function Redirect(props: { href: string }): JSX.Element;
  export function Stack(props?: { children?: React.ReactNode; screenOptions?: Record<string, unknown> }): JSX.Element;
  export function Tabs(props?: { children?: React.ReactNode; screenOptions?: Record<string, unknown> }): JSX.Element;
  export namespace Stack {
    function Screen(props: { name?: string; options?: Record<string, unknown> }): JSX.Element;
  }
  export namespace Tabs {
    function Screen(props: { name?: string; options?: Record<string, unknown> }): JSX.Element;
  }
}

declare module 'expo-document-picker' {
  export interface DocumentPickerResult {
    canceled: boolean;
    assets?: Array<{
      uri: string;
      name: string;
      mimeType?: string;
      size?: number;
    }>;
  }
  export function getDocumentAsync(options?: {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }): Promise<DocumentPickerResult>;
}

declare module 'expo-image-picker' {
  export interface ImagePickerResult {
    canceled: boolean;
    assets?: Array<{
      uri: string;
      width: number;
      height: number;
      type?: string;
      fileName?: string;
    }>;
  }
  export function launchImageLibraryAsync(options?: {
    mediaTypes?: string;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: Record<string, unknown>): Promise<ImagePickerResult>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  export function requestCameraPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  export const MediaTypeOptions: { All: string; Images: string; Videos: string };
}

declare module 'expo-file-system' {
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;
  export function readAsStringAsync(uri: string, options?: { encoding?: string }): Promise<string>;
  export function writeAsStringAsync(uri: string, contents: string, options?: { encoding?: string }): Promise<void>;
  export function deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  export function getInfoAsync(uri: string): Promise<{ exists: boolean; isDirectory: boolean; size?: number; uri: string }>;
  export function downloadAsync(uri: string, fileUri: string): Promise<{ uri: string; status: number }>;
  export const EncodingType: { Base64: string; UTF8: string };
}

declare module 'expo-av' {
  export interface PlaybackStatus {
    isLoaded: boolean;
    isPlaying?: boolean;
    didJustFinish?: boolean;
    durationMillis?: number;
    positionMillis?: number;
    [key: string]: unknown;
  }

  export interface SoundObject {
    playAsync(): Promise<void>;
    pauseAsync(): Promise<void>;
    stopAsync(): Promise<void>;
    unloadAsync(): Promise<void>;
    setOnPlaybackStatusUpdate(callback: (status: PlaybackStatus) => void): void;
    getStatusAsync(): Promise<PlaybackStatus>;
  }

  export class RecordingClass {
    prepareToRecordAsync(options?: Record<string, unknown>): Promise<void>;
    startAsync(): Promise<void>;
    stopAndUnloadAsync(): Promise<void>;
    getURI(): string | null;
  }

  export namespace Audio {
    class Sound {
      playAsync(): Promise<void>;
      pauseAsync(): Promise<void>;
      stopAsync(): Promise<void>;
      unloadAsync(): Promise<void>;
      setOnPlaybackStatusUpdate(callback: (status: PlaybackStatus) => void): void;
      getStatusAsync(): Promise<PlaybackStatus>;
      static createAsync(
        source: { uri: string } | number,
        initialStatus?: Record<string, unknown>,
        onPlaybackStatusUpdate?: (status: PlaybackStatus) => void,
      ): Promise<{ sound: Sound; status: PlaybackStatus }>;
    }
    class Recording {
      prepareToRecordAsync(options?: Record<string, unknown>): Promise<void>;
      startAsync(): Promise<void>;
      stopAndUnloadAsync(): Promise<void>;
      getURI(): string | null;
      static RECORDING_OPTIONS_PRESET_HIGH_QUALITY: Record<string, unknown>;
    }
    function setAudioModeAsync(mode: Record<string, unknown>): Promise<void>;
    function requestPermissionsAsync(): Promise<{ status: string }>;
    const AndroidOutputFormat: Record<string, unknown>;
    const AndroidAudioEncoder: Record<string, unknown>;
    const IOSOutputFormat: Record<string, unknown>;
    const IOSAudioQuality: Record<string, unknown>;
  }
}

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type: string;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    details: Record<string, unknown> | null;
  }
  export function addEventListener(handler: (state: NetInfoState) => void): () => void;
  export function fetch(): Promise<NetInfoState>;
  export function useNetInfo(): NetInfoState;
  const NetInfo: {
    addEventListener: typeof addEventListener;
    fetch: typeof fetch;
  };
  export default NetInfo;
}
