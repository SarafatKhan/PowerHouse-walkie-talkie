import { useRef, useCallback } from 'react';
import { audioManager } from '../utils/audio';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

type SendSignalFn = (type: string, data: any, targetUserId?: string) => void;

export function useWebRTC(sendSignal: SendSignalFn) {
  // Map of target_user_id -> RTCPeerConnection (when broadcasting audio as speaker)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // RTCPeerConnection when receiving audio from current speaker
  const receivingPcRef = useRef<RTCPeerConnection | null>(null);

  // Queued ICE candidates if received before remote description
  const queuedCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  /**
   * Called when server grants speak lock to broadcast microphone audio to peers.
   * Reuses the existing microphone stream without prompting the user again.
   */
  const startBroadcasting = useCallback(async (peers: string[]) => {
    try {
      // 1. Acquire or reuse existing microphone stream
      const stream = await audioManager.acquireMicrophone();
      audioManager.playPttStartBeep();

      // 2. Establish 1-way WebRTC audio connection to all other connected peers
      for (const peerId of peers) {
        try {
          const pc = new RTCPeerConnection(RTC_CONFIG);

          // Add live audio track to peer connection
          stream.getAudioTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          // Route ICE candidates to this specific peer
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              sendSignal('ice_candidate', { candidate: event.candidate.toJSON() }, peerId);
            }
          };

          // Create Offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          peerConnectionsRef.current.set(peerId, pc);

          // Send offer to peer through WebSocket signaling
          sendSignal('webrtc_offer', { sdp: offer.sdp }, peerId);
        } catch (peerErr) {
          console.error(`Error negotiating WebRTC offer for peer ${peerId}:`, peerErr);
        }
      }

      return stream;
    } catch (err) {
      console.error('Failed to access microphone or broadcast WebRTC stream:', err);
      throw err;
    }
  }, [sendSignal]);

  /**
   * Called when user releases PTT. Mutes mic track and tears down WebRTC peer connections.
   * Keeps permission and stream object intact so next press doesn't re-prompt!
   */
  const stopBroadcasting = useCallback(() => {
    // 1. Mute microphone track rather than destroying it to avoid re-prompting
    audioManager.muteMicrophone();

    // 2. Close outgoing peer connections
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {
        // Ignore
      }
    });
    peerConnectionsRef.current.clear();
    queuedCandidatesRef.current.clear();

    // 3. Play radio release roger beep
    audioManager.playPttEndBeep();
  }, []);

  /**
   * Called when a listener receives an incoming WebRTC audio offer from the active speaker.
   */
  const handleIncomingOffer = useCallback(async (fromUserId: string, sdp: string) => {
    try {
      // Ensure audio context is unlocked
      await audioManager.unlockAudio();

      // Close any previous receiving connection
      if (receivingPcRef.current) {
        receivingPcRef.current.close();
        receivingPcRef.current = null;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      receivingPcRef.current = pc;

      // Handle receiving audio track
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          audioManager.playIncomingStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('ice_candidate', { candidate: event.candidate.toJSON() }, fromUserId);
        }
      };

      // Set remote offer description
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));

      // Process any queued candidates for this peer
      const queued = queuedCandidatesRef.current.get(fromUserId) || [];
      for (const cand of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
      queuedCandidatesRef.current.delete(fromUserId);

      // Create and send answer back to speaker
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal('webrtc_answer', { sdp: answer.sdp }, fromUserId);
    } catch (err) {
      console.error('Error handling incoming WebRTC offer:', err);
    }
  }, [sendSignal]);

  /**
   * Called on speaker side when a listener sends back their WebRTC answer.
   */
  const handleIncomingAnswer = useCallback(async (fromUserId: string, sdp: string) => {
    try {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc) {
        return;
      }

      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));

        const queued = queuedCandidatesRef.current.get(fromUserId) || [];
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        queuedCandidatesRef.current.delete(fromUserId);
      }
    } catch (err) {
      console.error(`Error handling WebRTC answer from ${fromUserId}:`, err);
    }
  }, []);

  /**
   * Called on either side when receiving an ICE candidate.
   */
  const handleIncomingCandidate = useCallback(async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    try {
      if (receivingPcRef.current) {
        if (receivingPcRef.current.remoteDescription) {
          await receivingPcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          const list = queuedCandidatesRef.current.get(fromUserId) || [];
          list.push(candidate);
          queuedCandidatesRef.current.set(fromUserId, list);
        }
        return;
      }

      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          const list = queuedCandidatesRef.current.get(fromUserId) || [];
          list.push(candidate);
          queuedCandidatesRef.current.set(fromUserId, list);
        }
      }
    } catch (err) {
      console.warn('Error adding ICE candidate:', err);
    }
  }, []);

  /**
   * Called when speaker stops speaking or disconnects.
   */
  const stopListening = useCallback(() => {
    if (receivingPcRef.current) {
      receivingPcRef.current.close();
      receivingPcRef.current = null;
    }
    audioManager.stopIncomingStream();
    audioManager.playPttEndBeep();
  }, []);

  return {
    startBroadcasting,
    stopBroadcasting,
    handleIncomingOffer,
    handleIncomingAnswer,
    handleIncomingCandidate,
    stopListening,
  };
}
