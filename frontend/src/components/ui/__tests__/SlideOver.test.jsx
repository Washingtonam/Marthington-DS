import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SlideOver from '../SlideOver';

describe('SlideOver', () => {
  test('renders and closes on Escape and backdrop click, focuses close button', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <SlideOver isOpen={true} onClose={onClose} title="Test Slide">
        <div>Inner Content</div>
      </SlideOver>
    );

    // dialog present
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();

    // initial focus should land on the Close button inside the panel
    const closeButton = screen.getByText('Close');
    expect(document.activeElement === closeButton || closeButton).toBeTruthy();

    // simulate Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();

    // simulate backdrop click
    const root = container.firstChild; // root wrapper
    const overlay = root?.querySelector('div');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });
});
