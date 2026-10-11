'use strict';
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const videos = [...document.querySelectorAll('video')];
const playback = new WeakMap(videos.map(video => [video, { visible: false, userPaused: false, automaticPause: false }]));
function updatePlayback(video) {
  const state = playback.get(video);
  const shouldPlay = state.visible && !document.hidden && !motionPreference.matches && !state.userPaused;
  if (shouldPlay && video.paused) video.play().catch(() => {});
  else if (!shouldPlay && !video.paused) { state.automaticPause = true; video.pause(); }
}
for (const video of videos) {
  video.muted = true;
  video.addEventListener('pause', () => {
    const state = playback.get(video);
    if (state.automaticPause) state.automaticPause = false;
    else state.userPaused = true;
  });
  video.addEventListener('play', () => { playback.get(video).userPaused = false; });
  const showError = () => { video.parentElement.querySelector('.video-error').hidden = false; };
  video.addEventListener('error', showError);
  video.querySelector('source').addEventListener('error', showError);
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      playback.get(entry.target).visible = entry.isIntersecting;
      updatePlayback(entry.target);
    }
  }, { threshold: 0.15 });
  videos.forEach(video => observer.observe(video));
}
document.addEventListener('visibilitychange', () => videos.forEach(updatePlayback));
motionPreference.addEventListener('change', () => videos.forEach(updatePlayback));
const copyButton = document.getElementById('copy-bibtex');
copyButton.addEventListener('click', async () => {
  const citation = document.getElementById('bibtex');
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(citation.textContent);
    copyButton.textContent = 'Copied';
    status.textContent = 'Citation copied to clipboard.';
    setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange(); range.selectNodeContents(citation);
    selection.removeAllRanges(); selection.addRange(range);
    status.textContent = 'Citation selected. Press Ctrl+C or ⌘C to copy.';
  }
});
