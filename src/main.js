import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    deleteDoc,
    serverTimestamp 
} from 'firebase/firestore';

const firebaseConfig = {
    projectId: "gen-lang-client-0009344543",
    appId: "1:467671422182:web:89b889915f768400ee1727",
    apiKey: "AIzaSyBrN311sSV5SgFJmUL13a00uEv0_JXeljQ",
    authDomain: "gen-lang-client-0009344543.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-013b1c59-93f4-4094-8692-f5442c71f1d6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function anonymizeName(name) {
    if (!name) return "";
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    
    if (lower.startsWith('ana')) return "A.";
    if (lower.startsWith('kash')) return "K.";
    if (lower.startsWith('vik')) return "V.";
    
    return trimmed.charAt(0).toUpperCase() + ".";
}

// State variables
let occupantsCurrent = [];
let occupantsActuel = [];
let tasks = [];
let cologColors = {
    'A.': '#6366f1',
    'K.': '#f59e0b',
    'V.': '#003063'
};

let currentLang = 'FR';
let editingActuel = false;
let editingPrev = false;
let editingTasks = false;
let isAuthenticated = false;
let pendingEditType = null;
let currentMonthDate = new Date();
let selectedDayForTask = null;
let houseTasksState = {};

// UI Updates
let renderTimeout = null;
function debouncedRender() {
    if (renderTimeout) clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
        renderCalendar();
    }, 50);
}

function initFirebaseSync() {
    onSnapshot(doc(db, 'coloc_settings', 'colors'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const newColors = {};
            for (let key in data) {
                newColors[anonymizeName(key)] = data[key];
            }
            cologColors = newColors;
            if (document.getElementById('color-ana')) {
                document.getElementById('color-ana').value = cologColors['A.'] || '#6366f1';
                document.getElementById('color-kash').value = cologColors['K.'] || '#f59e0b';
                document.getElementById('color-vik').value = cologColors['V.'] || '#003063';
            }
            debouncedRender();
        }
    });

    onSnapshot(query(collection(db, 'tasks'), orderBy('day', 'asc')), (snapshot) => {
        tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, roommate: anonymizeName(data.roommate) };
        });
        debouncedRender();
    });

    onSnapshot(doc(db, 'coloc_data', 'house_tasks'), (docSnap) => {
        if (docSnap.exists()) {
            houseTasksState = docSnap.data();
            debouncedRender();
        }
    });

    onSnapshot(query(collection(db, 'finances')), (snapshot) => {
        const allFinances = snapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, name: anonymizeName(data.name) };
        });
        occupantsActuel = allFinances.filter(f => f.type === 'actuel').sort((a, b) => (a.order || 0) - (b.order || 0));
        occupantsCurrent = allFinances.filter(f => f.type === 'previsionnel').sort((a, b) => (a.order || 0) - (b.order || 0));
        
        renderTables();
        updateSummary();
    });
}

window.switchTab = function(tabId) {
    console.log("Switching to tab:", tabId);
    try {
        window.scrollTo({top: 0, behavior: 'instant'});
        document.querySelectorAll('.tab-content').forEach(content => { content.classList.add('hidden'); });
        const activeTab = document.getElementById('content-' + tabId);
        if (activeTab) activeTab.classList.remove('hidden');

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active', 'border-primary/100');
            btn.classList.add('border-primary/0', 'text-on-surface-variant');
        });
        const activeBtn = document.getElementById('tab-' + tabId);
        if (activeBtn) {
            activeBtn.classList.add('active', 'border-primary/100');
            activeBtn.classList.remove('border-primary/0', 'text-on-surface-variant');
        }
        if (tabId === 'life') debouncedRender();
        if (tabId === 'finance') renderTables();
    } catch (e) { console.error("Tab switch error:", e); }
}

