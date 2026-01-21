import React from 'react';
import OriginalFooter from '@theme-original/DocItem/Footer';
import { useProgress } from '@site/src/context/ProgressContext';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';

export default function FooterWrapper(props) {
  console.log('FooterWrapper rendered with props:', props);

  const { toggleComplete, isCompleted } = useProgress();
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();

  // Derive docId from pathname (e.g., '/docs/module8/intro' -> 'module8/intro')
  const docId = location.pathname.replace(/^\/docs\//, '').replace(/\/$/, '');

  // Guard: Skip if docId is invalid or lacks subpage structure (no '/')
  if (!docId || docId === '' || !docId.includes('/')) {
    console.log('Guard triggered: No subpage (docId:', docId, ')');
    return <OriginalFooter {...props} />;
  }

  console.log('Doc ID derived:', docId);

  return (
    <>
      <OriginalFooter {...props} />
      <button
        onClick={() => toggleComplete(docId)}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: isCompleted(docId) ? 'gray' : 'green',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {isCompleted(docId) ? 'Параграф не прочитан' : 'Параграф прочитан'}
      </button>
    </>
  );
}
