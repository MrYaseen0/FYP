import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { AuthProvider } from '../context/AuthContext';

const mockAuthAPI = {
  login: vi.fn(),
  me: vi.fn(),
  guestToken: vi.fn(),
  logout: vi.fn().mockResolvedValue({}),
};

vi.mock('../api', () => ({
  get authAPI() { return mockAuthAPI; },
  messagesAPI: { getConversations: vi.fn().mockResolvedValue({ conversations: [] }) },
  notificationsAPI: { getAll: vi.fn().mockResolvedValue({ notifications: [] }) },
}));

vi.mock('../components/SupportModal', () => ({
  default: () => <div data-testid="support-modal">SupportModal</div>,
}));

function renderWithAuth(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the Dashboard tab', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not init'));
    renderWithAuth(<Navbar />);
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the user name when authenticated', async () => {
    localStorage.setItem('ht_token', 'valid-token');
    mockAuthAPI.me.mockResolvedValue({ id: 'usr_1', username: 'testuser', role: 'user', full_name: 'Test User', avatar: 'TU' });
    renderWithAuth(<Navbar />);
    expect(await screen.findByText('Test User')).toBeInTheDocument();
  });

  it('renders the user avatar when authenticated', async () => {
    localStorage.setItem('ht_token', 'valid-token');
    mockAuthAPI.me.mockResolvedValue({ id: 'usr_1', username: 'testuser', role: 'user', full_name: 'Test User', avatar: 'TU' });
    renderWithAuth(<Navbar />);
    expect(await screen.findByText('TU')).toBeInTheDocument();
  });

  it('shows System Online status', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not init'));
    renderWithAuth(<Navbar />);
    expect(await screen.findByText('System Online')).toBeInTheDocument();
  });

  it('shows the About Us button for non-admin users', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not init'));
    renderWithAuth(<Navbar />);
    expect(await screen.findByText('About Us')).toBeInTheDocument();
  });

  it('renders the SupportModal', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not init'));
    renderWithAuth(<Navbar />);
    expect(await screen.findByTestId('support-modal')).toBeInTheDocument();
  });

  it('renders the Logo component', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not init'));
    const { container } = renderWithAuth(<Navbar />);
    expect(container.querySelector('.healtheon-logo')).toBeInTheDocument();
  });

  it('shows case breadcrumb for /cases/ routes', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not init'));
    renderWithAuth(<Navbar />, { route: '/cases/abc123' });
    expect(await screen.findByText(/Case ABC123/)).toBeInTheDocument();
  });
});
