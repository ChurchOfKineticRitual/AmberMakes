// ===== STATE =====
let data = null;
let selection = { kind: null, genreId: null, subtypeId: null }; // kind: 'genre' | 'subtype'
const STORAGE_KEY = 'recipe-designer-data';
const SCHEMA_VERSION = 1;

let fileHandle = null;          // FileSystem handle when connected
let lastSyncedJson = null;      // serialized snapshot last written to file/exported
let syncTimer = null;
let syncInProgress = false;
const SUPPORTS_FS_ACCESS = 'showOpenFilePicker' in window;

// ===== INIT =====
async function init() {
    bindHeader();

    // Try to restore a previously connected file handle
    const restored = await loadStoredHandle();
    if (restored) {
        const ok = await ensurePermission(restored, 'readwrite');
        if (ok) fileHandle = restored;
    }

    let loaded = null;

    // 1. If we have a file handle, the file is the source of truth
    if (fileHandle) {
        loaded = await readFromHandle(fileHandle);
    }

    // 2. Else try localStorage
    if (!loaded) loaded = loadFromStorage();

    // 3. Else try the seed file
    if (!loaded) loaded = await loadFromFile();

    // 4. Else empty state
    if (!loaded) loaded = seedData();

    data = upgradeSchema(loaded);
    lastSyncedJson = JSON.stringify(data);

    renderSidebar();
    updateStatus();
    window.addEventListener('beforeunload', warnIfDirty);
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

async function loadFromFile() {
    try {
        const r = await fetch('recipes.json');
        if (!r.ok) return null;
        return await r.json();
    } catch (e) { return null; }
}

function seedData() {
    return { version: SCHEMA_VERSION, personalitySliders: [], genres: [] };
}

function upgradeSchema(d) {
    // Future migrations go here. For now, ensure required fields exist.
    if (!d.version) d.version = SCHEMA_VERSION;
    if (!Array.isArray(d.genres)) d.genres = [];
    if (!Array.isArray(d.personalitySliders)) d.personalitySliders = [];
    return d;
}

// Called after every edit. Auto-saves to localStorage immediately, schedules
// a debounced write to the connected file (if any).
function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('localStorage save failed', e);
    }
    updateStatus();
    if (fileHandle) {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(syncToFile, 500);
    }
}

// ===== FILE SYSTEM ACCESS =====
async function connectToFile() {
    if (!SUPPORTS_FS_ACCESS) {
        toast('Your browser does not support direct file sync — use Export instead. (Chrome / Edge supported)');
        return;
    }
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
            multiple: false
        });
        const ok = await ensurePermission(handle, 'readwrite');
        if (!ok) { toast('Write permission denied'); return; }

        // Try to load whatever's already in the file. If non-empty, ask whether
        // to use it (file wins) or keep current edits (push to file).
        const fileData = await readFromHandle(handle);
        if (fileData && hasContent(fileData) && hasContent(data) &&
            JSON.stringify(fileData) !== JSON.stringify(data)) {
            const useFile = await confirmModal(
                'The file already contains recipes that differ from your current edits. ' +
                'Click Confirm to LOAD the file (replacing your edits). Cancel to KEEP your edits and overwrite the file on next save.'
            );
            if (useFile) {
                data = upgradeSchema(fileData);
                lastSyncedJson = JSON.stringify(data);
                renderSidebar();
                renderEditor();
            }
        } else if (fileData && hasContent(fileData) && !hasContent(data)) {
            data = upgradeSchema(fileData);
            lastSyncedJson = JSON.stringify(data);
            renderSidebar();
            renderEditor();
        }

        fileHandle = handle;
        await storeHandle(handle);
        await syncToFile();
        toast('Connected — edits will save to ' + handle.name);
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error(e);
            toast('Could not connect: ' + e.message);
        }
    }
}

async function disconnectFile() {
    fileHandle = null;
    await clearStoredHandle();
    updateStatus();
    toast('Disconnected — changes will only save to your browser');
}

async function ensurePermission(handle, mode) {
    if (!handle.queryPermission) return true;
    let p = await handle.queryPermission({ mode });
    if (p === 'granted') return true;
    p = await handle.requestPermission({ mode });
    return p === 'granted';
}

