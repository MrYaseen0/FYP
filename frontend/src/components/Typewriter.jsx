/**
 * Typewriter — Cool typing animation component
 */
import { useState, useEffect } from 'react';

export default function Typewriter({ words = [], speed = 80, deleteSpeed = 40, pause = 2000, className = '' }) {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIdx < word.length) {
          setText(word.slice(0, charIdx + 1));
          setCharIdx(c => c + 1);
        } else {
          setTimeout(() => setIsDeleting(true), pause);
        }
      } else {
        if (charIdx > 0) {
          setText(word.slice(0, charIdx - 1));
          setCharIdx(c => c - 1);
        } else {
          setIsDeleting(false);
          setWordIdx(i => (i + 1) % words.length);
        }
      }
    }, isDeleting ? deleteSpeed : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, isDeleting, wordIdx, words, speed, deleteSpeed, pause]);

  return (
    <span className={className}>
      {text}
      <span style={{
        display: 'inline-block',
        width: 3,
        height: '1em',
        background: 'linear-gradient(180deg, #067857, #06b6d4)',
        marginLeft: 2,
        verticalAlign: 'text-bottom',
        animation: 'blink 0.8s step-end infinite',
      }} />
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </span>
  );
}
