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
    
    // Fallback: first letter + dot
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

// UI State
let currentLang = 'FR';
let editingActuel = false;
let editingPrev = false;
let editingTasks = false;
let isAuthenticated = false;
let pendingEditType = null;
let currentMonthDate = new Date();
let selectedDayForTask = null;
let houseTasksState = {};

// Helper to debounce repetitive UI updates
let renderTimeout = null;
function debouncedRender() {
    if (renderTimeout) clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
        renderCalendar();
    }, 50);
}

// Firebase Sync
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
        
        if (occupantsActuel.length === 0) {
            seedDefaultFinances();
        }

        renderTables();
        updateSummary();
    });
}

async function seedDefaultFinances() {
    const defaults = [
        { name: "A.", detail: "Petite • +18.33$ inc.", detailEN: "Small • +18.33$ inc.", rent: "592,34 $", internet: "14,95 $", hydro: "16,71 $", total: "624 $", type: "actuel", order: 0 },
        { name: "K.", detail: "Moyenne • +22.49$ inc.", detailEN: "Medium • +22.49$ inc.", rent: "726,33 $", internet: "14,95 $", hydro: "16,72 $", total: "758 $", type: "actuel", order: 1 },
        { name: "V.", detail: "Grande • +24.18$ inc.", detailEN: "Large • +24.18$ inc.", rent: "781,33 $", internet: "14,95 $", hydro: "16,72 $", total: "813 $", type: "actuel", order: 2 },
        { name: "A.", detail: "Petite • +18.33$ inc.", detailEN: "Small • +18.33$ inc.", rent: "611,34 $", internet: "14,95 $", hydro: "16,71 $", total: "643 $", type: "previsionnel", order: 0 },
        { name: "K.", detail: "Moyenne • +22.49$ inc.", detailEN: "Medium • +22.49$ inc.", rent: "749,33 $", internet: "14,95 $", hydro: "16,72 $", total: "781 $", type: "previsionnel", order: 1 },
        { name: "V.", detail: "Grande • +24.18$ inc.", detailEN: "Large • +24.18$ inc.", rent: "805,33 $", internet: "14,95 $", hydro: "16,72 $", total: "837 $", type: "previsionnel", order: 2 }
    ];
    for (const item of defaults) {
        await addDoc(collection(db, 'finances'), item);
    }
}

window.switchTab = function(tabId) {
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
        
        if (tabId === 'life') renderCalendar();
        if (tabId === 'finance') renderTables();
    } catch (e) {
        console.error("Tab switch error:", e);
    }
}