async function readFromHandle(handle) {
    try {
        const file = await handle.getFile();
        const text = await file.text();
        if (!text.trim()) return null;
        return JSON.parse(text);
    } catch (e) { return null; }
}

async function syncToFile() {
    if (!fileHandle || syncInProgress) return;
    syncInProgress = true;
    updateStatus();
    try {
        const writable = await fileHandle.createWritable();
        const json = JSON.stringify(data, null, 2);
        await writable.write(json);
        await writable.close();
        lastSyncedJson = json;
    } catch (e) {
        console.error('Sync failed', e);
        toast('Sync to file failed — changes are still saved in your browser');
        // Fall back to disconnected state so the user knows something's off
        fileHandle = null;
        await clearStoredHandle();
    } finally {
        syncInProgress = false;
        updateStatus();
    }
}

function hasContent(d) {
    if (!d) return false;
    return (d.genres && d.genres.some(g => g.subtypes && g.subtypes.length > 0)) ||
           (d.personalitySliders && d.personalitySliders.length > 0);
}

// ===== INDEXEDDB FOR FILE HANDLE =====
const DB_NAME = 'recipe-designer';
const DB_STORE = 'handles';

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

async function storeHandle(handle) {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).put(handle, 'recipes');
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) { console.warn('Could not persist file handle', e); }
}

async function loadStoredHandle() {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readonly');
            const req = tx.objectStore(DB_STORE).get('recipes');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror   = () => reject(req.error);
        });
    } catch (e) { return null; }
}

async function clearStoredHandle() {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).delete('recipes');
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) { /* ignore */ }
}

// ===== STATUS BADGE =====
function isDirty() {
    return JSON.stringify(data) !== lastSyncedJson;
}

function updateStatus() {
    const el = document.getElementById('save-status');
    if (!el) return;
    const text = el.querySelector('.status-text');

    el.classList.remove('synced', 'dirty', 'browser', 'error');

    if (fileHandle) {
        if (syncInProgress) {
            text.textContent = 'Saving to ' + fileHandle.name + '…';
            el.classList.add('dirty');
        } else if (isDirty()) {
            text.textContent = 'Unsaved changes';
            el.classList.add('dirty');
        } else {
            text.textContent = 'Synced to ' + fileHandle.name;
            el.classList.add('synced');
        }
    } else {
        text.textContent = SUPPORTS_FS_ACCESS
            ? 'Browser only — click Connect to file'
            : 'Browser only — Export to save to disk';
        el.classList.add('browser');
    }

    // Update Connect button label
    const btn = document.getElementById('btn-connect');
    if (btn) {
        if (fileHandle) {
            btn.textContent = 'Disconnect';
            btn.classList.remove('primary');
            btn.title = 'Stop syncing to ' + fileHandle.name;
        } else {
            btn.textContent = 'Connect to file';
            btn.classList.add('primary');
            btn.title = 'Pick recipes.json so edits auto-save to disk';
            btn.disabled = !SUPPORTS_FS_ACCESS;
            if (!SUPPORTS_FS_ACCESS) btn.title = 'Direct file sync needs Chrome or Edge — use Export instead';
        }
    }
}

function warnIfDirty(e) {
    // Only warn if there are unsaved changes that haven't made it to a file/export.
    if (isDirty() && !fileHandle) {
        e.preventDefault();
        e.returnValue = '';
    }
}

// ===== ID HELPERS =====
function makeId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item-' + Date.now();
}

function findGenre(id)   { return data.genres.find(g => g.id === id); }
function findSubtype(genreId, subtypeId) {
    const g = findGenre(genreId);
    return g ? g.subtypes.find(s => s.id === subtypeId) : null;
}

function isSubtypeFilled(s) {
    if (!s) return false;
    return !!(s.setting && s.hook && s.goal && s.tone &&
              s.cast && s.cast.length > 0 &&
              s.beats && s.beats.length > 0);
}

// ===== SIDEBAR =====
function renderSidebar() {
    renderGenres();
    renderSliders();
}

