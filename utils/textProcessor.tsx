
import React from 'react';

/**
 * Transforms a string into a Bionic Reading format.
 * Bolds the first part of each word to help the eye anchor.
 */
export const processBionicText = (text: string, boldRatio: number = 0.5): React.ReactNode[] => {
  if (!text) return [];

  // Split by whitespace but keep the whitespace in the array
  const parts = text.split(/(\s+)/);

  return parts.map((part, index) => {
    // If it's whitespace or punctuation only, return it as is
    if (/^\s+$/.test(part)) {
      return <span key={index}>{part}</span>;
    }

    // Handle punctuation attached to words
    const wordMatch = part.match(/^(\W*)(.*?)(\W*)$/);
    if (!wordMatch) return <span key={index}>{part}</span>;

    const [_, prefix, coreWord, suffix] = wordMatch;
    
    if (!coreWord) return <span key={index}>{part}</span>;

    // Calculate how many characters to bold
    // Small logic: at least 1 char, at most word length
    const boldLength = Math.max(1, Math.ceil(coreWord.length * boldRatio));
    const boldPart = coreWord.substring(0, boldLength);
    const lightPart = coreWord.substring(boldLength);

    return (
      <span key={index} className="inline-block">
        {prefix}
        <strong className="font-bold opacity-100">{boldPart}</strong>
        <span className="opacity-60">{lightPart}</span>
        {suffix}
      </span>
    );
  });
};