const translations = {
    FR: {
        langBtn: 'EN', title: 'Gestion Maison', heroCat: 'Gestion Financière', heroTitle: 'Maison', totalSpread: 'Total à Répartir', payments: 'paiements', spreadDesc: 'Montant global mensuel actuel (Mai - Juin)', rent: 'loyer', rentDesc: 'Loyer Total (Mai-Juin)', charges: 'charges', chargesDesc: 'Internet & Hydro', table1Title: 'Grille de Répartition (Mai - Juin 2026)', badge1: 'Actuel', thOcc: 'Occupant', thRent: 'Loyer', thInternet: 'Internet', thHydro: 'Hydro', thTotal: 'Total', table2Title: 'Grille de Répartition (Dès Juillet 2026)', badge2: 'Prévisionnel', thRentPrev: 'Loyer (Prév.)', historyTitle: 'Historique des Loyers 2026', historyHeader: 'Calendrier des Paiements', histDate1: 'Mai - Juin 2026', histDesc1: 'Petite: 624$ • Moy: 758$ • Gde: 813$ (Tout inclus)', histDate2: 'Dès Juillet 2026', histDesc2: 'Petite: 642$ • Moy: 781$ • Gde: 837$ (Tout inclus)', notesTitle: 'Détails des Charges', internetDetail: '44,85 $ total divisé par 3 occupants (14,95 $/pers). Inclus haute vitesse illimitée.', hydroDetail: '50,83 $ total par mois (16,94 $/pers). Basé sur le plan de paiements égaux.', edit: 'Modifier', save: 'Enregistrer', cancel: 'Annuler', modalTitle: 'Accès Sécurisé', modalDesc: 'Veuillez entrer le code d\'accès pour modifier.', modalError: 'Code incorrect', modalCancel: 'Annuler', modalValidate: 'Valider', navHome: 'Accueil', navFinance: 'Gestion financière', navLife: 'Vie en coloc', navDocs: 'Documents', homeCategory: 'Bienvenue chez nous', heroImgLabel: 'La Terrasse', heroImgSub: 'Espace extérieur & briques rouges', roommatesTitle: 'Les Colocataires', roleAna: 'Petite Chambre', roleKash: 'Moyenne Chambre', roleVik: 'Grande Chambre', homeTitle: 'Maison', lifeCategory: 'Vie Commune', lifeTitle: 'Tâches & Vie en Colocation', tasksTitle: 'Tâches Ménagères', rulesTitle: 'Règles de Vie', rulesDesc: '"Le respect et la communication sont les clés d\'une colocation réussie."', rotationTitle: 'Calendrier de Rotation', weekCurrent: 'Semaine Actuelle', thZone: 'Zone / Tâche', zoneKitchen: 'Cuisine', zoneBath: 'Salle de Bain', zoneLiving: 'Poubelles & Salon', principleTitle: 'PRINCIPE', principleDesc: 'Chaque colocataire se voit attribuer une zone spécifique par semaine. La rotation s\'effectue le dimanche soir.', rulesHeader: 'RÈGLES', rulesContent: 'Le matériel de nettoyage doit être rangé après usage.', flexTitle: 'FLEXIBILITÉ', flexDesc: 'L\'échange de tâches est autorisé après accord mutuel.', validateTasks: 'Valider mes tâches', task1: 'Recyclage (Lundi)', task2: 'Poubelles (Mercredi)', task3: 'Compost (Jeudi)', taskClean: 'Entretien des aires communes', taskModalTitle: 'Ajouter une Tâche', taskModalPlaceholder: 'Nom de la tâche...', taskModalValidate: 'Valider', docsCategory: 'Archives', docsTitle: 'Documents Partagés', docLease: 'Le Bail', docLeaseDesc: 'Signé le 15 Janvier', docHydro: 'Factures Hydro', docHydroDesc: 'Historique mensuel', docAgr: 'Entente de Coloc', docAgrDesc: 'Règles et signatures'
    },
    EN: {
        langBtn: 'FR', title: 'Home Management', heroCat: 'Financial Management', heroTitle: 'Maison', totalSpread: 'Total to Distribute', payments: 'payments', spreadDesc: 'Current global monthly amount (May - June)', rent: 'rent', rentDesc: 'Total Rent (May-June)', charges: 'charges', chargesDesc: 'Internet & Hydro', table1Title: 'Distribution Grid (May - June 2026)', badge1: 'Current', thOcc: 'Occupant', thRent: 'Rent', thInternet: 'Internet', thHydro: 'Hydro', thTotal: 'Total', table2Title: 'Distribution Grid (From July 2026)', badge2: 'Forecasted', thRentPrev: 'Rent (Fore.)', historyTitle: 'Rent History 2026', historyHeader: 'Payment Schedule', histDate1: 'May - June 2026', histDesc1: 'Small: 624$ • Med: 758$ • Large: 813$ (All inclusive)', histDate2: 'From July 2026', histDesc2: 'Small: 642$ • Med: 781$ • Large: 837$ (All inclusive)', notesTitle: 'Charges Details', internetDetail: '44,85 $ total divided by 3 occupants (14,95 $/pers).', hydroDetail: '50,83 $ total per month (16,94 $/pers).', edit: 'Edit', save: 'Save', cancel: 'Cancel', modalTitle: 'Secure Access', modalDesc: 'Please enter the access code to edit.', modalError: 'Incorrect code', modalCancel: 'Cancel', modalValidate: 'Validate', navHome: 'Home', navFinance: 'Financial Management', navLife: 'Life & Tasks', navDocs: 'Documents', homeCategory: 'Welcome Home', heroImgLabel: 'The Terrace', heroImgSub: 'Outdoor space & red bricks', roommatesTitle: 'The Roommates', roleAna: 'Small Room', roleKash: 'Medium Room', roleVik: 'Large Room', homeTitle: 'Maison', lifeCategory: 'Common Life', lifeTitle: 'Tasks & Life', tasksTitle: 'Housework', rulesTitle: 'House Rules', rulesDesc: '"Respect and communication are keys to co-living success."', rotationTitle: 'Rotation Calendar', weekCurrent: 'Current Week', thZone: 'Zone / Task', zoneKitchen: 'Kitchen', zoneBath: 'Bathroom', zoneLiving: 'Trash & Living Room', principleTitle: 'PRINCIPLE', principleDesc: 'Each roommate is assigned a specific zone per week. Rotation occurs on Sunday evening.', rulesHeader: 'RULES', rulesContent: 'Cleaning equipment must be stored after use.', flexTitle: 'FLEXIBILITY', flexDesc: 'Task exchange is allowed with mutual agreement.', validateTasks: 'Validate my tasks', task1: 'Recycling (Monday)', task2: 'Trash (Wednesday)', task3: 'Compost (Thursday)', taskClean: 'Common Areas Maintenance', taskModalTitle: 'Add a Task', taskModalPlaceholder: 'Task name...', taskModalValidate: 'Validate', docsCategory: 'Archives', docsTitle: 'Shared Documents', docLease: 'The Lease', docLeaseDesc: 'Signed Jan 15th', docHydro: 'Hydro Bills', docHydroDesc: 'Monthly history', docAgr: 'Roommate Agreement', docAgrDesc: 'Rules and signatures'
    }
};

