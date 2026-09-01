import { supabase } from "./supabaseClient.js";
import { signIn, signOut, getSession, onAuthChange, requestPasswordReset } from "./auth.js";
import { listEntries, getEntry, createEntry, updateEntry, deleteEntry, listMyShares, inviteObserver, removeObserver } from "./entries.js";
import { SYMPTOMS, symptomLabel } from "./symptoms.js";
import { renderBodyMap } from "./bodymap.js";
import { exportCsv, openPrintView } from "./export.js";

const appEl = document.getElementById("app");
let currentSession = null;
let cachedEntries = [];

function fmtDate(d) {
  return new Date(d).toLocaleDateString("de-CH");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s ?? "";
  return div.innerHTML;
}

// ---------- Shell / Routing ----------

function renderShell() {
  appEl.innerHTML = `
    <header class="topbar">
      <h1>Krankengeschichte</h1>
      <button id="logoutBtn" class="icon-btn" title="Abmelden">⎋</button>
    </header>
    <main id="view" class="view"></main>
    <nav class="bottomnav">
      <a href="#/entries" data-route="#/entries">📋<span>Übersicht</span></a>
      <a href="#/entries/new" data-route="#/entries/new">➕<span>Neu</span></a>
      <a href="#/export" data-route="#/export">📄<span>Export</span></a>
      <a href="#/observers" data-route="#/observers">👥<span>Beobachter</span></a>
    </nav>
  `;
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut();
  });
  window.addEventListener("hashchange", route);
  route();
}

function setActiveNav() {
  const hash = location.hash || "#/entries";
  document.querySelectorAll(".bottomnav a").forEach((a) => {
    a.classList.remove("active");
  });
  if (hash.startsWith("#/entries/new")) document.querySelector('[data-route="#/entries/new"]').classList.add("active");
  else if (hash.startsWith("#/entries")) document.querySelector('[data-route="#/entries"]').classList.add("active");
  else if (hash.startsWith("#/export")) document.querySelector('[data-route="#/export"]').classList.add("active");
  else if (hash.startsWith("#/observers")) document.querySelector('[data-route="#/observers"]').classList.add("active");
}

async function route() {
  const hash = location.hash || "#/entries";
  setActiveNav();
  const view = document.getElementById("view");
  view.innerHTML = `<p class="hint">Lade…</p>`;

  const editMatch = hash.match(/^#\/entries\/([^/]+)\/edit$/);

  if (hash === "#/entries/new") {
    renderEntryForm(view, null);
  } else if (editMatch) {
    const entry = await getEntry(editMatch[1]);
    renderEntryForm(view, entry);
  } else if (hash === "#/export") {
    renderExport(view);
  } else if (hash === "#/observers") {
    renderObservers(view);
  } else {
    renderEntryList(view);
  }
}

// ---------- Entry list ----------

async function renderEntryList(view) {
  try {
    cachedEntries = await listEntries();
  } catch (err) {
    view.innerHTML = `<p class="error">Fehler beim Laden: ${escapeHtml(err.message)}</p>`;
    return;
  }

  if (cachedEntries.length === 0) {
    view.innerHTML = `<p class="hint">Noch keine Einträge. Tippe unten auf "Neu", um den ersten Eintrag zu erstellen.</p>`;
    return;
  }

  view.innerHTML = `<div class="entry-list">${cachedEntries
    .map(
      (e) => `
      <article class="entry-card" data-id="${e.id}">
        <div class="entry-card-header">
          <strong>${fmtDate(e.entry_date)}</strong>
          <span class="entry-actions">
            <button class="icon-btn edit" data-id="${e.id}" title="Bearbeiten">✎</button>
            <button class="icon-btn delete" data-id="${e.id}" title="Löschen">🗑</button>
          </span>
        </div>
        ${e.triggers ? `<p class="muted">Auslöser: ${escapeHtml(e.triggers)}</p>` : ""}
        <div class="badges">
          ${(e.symptoms || [])
            .map((s) => `<span class="badge">${escapeHtml(symptomLabel(s))}</span>`)
            .join("")}
          ${e.symptoms_other ? `<span class="badge muted-badge">${escapeHtml(e.symptoms_other)}</span>` : ""}
        </div>
        ${e.pain_location ? `<p class="muted">Schmerzort: ${escapeHtml(e.pain_location)}</p>` : ""}
      </article>`
    )
    .join("")}</div>`;

  view.querySelectorAll(".edit").forEach((btn) =>
    btn.addEventListener("click", () => {
      location.hash = `#/entries/${btn.dataset.id}/edit`;
    })
  );
  view.querySelectorAll(".delete").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Diesen Eintrag wirklich löschen?")) return;
      await deleteEntry(btn.dataset.id);
      renderEntryList(view);
    })
  );
}

