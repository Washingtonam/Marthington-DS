import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SlideOver from '../SlideOver';

describe('SlideOver', () => {
  test('renders a centered dialog and closes on Escape and backdrop click', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <SlideOver isOpen={true} onClose={onClose} title="Test Slide">
        <div>Inner Content</div>
      </SlideOver>
    );

    // dialog present
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();

    const closeButton = screen.getByRole('button', { name: 'Close dialog' });
    expect(document.activeElement).toBe(closeButton);
    expect(dialog.className).toContain('max-w-3xl');

    // simulate Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();

    // simulate backdrop click
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog backdrop' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