const translations = {
    FR: {
        langBtn: 'EN', title: 'Gestion Maison', heroCat: 'Gestion Financière', heroTitle: 'Maison', totalSpread: 'Total à Répartir', payments: 'paiements', spreadDesc: 'Montant global mensuel actuel (Mai - Juin)', rent: 'loyer', rentDesc: 'Loyer Total (Mai-Juin)', charges: 'charges', chargesDesc: 'Internet & Hydro', table1Title: 'Grille de Répartition (Mai - Juin 2026)', badge1: 'Actuel', thOcc: 'Occupant', thRent: 'Loyer', thInternet: 'Internet', thHydro: 'Hydro', thTotal: 'Total', table2Title: 'Grille de Répartition (Dès Juillet 2026)', badge2: 'Prévisionnel', thRentPrev: 'Loyer (Prév.)', historyTitle: 'Historique des Loyers 2026', historyHeader: 'Calendrier des Paiements', histDate1: 'Mai - Juin 2026', histDesc1: 'Petite: 624$ • Moy: 758$ • Gde: 813$ (Tout inclus)', histDate2: 'Dès Juillet 2026', histDesc2: 'Petite: 642$ • Moy: 781$ • Gde: 837$ (Tout inclus)', notesTitle: 'Détails des Charges', internetDetail: '44,85 $ total divisé par 3 occupants (14,95 $/pers). Inclus haute vitesse illimitée.', hydroDetail: '50,15 $ total par mois (16,72 $/pers). Basé sur le plan de paiements égaux.', evolPrice: 'évolution du prix', edit: 'Modifier', save: 'Enregistrer', cancel: 'Annuler', modalTitle: 'Accès Sécurisé', modalDesc: 'Veuillez entrer le code d\'accès pour modifier.', modalError: 'Code incorrect', modalCancel: 'Annuler', modalValidate: 'Valider', navHome: 'Accueil', navFinance: 'Gestion financière', navLife: 'Vie en coloc', navDocs: 'Documents', homeCategory: 'Bienvenue chez nous', heroImgLabel: 'La Maison', heroImgSub: 'Plateau-Mont-Royal, Montréal', roommatesTitle: 'Les Colocataires', roleAna: 'Petite Chambre', roleKash: 'Moyenne Chambre', roleVik: 'Grande Chambre', homeTitle: 'Maison', lifeCategory: 'Vie Commune', lifeTitle: 'Tâches & Vie en Colocation', tasksTitle: 'Tâches Ménagères', rulesTitle: 'Règles de Vie', rulesDesc: '"Le respect et la communication sont les clés d\'une colocation réussie."', rotationTitle: 'Calendrier de Rotation', weekCurrent: 'Semaine Actuelle', thZone: 'Zone / Tâche', zoneKitchen: 'Cuisine', zoneBath: 'Salle de Bain', zoneLiving: 'Poubelles & Salon', principleTitle: 'PRINCIPE', principleDesc: 'Chaque colocataire se voit attribuer une zone spécifique par semaine. La rotation s\'effectue le dimanche soir.', rulesHeader: 'RÈGLES', rulesContent: 'Le matériel de nettoyage doit être rangé après usage. Les produits communs sont rachetés via le fond commun.', flexTitle: 'FLEXIBILITÉ', flexDesc: 'L\'échange de tâches est autorisé après accord mutuel. Signalez tout changement pour le suivi.', validateTasks: 'Valider mes tâches', task1: 'Recyclage (Lundi)', task2: 'Poubelles (Mercredi)', task3: 'Compost (Jeudi)', taskClean: 'Entretien des aires communes', taskModalTitle: 'Ajouter une Tâche', taskModalPlaceholder: 'Nom de la tâche...', taskModalValidate: 'Valider', docsCategory: 'Archives & Preuves', docsTitle: 'Documents Partagés', docLease: 'Le Bail (2026-2027)', docLeaseDesc: 'Signé le 15 Janvier', docHydro: 'Factures Hydro', docHydroDesc: 'Historique mensuel', docAgr: 'Entente de Coloc', docAgrDesc: 'Règles et signatures'
    },
    EN: {
        langBtn: 'FR', title: 'Maison Management', heroCat: 'Financial Management', heroTitle: 'Maison', totalSpread: 'Total to Allocate', payments: 'payments', spreadDesc: 'Current global monthly amount (May - June)', rent: 'rent', rentDesc: 'Total Rent (May-June)', charges: 'charges', chargesDesc: 'Internet & Hydro', table1Title: 'Allocation Grid (May - June 2026)', badge1: 'Current', thOcc: 'Occupant', thRent: 'Rent', thInternet: 'Internet', thHydro: 'Hydro', thTotal: 'Total', table2Title: 'Allocation Grid (From July 2026)', badge2: 'Forecasted', thRentPrev: 'Rent (Fore.)', historyTitle: 'Rent History 2026', historyHeader: 'Payment Schedule', histDate1: 'May - June 2026', histDesc1: 'Small: 624$ • Med: 758$ • Large: 813$ (All inclusive)', histDate2: 'From July 2026', histDesc2: 'Small: 642$ • Med: 781$ • Large: 837$ (All inclusive)', notesTitle: 'Charges Details', internetDetail: '44,85 $ total divided by 3 occupants (14,95 $/pers). Unlimited high speed included.', hydroDetail: '50,15 $ total per month (16,72 $/pers). Based on equal payment plan.', evolPrice: 'price evolution', edit: 'Modify', save: 'Save', cancel: 'Cancel', modalTitle: 'Secure Access', modalDesc: 'Please enter the access code to edit.', modalError: 'Incorrect code', modalCancel: 'Cancel', modalValidate: 'Validate', navHome: 'Home', navFinance: 'Financial Management', navLife: 'Life & Tasks', navDocs: 'Documents', homeCategory: 'Welcome home', heroImgLabel: 'The Maison', heroImgSub: 'Plateau-Mont-Royal, Montreal', roommatesTitle: 'The Roommates', roleAna: 'Small Room', roleKash: 'Medium Room', roleVik: 'Large Room', homeTitle: 'Maison', lifeCategory: 'Common Life', lifeTitle: 'Tasks & Living Together', tasksTitle: 'Housework', rulesTitle: 'House Rules', rulesDesc: '"Respect and communication are the keys to a successful co-living."', rotationTitle: 'Rotation Calendar', weekCurrent: 'Current Week', thZone: 'Zone / Task', zoneKitchen: 'Kitchen', zoneBath: 'Bathroom', zoneLiving: 'Trash & Living Room', principleTitle: 'PRINCIPLE', principleDesc: 'Each roommate is assigned a specific zone per week. Rotation occurs on Sunday evening.', rulesHeader: 'RULES', rulesContent: 'Cleaning equipment must be stored after use. Common products are replaced via the common fund.', flexTitle: 'FLEXIBILITY', flexDesc: 'Task exchange is allowed after mutual agreement. Report any change for tracking.', validateTasks: 'Validate my tasks', task1: 'Recycling (Monday)', task2: 'Trash (Wednesday)', task3: 'Compost (Thursday)', taskClean: 'Common Areas Cleaning', taskModalTitle: 'Add a Task', taskModalPlaceholder: 'Task name...', taskModalValidate: 'Validate', docsCategory: 'Archives & Proofs', docsTitle: 'Shared Documents', docLease: 'The Lease (2026-2027)', docLeaseDesc: 'Signed on Jan 15th', docHydro: 'Hydro Bills', docHydroDesc: 'Monthly history', docAgr: 'Roommate Agreement', docAgrDesc: 'Rules and signatures'
    }
};

