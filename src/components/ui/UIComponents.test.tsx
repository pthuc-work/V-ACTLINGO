import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Button, Card, Chip, ProgressBar, StarRating, Toggle, computeStarsFromPercentage } from './index';

describe('UI Components', () => {
  it('renders Button with Duolingo 3D style and handles click', () => {
    const handleClick = vi.fn();
    render(
      <Button variant="primary" size="md" onClick={handleClick}>
        Bắt đầu
      </Button>
    );

    const btn = screen.getByRole('button', { name: /Bắt đầu/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('computes correct stars from percentage', () => {
    expect(computeStarsFromPercentage(95)).toBe(3);
    expect(computeStarsFromPercentage(90)).toBe(3);
    expect(computeStarsFromPercentage(80)).toBe(2);
    expect(computeStarsFromPercentage(70)).toBe(2);
    expect(computeStarsFromPercentage(60)).toBe(1);
    expect(computeStarsFromPercentage(50)).toBe(1);
    expect(computeStarsFromPercentage(40)).toBe(0);
  });

  it('renders ProgressBar with correct fill', () => {
    const { container } = render(<ProgressBar value={50} max={100} color="green" />);
    const bar = container.querySelector('.bg-brand-green');
    expect(bar).toBeInTheDocument();
  });

  it('renders Chip and Toggle', () => {
    const handleToggle = vi.fn();
    render(
      <>
        <Chip variant="verified">Đã xác minh</Chip>
        <Toggle checked={false} onChange={handleToggle} label="Chế độ Tối" />
      </>
    );

    expect(screen.getByText('Đã xác minh')).toBeInTheDocument();
    expect(screen.getByText('Chế độ Tối')).toBeInTheDocument();
  });
});
