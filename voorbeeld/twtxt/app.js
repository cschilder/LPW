// twtxt-client — gebruikt ../api/twtxt.php (ophalen + publiceren op je eigen domein)
(() => {
  const { $, esc } = Kern;
  const DISCOVER = [
    ['https://twtxt.net/user/prologic/twtxt.txt', 'prologic — maker van yarn.social'],
    ['https://www.uninformativ.de/twtxt.txt', 'movq — uninformativ.de'],
    ['https://twtxt.envs.net/~lyse/twtxt.txt', 'lyse — envs.net'],
  ];
  let mine = { url: '', nick: '', twts: [] };
  const feeds = {};          // url → { nick, twts, error }

  // @<nick url> → klikbare vermelding; #tags en URL's markeren
  function fmt(text) {
    // Eén gecombineerde regex, zodat URL's binnen een mention niet nog eens gelinkt worden.
    return esc(text).replace(/@&lt;(\S+) (\S+?)&gt;|(^|\s)#(\w+)|(https?:\/\/[^\s<]+)/g, (m, n, u, pre, tag, url) => {
      if (n) return `<a class="mention kern-link" data-follow="${u}">@${n}</a>`;
      if (tag) return `${pre}<span class="mention">#${tag}</span>`;
      return `<a class="kern-link" href="${url}" target="_blank" rel="noopener">${url}</a>`;
    });
  }
  function twtCard(t) {
    return `<div class="twt${t.own ? ' twt--own' : ''}"><div class="twt__meta"><span class="twt__nick">@${esc(t.nick)}</span>
      <span class="twt__time">· ${Kern.relTime(t.ts)}</span></div><div class="twt__body">${fmt(t.text)}</div></div>`;
  }

  async function loadMine() {
    mine = await Kern.api('twtxt', { action: 'mine' }, { silent: true }).catch(() => mine);
    renderMine();
  }
  async function fetchFeed(url) {
    try {
      const d = await Kern.api('twtxt', { action: 'fetch', url }, { silent: true });
      feeds[url] = { nick: d.nick || new URL(url).hostname, twts: d.twts, meta: d.meta };
    } catch (e) { feeds[url] = { nick: url, twts: [], error: e.message }; }
  }
  async function refresh() {
    const follow = Kern.get('follow', []);
    $('#tl-status').textContent = `Feeds ophalen (${follow.length + 1})…`;
    await Promise.all([loadMine(), ...follow.map(fetchFeed)]);
    renderTimeline();
    renderFollowing();
  }
  function renderTimeline() {
    const all = [...mine.twts.map((t) => ({ ...t, nick: mine.nick || Kern.user, own: true })),
      ...Kern.get('follow', []).flatMap((u) => (feeds[u]?.twts || []).map((t) => ({ ...t, nick: feeds[u].nick })))]
      .sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 100);
    const n = Kern.get('follow', []).length;
    $('#tl-status').textContent = `${all.length} twts uit ${n + 1} feed${n ? 's' : ''}`;
    $('#timeline').innerHTML = all.map(twtCard).join('') || '<div class="kern-card kern-muted">Nog geen twts. Volg iemand of publiceer je eerste twt.</div>';
  }
  function renderFollowing() {
    const f = Kern.get('follow', []);
    $('#following').innerHTML = f.map((u) => {
      const x = feeds[u] || {};
      return `<div class="user-row"><div class="user-row__info"><div class="user-row__name">@${esc(x.nick || '…')}</div>
        <div class="user-row__url">${esc(u)}${x.error ? ` · <span style="color:var(--err)">${esc(x.error)}</span>` : ` · ${x.twts?.length ?? 0} twts`}</div></div>
        <button class="kern-btn kern-btn--ghost kern-btn--small" data-unfollow="${esc(u)}">Ontvolgen</button></div>`;
    }).join('') || '<div class="kern-card kern-muted">Je volgt nog niemand.</div>';
  }
  function renderMine() {
    $('#my-head').innerHTML = mine.exists ? `<h5>@${esc(mine.nick)}</h5><p style="margin:0">Jouw feed staat op:</p>
        <pre class="kern-pre">${esc(mine.url)}</pre><div class="kern-btns"><button class="kern-btn kern-btn--ghost kern-btn--small" id="btn-copy">URL kopiëren</button>
        <a class="kern-btn kern-btn--ghost kern-btn--small" href="${esc(mine.url)}" target="_blank" rel="noopener">Bestand openen</a></div>
        <p class="kern-muted">Deel deze URL: wie hem toevoegt, volgt jou.</p>`
      : '<h5>Nog geen feed</h5><p class="kern-muted">Publiceer je eerste twt; dan wordt <code>publiek/twtxt.txt</code> aangemaakt.</p>';
    $('#my-twts').innerHTML = mine.twts.map((t) => twtCard({ ...t, nick: mine.nick, own: true })).join('');
    const c = $('#btn-copy');
    if (c) c.onclick = () => Kern.copy(mine.url);
  }

  async function follow(url) {
    url = url.trim();
    if (!/^https?:\/\//.test(url)) return Kern.toast('Ongeldige URL', 'Gebruik http(s)://…/twtxt.txt', 'err');
    const f = Kern.get('follow', []);
    if (!f.includes(url)) Kern.set('follow', [...f, url]);
    await fetchFeed(url);
    renderFollowing();
    renderTimeline();
    Kern.toast(feeds[url].error ? 'Volgen, maar ophalen mislukt' : `Je volgt nu @${feeds[url].nick}`, url, feeds[url].error ? 'err' : 'ok');
  }

  // compose
  const open = () => { $('#compose-bar').hidden = true; $('#compose-expanded').hidden = false; $('#t-text').focus(); };
  const close = () => { $('#compose-expanded').hidden = true; $('#compose-bar').hidden = false; };
  $('#compose-bar').onclick = open;
  $('#btn-cancel').onclick = close;
  $('#t-text').addEventListener('input', () => { $('#t-count').textContent = `${$('#t-text').value.length}/500`; });
  $('#btn-twt').onclick = (e) => Kern.busy(e.target, async () => {
    const text = $('#t-text').value.trim();
    if (!text) return;
    const admin = await Kern.needAdmin();
    if (!admin) return;
    try {
      mine = await Kern.api('twtxt', { action: 'publish', text, nick: Kern.user, admin });
    } catch (err) { if (/beheerwachtwoord/i.test(err.message)) Kern.admin.set(''); throw err; }
    $('#t-text').value = '';
    close();
    renderMine();
    renderTimeline();
    Kern.toast('Twt gepubliceerd', mine.url, 'ok');
  });

  $('#btn-follow').onclick = (e) => Kern.busy(e.target, () => follow($('#f-url').value));
  $('#discover').innerHTML = DISCOVER.map(([u, t]) => `<li><a data-follow="${esc(u)}">${esc(t)}</a><br><span class="kern-muted">${esc(u)}</span></li>`).join('');
  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-follow]');
    if (f) { e.preventDefault(); follow(f.dataset.follow); }
    const u = e.target.closest('[data-unfollow]');
    if (u) { Kern.set('follow', Kern.get('follow', []).filter((x) => x !== u.dataset.unfollow)); renderFollowing(); renderTimeline(); }
  });

  Kern.onStart(() => {
    if (Kern.param('follow')) Kern.set('follow', [...new Set([...Kern.get('follow', []), Kern.param('follow')])]);
    refresh();
  });
})();