window.showPasscodeModal = function(type) {
    pendingEditType = type;
    const modal = document.getElementById('passcode-modal');
    const input = document.getElementById('passcode-input');
    const error = document.getElementById('modal-error');
    if (!modal || !input) return;
    input.value = '';
    error.classList.add('hidden');
    modal.classList.remove('hidden');
    input.focus();
}

window.closePasscodeModal = function() {
    document.getElementById('passcode-modal').classList.add('hidden');
    pendingEditType = null;
}

window.validatePasscode = function() {
    const input = document.getElementById('passcode-input');
    const error = document.getElementById('modal-error');
    if (input.value === '0000') {
        isAuthenticated = true;
        closePasscodeModal();
        executeEdit(pendingEditType);
    } else {
        error.classList.remove('hidden');
        input.value = '';
        input.focus();
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
        btn.classList.add('bg-white', 'shadow-inner');
        btn.innerHTML = `<span class="material-symbols-outlined text-sm text-secondary">check</span><span class="text-[10px] font-bold uppercase tracking-wider text-secondary">Terminer</span>`;
        btn.onclick = () => stopTaskEdit();
    }
    renderTables();
    renderCalendar();
}

window.stopTaskEdit = function() {
    editingTasks = false;
    const btn = document.getElementById('edit-tasks-btn');
    btn.classList.remove('bg-white', 'shadow-inner');
    btn.innerHTML = `<span class="material-symbols-outlined text-sm text-primary">edit</span><span class="text-[10px] font-bold uppercase tracking-wider text-primary">Modifier</span>`;
    btn.onclick = () => toggleEdit('tasks');
    renderCalendar();
}