function renderGenres() {
    const list = document.getElementById('genre-list');
    list.innerHTML = '';

    data.genres.forEach(genre => {
        const expanded = selection.genreId === genre.id;

        const row = document.createElement('li');
        const header = document.createElement('div');
        header.className = 'genre-row' + (expanded ? ' expanded' : '') +
                           (selection.kind === 'genre' && selection.genreId === genre.id ? ' active' : '');

        const swatch = document.createElement('span');
        swatch.className = 'genre-swatch';
        swatch.style.background = genre.colour || '#888';

        const name = document.createElement('span');
        name.className = 'genre-name';
        name.textContent = genre.name;

        const arrow = document.createElement('span');
        arrow.className = 'genre-arrow';
        arrow.textContent = '▶';

        header.append(swatch, name, arrow);

        header.onclick = () => {
            // Click expands/collapses + selects the genre for editing
            selectGenre(genre.id);
        };

        row.appendChild(header);

        if (expanded) {
            const sub = document.createElement('ul');
            sub.className = 'subtype-list';

            genre.subtypes.forEach(st => {
                const sRow = document.createElement('li');
                sRow.className = 'subtype-row' +
                    (isSubtypeFilled(st) ? ' filled' : ' empty') +
                    (selection.kind === 'subtype' && selection.subtypeId === st.id ? ' active' : '');
                sRow.textContent = st.name;
                sRow.onclick = (e) => { e.stopPropagation(); selectSubtype(genre.id, st.id); };
                sub.appendChild(sRow);
            });

            const add = document.createElement('li');
            add.className = 'add-subtype';
            add.textContent = '+ Add sub-type';
            add.onclick = (e) => { e.stopPropagation(); addSubtype(genre.id); };
            sub.appendChild(add);

            row.appendChild(sub);
        }

        list.appendChild(row);
    });
}

function renderSliders() {
    const list = document.getElementById('slider-list');
    list.innerHTML = '';

    data.personalitySliders.forEach((slider, idx) => {
        const row = document.createElement('li');
        row.className = 'slider-row';

        const labels = document.createElement('div');
        labels.className = 'slider-labels';

        const left = document.createElement('input');
        left.type = 'text';
        left.value = slider.leftLabel;
        left.placeholder = 'left';
        left.oninput = () => { slider.leftLabel = left.value; save(); };

        const dash = document.createElement('span');
        dash.textContent = '↔';

        const right = document.createElement('input');
        right.type = 'text';
        right.value = slider.rightLabel;
        right.placeholder = 'right';
        right.oninput = () => { slider.rightLabel = right.value; save(); };

        labels.append(left, dash, right);

        const del = document.createElement('button');
        del.className = 'danger mini';
        del.textContent = '×';
        del.title = 'Remove slider';
        del.onclick = () => {
            data.personalitySliders.splice(idx, 1);
            save();
            renderSliders();
        };

        row.append(labels, del);
        list.appendChild(row);
    });
}

// ===== SELECTION =====
function selectGenre(id) {
    if (selection.kind === 'genre' && selection.genreId === id) {
        // Clicking same genre collapses
        selection = { kind: null, genreId: null, subtypeId: null };
    } else {
        selection = { kind: 'genre', genreId: id, subtypeId: null };
    }
    renderSidebar();
    renderEditor();
}

function selectSubtype(genreId, subtypeId) {
    selection = { kind: 'subtype', genreId, subtypeId };
    renderSidebar();
    renderEditor();
}

// ===== EDITOR =====
function renderEditor() {
    const editor = document.getElementById('editor');
    editor.innerHTML = '';

    if (selection.kind === 'genre') {
        renderGenreEditor(editor, findGenre(selection.genreId));
    } else if (selection.kind === 'subtype') {
        renderSubtypeEditor(editor, findGenre(selection.genreId), findSubtype(selection.genreId, selection.subtypeId));
    } else {
        editor.innerHTML = `
            <div class="empty-state">
                <p>Pick a sub-type from the sidebar to edit its recipe.</p>
                <p class="hint">Or click a genre to edit its name and add sub-types.</p>
            </div>`;
    }
}

