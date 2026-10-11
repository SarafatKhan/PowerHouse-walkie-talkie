import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// ==========================================================
// 1. PTT Button State Tests
// ==========================================================
import { PushToTalkButton } from '../components/PushToTalkButton';

describe('PushToTalkButton', () => {
  const noop = () => {};

  it('renders HOLD TO TALK in idle state', () => {
    render(<PushToTalkButton state="idle" onRequestTalk={noop} onReleaseTalk={noop} />);
    expect(screen.getByText('HOLD TO TALK')).toBeTruthy();
  });

  it('renders RELEASE TO STOP when speaking', () => {
    render(<PushToTalkButton state="speaking" onRequestTalk={noop} onReleaseTalk={noop} />);
    expect(screen.getByText('RELEASE TO STOP')).toBeTruthy();
  });

  it('renders CHANNEL BUSY when busy', () => {
    render(<PushToTalkButton state="busy" onRequestTalk={noop} onReleaseTalk={noop} />);
    expect(screen.getByText('CHANNEL BUSY')).toBeTruthy();
  });

  it('renders CONNECTING... when requesting lock', () => {
    render(<PushToTalkButton state="connecting" onRequestTalk={noop} onReleaseTalk={noop} />);
    expect(screen.getByText('CONNECTING...')).toBeTruthy();
  });

  it('renders MIC REQUIRED when microphone unavailable', () => {
    render(<PushToTalkButton state="mic_required" onRequestTalk={noop} onReleaseTalk={noop} />);
    expect(screen.getByText('MIC REQUIRED')).toBeTruthy();
  });

  it('has aria-label on the button', () => {
    render(<PushToTalkButton state="idle" onRequestTalk={noop} onReleaseTalk={noop} />);
    expect(screen.getByRole('button', { name: /hold to talk/i })).toBeTruthy();
  });
});

// ==========================================================
// 2. Connection Badge State Tests
// ==========================================================
import { ConnectionBadge } from '../components/ConnectionBadge';

describe('ConnectionBadge', () => {
  it('shows CONNECTED', () => {
    render(<ConnectionBadge status="connected" />);
    expect(screen.getByText('CONNECTED')).toBeTruthy();
  });

  it('shows OFFLINE when disconnected', () => {
    render(<ConnectionBadge status="disconnected" />);
    expect(screen.getByText('OFFLINE')).toBeTruthy();
  });

  it('shows RECONNECTING... when reconnecting', () => {
    render(<ConnectionBadge status="reconnecting" />);
    expect(screen.getByText('RECONNECTING...')).toBeTruthy();
  });

  it('shows CONNECTING... when connecting', () => {
    render(<ConnectionBadge status="connecting" />);
    expect(screen.getByText('CONNECTING...')).toBeTruthy();
  });
});

// ==========================================================
// 3. CurrentSpeaker Display Tests
// ==========================================================
import { CurrentSpeaker } from '../components/CurrentSpeaker';

describe('CurrentSpeaker', () => {
  it('shows CHANNEL CLEAR when no speaker', () => {
    render(
      <CurrentSpeaker
        currentSpeaker={null}
        currentUserId="USR_TEST1"
        busyReason={null}
      />
    );
    expect(screen.getByText('CHANNEL CLEAR')).toBeTruthy();
  });

  it('shows speaker name when someone else is speaking', () => {
    render(
      <CurrentSpeaker
        currentSpeaker={{ user_id: 'USR_RAHUL', name: 'Rahul' }}
        currentUserId="USR_SARAFAT"
        busyReason="Rahul is currently speaking."
      />
    );
    expect(screen.getByText('RAHUL IS SPEAKING')).toBeTruthy();
    expect(screen.getByText('Channel Busy')).toBeTruthy();
  });

  it('shows YOU ARE SPEAKING when current user is the speaker', () => {
    render(
      <CurrentSpeaker
        currentSpeaker={{ user_id: 'USR_SARAFAT', name: 'Sarafat' }}
        currentUserId="USR_SARAFAT"
        busyReason={null}
      />
    );
    expect(screen.getByText('YOU ARE SPEAKING')).toBeTruthy();
  });
});

// ==========================================================
// 4. AudioVisualizer Tests
// ==========================================================
import { AudioVisualizer } from '../components/AudioVisualizer';

describe('AudioVisualizer', () => {
  it('renders the correct number of bars', () => {
    const { container } = render(<AudioVisualizer isActive={false} bars={12} />);
    const bars = container.querySelectorAll('span');
    expect(bars.length).toBe(12);
  });

  it('renders with default bar count of 16', () => {
    const { container } = render(<AudioVisualizer isActive={true} />);
    const bars = container.querySelectorAll('span');
    expect(bars.length).toBe(16);
  });
});

// ==========================================================
// 5. OnlineUserCount Tests
// ==========================================================
import { OnlineUserCount } from '../components/OnlineUserCount';

describe('OnlineUserCount', () => {
  const mockUsers = [
    { id: 1, user_id: 'USR_A', name: 'Alice', email: 'a@test.com' },
    { id: 2, user_id: 'USR_B', name: 'Bob', email: 'b@test.com' },
  ];

  it('shows user count text', () => {
    render(<OnlineUserCount count={8} users={mockUsers} currentUserId="USR_A" />);
    expect(screen.getByText(/8/)).toBeTruthy();
    expect(screen.getByText(/USERS ONLINE/)).toBeTruthy();
  });

  it('shows singular for 1 user', () => {
    render(<OnlineUserCount count={1} users={mockUsers.slice(0, 1)} currentUserId="USR_A" />);
    expect(screen.getByText(/USER ONLINE/)).toBeTruthy();
  });
});

// ==========================================================
// 6. DownloadAppModal Tests
// ==========================================================
import { DownloadAppModal } from '../components/DownloadAppModal';

describe('DownloadAppModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <DownloadAppModal isOpen={false} onClose={() => {}} isInstallable={true} onNativeInstall={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders download instructions when open', () => {
    render(
      <DownloadAppModal isOpen={true} onClose={() => {}} isInstallable={false} onNativeInstall={() => {}} />
    );
    expect(screen.getByText('Download Power House')).toBeTruthy();
    expect(screen.getByText(/Android/i)).toBeTruthy();
    expect(screen.getByText(/iPhone/i)).toBeTruthy();
  });

  it('shows native install button when installable', () => {
    render(
      <DownloadAppModal isOpen={true} onClose={() => {}} isInstallable={true} onNativeInstall={() => {}} />
    );
    expect(screen.getByText('Install to Home Screen Now')).toBeTruthy();
  });
});