window.showPasscodeModal = function(type) {
    pendingEditType = type;
    const modal = document.getElementById('passcode-modal');
    if (!modal) return;
    document.getElementById('passcode-input').value = '';
    document.getElementById('modal-error').classList.add('hidden');
    modal.classList.remove('hidden');
}

window.closePasscodeModal = function() {
    document.getElementById('passcode-modal').classList.add('hidden');
    pendingEditType = null;
}

window.validatePasscode = function() {
    const input = document.getElementById('passcode-input');
    if (input.value === '0000') {
        isAuthenticated = true;
        closePasscodeModal();
        executeEdit(pendingEditType);
    } else {
        document.getElementById('modal-error').classList.remove('hidden');
        input.value = '';
    }
}

window.toggleEdit = function(type) {
    if (isAuthenticated) { executeEdit(type); } else { showPasscodeModal(type); }
}

window.executeEdit = function(type) {
    if (type === 'actuel') {
        editingActuel = true;
        document.getElementById('edit-btn-1').classList.add('hidden');
        document.getElementById('edit-controls-1').classList.remove('hidden');
    } else if (type === 'prev') {
        editingPrev = true;
        document.getElementById('edit-btn-2').classList.add('hidden');
        document.getElementById('edit-controls-2').classList.remove('hidden');
    } else if (type === 'tasks') {
        editingTasks = true;
        const btn = document.getElementById('edit-tasks-btn');
        btn.onclick = () => stopTaskEdit();
        renderCalendar();
    }
    renderTables();
}

window.stopTaskEdit = function() {
    editingTasks = false;
    const btn = document.getElementById('edit-tasks-btn');
    btn.onclick = () => toggleEdit('tasks');
    renderCalendar();
}

