import React, { useState } from 'react';
import SlideOver from './SlideOver';

export default {
  title: 'UI/SlideOver',
  component: SlideOver,
};

export const Default = () => {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      <SlideOver isOpen={open} onClose={() => setOpen(false)} title="Story SlideOver">
        <div style={{ padding: 20 }}>
          <p>This is the slide-over content in Storybook.</p>
          <button onClick={() => setOpen(false)}>Close from inside</button>
        </div>
      </SlideOver>
    </div>
  );
};
