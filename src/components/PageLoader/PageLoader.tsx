'use client'

import { useState, useEffect } from 'react';
import styles from './PageLoader.module.css';

interface PageLoaderProps {
  message?: string;
  show?: boolean;
}

export default function PageLoader({ message = "Loading...", show = true }: PageLoaderProps) {
  const [shouldRender, setShouldRender] = useState(show);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div className={`${styles.overlay} ${isVisible ? styles.visible : styles.hidden}`}>
      <div className={styles.loaderContent}>
        <div className={styles.spinner}></div>
        <p className={styles.text}>{message}</p>
      </div>
    </div>
  );
}