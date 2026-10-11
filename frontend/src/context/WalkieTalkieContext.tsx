import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type { ConnectionStatus, PTTButtonState, SpeakerInfo, User } from '../types';
import { useWebRTC } from '../hooks/useWebRTC';
import { audioManager } from '../utils/audio';

interface WalkieTalkieContextType {
  connectionStatus: ConnectionStatus;
  pttState: PTTButtonState;
  currentSpeaker: SpeakerInfo | null;
  busyReason: string | null;
  onlineCount: number;
  onlineUsers: User[];
  isChannelClear: boolean;
  isAudioUnlocked: boolean;
  unlockAudio: () => Promise<void>;
  requestTalk: () => Promise<void>;
  releaseTalk: () => void;
}

const WalkieTalkieContext = createContext<WalkieTalkieContextType | undefined>(undefined);

export const WalkieTalkieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [pttState, setPttState] = useState<PTTButtonState>('idle');
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerInfo | null>(null);
  const [busyReason, setBusyReason] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const isHoldingButtonRef = useRef<boolean>(false);

  // Send message through WebSocket
  const sendSignal = useCallback((type: string, data: any, targetUserId?: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type,
          data,
          target_user_id: targetUserId,
        })
      );
    }
  }, []);

  const {
    startBroadcasting,
    stopBroadcasting,
    handleIncomingOffer,
    handleIncomingAnswer,
    handleIncomingCandidate,
    stopListening,
  } = useWebRTC(sendSignal);

  // Unlock browser audio context
  const unlockAudio = useCallback(async () => {
    const success = await audioManager.unlockAudio();
    if (success) {
      setIsAudioUnlocked(true);
    }
  }, []);

  // Set up WebSocket connection whenever authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setConnectionStatus('disconnected');
      return;
    }

    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      setConnectionStatus((prev) => (prev === 'connected' ? 'reconnecting' : 'connecting'));

      // Determine WS URL from environment or current host
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const wsProtocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:';
      const host = backendUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${host}/ws?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) return;
        setConnectionStatus('connected');
        console.log('Connected to Global Walkie-Talkie channel');
      };

      ws.onmessage = async (event) => {
        if (isUnmounted) return;
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type;
          const data = msg.data || {};

          switch (type) {
            case 'channel_state': {
              setOnlineCount(data.online_count || 1);
              setOnlineUsers(data.users || []);
              if (data.current_speaker) {
                setCurrentSpeaker(data.current_speaker);
                if (data.current_speaker.user_id !== user?.user_id) {
                  setPttState('busy');
                }
              } else {
                setCurrentSpeaker(null);
                if (!isHoldingButtonRef.current) {
                  setPttState('idle');
                }
              }
              break;
            }

            case 'presence_update': {
              setOnlineCount(data.online_count || 1);
              setOnlineUsers(data.users || []);
              break;
            }

            case 'speak_granted': {
              // Server approved speaker lock!
              setPttState('speaking');
              setBusyReason(null);
              setCurrentSpeaker({
                user_id: user!.user_id,
                name: user!.name,
                started_at: new Date().toISOString(),
              });

              try {
                const peers = data.peers || [];
                await startBroadcasting(peers);
              } catch (micErr: any) {
                console.error('Microphone error on speak granted:', micErr);
                setPttState('mic_required');
                setBusyReason('Microphone access is required to speak.');
                // Release lock since mic failed
                sendSignal('release_speak', {});
              }
              break;
            }

            case 'speak_denied': {
              // Server rejected speaker lock because channel is busy or rate limited
              setPttState('busy');
              setBusyReason(data.reason || `${data.current_speaker || 'Another user'} is speaking.`);
              break;
            }

            case 'speaker_started': {
              const speaker: SpeakerInfo = {
                user_id: data.speaker_id,
                name: data.speaker_name,
                started_at: data.started_at,
              };
              setCurrentSpeaker(speaker);
              if (data.speaker_id !== user?.user_id) {
                setPttState('busy');
                setBusyReason(`${speaker.name} is currently speaking.`);
              }
              break;
            }

            case 'speaker_stopped': {
              stopListening();
              setCurrentSpeaker(null);
              setBusyReason(null);
              if (!isHoldingButtonRef.current) {
                setPttState('idle');
              }
              break;
            }

            case 'webrtc_offer': {
              // Incoming audio offer from active speaker
              if (msg.from_user_id && data.sdp) {
                await handleIncomingOffer(msg.from_user_id, data.sdp);
              }
              break;
            }

            case 'webrtc_answer': {
              // Incoming answer from a listening peer
              if (msg.from_user_id && data.sdp) {
                await handleIncomingAnswer(msg.from_user_id, data.sdp);
              }
              break;
            }

            case 'ice_candidate': {
              if (msg.from_user_id && data.candidate) {
                await handleIncomingCandidate(msg.from_user_id, data.candidate);
              }
              break;
            }

            default:
              break;
          }
        } catch (parseErr) {
          console.error('Error handling WebSocket message:', parseErr);
        }
      };

      ws.onclose = () => {
        if (isUnmounted) return;
        setConnectionStatus('disconnected');
        setCurrentSpeaker(null);
        setPttState('idle');
        stopBroadcasting();
        stopListening();

        // Attempt automatic reconnection in 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket encountered an error:', err);
      };
    };

    connectWebSocket();

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);

    return () => {
      isUnmounted = true;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      stopBroadcasting();
      stopListening();
    };
  }, [
    isAuthenticated,
    token,
    user?.user_id,
    user?.name,
    startBroadcasting,
    stopBroadcasting,
    stopListening,
    handleIncomingOffer,
    handleIncomingAnswer,
    handleIncomingCandidate,
    sendSignal,
  ]);

  // Request to speak (Hold down PTT)
  const requestTalk = useCallback(async () => {
    // Check if channel is already occupied by someone else
    if (currentSpeaker && currentSpeaker.user_id !== user?.user_id) {
      setPttState('busy');
      setBusyReason(`${currentSpeaker.name} is currently speaking. Please wait.`);
      return;
    }

    isHoldingButtonRef.current = true;
    setPttState('connecting');

    // Make sure audio context is unlocked
    await unlockAudio();

    // Request speaker lock from server
    sendSignal('request_speak', {});
  }, [currentSpeaker, user?.user_id, unlockAudio, sendSignal]);

  // Release speak (Release PTT button)
  const releaseTalk = useCallback(() => {
    isHoldingButtonRef.current = false;

    if (pttState === 'speaking' || pttState === 'connecting') {
      stopBroadcasting();
      sendSignal('release_speak', {});
      setPttState('idle');
    } else if (pttState === 'busy') {
      // If was temporarily busy, keep busy state if someone else is still speaking
      if (!currentSpeaker) {
        setPttState('idle');
        setBusyReason(null);
      }
    }
  }, [pttState, currentSpeaker, stopBroadcasting, sendSignal]);

  return (
    <WalkieTalkieContext.Provider
      value={{
        connectionStatus,
        pttState,
        currentSpeaker,
        busyReason,
        onlineCount,
        onlineUsers,
        isChannelClear: currentSpeaker === null,
        isAudioUnlocked,
        unlockAudio,
        requestTalk,
        releaseTalk,
      }}
    >
      {children}
    </WalkieTalkieContext.Provider>
  );
};

export const useWalkieTalkie = (): WalkieTalkieContextType => {
  const context = useContext(WalkieTalkieContext);
  if (!context) {
    throw new Error('useWalkieTalkie must be used within a WalkieTalkieProvider');
  }
  return context;
};