window.cancelEdit = function(type) {
    if (type === 'actuel') { editingActuel = false; document.getElementById('edit-btn-1').classList.remove('hidden'); document.getElementById('edit-controls-1').classList.add('hidden'); }
    else { editingPrev = false; document.getElementById('edit-btn-2').classList.remove('hidden'); document.getElementById('edit-controls-2').classList.add('hidden'); }
    renderTables();
}

window.saveData = async function(type) {
    const tableId = type === 'actuel' ? 'occupants-table-body-2026' : 'occupants-table-body';
    const rows = document.getElementById(tableId).querySelectorAll('tr');
    const dataList = type === 'actuel' ? occupantsActuel : occupantsCurrent;
    for (let i = 0; i < rows.length; i++) {
        const inputs = rows[i].querySelectorAll('input');
        if (inputs.length > 0) {
            const id = dataList[i].id;
            const updated = { rent: inputs[0].value, internet: inputs[1].value, hydro: inputs[2].value, total: inputs[3].value };
            await setDoc(doc(db, 'finances', id), updated, { merge: true });
        }
    }
    cancelEdit(type);
}

function updateSummary() {
    let totalRent = 0, totalCharges = 0;
    occupantsActuel.forEach(occ => {
        totalRent += parseCurrency(occ.rent);
        totalCharges += parseCurrency(occ.internet) + parseCurrency(occ.hydro);
    });
    setSafeText('summary-rent', formatCurrency(totalRent));
    setSafeText('summary-charges', formatCurrency(totalCharges));
    setSafeText('summary-total', formatCurrency(totalRent + totalCharges));
}

function parseCurrency(str) { if (!str) return 0; return parseFloat(str.replace(/[^-0-9.,]/g, '').replace(',', '.')) || 0; }
function formatCurrency(val) { return val.toFixed(2).replace('.', ',') + ' $'; }

window.handleRowInput = function(input) {
    const tr = input.closest('tr');
    const inputs = tr.querySelectorAll('input');
    const total = parseCurrency(inputs[0].value) + parseCurrency(inputs[1].value) + parseCurrency(inputs[2].value);
    inputs[3].value = Math.ceil(total) + ' $';
}

window.toggleLanguage = function() {
    currentLang = currentLang === 'FR' ? 'EN' : 'FR';
    updateContent();
}

function setSafeText(id, text) { const el = document.getElementById(id); if (el) el.innerText = text || ""; }
function setSafeHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html || ""; }

function updateContent() {
    const t = translations[currentLang];
    if (!t) return;
    setSafeText('lang-text', t.langBtn);
    setSafeText('hero-category', t.heroCat);
    setSafeText('hero-title', t.heroTitle);
    setSafeText('label-spread', t.totalSpread);
    setSafeText('label-payments', t.payments);
    setSafeText('spread-desc', t.spreadDesc);
    setSafeText('label-rent-box', t.rent);
    setSafeText('rent-box-desc', t.rentDesc);
    setSafeText('label-charges-box', t.charges);
    setSafeText('charges-box-desc', t.chargesDesc);
    setSafeHTML('table-1-title', `<span class="w-1.5 h-6 bg-secondary rounded-full"></span>${t.table1Title}`);
    setSafeText('badge-1', t.badge1);
    setSafeText('th-occ-1', t.thOcc);
    setSafeText('th-rent-1', t.thRent);
    setSafeText('th-internet-1', t.thInternet);
    setSafeText('th-hydro-1', t.thHydro);
    setSafeHTML('table-2-title', `<span class="w-1.5 h-6 bg-primary rounded-full"></span>${t.table2Title}`);
    setSafeText('badge-2', t.badge2);
    setSafeText('th-occ-2', t.thOcc);
    setSafeText('th-rent-2', t.thRentPrev);
    setSafeHTML('history-title', `<span class="w-1.5 h-6 bg-secondary rounded-full"></span>${t.historyTitle}`);
    setSafeText('history-header', t.historyHeader);
    setSafeText('hist-date-1', t.histDate1);
    setSafeText('hist-desc-1', t.histDesc1);
    setSafeText('hist-date-2', t.histDate2);
    setSafeText('hist-desc-2', t.histDesc2);
    setSafeHTML('notes-title', `<span class="w-1.5 h-6 bg-tertiary rounded-full"></span>${t.notesTitle}`);
    setSafeText('internet-detail', t.internetDetail);
    setSafeText('hydro-detail', t.hydroDetail);
    setSafeText('btn-edit-text-1', t.edit);
    setSafeText('btn-edit-text-2', t.edit);
    setSafeText('tab-home', t.navHome);
    setSafeText('tab-finance', t.navFinance);
    setSafeText('tab-life', t.navLife);
    setSafeText('tab-docs', t.navDocs);
    setSafeText('home-category', t.homeCategory);
    setSafeText('home-title', t.homeTitle);
    setSafeText('hero-img-label', t.heroImgLabel);
    setSafeText('hero-img-sub', t.heroImgSub);
    setSafeText('roommates-title', t.roommatesTitle);
    setSafeText('role-ana', t.roleAna);
    setSafeText('role-kash', t.roleKash);
    setSafeText('role-vik', t.roleVik);
    setSafeText('life-category', t.lifeCategory);
    setSafeText('life-title', t.lifeTitle);
    setSafeText('tasks-title', t.tasksTitle);
    setSafeText('principle-title', t.principleTitle);
    setSafeText('principle-desc', t.principleDesc);
    setSafeText('rules-header', t.rulesHeader);
    setSafeText('rules-content', t.rulesContent);
    setSafeText('flex-title', t.flexTitle);
    setSafeText('flex-desc', t.flexDesc);
    renderTables();
    debouncedRender();
}