function renderGenreEditor(parent, genre) {
    if (!genre) return;
    const section = document.createElement('div');
    section.className = 'editor-section';

    section.innerHTML = `<div class="editor-breadcrumb">Genre</div>`;

    const titleRow = document.createElement('div');
    titleRow.className = 'editor-title';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = genre.name;
    titleInput.oninput = () => { genre.name = titleInput.value; save(); renderGenres(); };
    titleRow.appendChild(titleInput);
    section.appendChild(titleRow);

    const editRow = document.createElement('div');
    editRow.className = 'genre-edit-row';

    const colourLabel = document.createElement('span');
    colourLabel.textContent = 'Colour:';
    colourLabel.style.color = 'var(--text-dim)';
    colourLabel.style.fontSize = '12px';

    const colourInput = document.createElement('input');
    colourInput.type = 'color';
    colourInput.value = genre.colour || '#888888';
    colourInput.oninput = () => { genre.colour = colourInput.value; save(); renderGenres(); };

    const del = document.createElement('button');
    del.className = 'danger delete-genre-btn';
    del.textContent = 'Delete genre';
    del.onclick = async () => {
        if (!await confirmModal(`Delete "${genre.name}" and all its sub-types?`)) return;
        data.genres = data.genres.filter(g => g.id !== genre.id);
        selection = { kind: null, genreId: null, subtypeId: null };
        save();
        renderSidebar();
        renderEditor();
    };

    editRow.append(colourLabel, colourInput, del);
    section.appendChild(editRow);

    const help = document.createElement('p');
    help.style.color = 'var(--text-dim)';
    help.style.fontSize = '13px';
    help.textContent = 'Use the sidebar to add sub-types. Each sub-type is a story recipe inside this genre.';
    section.appendChild(help);

    parent.appendChild(section);
}

function renderSubtypeEditor(parent, genre, sub) {
    if (!sub || !genre) return;

    const section = document.createElement('div');
    section.className = 'editor-section';

    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'editor-breadcrumb';
    breadcrumb.innerHTML = `<span style="color:${genre.colour}">●</span> ${escapeHtml(genre.name)} → Sub-type`;
    section.appendChild(breadcrumb);

    const titleRow = document.createElement('div');
    titleRow.className = 'editor-title';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = sub.name;
    titleInput.oninput = () => { sub.name = titleInput.value; save(); renderGenres(); };

    const delBtn = document.createElement('button');
    delBtn.className = 'danger';
    delBtn.textContent = 'Delete';
    delBtn.onclick = async () => {
        if (!await confirmModal(`Delete sub-type "${sub.name}"?`)) return;
        genre.subtypes = genre.subtypes.filter(s => s.id !== sub.id);
        selection = { kind: 'genre', genreId: genre.id, subtypeId: null };
        save();
        renderSidebar();
        renderEditor();
    };

    titleRow.append(titleInput, delBtn);
    section.appendChild(titleRow);

    // Recipe fields
    section.appendChild(textField('Setting',
        'Sensory snapshot — where, when, atmosphere.',
        sub.setting, v => { sub.setting = v; save(); markFilled(); }));

    section.appendChild(textField('Hook',
        'Why is the player in this story? The inciting incident.',
        sub.hook, v => { sub.hook = v; save(); markFilled(); }));

    section.appendChild(textField('Goal',
        'What is the player trying to achieve?',
        sub.goal, v => { sub.goal = v; save(); markFilled(); }));

    section.appendChild(listField('Cast',
        'NPC archetypes the AI fleshes out (2–4).',
        sub.cast || (sub.cast = []),
        { titleKey: 'archetype', titlePlaceholder: 'e.g. The Local Guide',
          bodyKey: 'description', bodyPlaceholder: 'What they want, what they hide…' },
        () => markFilled()));

    section.appendChild(listField('Beats',
        'The 3–5 scenes the story moves through, in order.',
        sub.beats || (sub.beats = []),
        { titleKey: 'title', titlePlaceholder: 'e.g. Arrival',
          bodyKey: 'description', bodyPlaceholder: 'What happens in this scene…' },
        () => markFilled()));

    section.appendChild(textField('Tone',
        'Voice, vocabulary, mood — pulpy? dreamy? clipped?',
        sub.tone, v => { sub.tone = v; save(); markFilled(); }));

    section.appendChild(textField('Choice flavour',
        'What kinds of decisions does the player make in this story?',
        sub.choiceFlavour, v => { sub.choiceFlavour = v; save(); markFilled(); }));

    parent.appendChild(section);

    function markFilled() {
        // Re-render sidebar to update filled/empty indicators
        renderGenres();
    }
}

