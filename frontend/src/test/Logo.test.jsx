import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Logo from '../components/Logo';

describe('Logo', () => {
  it('renders the SVG element', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with default size 40', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
  });

  it('renders with custom size', () => {
    const { container } = render(<Logo size={80} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
    expect(svg).toHaveAttribute('height', '80');
  });

  it('does not show text by default', () => {
    render(<Logo />);
    expect(screen.queryByText('HEALTHEON')).not.toBeInTheDocument();
  });

  it('shows HEALTHEON text when showText=true', () => {
    render(<Logo showText={true} />);
    expect(screen.getByText('HEALTHEON')).toBeInTheDocument();
  });

  it('shows subtitle when size > 30 and showText', () => {
    render(<Logo size={40} showText={true} />);
    expect(screen.getByText('CLINICAL AI PLATFORM')).toBeInTheDocument();
  });

  it('does not show subtitle when size <= 30', () => {
    render(<Logo size={24} showText={true} />);
    expect(screen.queryByText('CLINICAL AI PLATFORM')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Logo className="custom-class" />);
    const wrapper = container.querySelector('.healtheon-logo');
    expect(wrapper).toHaveClass('custom-class');
  });

  it('renders the medical cross element', () => {
    const { container } = render(<Logo />);
    const heart = container.querySelector('.logo-heart');
    expect(heart).toBeInTheDocument();
  });

  it('renders petals', () => {
    const { container } = render(<Logo />);
    const petals = container.querySelectorAll('.logo-petal');
    expect(petals.length).toBe(6);
  });

  it('renders sparkle stars', () => {
    const { container } = render(<Logo />);
    const sparkles = container.querySelectorAll('.logo-sparkle');
    expect(sparkles.length).toBe(8);
  });
});
