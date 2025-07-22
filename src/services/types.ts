export interface VoiceCommandCallbacks {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onTranscriptionUpdate?: (text: string) => void;
  onCommandResult?: (result: VoiceCommandResult) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onAudioPause?: () => void;
  onAudioResume?: () => void;
  onAudioProgress?: (currentTime: number, duration: number) => void;
  onError?: (error: string) => void;
}

export interface TranscriptionResult {
  success: boolean;
  transcription: string;
  error?: string;
}

export interface CommandProcessResult {
  success: boolean;
  result: VoiceCommandResult;
  error?: string;
}

export interface VoiceCommandResult {
  action: string;
  data?: unknown;
  confidence?: number;
  confirmation?: string;
  message?: string;
  response?: string;
}

export interface SpeechSynthesisResult {
  success: boolean;
  audioData?: string;
  error?: string;
}

export interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  transcription: string;
  result: VoiceCommandResult | null;
  error: string | null;
}

export interface SilenceDetectionConfig {
  silenceThreshold: number;
  silenceDuration: number;
  sampleRate: number;
}

export interface AudioConfig {
  autoPlay?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
  preferWebSpeech?: boolean;
}

export interface AudioState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
} 