// ---------- Entry form ----------

function renderEntryForm(view, entry) {
  const isEdit = !!entry;
  const symptoms = entry?.symptoms || [];
  let bodyPoints = entry?.body_points ? [...entry.body_points] : [];

  view.innerHTML = `
    <form id="entryForm" class="form">
      <label>Datum
        <input type="date" name="entry_date" required value="${entry?.entry_date || todayIso()}" />
      </label>

      <label>Möglicher Auslöser
        <input type="text" name="triggers" placeholder="z.B. Erdnüsse, Sport, Stress …" value="${escapeHtml(entry?.triggers || "")}" />
      </label>

      <fieldset>
        <legend>Symptome</legend>
        <div class="checkbox-grid">
          ${SYMPTOMS.map(
            (s) => `
            <label class="checkbox-tile">
              <input type="checkbox" name="symptoms" value="${s.key}" ${symptoms.includes(s.key) ? "checked" : ""} />
              <span style="--dot-color:${s.color}">${s.label}</span>
            </label>`
          ).join("")}
        </div>
        <label>Weitere Symptome
          <input type="text" name="symptoms_other" placeholder="Sonstiges …" value="${escapeHtml(entry?.symptoms_other || "")}" />
        </label>
      </fieldset>

      <label>Zusätzliche Medikamente
        <input type="text" name="medications" placeholder="z.B. Antihistaminikum, Cortison …" value="${escapeHtml(entry?.medications || "")}" />
      </label>

      <fieldset>
        <legend>Wo tritt der Schmerz / das Symptom auf?</legend>
        <label>Beschreibung
          <textarea name="pain_location" rows="2" placeholder="z.B. rechter Unterarm, Lippen …">${escapeHtml(entry?.pain_location || "")}</textarea>
        </label>
        <div id="bodyMapContainer"></div>
      </fieldset>

      <label>Besonderes
        <textarea name="notes" rows="3" placeholder="Weitere Beobachtungen …">${escapeHtml(entry?.notes || "")}</textarea>
      </label>

      <div class="form-actions">
        <button type="submit" class="primary">Speichern</button>
        <button type="button" id="cancelBtn" class="secondary">Abbrechen</button>
      </div>
      <p id="formError" class="error"></p>
    </form>
  `;

  renderBodyMap(document.getElementById("bodyMapContainer"), bodyPoints, (pts) => {
    bodyPoints = pts;
  });

  document.getElementById("cancelBtn").addEventListener("click", () => {
    location.hash = "#/entries";
  });

  document.getElementById("entryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const payload = {
      entry_date: fd.get("entry_date"),
      triggers: fd.get("triggers") || null,
      symptoms: fd.getAll("symptoms"),
      symptoms_other: fd.get("symptoms_other") || null,
      medications: fd.get("medications") || null,
      pain_location: fd.get("pain_location") || null,
      notes: fd.get("notes") || null,
      body_points: bodyPoints,
    };
    try {
      if (isEdit) {
        await updateEntry(entry.id, payload);
      } else {
        await createEntry(payload);
      }
      location.hash = "#/entries";
    } catch (err) {
      document.getElementById("formError").textContent = "Fehler: " + err.message;
    }
  });
}

// ---------- Export ----------

