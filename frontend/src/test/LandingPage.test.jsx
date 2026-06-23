import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import { AuthProvider } from '../context/AuthContext';

const mockAuthAPI = {
  login: vi.fn(),
  me: vi.fn().mockRejectedValue(new Error('not init')),
  guestToken: vi.fn(),
  logout: vi.fn().mockResolvedValue({}),
  enterGuestMode: vi.fn(),
};
vi.mock('../api', () => ({
  get authAPI() { return mockAuthAPI; },
}));

vi.mock('../components/LiveWallpaper', () => ({ default: () => <div /> }));
vi.mock('../components/CursorTrail', () => ({ default: () => <div /> }));
vi.mock('../components/Confetti', () => ({ default: () => <div /> }));
vi.mock('../components/Logo', () => ({ default: () => <div className="logo-mock" /> }));
vi.mock('../components/SupportModal', () => ({ default: () => <div data-testid="support-modal" /> }));
vi.mock('../components/Typewriter', () => ({ default: ({ words }) => <span>{words[0]}</span> }));
vi.mock('../components/RadialOrbitalTimeline', () => ({ default: () => <div />, Icons: {} }));
vi.mock('../components/ScrollReveal', () => ({
  ScrollReveal: ({ children }) => <div>{children}</div>,
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock('../components/GlassCard', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../components/GlowCard', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../components/RippleButton', ({ children, onClick, ...props }) => {
  return { default: ({ children, onClick, ...props }) => <button onClick={onClick}>{children}</button> };
});

function renderLanding() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LandingPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LandingPage', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('renders the hero title', () => {
    renderLanding();
    expect(screen.getByText('The Future of')).toBeInTheDocument();
  });

  it('renders the badge text', () => {
    renderLanding();
    expect(screen.getByText('Multi-Agent Clinical AI')).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    renderLanding();
    expect(screen.getByText('Multi-Agent AI')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Streaming')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Security')).toBeInTheDocument();
    expect(screen.getByText('Clinical Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Diagnostic Insights')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders How It Works steps', () => {
    renderLanding();
    expect(screen.getByText('Submit Case')).toBeInTheDocument();
    expect(screen.getByText('AI Conference')).toBeInTheDocument();
    expect(screen.getByText('Get Report')).toBeInTheDocument();
  });

  it('renders agent names', () => {
    renderLanding();
    expect(screen.getByText('Intake')).toBeInTheDocument();
    expect(screen.getByText('Cardiologist')).toBeInTheDocument();
    expect(screen.getByText('Neurologist')).toBeInTheDocument();
  });

  it('renders the CTA section', () => {
    renderLanding();
    expect(screen.getByText('Ready to Transform Clinical Reasoning?')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderLanding();
    expect(screen.getByRole('link', { name: 'Features' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How It Works' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AI Agents' })).toBeInTheDocument();
  });

  it('renders the SupportModal', () => {
    renderLanding();
    expect(screen.getByTestId('support-modal')).toBeInTheDocument();
  });

  it('renders floating stats', () => {
    renderLanding();
    expect(screen.getByText('500+')).toBeInTheDocument();
    expect(screen.getByText('10,000+')).toBeInTheDocument();
    expect(screen.getByText('94%')).toBeInTheDocument();
  });

  it('renders the footer', () => {
    renderLanding();
    expect(screen.getByText('© 2026 Healtheon. Clinical AI Platform.')).toBeInTheDocument();
  });

  it('opens the Get Started modal', async () => {
    renderLanding();
    fireEvent.click(screen.getAllByText('Get Started')[0]);
    expect(await screen.findByText('Welcome to Healtheon')).toBeInTheDocument();
  });

  it('shows Free Access option in modal', async () => {
    renderLanding();
    fireEvent.click(screen.getAllByText('Get Started')[0]);
    expect(await screen.findByText('Free Access')).toBeInTheDocument();
  });
});