window.cancelEdit = function(type) {
    if (type === 'actuel') {
        editingActuel = false;
        document.getElementById('edit-btn-1').classList.remove('hidden');
        document.getElementById('edit-controls-1').classList.add('hidden');
    } else {
        editingPrev = false;
        document.getElementById('edit-btn-2').classList.remove('hidden');
        document.getElementById('edit-controls-2').classList.add('hidden');
    }
    renderTables();
}

window.saveData = async function(type) {
    const tableId = type === 'actuel' ? 'occupants-table-body-2026' : 'occupants-table-body';
    const rows = document.getElementById(tableId).querySelectorAll('tr');
    const data = type === 'actuel' ? occupantsActuel : occupantsCurrent;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const inputs = row.querySelectorAll('input');
        if (inputs.length > 0) {
            const id = data[i].id;
            const updatedData = { rent: inputs[0].value, internet: inputs[1].value, hydro: inputs[2].value, total: inputs[3].value };
            if (id) {
                try { await setDoc(doc(db, 'finances', id), updatedData, { merge: true }); } catch (e) { console.error("Save error:", e); }
            }
        }
    }
    cancelEdit(type);
}

function updateSummary() {
    let totalRent = 0; let totalCharges = 0;
    occupantsActuel.forEach(occ => {
        totalRent += parseCurrency(occ.rent);
        totalCharges += parseCurrency(occ.internet) + parseCurrency(occ.hydro);
    });
    const rentEl = document.getElementById('summary-rent');
    const chargesEl = document.getElementById('summary-charges');
    const totalEl = document.getElementById('summary-total');
    if (rentEl) rentEl.innerText = formatCurrency(totalRent);
    if (chargesEl) chargesEl.innerText = formatCurrency(totalCharges);
    if (totalEl) totalEl.innerText = formatCurrency(totalRent + totalCharges);
}

function parseCurrency(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[^-0-9.,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

function formatCurrency(val) { return val.toFixed(2).replace('.', ',') + ' $'; }

window.handleRowInput = function(input) {
    const tr = input.closest('tr');
    const inputs = tr.querySelectorAll('input');
    const rent = parseCurrency(inputs[0].value);
    const internet = parseCurrency(inputs[1].value);
    const hydro = parseCurrency(inputs[2].value);
    const total = rent + internet + hydro;
    inputs[3].value = Math.ceil(total) + ' $';
}

window.toggleLanguage = function() {
    currentLang = currentLang === 'FR' ? 'EN' : 'FR';
    updateContent();
}

function setSafeText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text || "";
}

function setSafeHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html || "";
}