function renderTable(data, elementId, colorClass, showDetail = true) {
    const isEditing = (elementId === 'occupants-table-body-2026' && editingActuel) || (elementId === 'occupants-table-body' && editingPrev);
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';
    data.forEach(occ => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-white transition-all group";
        const detailText = currentLang === 'FR' ? occ.detail : occ.detailEN;
        if (isEditing) {
            tr.innerHTML = `<td class="p-5 whitespace-nowrap"><p class="font-headline font-bold text-[#191c1d]">${occ.name}</p>${showDetail ? `<p class="text-[10px] text-[#424751] font-medium">${detailText}</p>` : ''}</td><td class="p-5 whitespace-nowrap"><input type="text" oninput="handleRowInput(this)" value="${occ.rent}" class="w-full bg-white border border-outline-variant/30 rounded px-2 py-1 text-sm font-bold"></td><td class="p-5 whitespace-nowrap"><input type="text" oninput="handleRowInput(this)" value="${occ.internet}" class="w-full bg-white border border-outline-variant/30 rounded px-2 py-1 text-sm"></td><td class="p-5 whitespace-nowrap"><input type="text" oninput="handleRowInput(this)" value="${occ.hydro}" class="w-full bg-white border border-outline-variant/30 rounded px-2 py-1 text-sm"></td><td class="p-5 text-right whitespace-nowrap"><input type="text" value="${occ.total}" readonly class="w-24 text-right bg-gray-50 border border-outline-variant/20 rounded px-2 py-1 text-lg font-headline font-black ${colorClass}"></td>`;
        } else {
            tr.innerHTML = `<td class="p-5 whitespace-nowrap"><p class="font-headline font-bold text-[#191c1d] group-hover:text-primary transition-colors">${occ.name}</p>${showDetail ? `<p class="text-[10px] text-[#424751] font-medium">${detailText}</p>` : ''}</td><td class="p-5 font-bold whitespace-nowrap">${occ.rent}</td><td class="p-5 text-[#424751] font-medium whitespace-nowrap">${occ.internet}</td><td class="p-5 text-[#424751] font-medium whitespace-nowrap">${occ.hydro}</td><td class="p-5 text-right font-headline font-black ${colorClass} text-lg whitespace-nowrap">${occ.total}</td>`;
        }
        container.appendChild(tr);
    });
}

function renderTables() {
    renderTable(occupantsActuel, 'occupants-table-body-2026', 'text-secondary', false);
    renderTable(occupantsCurrent, 'occupants-table-body', 'text-primary');
}

window.updateColors = async function() {
    cologColors['A.'] = document.getElementById('color-ana').value;
    cologColors['K.'] = document.getElementById('color-kash').value;
    cologColors['V.'] = document.getElementById('color-vik').value;
    await setDoc(doc(db, 'coloc_settings', 'colors'), cologColors);
    debouncedRender();
}

window.openTaskModal = function(day) {
    if (!editingTasks) return;
    selectedDayForTask = day;
    document.getElementById('task-modal').classList.remove('hidden');
}

