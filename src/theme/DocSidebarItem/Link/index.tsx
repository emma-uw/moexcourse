import React from 'react';
import OriginalLink from '@theme-original/DocSidebarItem/Link';
import { useProgress } from '@site/src/context/ProgressContext'; // Your context import

export default function LinkWrapper(props) {
  const { item } = props;
  const { isCompleted } = useProgress();

  // Only add indicator to doc links inside modules (categories)
  if (item.type === 'link' && item.docId) {
    const completed = isCompleted(item.docId);
    const indicatorClass = `progress-indicator ${completed ? 'progress-indicator-completed' : ''}`; // Add completed class if true
    // Optional: For visible empty circle when not completed, use:
    // const indicatorClass = `progress-indicator ${completed ? 'progress-indicator-completed' : 'progress-indicator-not-completed'}`;

    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <OriginalLink {...props} />
        <div className={indicatorClass} /> {/* Always render, but style changes */}
      </div>
    );
  }

  // Fallback to original for non-doc links or categories
  return <OriginalLink {...props} />;
}