function updateContent() {
    const t = translations[currentLang];
    if (!t) return;
    document.documentElement.lang = currentLang.toLowerCase();
    document.title = t.title;
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
    setSafeHTML('table-1-title', `<span class="w-1.5 h-6 bg-[#1b6d24] rounded-full"></span>${t.table1Title}`);
    setSafeText('badge-1', t.badge1);
    setSafeText('th-occ-1', t.thOcc);
    setSafeText('th-rent-1', t.thRent);
    setSafeText('th-internet-1', t.thInternet);
    setSafeText('th-hydro-1', t.thHydro);
    setSafeText('th-total-1', t.thTotal);
    setSafeHTML('table-2-title', `<span class="w-1.5 h-6 bg-[#003063] rounded-full"></span>${t.table2Title}`);
    setSafeText('badge-2', t.badge2);
    setSafeText('th-occ-2', t.thOcc);
    setSafeText('th-rent-2', t.thRentPrev);
    setSafeText('th-internet-2', t.thInternet);
    setSafeText('th-hydro-2', t.thHydro);
    setSafeText('th-total-2', t.thTotal);
    setSafeHTML('history-title', `<span class="w-1.5 h-6 bg-[#1b6d24] rounded-full"></span>${t.historyTitle}`);
    setSafeText('history-header', t.historyHeader);
    setSafeText('hist-date-1', t.histDate1);
    setSafeText('hist-desc-1', t.histDesc1);
    setSafeText('hist-date-2', t.histDate2);
    setSafeText('hist-desc-2', t.histDesc2);
    setSafeHTML('notes-title', `<span class="w-1.5 h-6 bg-[#636037] rounded-full"></span>${t.notesTitle}`);
    setSafeText('internet-detail', t.internetDetail);
    setSafeText('hydro-detail', t.hydroDetail);
    setSafeText('btn-edit-text-1', t.edit);
    setSafeText('btn-edit-text-2', t.edit);
    const ec1 = document.getElementById('edit-controls-1');
    if (ec1) {
        const table1Controls = ec1.querySelectorAll('button');
        if (table1Controls.length >= 2) { table1Controls[0].innerText = t.save; table1Controls[1].innerText = t.cancel; }
    }
    const ec2 = document.getElementById('edit-controls-2');
    if (ec2) {
        const table2Controls = ec2.querySelectorAll('button');
        if (table2Controls.length >= 2) { table2Controls[0].innerText = t.save; table2Controls[1].innerText = t.cancel; }
    }
    setSafeText('modal-title', t.modalTitle);
    setSafeText('modal-desc', t.modalDesc);
    setSafeText('modal-error', t.modalError);
    const pm = document.getElementById('passcode-modal');
    if (pm) {
        const modalBtns = pm.querySelectorAll('button');
        if (modalBtns.length >= 2) { modalBtns[0].innerText = t.modalCancel; modalBtns[1].innerText = t.modalValidate; }
    }
    setSafeText('tab-home', t.navHome);
    setSafeText('tab-finance', t.navFinance);
    setSafeText('tab-life', t.navLife);
    setSafeText('tab-docs', t.navDocs);
    updateRotationWeek();
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
    setSafeText('rotation-title', t.rotationTitle);
    setSafeText('week-current-label', t.weekCurrent);
    setSafeText('th-zone', t.thZone);
    setSafeText('zone-kitchen', t.zoneKitchen);
    setSafeText('zone-bath', t.zoneBath);
    setSafeText('zone-living', t.zoneLiving);
    setSafeText('principle-title', t.principleTitle);
    setSafeText('principle-desc', t.principleDesc);
    setSafeText('rules-header', t.rulesHeader);
    setSafeText('rules-content', t.rulesContent);
    setSafeText('flex-title', t.flexTitle);
    setSafeText('flex-desc', t.flexDesc);
    setSafeText('btn-validate-tasks', t.validateTasks);
    setSafeText('rules-title', t.rulesTitle);
    setSafeText('rules-desc', t.rulesDesc);
    setSafeText('task-1', t.task1);
    setSafeText('task-2', t.task2);
    setSafeText('task-3', t.task3);
    setSafeText('task-clean', t.taskClean);
    const tmHeader = document.querySelector('#task-modal h3');
    if (tmHeader) tmHeader.innerText = t.taskModalTitle;
    const tmit = document.getElementById('task-input-text');
    if (tmit) tmit.placeholder = t.taskModalPlaceholder;
    const tm = document.getElementById('task-modal');
    if (tm) {
        const taskModalBtns = tm.querySelectorAll('button');
        if (taskModalBtns.length >= 2) { taskModalBtns[0].innerText = t.modalCancel; taskModalBtns[1].innerText = t.taskModalValidate; }
    }
    setSafeText('docs-category', t.docsCategory);
    setSafeText('docs-title', t.docsTitle);
    setSafeText('doc-lease', t.docLease);
    setSafeText('doc-lease-desc', t.docLeaseDesc);
    setSafeText('doc-hydro', t.docHydro);
    setSafeText('doc-hydro-desc', t.docHydroDesc);
    setSafeText('doc-agr', t.docAgr);
    setSafeText('doc-agr-desc', t.docAgrDesc);
    renderTables();
}