// ===== FIELD HELPERS =====
function textField(label, help, value, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'field';

    const lbl = document.createElement('div');
    lbl.className = 'field-label';
    lbl.textContent = label;
    wrap.appendChild(lbl);

    if (help) {
        const h = document.createElement('div');
        h.className = 'field-help';
        h.textContent = help;
        wrap.appendChild(h);
    }

    const ta = document.createElement('textarea');
    ta.value = value || '';
    ta.rows = 2;
    ta.oninput = () => onChange(ta.value);
    wrap.appendChild(ta);

    return wrap;
}

function listField(label, help, items, schema, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'field';

    const lbl = document.createElement('div');
    lbl.className = 'field-label';
    lbl.textContent = label;
    wrap.appendChild(lbl);

    if (help) {
        const h = document.createElement('div');
        h.className = 'field-help';
        h.textContent = help;
        wrap.appendChild(h);
    }

    const list = document.createElement('div');
    list.className = 'list-items';
    wrap.appendChild(list);

    function renderList() {
        list.innerHTML = '';
        items.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'list-item';

            const title = document.createElement('input');
            title.type = 'text';
            title.placeholder = schema.titlePlaceholder;
            title.value = item[schema.titleKey] || '';
            title.oninput = () => { item[schema.titleKey] = title.value; save(); onChange && onChange(); };

            const body = document.createElement('textarea');
            body.placeholder = schema.bodyPlaceholder;
            body.value = item[schema.bodyKey] || '';
            body.rows = 2;
            body.oninput = () => { item[schema.bodyKey] = body.value; save(); onChange && onChange(); };

            const actions = document.createElement('div');
            actions.className = 'list-item-actions';

            const upBtn = document.createElement('button');
            upBtn.textContent = '↑';
            upBtn.disabled = idx === 0;
            upBtn.onclick = () => {
                if (idx === 0) return;
                [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                save(); renderList(); onChange && onChange();
            };

            const downBtn = document.createElement('button');
            downBtn.textContent = '↓';
            downBtn.disabled = idx === items.length - 1;
            downBtn.onclick = () => {
                if (idx === items.length - 1) return;
                [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]];
                save(); renderList(); onChange && onChange();
            };

            const del = document.createElement('button');
            del.className = 'danger';
            del.textContent = '×';
            del.onclick = () => {
                items.splice(idx, 1);
                save(); renderList(); onChange && onChange();
            };

            actions.append(upBtn, downBtn, del);
            row.append(title, body, actions);
            list.appendChild(row);
        });

        const add = document.createElement('button');
        add.className = 'add-item';
        add.textContent = '+ Add ' + label.toLowerCase().replace(/s$/, '');
        add.onclick = () => {
            const obj = {};
            obj[schema.titleKey] = '';
            obj[schema.bodyKey] = '';
            items.push(obj);
            save(); renderList(); onChange && onChange();
        };
        list.appendChild(add);
    }

    renderList();
    return wrap;
}

// ===== ADD =====
async function addGenre() {
    const name = await promptModal('New genre', 'Genre name…');
    if (!name) return;
    const id = uniqueId(makeId(name), data.genres);
    data.genres.push({ id, name, colour: randomColour(), subtypes: [] });
    save();
    selection = { kind: 'genre', genreId: id, subtypeId: null };
    renderSidebar();
    renderEditor();
}

async function addSubtype(genreId) {
    const genre = findGenre(genreId);
    if (!genre) return;
    const name = await promptModal('New sub-type', 'Sub-type name…');
    if (!name) return;
    const id = uniqueId(makeId(name), genre.subtypes);
    genre.subtypes.push({
        id, name,
        setting: '', hook: '', cast: [], goal: '', beats: [], tone: '', choiceFlavour: ''
    });
    save();
    selection = { kind: 'subtype', genreId, subtypeId: id };
    renderSidebar();
    renderEditor();
}

