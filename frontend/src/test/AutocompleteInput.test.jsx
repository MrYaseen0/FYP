import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutocompleteInput from '../components/AutocompleteInput';

const SUGGESTIONS = ['chest pain', 'shortness of breath', 'headache', 'nausea', 'dizziness'];

describe('AutocompleteInput', () => {
  it('renders an input element', () => {
    render(<AutocompleteInput value="" onChange={() => {}} suggestions={SUGGESTIONS} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<AutocompleteInput value="" onChange={() => {}} suggestions={SUGGESTIONS} placeholder="Type symptoms..." />);
    expect(screen.getByPlaceholderText('Type symptoms...')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<AutocompleteInput value="" onChange={onChange} suggestions={SUGGESTIONS} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'chest' } });
    expect(onChange).toHaveBeenCalledWith('chest');
  });

  it('shows dropdown with filtered suggestions when typing', () => {
    render(<AutocompleteInput value="ch" onChange={() => {}} suggestions={SUGGESTIONS} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ch' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('filters suggestions by case-insensitive match', () => {
    render(<AutocompleteInput value="NAU" onChange={() => {}} suggestions={SUGGESTIONS} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'NAU' } });
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    expect(options.some(o => o.textContent.includes('nausea'))).toBe(true);
  });

  it('limits suggestions to 10', () => {
    const manySuggestions = Array.from({ length: 20 }, (_, i) => `symptom ${i}`);
    render(<AutocompleteInput value="symptom" onChange={() => {}} suggestions={manySuggestions} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'symptom' } });
    expect(screen.getAllByRole('option').length).toBe(10);
  });

  it('hides dropdown when Escape is pressed', () => {
    render(<AutocompleteInput value="ch" onChange={() => {}} suggestions={SUGGESTIONS} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ch' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates options with ArrowDown', async () => {
    render(<AutocompleteInput value="ch" onChange={() => {}} suggestions={SUGGESTIONS} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ch' } });
    await waitFor(() => { expect(screen.queryByRole('listbox')).toBeInTheDocument(); });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('navigates options with ArrowUp', async () => {
    render(<AutocompleteInput value="ch" onChange={() => {}} suggestions={SUGGESTIONS} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ch' } });
    await waitFor(() => { expect(screen.queryByRole('listbox')).toBeInTheDocument(); });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => { expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true'); });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const lastIdx = options.length - 1;
      expect(options[lastIdx]).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('selects suggestion on mouseDown', () => {
    const onChange = vi.fn();
    render(<AutocompleteInput value="ch" onChange={onChange} suggestions={SUGGESTIONS} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ch' } });
    fireEvent.mouseDown(screen.getAllByRole('option')[0]);
    expect(onChange).toHaveBeenCalled();
  });

  it('renders textarea when multiline=true', () => {
    render(<AutocompleteInput value="" onChange={() => {}} suggestions={SUGGESTIONS} multiline />);
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  it('renders input when multiline=false', () => {
    render(<AutocompleteInput value="" onChange={() => {}} suggestions={SUGGESTIONS} />);
    expect(screen.getByRole('textbox').tagName).toBe('INPUT');
  });

  it('does not show dropdown when query is empty', () => {
    render(<AutocompleteInput value="" onChange={() => {}} suggestions={SUGGESTIONS} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<AutocompleteInput value="" onChange={() => {}} suggestions={SUGGESTIONS} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('accepts label prop without error', () => {
    render(<AutocompleteInput value="" onChange={() => {}} suggestions={SUGGESTIONS} label="Symptoms" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with id prop', () => {
    render(<AutocompleteInput value="" onChange={() => {}} suggestions={SUGGESTIONS} id="test-id" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'test-id');
  });
});
