import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import { AuthProvider } from '../context/AuthContext';

const mockAuthAPI = {
  login: vi.fn(),
  me: vi.fn().mockRejectedValue(new Error('not init')),
  guestToken: vi.fn(),
  logout: vi.fn().mockResolvedValue({}),
  forgotPassword: vi.fn(),
};
vi.mock('../api', () => ({
  get authAPI() { return mockAuthAPI; },
}));
vi.mock('../components/Logo', () => ({ default: () => <div className="logo-mock" /> }));

function renderFP() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <AuthProvider>
        <ForgotPasswordPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('renders the heading', () => {
    renderFP();
    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
  });

  it('renders the email input', () => {
    renderFP();
    expect(screen.getByPlaceholderText('your.clinical.email@hospital.com')).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderFP();
    expect(screen.getByRole('button', { name: /Send Reset Link/ })).toBeInTheDocument();
  });

  it('disables button when email is empty', () => {
    renderFP();
    expect(screen.getByRole('button', { name: /Send Reset Link/ })).toBeDisabled();
  });

  it('enables button when email is filled', () => {
    renderFP();
    fireEvent.change(screen.getByPlaceholderText('your.clinical.email@hospital.com'), { target: { value: 'test@test.com' } });
    expect(screen.getByRole('button', { name: /Send Reset Link/ })).not.toBeDisabled();
  });

  it('calls forgotPassword on submit', async () => {
    mockAuthAPI.forgotPassword.mockResolvedValue({ message: 'sent' });
    renderFP();
    fireEvent.change(screen.getByPlaceholderText('your.clinical.email@hospital.com'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/ }));
    await waitFor(() => {
      expect(mockAuthAPI.forgotPassword).toHaveBeenCalledWith('test@test.com');
    });
  });

  it('shows success message after sending', async () => {
    mockAuthAPI.forgotPassword.mockResolvedValue({ message: 'sent' });
    renderFP();
    fireEvent.change(screen.getByPlaceholderText('your.clinical.email@hospital.com'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/ }));
    expect(await screen.findByText(/Check your email/)).toBeInTheDocument();
  });

  it('shows error on failure', async () => {
    mockAuthAPI.forgotPassword.mockRejectedValue(new Error('Network error'));
    renderFP();
    fireEvent.change(screen.getByPlaceholderText('your.clinical.email@hospital.com'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/ }));
    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
  });

  it('has back to sign in link', () => {
    renderFP();
    expect(screen.getByText(/Back to Sign In/)).toBeInTheDocument();
  });
});
