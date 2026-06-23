import { vi } from 'vitest';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    MemoryRouter: actual.MemoryRouter,
  };
});

// Mock context API calls
vi.mock('../api', () => ({
  authAPI: {
    login: vi.fn(),
    me: vi.fn(),
    guestToken: vi.fn(),
    logout: vi.fn(),
  },
  messagesAPI: {
    getConversations: vi.fn().mockResolvedValue({ conversations: [] }),
  },
  notificationsAPI: {
    getAll: vi.fn().mockResolvedValue({ notifications: [] }),
  },
}));