function renderTable(data, elementId, colorClass, showDetail = true) {
    const isEditing = (elementId === 'occupants-table-body-2026' && editingActuel) || (elementId === 'occupants-table-body' && editingPrev);
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';
    data.forEach((occ, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-white transition-all group";
        const detailText = currentLang === 'FR' ? occ.detail : occ.detailEN;
        if (isEditing) {
            tr.innerHTML = `<td class="p-5 whitespace-nowrap"><p class="font-headline font-bold text-[#191c1d]">${anonymizeName(occ.name)}</p>${showDetail ? `<p class="text-[10px] text-[#424751] font-medium">${detailText}</p>` : ''}</td><td class="p-5 whitespace-nowrap"><input type="text" oninput="handleRowInput(this)" value="${occ.rent}" class="w-full bg-white border border-outline-variant/30 rounded px-2 py-1 text-sm font-bold text-[#191c1d]"></td><td class="p-5 whitespace-nowrap"><input type="text" oninput="handleRowInput(this)" value="${occ.internet}" class="w-full bg-white border border-outline-variant/30 rounded px-2 py-1 text-sm text-[#424751]"></td><td class="p-5 whitespace-nowrap"><input type="text" oninput="handleRowInput(this)" value="${occ.hydro}" class="w-full bg-white border border-outline-variant/30 rounded px-2 py-1 text-sm text-[#424751]"></td><td class="p-5 text-right whitespace-nowrap"><input type="text" value="${occ.total}" readonly class="w-24 text-right bg-gray-50 border border-outline-variant/20 rounded px-2 py-1 text-lg font-headline font-extrabold ${colorClass} cursor-not-allowed"></td>`;
        } else {
            tr.innerHTML = `<td class="p-5 whitespace-nowrap"><p class="font-headline font-bold text-[#191c1d] group-hover:text-primary transition-colors">${anonymizeName(occ.name)}</p>${showDetail ? `<p class="text-[10px] text-[#424751] font-medium">${detailText}</p>` : ''}</td><td class="p-5 font-bold text-[#191c1d] whitespace-nowrap">${occ.rent}</td><td class="p-5 text-[#424751] font-medium whitespace-nowrap">${occ.internet}</td><td class="p-5 text-[#424751] font-medium whitespace-nowrap">${occ.hydro}</td><td class="p-5 text-right font-headline font-extrabold ${colorClass} text-lg whitespace-nowrap">${occ.total}</td>`;
        }
        container.appendChild(tr);
    });
}

function renderTables() {
    renderTable(occupantsActuel, 'occupants-table-body-2026', 'text-[#1b6d24]', false);
    renderTable(occupantsCurrent, 'occupants-table-body', 'text-[#003063]');
}

