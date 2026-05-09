// ===== STATE =====
let data = null;
let selection = { kind: null, genreId: null, subtypeId: null }; // kind: 'genre' | 'subtype'
const STORAGE_KEY = 'recipe-designer-data';

// ===== INIT =====
async function init() {
    data = loadFromStorage() || await loadFromFile() || seedData();
    renderSidebar();
    bindHeader();
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
    return { personalitySliders: [], genres: [] };
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    del.onclick = () => {
        if (!confirm(`Delete "${genre.name}" and all its sub-types?`)) return;
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
    delBtn.onclick = () => {
        if (!confirm(`Delete sub-type "${sub.name}"?`)) return;
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
function addGenre() {
    const name = prompt('Genre name?');
    if (!name) return;
    const id = uniqueId(makeId(name), data.genres);
    data.genres.push({ id, name, colour: randomColour(), subtypes: [] });
    save();
    selection = { kind: 'genre', genreId: id, subtypeId: null };
    renderSidebar();
    renderEditor();
}

function addSubtype(genreId) {
    const genre = findGenre(genreId);
    if (!genre) return;
    const name = prompt('Sub-type name?');
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
    document.getElementById('btn-add-genre').onclick  = addGenre;
    document.getElementById('btn-add-slider').onclick = addSlider;
    document.getElementById('file-input').onchange = importJson;
}

function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipes.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Downloaded recipes.json');
}

function importJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            data = JSON.parse(reader.result);
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
    if (!confirm('Reset to the recipes.json file on disk? Your unsaved changes will be lost.')) return;
    const fresh = await loadFromFile();
    if (!fresh) {
        toast('Could not load recipes.json');
        return;
    }
    data = fresh;
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
