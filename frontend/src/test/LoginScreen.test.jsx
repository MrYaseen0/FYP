import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginScreen from '../pages/LoginScreen';
import { AuthProvider } from '../context/AuthContext';

const mockAuthAPI = {
  login: vi.fn(),
  me: vi.fn().mockRejectedValue(new Error('not init')),
  guestToken: vi.fn(),
  logout: vi.fn().mockResolvedValue({}),
};
vi.mock('../api', () => ({
  get authAPI() { return mockAuthAPI; },
}));

vi.mock('../components/LiveWallpaper', () => ({ default: () => <div /> }));
vi.mock('../components/Logo', () => ({ default: () => <div className="logo-mock" /> }));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LoginScreen', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('renders the sign in heading', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('renders the email input', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('your.clinical.email@hospital.com')).toBeInTheDocument();
  });

  it('renders the password input', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('renders the Remember me checkbox', () => {
    renderLogin();
    expect(screen.getByText('Remember me for 30 days')).toBeInTheDocument();
  });

  it('renders the Forgot password link', () => {
    renderLogin();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('renders the Register link', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  });

  it('disables the submit button when fields are empty', () => {
    renderLogin();
    const btn = screen.getByRole('button', { name: /Sign In/ });
    expect(btn).toBeDisabled();
  });

  it('enables submit when both fields are filled', () => {
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('your.clinical.email@hospital.com'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
    const btn = screen.getByRole('button', { name: /Sign In/ });
    expect(btn).not.toBeDisabled();
  });

  it('toggles password visibility', () => {
    renderLogin();
    const input = screen.getByPlaceholderText('••••••••');
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByText('👁'));
    expect(input.type).toBe('text');
  });

  it('shows About Us link', () => {
    renderLogin();
    expect(screen.getByText('About Us')).toBeInTheDocument();
  });

  it('shows security notice', () => {
    renderLogin();
    expect(screen.getByText(/JWT-authenticated/)).toBeInTheDocument();
  });

  it('calls login and navigates on success', async () => {
    mockAuthAPI.login.mockResolvedValue({ success: true, access_token: 'tok', user: { id: 1, role: 'user' } });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('your.clinical.email@hospital.com'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/ }));
    await waitFor(() => {
      expect(mockAuthAPI.login).toHaveBeenCalledWith('a@b.com', 'pass123');
    });
  });

  it('shows error on login failure', async () => {
    mockAuthAPI.login.mockImplementation(() => { throw new Error('Invalid credentials'); });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('your.clinical.email@hospital.com'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/ }));
    await waitFor(() => {
      expect(screen.queryByText('Invalid credentials')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