window.addEventListener('scroll', () => {
    const btn = document.getElementById('back-to-top');
    if (window.scrollY > 300) { btn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-10'); btn.classList.add('opacity-100', 'translate-y-0'); }
    else { btn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-10'); btn.classList.remove('opacity-100', 'translate-y-0'); }
});

window.updateColors = async function() {
    cologColors['A.'] = document.getElementById('color-ana').value;
    cologColors['K.'] = document.getElementById('color-kash').value;
    cologColors['V.'] = document.getElementById('color-vik').value;
    try { await setDoc(doc(db, 'coloc_settings', 'colors'), cologColors); } catch (e) { console.error("Update colors error:", e); }
    renderCalendar();
}

window.openTaskModal = function(day) {
    if (!editingTasks) return;
    selectedDayForTask = day;
    const modalDateEl = document.getElementById('task-modal-date');
    const monthDisplayEl = document.getElementById('current-month-display');
    if (modalDateEl && monthDisplayEl) { modalDateEl.innerText = `${day} ${monthDisplayEl.innerText}`; }
    document.getElementById('task-input-text').value = '';
    document.getElementById('task-modal').classList.remove('hidden');
}

window.closeTaskModal = function() { document.getElementById('task-modal').classList.add('hidden'); selectedDayForTask = null; }

window.saveTask = async function() {
    const taskText = document.getElementById('task-input-text').value;
    const roommate = document.getElementById('task-roommate-select').value;
    if (!taskText) return;
    try {
        await addDoc(collection(db, 'tasks'), { day: selectedDayForTask, month: currentMonthDate.getMonth(), year: currentMonthDate.getFullYear(), roommate: roommate, task: taskText, createdAt: serverTimestamp() });
        closeTaskModal();
    } catch (e) { console.error("Save task error:", e); }
}

window.deleteTask = async function(id) {
    if (!editingTasks) return;
    try { await deleteDoc(doc(db, 'tasks', id)); } catch (e) { console.error("Delete task error:", e); }
}

function renderCalendar() {
    const container = document.getElementById('calendar-grid-container');
    const monthDisplay = document.getElementById('current-month-display');
    if (!container) return;
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const monthNames = currentLang === 'FR' ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'] : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = currentLang === 'FR' ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (monthDisplay) { monthDisplay.innerText = `${monthNames[month]} ${year}`; }
    container.innerHTML = '';
    dayNames.forEach(d => { const header = document.createElement('div'); header.className = 'calendar-header-day'; header.innerText = d; container.appendChild(header); });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDay; i > 0; i--) { const day = document.createElement('div'); day.className = 'calendar-day other-month'; day.innerHTML = `<span class="text-[10px] font-bold text-gray-300">${prevMonthLastDay - i + 1}</span>`; container.appendChild(day); }
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = `calendar-day ${editingTasks ? 'cursor-pointer hover:bg-primary/5 transition-colors' : ''}`;
        dayDiv.onclick = () => openTaskModal(i);
        dayDiv.innerHTML = `<span class="text-[10px] font-bold text-on-surface">${i}</span>`;
        const dayTasks = tasks.filter(t => t.day === i && t.month === month && t.year === year);
        const date = new Date(year, month, i);
        const dayOfWeek = date.getDay();
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const startOfYear = new Date(year, 0, 1);
        const daysDiff = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
        const weekOfYear = Math.ceil((daysDiff + startOfYear.getDay() + 1) / 7);
        const rotationWeek = ((weekOfYear - 1) % 3) + 1;

        if (dayOfWeek === 1) {
            const assignments = [];
            if (rotationWeek === 1) { assignments.push({ id: 'task-kitchen', zone: 'Cuisine', person: 'A.' }, { id: 'task-bath', zone: 'SdB', person: 'K.' }, { id: 'task-living', zone: 'Salon', person: 'V.' }); }
            else if (rotationWeek === 2) { assignments.push({ id: 'task-kitchen', zone: 'Cuisine', person: 'K.' }, { id: 'task-bath', zone: 'SdB', person: 'V.' }, { id: 'task-living', zone: 'Salon', person: 'A.' }); }
            else { assignments.push({ id: 'task-kitchen', zone: 'Cuisine', person: 'V.' }, { id: 'task-bath', zone: 'SdB', person: 'A.' }, { id: 'task-living', zone: 'Salon', person: 'K.' }); }

            assignments.forEach(asgn => {
                const fullId = `${dateKey}_${asgn.id}`;
                const isDone = houseTasksState[fullId];
                const rotPill = document.createElement('div');
                rotPill.className = `w-full text-[8.5px] font-bold text-white px-1.5 py-1 rounded flex justify-between items-center mb-1 shadow-sm cursor-pointer transition-all hover:brightness-110 ${isDone ? 'ring-1 ring-white/50 ring-offset-1 ring-offset-green-500' : ''}`;
                rotPill.style.backgroundColor = cologColors[asgn.person] || '#ccc';
                rotPill.onclick = (e) => { e.stopPropagation(); window.toggleHouseTask(fullId); };
                rotPill.innerHTML = `<div class="flex items-center gap-1">${isDone ? '<span class="material-symbols-outlined text-[10px]">check_circle</span>' : '<div class="w-2 h-2 rounded-full border border-white/30"></div>'}<span>${asgn.zone}</span></div><span class="opacity-90">${asgn.person}</span>`;
                dayDiv.appendChild(rotPill);
            });
        }

        const recurrentTasks = [];
        if (dayOfWeek === 1) recurrentTasks.push({ id: 'task-1', task: "Recyclage", color: "#22c55e" });
        if (dayOfWeek === 3) recurrentTasks.push({ id: 'task-2', task: "Poubelles", color: "#4b5563" });
        if (dayOfWeek === 4) recurrentTasks.push({ id: 'task-3', task: "Compost", color: "#854d0e" });
        if (dayOfWeek === 0) recurrentTasks.push({ id: 'task-clean', task: "Entretien", color: "#2a5ea5" });

        recurrentTasks.forEach(rt => {
            const fullId = `${dateKey}_${rt.id}`;
            const isDone = houseTasksState[fullId];
            const pill = document.createElement('div');
            pill.className = `task-pill flex justify-between items-center gap-1 cursor-pointer transition-all hover:brightness-110 ${isDone ? 'opacity-100 ring-1 ring-white/50 ring-offset-1 ring-offset-green-500' : 'opacity-90'}`;
            pill.style.backgroundColor = rt.color; pill.style.fontSize = '9.5px'; pill.style.padding = '3px 6px';
            pill.onclick = (e) => { e.stopPropagation(); window.toggleHouseTask(fullId); };
            pill.innerHTML = `<span>${rt.task}</span>${isDone ? '<span class="material-symbols-outlined text-[11px]">check_circle</span>' : '<div class="w-2.5 h-2.5 rounded-full border border-white/30"></div>'}`;
            dayDiv.appendChild(pill);
        });
        
        dayTasks.forEach(t => {
            const pill = document.createElement('div'); pill.className = 'task-pill relative group'; pill.style.backgroundColor = cologColors[t.roommate] || '#ccc';
            pill.innerHTML = `${t.task}${editingTasks ? `<span onclick="event.stopPropagation(); window.deleteTask('${t.id}')" class="absolute -right-1 -top-1 bg-white text-error rounded-full w-3 h-3 flex items-center justify-center text-[8px] shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">×</span>` : ''}`;
            dayDiv.appendChild(pill);
        });
        container.appendChild(dayDiv);
    }
    const totalCells = container.children.length - 7;
    const remaining = 42 - totalCells;
    for (let i = 1; i <= remaining; i++) { const day = document.createElement('div'); day.className = 'calendar-day other-month'; day.innerHTML = `<span class="text-[10px] font-bold text-gray-300">${i}</span>`; container.appendChild(day); }
}

window.toggleHouseTask = async function(fullKey) {
    houseTasksState[fullKey] = !houseTasksState[fullKey];
    debouncedRender();
    try { await setDoc(doc(db, 'coloc_data', 'house_tasks'), houseTasksState); } catch (e) { console.error("Toggle house task error:", e); }
}

function updateHouseTaskUI(taskId) { debouncedRender(); }
function updateRotationWeek() { debouncedRender(); }

window.nextMonth = function() { currentMonthDate.setMonth(currentMonthDate.getMonth() + 1); renderCalendar(); }
window.prevMonth = function() { currentMonthDate.setMonth(currentMonthDate.getMonth() - 1); renderCalendar(); }

window.addEventListener('DOMContentLoaded', () => {
    try { initFirebaseSync(); updateContent(); window.switchTab('home'); } catch (e) { console.error("Init error:", e); }
});
