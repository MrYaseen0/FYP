import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import { AuthProvider } from '../context/AuthContext';

const mockAuthAPI = {
  login: vi.fn(),
  me: vi.fn().mockRejectedValue(new Error('not init')),
  guestToken: vi.fn(),
  logout: vi.fn().mockResolvedValue({}),
  resetPassword: vi.fn(),
};
vi.mock('../api', () => ({
  get authAPI() { return mockAuthAPI; },
}));
vi.mock('../components/Logo', () => ({ default: () => <div className="logo-mock" /> }));

function renderRP(token = 'valid-token') {
  const entries = token ? [`/reset-password?token=${token}`] : ['/reset-password'];
  return render(
    <MemoryRouter initialEntries={entries}>
      <AuthProvider>
        <ResetPasswordPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('renders the heading with token', () => {
    renderRP();
    expect(screen.getByRole('heading', { name: 'Create New Password' })).toBeInTheDocument();
  });

  it('shows error when no token', () => {
    renderRP(null);
    expect(screen.getByText(/No reset token found/)).toBeInTheDocument();
  });

  it('renders the new password input', () => {
    renderRP();
    expect(screen.getByPlaceholderText('Enter new password')).toBeInTheDocument();
  });

  it('renders the confirm password input', () => {
    renderRP();
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderRP();
    expect(screen.getByRole('button', { name: /Reset Password/ })).toBeInTheDocument();
  });

  it('shows password strength indicator when typing', () => {
    renderRP();
    const input = screen.getByPlaceholderText('Enter new password');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(screen.getByText(/Weak|Very Weak|Enter a password/)).toBeInTheDocument();
  });

  it('shows match indicator when passwords match', () => {
    renderRP();
    const pw = screen.getByPlaceholderText('Enter new password');
    const confirm = screen.getByPlaceholderText('Confirm new password');
    fireEvent.change(pw, { target: { value: 'StrongPass123!' } });
    fireEvent.change(confirm, { target: { value: 'StrongPass123!' } });
    const checks = screen.getAllByText('✓');
    expect(checks.length).toBeGreaterThanOrEqual(1);
  });

  it('calls resetPassword on valid submit', async () => {
    mockAuthAPI.resetPassword.mockResolvedValue({ message: 'success' });
    renderRP();
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'NewSecure123!' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'NewSecure123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/ }));
    await waitFor(() => {
      expect(mockAuthAPI.resetPassword).toHaveBeenCalledWith('valid-token', 'NewSecure123!');
    });
  });

  it('shows success message after reset', async () => {
    mockAuthAPI.resetPassword.mockResolvedValue({ message: 'success' });
    renderRP();
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'NewSecure123!' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'NewSecure123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/ }));
    expect(await screen.findByText(/Password Reset/)).toBeInTheDocument();
  });

  it('shows error on API failure', async () => {
    mockAuthAPI.resetPassword.mockRejectedValue({ response: { data: { detail: 'Invalid token' } } });
    renderRP();
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'NewSecure123!' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'NewSecure123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/ }));
    expect(await screen.findByText('Invalid token')).toBeInTheDocument();
  });

  it('has back to sign in link', () => {
    renderRP();
    expect(screen.getByText(/Back to Sign In/)).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderRP();
    const pw = screen.getByPlaceholderText('Enter new password');
    expect(pw.type).toBe('password');
    fireEvent.click(screen.getByText('👁'));
    expect(pw.type).toBe('text');
  });
});