function addSlider() {
    data.personalitySliders.push({
        id: 'slider-' + Date.now(),
        leftLabel: '',
        rightLabel: ''
    });
    save();
    renderSliders();
}

function uniqueId(base, list) {
    let id = base, n = 1;
    while (list.some(item => item.id === id)) {
        id = base + '-' + (++n);
    }
    return id;
}

function randomColour() {
    const palette = ['#ff5a3c', '#ff5fae', '#5fa8ff', '#7a3cff', '#3cdc8a', '#ffc83c', '#3cc8d4', '#d4793c'];
    return palette[Math.floor(Math.random() * palette.length)];
}

// ===== HEADER ACTIONS =====
function bindHeader() {
    document.getElementById('btn-export').onclick = exportJson;
    document.getElementById('btn-import').onclick = () => document.getElementById('file-input').click();
    document.getElementById('btn-copy').onclick   = copyJson;
    document.getElementById('btn-reset').onclick  = resetData;
    document.getElementById('btn-connect').onclick = () => fileHandle ? disconnectFile() : connectToFile();
    document.getElementById('btn-add-genre').onclick  = addGenre;
    document.getElementById('btn-add-slider').onclick = addSlider;
    document.getElementById('file-input').onchange = importJson;
}

function exportJson() {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipes.json';
    a.click();
    URL.revokeObjectURL(url);
    lastSyncedJson = json;
    updateStatus();
    toast('Downloaded recipes.json');
}

function importJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            data = upgradeSchema(JSON.parse(reader.result));
            save();
            selection = { kind: null, genreId: null, subtypeId: null };
            renderSidebar();
            renderEditor();
            toast('Imported recipes.json');
        } catch (err) {
            toast('Import failed: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

async function copyJson() {
    try {
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        toast('JSON copied to clipboard');
    } catch (e) {
        toast('Copy failed: ' + e.message);
    }
}

async function resetData() {
    if (!await confirmModal('Reset to the recipes.json file on disk? Your unsaved changes will be lost.')) return;
    const fresh = await loadFromFile();
    if (!fresh) {
        toast('Could not load recipes.json');
        return;
    }
    data = upgradeSchema(fresh);
    save();
    selection = { kind: null, genreId: null, subtypeId: null };
    renderSidebar();
    renderEditor();
    toast('Reset to file on disk');
}

// ===== UTILITY =====
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function promptModal(title, placeholder = '') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';

        const heading = document.createElement('h3');
        heading.textContent = title;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder;

        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const cancel = document.createElement('button');
        cancel.className = 'ghost';
        cancel.textContent = 'Cancel';

        const ok = document.createElement('button');
        ok.className = 'primary';
        ok.textContent = 'Add';

        actions.append(cancel, ok);
        modal.append(heading, input, actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const cleanup = () => overlay.remove();
        const submit = () => { cleanup(); resolve(input.value.trim() || null); };
        const dismiss = () => { cleanup(); resolve(null); };

        ok.onclick = submit;
        cancel.onclick = dismiss;
        overlay.onclick = (e) => { if (e.target === overlay) dismiss(); };
        input.onkeydown = (e) => {
            if (e.key === 'Enter') submit();
            else if (e.key === 'Escape') dismiss();
        };

        setTimeout(() => input.focus(), 10);
    });
}

function confirmModal(message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';

        const p = document.createElement('p');
        p.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const cancel = document.createElement('button');
        cancel.className = 'ghost';
        cancel.textContent = 'Cancel';

        const ok = document.createElement('button');
        ok.className = 'danger';
        ok.textContent = 'Confirm';

        actions.append(cancel, ok);
        modal.append(p, actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const cleanup = () => overlay.remove();
        ok.onclick = () => { cleanup(); resolve(true); };
        cancel.onclick = () => { cleanup(); resolve(false); };
        overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { document.removeEventListener('keydown', esc); cleanup(); resolve(false); }
        });

        setTimeout(() => ok.focus(), 10);
    });
}

let toastTimer = null;
function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

// ===== GO =====
init();