function renderExport(view) {
  view.innerHTML = `
    <div class="export-panel">
      <p class="hint">Exportiere deine Krankengeschichte, z.B. für den Arztbesuch.</p>
      <button id="printBtn" class="primary">Als PDF / Drucken</button>
      <button id="csvBtn" class="secondary">Als CSV exportieren</button>
      <p class="muted">${cachedEntries.length} Einträge geladen.</p>
    </div>
  `;
  document.getElementById("printBtn").addEventListener("click", async () => {
    const entries = cachedEntries.length ? cachedEntries : await listEntries();
    openPrintView(entries);
  });
  document.getElementById("csvBtn").addEventListener("click", async () => {
    const entries = cachedEntries.length ? cachedEntries : await listEntries();
    exportCsv(entries);
  });
}

// ---------- Observers ----------

async function renderObservers(view) {
  view.innerHTML = `<p class="hint">Lade…</p>`;
  const ownerId = currentSession.user.id;
  let shares = [];
  try {
    shares = await listMyShares(ownerId);
  } catch (err) {
    view.innerHTML = `<p class="error">Fehler: ${escapeHtml(err.message)}</p>`;
    return;
  }

  view.innerHTML = `
    <div class="observers-panel">
      <p class="hint">Lade Personen ein, die deine Einträge nur ansehen (nicht bearbeiten) dürfen.</p>
      <form id="inviteForm" class="form inline">
        <input type="email" name="email" placeholder="email@beispiel.ch" required />
        <button type="submit" class="primary">Einladen</button>
      </form>
      <p id="inviteError" class="error"></p>
      <ul class="share-list">
        ${shares
          .map(
            (s) => `<li>${escapeHtml(s.invited_email)} <button class="icon-btn remove" data-id="${s.id}" title="Entfernen">🗑</button></li>`
          )
          .join("") || '<li class="muted">Noch niemand eingeladen.</li>'}
      </ul>
      <p class="muted">Hinweis: Die eingeladene Person braucht ein eigenes Konto mit genau dieser E-Mail-Adresse (im Supabase-Dashboard unter Authentication → Users anlegen).</p>
    </div>
  `;

  document.getElementById("inviteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get("email");
    try {
      await inviteObserver(ownerId, email);
      renderObservers(view);
    } catch (err) {
      document.getElementById("inviteError").textContent = "Fehler: " + err.message;
    }
  });

  view.querySelectorAll(".remove").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await removeObserver(btn.dataset.id);
      renderObservers(view);
    })
  );
}

// ---------- Login ----------

function renderLogin(errorMsg) {
  appEl.innerHTML = `
    <div class="login-screen">
      <h1>Krankengeschichte</h1>
      <p class="hint">Bitte melde dich an.</p>
      <form id="loginForm" class="form">
        <label>E-Mail
          <input type="email" name="email" required autocomplete="username" />
        </label>
        <label>Passwort
          <input type="password" name="password" required autocomplete="current-password" />
        </label>
        <button type="submit" class="primary">Anmelden</button>
        <button type="button" id="forgotBtn" class="link-btn">Passwort vergessen?</button>
      </form>
      <p class="error">${errorMsg ? escapeHtml(errorMsg) : ""}</p>
      <p id="loginInfo" class="hint"></p>
    </div>
  `;

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await signIn(fd.get("email"), fd.get("password"));
    } catch (err) {
      renderLogin(err.message);
    }
  });

  document.getElementById("forgotBtn").addEventListener("click", async () => {
    const email = document.querySelector('#loginForm input[name="email"]').value;
    if (!email) {
      document.getElementById("loginInfo").textContent = "Bitte zuerst E-Mail-Adresse eingeben.";
      return;
    }
    try {
      await requestPasswordReset(email);
      document.getElementById("loginInfo").textContent = "E-Mail zum Zurücksetzen wurde verschickt.";
    } catch (err) {
      document.getElementById("loginInfo").textContent = "Fehler: " + err.message;
    }
  });
}

// ---------- Boot ----------

async function boot() {
  currentSession = await getSession();
  if (currentSession) {
    renderShell();
  } else {
    renderLogin();
  }

  onAuthChange((session) => {
    const wasLoggedIn = !!currentSession;
    currentSession = session;
    const isLoggedIn = !!session;
    if (wasLoggedIn !== isLoggedIn) {
      if (isLoggedIn) renderShell();
      else renderLogin();
    }
  });
}

boot();
