'use client';

import { useState } from 'react';

interface ShareButtonProps {
  address: string;
  score: number;
  level: string;
}

function formatLevel(level: string): string {
  return level.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ShareButton({ address, score, level }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/profile?address=${encodeURIComponent(address)}`
    : '';

  const shareText = `My hazard risk score is ${score}/100 (${formatLevel(level)}) for ${address}. Check your risk at MyHazardProfile:`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowMenu(false);
  }

  function shareTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    setShowMenu(false);
  }

  function shareLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    setShowMenu(false);
  }

  function shareFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    setShowMenu(false);
  }

  async function shareNative() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MyHazardProfile', text: shareText, url: shareUrl });
      } catch {
        // User cancelled
      }
    }
    setShowMenu(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-white/20 border-2 border-white/40 rounded-xl hover:bg-white/30 transition-colors text-sm font-medium text-white"
        aria-label="Share this risk profile"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border z-20 py-2">
            {'share' in navigator && (
              <button onClick={shareNative} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
                <span className="text-lg">&#x1F4F1;</span> Share via...
              </button>
            )}
            <button onClick={shareTwitter} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              <span className="text-lg">&#x1D54F;</span> Share on X / Twitter
            </button>
            <button onClick={shareLinkedIn} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              <span className="text-lg font-bold text-blue-700">in</span> Share on LinkedIn
            </button>
            <button onClick={shareFacebook} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              <span className="text-lg font-bold text-blue-600">f</span> Share on Facebook
            </button>
            <hr className="my-1" />
            <button onClick={copyLink} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              <span className="text-lg">&#x1F517;</span>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