window.closeTaskModal = function() { document.getElementById('task-modal').classList.add('hidden'); selectedDayForTask = null; }

window.saveTask = async function() {
    const taskText = document.getElementById('task-input-text').value;
    const roommate = document.getElementById('task-roommate-select').value;
    if (!taskText) return;
    await addDoc(collection(db, 'tasks'), { day: selectedDayForTask, month: currentMonthDate.getMonth(), year: currentMonthDate.getFullYear(), roommate: roommate, task: taskText, createdAt: serverTimestamp() });
    closeTaskModal();
}

window.deleteTask = async function(id) { await deleteDoc(doc(db, 'tasks', id)); }

function renderCalendar() {
    const container = document.getElementById('calendar-grid-container');
    if (!container) return;
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const monthNames = currentLang === 'FR' ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'] : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = currentLang === 'FR' ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    setSafeText('current-month-display', `${monthNames[month]} ${year}`);
    container.innerHTML = '';
    dayNames.forEach(d => { const h = document.createElement('div'); h.className = 'calendar-header-day'; h.innerText = d; container.appendChild(h); });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) { const d = document.createElement('div'); d.className = 'calendar-day other-month'; container.appendChild(d); }
    for (let i = 1; i <= daysInMonth; i++) {
        const d = document.createElement('div');
        d.className = `calendar-day ${editingTasks ? 'cursor-pointer hover:bg-primary/5' : ''}`;
        d.onclick = () => openTaskModal(i);
        d.innerHTML = `<span class="text-[10px] font-bold">${i}</span>`;
        const dayTasks = tasks.filter(t => t.day === i && t.month === month && t.year === year);
        const dateKey = `${year}-${month + 1}-${i}`;
        
        const date = new Date(year, month, i);
        const startOfYear = new Date(year, 0, 1);
        const weekOfYear = Math.ceil((Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000)) + startOfYear.getDay() + 1) / 7);
        const rotationIdx = ((weekOfYear - 1) % 3) + 1;

        if (date.getDay() === 1) { // Monday Rotations
            const asg = rotationIdx === 1 ? [['Cuisine', 'A.'], ['SdB', 'K.'], ['Salon', 'V.']] : rotationIdx === 2 ? [['Cuisine', 'K.'], ['SdB', 'V.'], ['Salon', 'A.']] : [['Cuisine', 'V.'], ['SdB', 'A.'], ['Salon', 'K.']];
            asg.forEach(([zone, pers]) => {
                const fid = `${dateKey}_${zone}`;
                const done = houseTasksState[fid];
                const p = document.createElement('div');
                p.className = `task-pill flex justify-between items-center mb-1 cursor-pointer hover:brightness-110 ${done ? 'ring-1 ring-offset-1 ring-green-500' : ''}`;
                p.style.backgroundColor = cologColors[pers];
                p.onclick = (e) => { e.stopPropagation(); window.toggleHouseTask(fid); };
                p.innerHTML = `<span class="truncate">${zone}</span><span class="material-symbols-outlined text-[10px]">${done ? 'check_circle' : 'circle'}</span>`;
                d.appendChild(p);
            });
        }
        
        dayTasks.forEach(t => {
            const p = document.createElement('div'); p.className = 'task-pill relative group mb-1'; p.style.backgroundColor = cologColors[t.roommate];
            p.innerHTML = `<span class="truncate">${t.task}</span>${editingTasks ? `<span onclick="event.stopPropagation(); window.deleteTask('${t.id}')" class="absolute -right-1 -top-1 bg-white text-error rounded-full w-3 h-3 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100">×</span>` : ''}`;
            d.appendChild(p);
        });
        container.appendChild(d);
    }
}

window.toggleHouseTask = async function(fid) {
    houseTasksState[fid] = !houseTasksState[fid];
    debouncedRender();
    await setDoc(doc(db, 'coloc_data', 'house_tasks'), houseTasksState);
}

window.nextMonth = function() { currentMonthDate.setMonth(currentMonthDate.getMonth() + 1); debouncedRender(); }
window.prevMonth = function() { currentMonthDate.setMonth(currentMonthDate.getMonth() - 1); debouncedRender(); }

window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded - Initializing App");
    try {
        initFirebaseSync();
        updateContent();
        window.switchTab('home');
        console.log("App Initialized Successfully");
    } catch (e) {
        console.error("Critical Init Error:", e);
    }
});
