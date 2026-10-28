'use strict';
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

// Reference scenes: play while visible; respect reduced motion and the viewer's own pauses.
const videos = [...document.querySelectorAll('.scene video')];
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

// Counterfactual comparison: the original run is the clock; the chosen edit follows it.
const stage = document.querySelector('[data-cf]');
if (stage) {
  const original = stage.querySelector('video[data-run="original"]');
  const edits = [...stage.querySelectorAll('video[data-run="edit"]')];
  const options = [...stage.querySelectorAll('.task-option[data-branch]')];
  const toggle = stage.querySelector('.cf-toggle');
  const tag = stage.querySelector('[data-cf-tag]');
  const caption = stage.querySelector('[data-cf-caption]');
  let active = edits.find(video => video.classList.contains('is-active')) || edits[0];
  let visible = false;
  let choice = null; // 'play' or 'pause' once the viewer uses the button

  const wanted = () => visible && !document.hidden && (choice ? choice === 'play' : !motionPreference.matches);
  const align = () => {
    if (Math.abs(active.currentTime - original.currentTime) > 0.08) active.currentTime = original.currentTime;
  };
  function update() {
    const play = wanted();
    for (const video of [original, active]) {
      if (play && video.paused) video.play().catch(() => {});
      else if (!play && !video.paused) video.pause();
    }
    align();
    toggle.dataset.action = play ? 'pause' : 'play';
    toggle.setAttribute('aria-label', play ? 'Pause both runs' : 'Play both runs');
  }
  function select(option) {
    const next = edits.find(video => video.dataset.branch === option.dataset.branch);
    if (!next) return;
    for (const item of options) item.setAttribute('aria-pressed', String(item === option));
    tag.textContent = option.dataset.tag;
    const result = document.createElement('strong');
    result.textContent = option.dataset.result;
    caption.replaceChildren(option.dataset.lead, result, '.');
    if (next === active) return;
    active.pause();
    active.classList.remove('is-active');
    next.classList.add('is-active');
    next.preload = 'auto';
    next.currentTime = original.currentTime;
    active = next;
    update();
  }
  options.forEach(option => option.addEventListener('click', () => select(option)));
  toggle.addEventListener('click', () => { choice = wanted() ? 'pause' : 'play'; update(); });
  original.addEventListener('timeupdate', () => { if (!original.paused) align(); });
  original.addEventListener('seeked', align);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) edits.forEach(video => { video.preload = 'auto'; });
      update();
    }, { threshold: 0.2 }).observe(original);
  } else {
    visible = true;
    update();
  }
  document.addEventListener('visibilitychange', update);
  motionPreference.addEventListener('change', update);
}

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
