export interface User {
  id: number;
  user_id: string;
  name: string;
  email: string;
  profile_picture?: string | null;
  created_at?: string;
  updated_at?: string;
  last_seen?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export type PTTButtonState = 
  | 'idle'                // Ready to talk
  | 'connecting'          // Requesting speak lock from server
  | 'speaking'            // Holding channel, broadcasting audio
  | 'busy'                // Someone else is speaking
  | 'mic_required';       // Microphone permission needed / blocked

export interface SpeakerInfo {
  user_id: string;
  name: string;
  started_at?: string | null;
}

export interface ChannelState {
  onlineCount: number;
  users: User[];
  currentSpeaker: SpeakerInfo | null;
  isChannelClear: boolean;
}

export interface SignalingOfferPayload {
  sdp: string;
}

export interface SignalingAnswerPayload {
  sdp: string;
}

export interface SignalingCandidatePayload {
  candidate: RTCIceCandidateInit;
}
