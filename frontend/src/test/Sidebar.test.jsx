import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { AuthProvider } from '../context/AuthContext';

const mockAuthAPI = {
  login: vi.fn(),
  me: vi.fn(),
  guestToken: vi.fn(),
  logout: vi.fn().mockResolvedValue({}),
};
const mockMessagesAPI = {
  getConversations: vi.fn().mockResolvedValue({ conversations: [] }),
};
const mockNotificationsAPI = {
  getAll: vi.fn().mockResolvedValue({ notifications: [] }),
};

vi.mock('../api', () => ({
  get authAPI() { return mockAuthAPI; },
  get messagesAPI() { return mockMessagesAPI; },
  get notificationsAPI() { return mockNotificationsAPI; },
}));

function renderWithAuth(ui, { route = '/', user = null } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the HEALTHEON brand', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not logged in'));
    renderWithAuth(<Sidebar />);
    expect(await screen.findByText('HEALTHEON')).toBeInTheDocument();
  });

  it('renders the version text', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not logged in'));
    renderWithAuth(<Sidebar />);
    expect(await screen.findByText(/V2\.1/)).toBeInTheDocument();
  });

  it('renders navigation items for user role when no auth', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not logged in'));
    renderWithAuth(<Sidebar />);
    // Default role is 'user' when no auth
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(await screen.findByText('New Case')).toBeInTheDocument();
    expect(await screen.findByText('My Appointments')).toBeInTheDocument();
  });

  it('renders user name when authenticated', async () => {
    localStorage.setItem('ht_token', 'valid-token');
    mockAuthAPI.me.mockResolvedValue({ id: 'usr_1', username: 'testuser', role: 'user', full_name: 'Test User' });
    renderWithAuth(<Sidebar />);
    expect(await screen.findByText('Test User')).toBeInTheDocument();
  });

  it('renders the logout button when authenticated', async () => {
    localStorage.setItem('ht_token', 'valid-token');
    mockAuthAPI.me.mockResolvedValue({ id: 'usr_1', username: 'testuser', role: 'user', full_name: 'Test User' });
    renderWithAuth(<Sidebar />);
    expect(await screen.findByTitle('Sign out')).toBeInTheDocument();
  });

  it('renders the System Status indicator', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not logged in'));
    renderWithAuth(<Sidebar />);
    expect(await screen.findByText('System Status')).toBeInTheDocument();
  });

  it('renders Settings in footer nav', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not logged in'));
    renderWithAuth(<Sidebar />);
    expect(await screen.findByText('Settings')).toBeInTheDocument();
  });

  it('renders Notifications in footer nav', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not logged in'));
    renderWithAuth(<Sidebar />);
    expect(await screen.findByText('Notifications')).toBeInTheDocument();
  });

  it('renders the Logo component', async () => {
    mockAuthAPI.me.mockRejectedValue(new Error('not logged in'));
    const { container } = renderWithAuth(<Sidebar />);
    expect(container.querySelector('.healtheon-logo')).toBeInTheDocument();
  });

  it('renders doctor nav items for doctor role', async () => {
    localStorage.setItem('ht_token', 'valid-token');
    mockAuthAPI.me.mockResolvedValue({ id: 'usr_1', username: 'doc', role: 'doctor', full_name: 'Dr. Test' });
    renderWithAuth(<Sidebar />);
    expect(await screen.findByText('My Patients')).toBeInTheDocument();
    expect(await screen.findByText('Patient Records')).toBeInTheDocument();
    expect(await screen.findByText('Clinical Notes')).toBeInTheDocument();
  });
});
