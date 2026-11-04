/**
 * git0 install button.
 *
 * Turns any link or button carrying `data-git0-repo="owner/repo"` into a
 * one-click installer. When the git0 background service is running on the
 * visitor's machine, a click does not download a file: the button asks the
 * service to install the right release for that machine, then morphs into a
 * progress bar that fills as the service downloads, installs and launches it.
 * When the service is not running, the link behaves exactly as before — it
 * still points at your normal download page.
 *
 *   <a href="https://github.com/owner/repo/releases/latest"
 *      data-git0-repo="owner/repo" class="git0-button">Download</a>
 *   <script src="git0-button.js"></script>
 *
 * Options, as attributes on the element:
 *   data-git0-port="47100"   the service port, if changed with --port
 *   data-git0-simulate       run the animation without the service (demos)
 *
 * The first install of a repository opens a small git0 page from 127.0.0.1
 * asking the visitor to allow it. That prompt is the service's, not the
 * website's, and a website cannot answer it.
 */
(function () {
  const DEFAULT_PORT = 47100;
  const TERMINAL = ['done', 'error', 'denied'];

  const css = `
.git0-button{--g0-accent:#6d28d9;--g0-track:rgba(109,40,217,.18);--g0-fg:#fff;
  position:relative;display:inline-flex;align-items:center;justify-content:center;
  min-width:220px;height:48px;padding:0 24px;border:0;border-radius:24px;
  background:var(--g0-accent);color:var(--g0-fg);font:600 15px/1 system-ui,sans-serif;
  text-decoration:none;cursor:pointer;overflow:hidden;isolation:isolate;
  transition:min-width .45s cubic-bezier(.2,.8,.2,1),border-radius .45s,background-color .3s,box-shadow .3s}
.git0-button:hover{box-shadow:0 6px 20px rgba(109,40,217,.35)}
.git0-button:focus-visible{outline:3px solid var(--g0-track);outline-offset:3px}
.git0-button .g0-label{position:relative;z-index:2;white-space:nowrap;transition:opacity .2s}
.git0-button .g0-fill{position:absolute;inset:0;width:0;z-index:1;background:var(--g0-accent);
  transition:width .35s ease}
.git0-button.g0-busy{min-width:320px;border-radius:12px;background:var(--g0-track);color:inherit;cursor:default;box-shadow:none}
.git0-button .g0-label-on{position:absolute;inset:0;z-index:3;display:none;align-items:center;justify-content:center;
  color:#fff;white-space:nowrap;clip-path:inset(0 calc(100% - var(--g0-p,0%)) 0 0);transition:clip-path .35s ease}
.git0-button.g0-busy .g0-label{color:#3b0764}
.git0-button.g0-busy:not(.g0-indeterminate) .g0-label-on{display:flex}
.git0-button.g0-indeterminate .g0-fill{width:35%!important;animation:g0-slide 1.1s ease-in-out infinite}
.git0-button.g0-done{background:#15803d;min-width:260px;border-radius:24px}
.git0-button.g0-done .g0-fill{opacity:0}
.git0-button.g0-done .g0-label{color:#fff}
.git0-button.g0-error{background:#b91c1c;border-radius:24px}
.git0-button.g0-error .g0-fill{opacity:0}
.git0-button.g0-error .g0-label{color:#fff}
@keyframes g0-slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
@media (prefers-reduced-motion:reduce){.git0-button,.git0-button .g0-fill{transition:none}
  .git0-button.g0-indeterminate .g0-fill{animation:none;width:100%!important;opacity:.4}}`;

  function injectCss() {
    if (document.getElementById('git0-button-css')) return;
    const style = document.createElement('style');
    style.id = 'git0-button-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  const mb = n => (n / 1048576).toFixed(1);

  function labelFor(job) {
    switch (job.status) {
      case 'awaiting-approval': return 'Allow the install in the git0 tab…';
      case 'resolving':         return 'Finding your build…';
      case 'downloading':       return job.totalBytes
        ? `Downloading ${Math.round((job.receivedBytes / job.totalBytes) * 100)}% · ${mb(job.receivedBytes)} / ${mb(job.totalBytes)} MB`
        : 'Downloading…';
      case 'installing':        return 'Installing…';
      case 'launching':         return 'Launching…';
      case 'done':              return job.launched ? 'Installed · opened ✓' : 'Installed ✓';
      case 'denied':            return 'Install cancelled';
      default:                  return `Failed — ${job.error || 'try again'}`;
    }
  }

  /** Paints a job onto the button. */
  function render(el, job) {
    const fill = el.querySelector('.g0-fill');
    const label = el.querySelector('.g0-label');
    const busy = !TERMINAL.includes(job.status);
    const indeterminate = job.status === 'awaiting-approval' || job.status === 'resolving' ||
      (job.status === 'downloading' && !job.totalBytes);

    el.classList.toggle('g0-busy', busy);
    el.classList.toggle('g0-indeterminate', busy && indeterminate);
    el.classList.toggle('g0-done', job.status === 'done');
    el.classList.toggle('g0-error', job.status === 'error' || job.status === 'denied');
    el.setAttribute('aria-busy', String(busy));
    const pct = `${Math.round(job.progress * 100)}%`;
    if (!indeterminate) fill.style.width = pct;
    // A white copy of the label, clipped to the filled part, keeps the text
    // readable on both sides of the bar's edge.
    el.style.setProperty('--g0-p', pct);
    label.textContent = labelFor(job);
    el.querySelector('.g0-label-on').textContent = label.textContent;
    fill.setAttribute('aria-valuenow', String(Math.round(job.progress * 100)));
  }

  function prepare(el) {
    if (el.querySelector('.g0-label')) return;
    const text = el.textContent.trim();
    el.textContent = '';
    const fill = document.createElement('span');
    fill.className = 'g0-fill';
    fill.setAttribute('role', 'progressbar');
    fill.setAttribute('aria-valuemin', '0');
    fill.setAttribute('aria-valuemax', '100');
    const label = document.createElement('span');
    label.className = 'g0-label';
    label.setAttribute('aria-live', 'polite');
    label.textContent = text;
    const labelOn = document.createElement('span');
    labelOn.className = 'g0-label-on';
    labelOn.setAttribute('aria-hidden', 'true');
    el.append(fill, label, labelOn);
    el.dataset.git0Label = text;
  }

  function reset(el) {
    el.className = el.className.replace(/\bg0-\S+/g, '').trim();
    el.querySelector('.g0-fill').style.width = '0';
    el.style.removeProperty('--g0-p');
    el.querySelector('.g0-label').textContent = el.dataset.git0Label;
    el.removeAttribute('aria-busy');
    delete el.dataset.git0Running;
  }

  async function serviceUp(base) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 700);
      const res = await fetch(`${base}/health`, { signal: ctl.signal });
      clearTimeout(t);
      return res.ok && (await res.json()).name === 'git0';
    } catch {
      return false;
    }
  }

  /** Plays the whole sequence with fake numbers, for demo pages. */
  async function simulate(el) {
    const total = 48 * 1048576;
    const job = { status: 'resolving', progress: 0, receivedBytes: 0, totalBytes: 0, launched: false };
    render(el, job);
    await new Promise(r => setTimeout(r, 900));
    job.status = 'downloading';
    job.totalBytes = total;
    while (job.receivedBytes < total) {
      job.receivedBytes = Math.min(total, job.receivedBytes + total * (0.015 + Math.random() * 0.035));
      job.progress = (job.receivedBytes / total) * 0.9;
      render(el, job);
      await new Promise(r => setTimeout(r, 90));
    }
    for (const [status, progress, wait] of [['installing', 0.94, 900], ['launching', 0.98, 600]]) {
      Object.assign(job, { status, progress });
      render(el, job);
      await new Promise(r => setTimeout(r, wait));
    }
    Object.assign(job, { status: 'done', progress: 1, launched: true });
    render(el, job);
  }

  async function onClick(event) {
    const el = event.currentTarget;
    if (el.dataset.git0Running) { event.preventDefault(); return; }

    if (el.hasAttribute('data-git0-simulate')) {
      event.preventDefault();
      el.dataset.git0Running = '1';
      await simulate(el);
      setTimeout(() => reset(el), 4000);
      return;
    }

    const base = `http://127.0.0.1:${el.dataset.git0Port || DEFAULT_PORT}`;
    // Decide synchronously that we own the click, so the browser does not
    // start the plain download while we check for the service. If it turns
    // out not to be running, follow the link ourselves.
    event.preventDefault();
    el.dataset.git0Running = '1';
    // Opened now, inside the click, so pop-up blockers allow it; pointed at
    // the approval page once we know there is one, closed if there is not.
    let approval = null;

    if (!(await serviceUp(base))) {
      reset(el);
      const href = el.getAttribute('href');
      if (href) window.location.href = href;
      return;
    }

    try {
      approval = window.open('', 'git0-approval', 'popup,width=480,height=420');
      const res = await fetch(`${base}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: el.dataset.git0Repo }),
      });
      let job = await res.json();
      if (!res.ok) throw new Error(job.error || `HTTP ${res.status}`);

      if (job.approveUrl && approval) approval.location.href = job.approveUrl;
      else if (approval) approval.close();

      while (!TERMINAL.includes(job.status)) {
        render(el, job);
        await new Promise(r => setTimeout(r, 400));
        job = await (await fetch(`${base}/status/${job.id}`)).json();
      }
      render(el, job);
    } catch (err) {
      if (approval) approval.close();
      render(el, { status: 'error', progress: 0, error: err.message });
    }
    setTimeout(() => reset(el), 6000);
  }

  function init(root) {
    injectCss();
    for (const el of (root || document).querySelectorAll('[data-git0-repo]')) {
      if (el.dataset.git0Bound) continue;
      el.dataset.git0Bound = '1';
      el.classList.add('git0-button');
      prepare(el);
      el.addEventListener('click', onClick);
    }
  }

  window.git0Button = { init, render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
})();
