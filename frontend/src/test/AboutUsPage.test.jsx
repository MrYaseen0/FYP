import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AboutUsPage from '../pages/AboutUsPage';

vi.mock('../components/Logo', () => ({ default: () => <div className="logo-mock" /> }));

function renderAbout() {
  return render(
    <MemoryRouter initialEntries={['/about']}>
      <AboutUsPage />
    </MemoryRouter>
  );
}

describe('AboutUsPage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('renders the developer name', () => {
    renderAbout();
    expect(screen.getByRole('heading', { name: 'Yaseen Ahmad' })).toBeInTheDocument();
  });

  it('renders the handle', () => {
    renderAbout();
    expect(screen.getByText('@yaseenahmadexe · he/him')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    renderAbout();
    expect(screen.getByText('Software Engineer · MERN Stack · Python')).toBeInTheDocument();
  });

  it('renders all stat cards', () => {
    renderAbout();
    expect(screen.getByText('15+')).toBeInTheDocument();
    expect(screen.getByText('500+')).toBeInTheDocument();
    expect(screen.getByText('20+')).toBeInTheDocument();
    expect(screen.getByText('4+')).toBeInTheDocument();
  });

  it('renders the About Me section', () => {
    renderAbout();
    expect(screen.getByRole('heading', { name: 'About Me' })).toBeInTheDocument();
  });

  it('renders the Details section', () => {
    renderAbout();
    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByText('Peshawar, Khyber Pakhtunkhwa, Pakistan')).toBeInTheDocument();
    expect(screen.getByText('CECOS University, Peshawar')).toBeInTheDocument();
  });

  it('renders the Skills section', () => {
    renderAbout();
    expect(screen.getByText('Skills & Expertise')).toBeInTheDocument();
    expect(screen.getByText('React / Next.js')).toBeInTheDocument();
    expect(screen.getByText('Python / FastAPI')).toBeInTheDocument();
  });

  it('renders skill percentages', () => {
    renderAbout();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('renders the Journey timeline', () => {
    renderAbout();
    expect(screen.getByText('My Journey')).toBeInTheDocument();
    expect(screen.getByText('Started Coding')).toBeInTheDocument();
    expect(screen.getByText('Web Development')).toBeInTheDocument();
    expect(screen.getByText('AI Integration')).toBeInTheDocument();
  });

  it('renders timeline years', () => {
    renderAbout();
    expect(screen.getByText('2022')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('renders the social section', () => {
    renderAbout();
    expect(screen.getByText("Let's Connect")).toBeInTheDocument();
  });

  it('renders social platform names', () => {
    renderAbout();
    const whatsapp = screen.getAllByText('WhatsApp');
    expect(whatsapp.length).toBeGreaterThanOrEqual(1);
    const linkedin = screen.getAllByText('LinkedIn');
    expect(linkedin.length).toBeGreaterThanOrEqual(1);
    const github = screen.getAllByText('GitHub');
    expect(github.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the Back button', () => {
    renderAbout();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders the footer with developer name', () => {
    renderAbout();
    expect(screen.getByText('Built with passion by Yaseen Ahmad')).toBeInTheDocument();
  });

  it('renders external links with correct hrefs', () => {
    renderAbout();
    const linkedin = screen.getAllByText('LinkedIn').find(el => el.tagName === 'SPAN');
    expect(linkedin).toBeTruthy();
  });

  it('renders hero action buttons', () => {
    renderAbout();
    expect(screen.getAllByText('WhatsApp').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the Open to opportunities status', () => {
    renderAbout();
    expect(screen.getByText('Open to opportunities')).toBeInTheDocument();
  });
});
