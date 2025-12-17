// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXJS3Ve1GLSCGRXnnTDuDI1ZLPjxQ4tOo",
  authDomain: "food-diary-a7e11.firebaseapp.com",
  projectId: "food-diary-a7e11",
  storageBucket: "food-diary-a7e11.firebasestorage.app",
  messagingSenderId: "359831072922",
  appId: "1:359831072922:web:817a5fd4b67f5b7339af23",
  measurementId: "G-991QH6R1J6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// State
let state = {
    entries: [],
    templates: [],
    customStomachStatuses: []
};

let currentUser = null;
let unsubscribeEntries = null;
let unsubscribeTemplates = null;

let currentMealItems = [];
let currentImageBase64 = null;
let currentEditingEntryId = null; // Track which entry is being edited
let expandedDays = new Set(); // Track which day sections are expanded

// DOM Elements
const entryForm = document.getElementById('entry-form');
const stomachForm = document.getElementById('stomach-form');
const foodNameInput = document.getElementById('food-name');
const caloriesInput = document.getElementById('calories');
const mealTypeInput = document.getElementById('meal-type');
const entryDateInput = document.getElementById('entry-date');
const entryTimeInput = document.getElementById('entry-time');
const entryImageInput = document.getElementById('entry-image');
const entryNotesInput = document.getElementById('entry-notes');
const imagePreview = document.getElementById('image-preview');
const saveTemplateBtn = document.getElementById('save-template-btn');
const templateList = document.getElementById('template-list');
const diaryList = document.getElementById('diary-list');
const totalCaloriesSpan = document.getElementById('total-calories');

// Auth Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userAvatarImg = document.getElementById('user-avatar');
const userNameSpan = document.getElementById('user-name');
const exportBtn = document.getElementById('export-btn');

const expandAllBtn = document.getElementById('expand-all-btn');
const collapseAllBtn = document.getElementById('collapse-all-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const submitEntryBtn = document.getElementById('submit-entry-btn');
const cancelMealEditBtn = document.getElementById('cancel-meal-edit-btn');
const cancelStomachEditBtn = document.getElementById('cancel-stomach-edit-btn');
const submitStomachBtn = document.getElementById('submit-stomach-btn');

// Meal Builder Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const mealNameInput = document.getElementById('meal-name');
const mealTypeCompositeInput = document.getElementById('meal-type-composite');
const subItemNameInput = document.getElementById('sub-item-name');
const subItemCaloriesInput = document.getElementById('sub-item-calories');
const addSubItemBtn = document.getElementById('add-sub-item-btn');
const mealItemsList = document.getElementById('meal-items-list');
const mealTotalCaloriesSpan = document.getElementById('meal-total-calories');
const addMealBtn = document.getElementById('add-meal-btn');
const saveMealTemplateBtn = document.getElementById('save-meal-template-btn');
const mealDateInput = document.getElementById('meal-date');
const mealTimeInput = document.getElementById('meal-time');
const mealNotesInput = document.getElementById('meal-notes');

// Stomach Form Elements
const stomachStatusSelect = document.getElementById('stomach-status');
const tasteDescriptionGroup = document.getElementById('taste-description-group');
const tasteDescriptionInput = document.getElementById('taste-description');
const customStatusGroup = document.getElementById('custom-status-group');
const customStatusInput = document.getElementById('custom-status-input');
const stomachDateInput = document.getElementById('stomach-date');
const stomachTimeInput = document.getElementById('stomach-time');
const stomachNotesInput = document.getElementById('stomach-notes');

// Initialization
function init() {
    // Wait for auth state
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            currentUser = user;
            showUserUI(user);
            subscribeToData(user.uid);
        } else {
            // No user is signed in.
            currentUser = null;
            showLoginUI();
            unsubscribeFromData();
            clearData();
        }
    });

    setDefaultDateTime();
}

// Auth Functions
function showUserUI(user) {
    loginBtn.classList.add('hidden');
    userInfoDiv.classList.remove('hidden');
    userInfoDiv.style.display = 'flex'; // Ensure flex display
    userAvatarImg.src = user.photoURL || 'https://via.placeholder.com/32';
    userNameSpan.textContent = user.displayName || user.email;
}

function showLoginUI() {
    loginBtn.classList.remove('hidden');
    userInfoDiv.classList.add('hidden');
    userInfoDiv.style.display = 'none';
}

function handleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        console.error("Login failed:", error);
        alert("Login failed: " + error.message);
    });
}

function handleLogout() {
    auth.signOut().catch(error => {
        console.error("Logout failed:", error);
    });
}

// Firestore Subscriptions
function subscribeToData(userId) {
    const userDocRef = db.collection('users').doc(userId);

    // Subscribe to Entries
    unsubscribeEntries = userDocRef.collection('entries')
        .orderBy('date', 'desc') // Order by date
        .onSnapshot(snapshot => {
            state.entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderEntries();
            updateSummary();
        }, error => {
            console.error("Error fetching entries:", error);
        });

    // Subscribe to Templates
    unsubscribeTemplates = userDocRef.collection('templates')
        .onSnapshot(snapshot => {
            state.templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTemplates();
        }, error => {
            console.error("Error fetching templates:", error);
        });
}

function unsubscribeFromData() {
    if (unsubscribeEntries) {
        unsubscribeEntries();
        unsubscribeEntries = null;
    }
    if (unsubscribeTemplates) {
        unsubscribeTemplates();
        unsubscribeTemplates = null;
    }
}

function clearData() {
    state.entries = [];
    state.templates = [];
    renderEntries();
    renderTemplates();
    updateSummary();
}

// Helper: Set default date/time to current values
function setDefaultDateTime() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);
    
    entryDateInput.value = dateStr;
    entryTimeInput.value = timeStr;
    mealDateInput.value = dateStr;
    mealTimeInput.value = timeStr;
    stomachDateInput.value = dateStr;
    stomachTimeInput.value = timeStr;
}

// Event Listeners
entryForm.addEventListener('submit', handleAddEntry);
entryImageInput.addEventListener('change', handleImageUpload);
stomachForm.addEventListener('submit', handleAddStomachEntry);
stomachStatusSelect.addEventListener('change', handleStomachStatusChange);
saveTemplateBtn.addEventListener('click', handleSaveTemplate);

loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
exportBtn.addEventListener('click', exportDataFallback);

expandAllBtn.addEventListener('click', handleExpandAll);
collapseAllBtn.addEventListener('click', handleCollapseAll);
cancelEditBtn.addEventListener('click', handleCancelEdit);
cancelMealEditBtn.addEventListener('click', handleCancelEdit);
cancelStomachEditBtn.addEventListener('click', handleCancelEdit);
const importBtn = document.getElementById('import-btn');
if(importBtn) importBtn.addEventListener('click', () => importFileInput.click());

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        
        const tabName = btn.dataset.tab;
        if (tabName === 'single') {
            document.getElementById('entry-form').classList.add('active');
        } else if (tabName === 'meal') {
            document.getElementById('meal-builder').classList.add('active');
        } else if (tabName === 'stomach') {
            document.getElementById('stomach-form').classList.add('active');
        }
    });
});

// Meal Builder Listeners
addSubItemBtn.addEventListener('click', handleAddSubItem);
addMealBtn.addEventListener('click', handleAddCompositeEntry);
saveMealTemplateBtn.addEventListener('click', handleSaveCompositeTemplate);

// Image Handling
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Resize logic (max width 800px)
            const MAX_WIDTH = 800;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            currentImageBase64 = canvas.toDataURL('image/jpeg', 0.7); // Compress to JPEG 70% quality
            
            // Show preview
            imagePreview.src = currentImageBase64;
            imagePreview.style.display = 'block';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Handlers - Single Item
function handleAddEntry(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert("Please login to add entries.");
        return;
    }

    const dateStr = entryDateInput.value;
    const timeStr = entryTimeInput.value;
    const dateTime = new Date(`${dateStr}T${timeStr}`).toISOString();

    const entryData = {
        date: dateTime,
        name: foodNameInput.value,
        calories: parseInt(caloriesInput.value) || 0,
        mealType: mealTypeInput.value,
        notes: entryNotesInput.value,
        image: currentImageBase64
    };

    const userEntriesRef = db.collection('users').doc(currentUser.uid).collection('entries');

    if (currentEditingEntryId) {
        // Update existing entry
        userEntriesRef.doc(currentEditingEntryId).update(entryData)
            .then(() => {
                console.log("Entry updated!");
                resetSingleItemForm();
            })
            .catch(error => {
                console.error("Error updating entry: ", error);
                alert("Error updating entry.");
            });
    } else {
        // Create new entry
        userEntriesRef.add(entryData)
            .then(() => {
                console.log("Entry added!");
                resetSingleItemForm();
            })
            .catch(error => {
                console.error("Error adding entry: ", error);
                alert("Error adding entry.");
            });
    }
}

function resetSingleItemForm() {
    currentEditingEntryId = null;
    submitEntryBtn.textContent = 'Add Entry';
    cancelEditBtn.classList.add('hidden');
    
    foodNameInput.value = '';
    caloriesInput.value = '';
    entryNotesInput.value = '';
    entryImageInput.value = '';
    imagePreview.style.display = 'none';
    imagePreview.src = '';
    currentImageBase64 = null;
    setDefaultDateTime();
    foodNameInput.focus();
}

function handleSaveTemplate() {
    if (!currentUser) {
        alert("Please login to save templates.");
        return;
    }

    const name = foodNameInput.value;
    const calories = caloriesInput.value;
    const mealType = mealTypeInput.value;

    if (!name) {
        alert('Please enter a food name to save as a template.');
        return;
    }

    const template = {
        name,
        calories: parseInt(calories) || 0,
        mealType
    };

    db.collection('users').doc(currentUser.uid).collection('templates').add(template)
        .then(() => {
            console.log("Template saved!");
        })
        .catch(error => {
            console.error("Error saving template: ", error);
            alert("Error saving template.");
        });
}

// Handlers - Meal Builder
function handleAddSubItem() {
    const name = subItemNameInput.value;
    const calories = parseInt(subItemCaloriesInput.value) || 0;

    if (!name) return;

    currentMealItems.push({ id: Date.now(), name, calories });
    renderMealBuilderItems();
    
    subItemNameInput.value = '';
    subItemCaloriesInput.value = '';
    subItemNameInput.focus();
}

function handleRemoveSubItem(id) {
    currentMealItems = currentMealItems.filter(item => item.id !== id);
    renderMealBuilderItems();
}



function renderMealBuilderItems() {
    mealItemsList.innerHTML = '';
    let total = 0;

    if (currentMealItems.length === 0) {
        mealItemsList.innerHTML = '<p class="empty-msg">No items added yet.</p>';
    } else {
        currentMealItems.forEach(item => {
            total += item.calories;
            const div = document.createElement('div');
            div.className = 'meal-item-row';
            div.innerHTML = `
                <span>${item.name}</span>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span>${item.calories} cal</span>
                    <button class="btn-delete" style="background:none; border:none; color:#999; cursor:pointer;">&times;</button>
                </div>
            `;
            div.querySelector('.btn-delete').addEventListener('click', () => handleRemoveSubItem(item.id));
            mealItemsList.appendChild(div);
        });
    }
    mealTotalCaloriesSpan.textContent = total;
}

function handleAddCompositeEntry() {
    if (!currentUser) {
        alert("Please login to add entries.");
        return;
    }

    const name = mealNameInput.value;
    if (!name) {
        alert('Please enter a meal name.');
        return;
    }
    if (currentMealItems.length === 0) {
        alert('Please add at least one item to the meal.');
        return;
    }

    const dateStr = mealDateInput.value;
    const timeStr = mealTimeInput.value;
    const dateTime = new Date(`${dateStr}T${timeStr}`).toISOString();
    const totalCalories = currentMealItems.reduce((sum, item) => sum + item.calories, 0);

    const entryData = {
        date: dateTime,
        name: name,
        calories: totalCalories,
        mealType: mealTypeCompositeInput.value,
        notes: mealNotesInput.value,
        items: [...currentMealItems]
    };

    const userEntriesRef = db.collection('users').doc(currentUser.uid).collection('entries');

    if (currentEditingEntryId) {
        // Update existing entry
        userEntriesRef.doc(currentEditingEntryId).update(entryData)
            .then(() => {
                console.log("Meal updated!");
                resetMealBuilderForm();
            })
            .catch(error => {
                console.error("Error updating meal: ", error);
                alert("Error updating meal.");
            });
    } else {
        // Create new entry
        userEntriesRef.add(entryData)
            .then(() => {
                console.log("Meal added!");
                resetMealBuilderForm();
            })
            .catch(error => {
                console.error("Error adding meal: ", error);
                alert("Error adding meal.");
            });
    }
}

function resetMealBuilderForm() {
    currentEditingEntryId = null;
    addMealBtn.textContent = 'Add Meal to Diary';
    cancelMealEditBtn.classList.add('hidden');
    
    mealNameInput.value = '';
    mealNotesInput.value = '';
    currentMealItems = [];
    renderMealBuilderItems();
    setDefaultDateTime();
}

function handleSaveCompositeTemplate() {
    if (!currentUser) {
        alert("Please login to save templates.");
        return;
    }

    const name = mealNameInput.value;
    if (!name) {
        alert('Please enter a meal name to save as a template.');
        return;
    }
    if (currentMealItems.length === 0) {
        alert('Please add at least one item to the meal.');
        return;
    }

    const totalCalories = currentMealItems.reduce((sum, item) => sum + item.calories, 0);

    const template = {
        name: name,
        calories: totalCalories,
        mealType: mealTypeCompositeInput.value,
        items: [...currentMealItems]
    };

    db.collection('users').doc(currentUser.uid).collection('templates').add(template)
        .then(() => {
            console.log("Meal template saved!");
        })
        .catch(error => {
            console.error("Error saving meal template: ", error);
            alert("Error saving meal template.");
        });
}

// Handlers - Stomach Diary
function handleStomachStatusChange() {
    const value = stomachStatusSelect.value;
    
    if (value === 'Lingering taste') {
        tasteDescriptionGroup.classList.remove('hidden');
        customStatusGroup.classList.add('hidden');
    } else if (value === 'Custom') {
        customStatusGroup.classList.remove('hidden');
        tasteDescriptionGroup.classList.add('hidden');
    } else {
        tasteDescriptionGroup.classList.add('hidden');
        customStatusGroup.classList.add('hidden');
    }
}

function handleAddStomachEntry(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert("Please login to add entries.");
        return;
    }

    const status = stomachStatusSelect.value;
    let finalStatus = status;
    let details = '';

    if (status === 'Lingering taste') {
        const taste = tasteDescriptionInput.value.trim();
        if (!taste) {
            alert('Please describe the taste.');
            return;
        }
        details = taste;
    } else if (status === 'Custom') {
        const custom = customStatusInput.value.trim();
        if (!custom) {
            alert('Please enter a custom status.');
            return;
        }
        finalStatus = custom;
        
        // Add to custom statuses if not already there
        // Note: We might want to persist custom statuses to Firestore too, but for now keeping it simple
        if (!state.customStomachStatuses) state.customStomachStatuses = [];
        if (!state.customStomachStatuses.includes(custom)) {
            state.customStomachStatuses.push(custom);
            renderStomachOptions();
        }
    }

    const dateStr = stomachDateInput.value;
    const timeStr = stomachTimeInput.value;
    const dateTime = new Date(`${dateStr}T${timeStr}`).toISOString();

    const entryData = {
        date: dateTime,
        type: 'stomach',
        status: finalStatus,
        details: details,
        notes: stomachNotesInput.value,
        calories: 0
    };

    const userEntriesRef = db.collection('users').doc(currentUser.uid).collection('entries');

    if (currentEditingEntryId) {
        // Update existing entry
        userEntriesRef.doc(currentEditingEntryId).update(entryData)
            .then(() => {
                console.log("Stomach entry updated!");
                resetStomachForm();
            })
            .catch(error => {
                console.error("Error updating stomach entry: ", error);
                alert("Error updating stomach entry.");
            });
    } else {
        // Create new entry
        userEntriesRef.add(entryData)
            .then(() => {
                console.log("Stomach entry added!");
                resetStomachForm();
            })
            .catch(error => {
                console.error("Error adding stomach entry: ", error);
                alert("Error adding stomach entry.");
            });
    }
}

function resetStomachForm() {
    currentEditingEntryId = null;
    submitStomachBtn.textContent = 'Add Entry';
    cancelStomachEditBtn.classList.add('hidden');
    
    stomachStatusSelect.value = 'Normal';
    tasteDescriptionInput.value = '';
    customStatusInput.value = '';
    stomachNotesInput.value = '';
    handleStomachStatusChange();
    setDefaultDateTime();
}

function renderStomachOptions() {
    // Keep default options
    const defaultOptions = ['Normal', 'Bloated', 'Hard', 'Lingering taste', 'Gas'];
    
    // Clear existing options but keep defaults and Custom
    stomachStatusSelect.innerHTML = '';
    
    defaultOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        stomachStatusSelect.appendChild(option);
    });

    // Add custom options
    if (state.customStomachStatuses) {
        state.customStomachStatuses.forEach(opt => {
            // Avoid duplicates if user added a default one as custom somehow
            if (!defaultOptions.includes(opt)) {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                stomachStatusSelect.appendChild(option);
            }
        });
    }

    // Add Custom option at the end
    const customOption = document.createElement('option');
    customOption.value = 'Custom';
    customOption.textContent = 'Custom...';
    stomachStatusSelect.appendChild(customOption);
}

// Shared Handlers
function handleUseTemplate(template) {
    if (template.items && template.items.length > 0) {
        // Switch to Meal Builder Tab
        document.querySelector('.tab-btn[data-tab="meal"]').click();
        
        mealNameInput.value = template.name;
        mealTypeCompositeInput.value = template.mealType;
        currentMealItems = template.items.map(item => ({...item, id: Date.now() + Math.random()})); // New IDs
        renderMealBuilderItems();
    } else {
        // Switch to Single Item Tab
        document.querySelector('.tab-btn[data-tab="single"]').click();
        
        foodNameInput.value = template.name;
        caloriesInput.value = template.calories;
        mealTypeInput.value = template.mealType;
    }
}

function handleDeleteEntry(id) {
    if (!currentUser) return;
    
    if (confirm("Are you sure you want to delete this entry?")) {
        db.collection('users').doc(currentUser.uid).collection('entries').doc(id).delete()
            .then(() => {
                console.log("Entry deleted!");
            })
            .catch(error => {
                console.error("Error deleting entry: ", error);
                alert("Error deleting entry.");
            });
    }
}

function handleDeleteTemplate(id, event) {
    event.stopPropagation();
    if (!currentUser) return;

    if (confirm("Are you sure you want to delete this template?")) {
        db.collection('users').doc(currentUser.uid).collection('templates').doc(id).delete()
            .then(() => {
                console.log("Template deleted!");
            })
            .catch(error => {
                console.error("Error deleting template: ", error);
                alert("Error deleting template.");
            });
    }
}

// Edit functionality
function loadEntryForEdit(entryId) {
    const entry = state.entries.find(e => e.id === entryId);
    if (!entry) return;

    currentEditingEntryId = entryId;
    const entryDate = new Date(entry.date);
    const dateStr = entryDate.toISOString().slice(0, 10);
    const timeStr = entryDate.toTimeString().slice(0, 5);

    if (entry.type === 'stomach') {
        // Load stomach form
        document.querySelector('.tab-btn[data-tab="stomach"]').click();
        stomachDateInput.value = dateStr;
        stomachTimeInput.value = timeStr;
        stomachStatusSelect.value = entry.status;
        stomachNotesInput.value = entry.notes || '';
        
        if (entry.status === 'Lingering taste') {
            tasteDescriptionInput.value = entry.details;
            tasteDescriptionGroup.classList.remove('hidden');
        }
        
        submitStomachBtn.textContent = 'Update Entry';
        cancelStomachEditBtn.classList.remove('hidden');
    } else if (entry.items && entry.items.length > 0) {
        // Load meal builder
        document.querySelector('.tab-btn[data-tab="meal"]').click();
        mealDateInput.value = dateStr;
        mealTimeInput.value = timeStr;
        mealNameInput.value = entry.name;
        mealTypeCompositeInput.value = entry.mealType;
        mealNotesInput.value = entry.notes || '';
        currentMealItems = entry.items.map(item => ({...item, id: item.id}));
        renderMealBuilderItems();
        
        addMealBtn.textContent = 'Update Meal';
        cancelMealEditBtn.classList.remove('hidden');
    } else {
        // Load single item form
        document.querySelector('.tab-btn[data-tab="single"]').click();
        entryDateInput.value = dateStr;
        entryTimeInput.value = timeStr;
        foodNameInput.value = entry.name;
        caloriesInput.value = entry.calories;
        mealTypeInput.value = entry.mealType;
        entryNotesInput.value = entry.notes || '';
        
        if (entry.image) {
            currentImageBase64 = entry.image;
            imagePreview.src = entry.image;
            imagePreview.style.display = 'block';
        } else {
            currentImageBase64 = null;
            imagePreview.style.display = 'none';
            imagePreview.src = '';
        }

        submitEntryBtn.textContent = 'Update Entry';
        cancelEditBtn.classList.remove('hidden');
    }
}

function handleCancelEdit() {
    resetSingleItemForm();
    resetMealBuilderForm();
    resetStomachForm();
    
    document.querySelector('.tab-btn[data-tab="single"]').click();
}

function handleExpandAll() {
    document.querySelectorAll('.day-section').forEach(section => {
        section.classList.add('expanded');
        const dayKey = section.dataset.dayKey;
        expandedDays.add(dayKey);
    });
}

function handleCollapseAll() {
    document.querySelectorAll('.day-section').forEach(section => {
        section.classList.remove('expanded');
        const dayKey = section.dataset.dayKey;
        expandedDays.delete(dayKey);
    });
}

function toggleDaySection(dayKey) {
    const section = document.querySelector(`.day-section[data-day-key="${dayKey}"]`);
    section.classList.toggle('expanded');
    
    if (section.classList.contains('expanded')) {
        expandedDays.add(dayKey);
    } else {
        expandedDays.delete(dayKey);
    }
}

// Rendering
function formatDateTime(isoString) {
    const date = new Date(isoString);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = daysOfWeek[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${dayName}, ${monthName} ${day}, ${hours}:${minutes} ${ampm}`;
}

function getDayKey(isoString) {
    const date = new Date(isoString);
    return date.toDateString();
}

function renderEntries() {
    diaryList.innerHTML = '';
    
    if (state.entries.length === 0) {
        diaryList.innerHTML = '<p style="text-align:center; color:#999; padding: 20px;">No entries yet.</p>';
        return;
    }

    // Group entries by day
    const groupedByDay = {};
    state.entries.forEach(entry => {
        const dayKey = getDayKey(entry.date);
        if (!groupedByDay[dayKey]) {
            groupedByDay[dayKey] = [];
        }
        groupedByDay[dayKey].push(entry);
    });

    // Sort days (today first, then backwards in time)
    const today = new Date().toDateString();
    const sortedDays = Object.keys(groupedByDay).sort((a, b) => {
        if (a === today) return -1;
        if (b === today) return 1;
        return new Date(b) - new Date(a);
    });

    // Render each day section
    sortedDays.forEach(dayKey => {
        const dayEntries = groupedByDay[dayKey];
        const isToday = dayKey === today;
        const dayDate = new Date(dayKey);
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayName = daysOfWeek[dayDate.getDay()];
        const monthName = months[dayDate.getMonth()];
        const day = dayDate.getDate();
        const dayLabel = isToday ? `Today (${dayName}, ${monthName} ${day})` : `${dayName}, ${monthName} ${day}`;

        // Create day section
        const daySection = document.createElement('div');
        daySection.className = 'day-section' + (isToday ? ' expanded' : '');
        daySection.dataset.dayKey = dayKey;
        
        // On load, today should be expanded
        if (isToday) {
            expandedDays.add(dayKey);
        }

        // Day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = `
            <button class="day-toggle" style="background:none; border:none; cursor:pointer; font-size:1.2rem; padding:0; margin-right:8px;">▼</button>
            <h3 style="margin:0; flex:1;">${dayLabel}</h3>
            <span class="day-entry-count" style="color:#999; font-size:0.9rem;">${dayEntries.length} entries</span>
        `;
        dayHeader.addEventListener('click', () => toggleDaySection(dayKey));
        daySection.appendChild(dayHeader);

        // Day entries container
        const dayEntriesContainer = document.createElement('div');
        dayEntriesContainer.className = 'day-entries-container';

        dayEntries.forEach(entry => {
            const div = document.createElement('div');
            
            if (entry.type === 'stomach') {
                div.className = 'diary-entry stomach-entry';
                div.innerHTML = `
                    <div class="entry-info">
                        <h4>${formatDateTime(entry.date)}</h4>
                        <h5>Stomach: ${entry.status}</h5>
                        <span>${entry.details ? 'Details: ' + entry.details : ''}</span>
                        ${entry.notes ? `<div class="entry-notes"><strong>Notes:</strong> ${entry.notes}</div>` : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <button class="btn-edit" style="background:none; border:none; color:#4a90e2; cursor:pointer; font-size:0.85rem; text-decoration:underline;">Edit</button>
                        <button class="btn-delete" style="background:none; border:none; color:#999; cursor:pointer; font-size:1.2rem;">&times;</button>
                    </div>
                `;
            } else {
                const isComposite = entry.items && entry.items.length > 0;
                
                let itemsHtml = '';
                if (isComposite) {
                    itemsHtml = `<div style="font-size:0.8rem; color:#666; margin-top:4px;">
                        ${entry.items.map(i => i.name).join(', ')}
                    </div>`;
                }

                div.className = 'diary-entry';
                div.innerHTML = `
                    <div class="entry-info">
                        <h4>${formatDateTime(entry.date)}</h4>
                        <span>${entry.mealType}</span>
                        <h5>${entry.name}</h5>
                        ${itemsHtml}
                        ${entry.image ? `<img src="${entry.image}" style="max-width: 100px; max-height: 100px; margin-top: 5px; border-radius: 4px; display: block;">` : ''}
                        ${entry.notes ? `<div class="entry-notes"><strong>Notes:</strong> ${entry.notes}</div>` : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span class="entry-calories">${entry.calories} cal</span>
                        <button class="btn-edit" style="background:none; border:none; color:#4a90e2; cursor:pointer; font-size:0.85rem; text-decoration:underline;">Edit</button>
                        <button class="btn-delete" style="background:none; border:none; color:#999; cursor:pointer; font-size:1.2rem;">&times;</button>
                    </div>
                `;
            }
            
            div.querySelector('.btn-edit').addEventListener('click', () => loadEntryForEdit(entry.id));
            div.querySelector('.btn-delete').addEventListener('click', () => handleDeleteEntry(entry.id));
            dayEntriesContainer.appendChild(div);
        });

        daySection.appendChild(dayEntriesContainer);
        diaryList.appendChild(daySection);
    });
}

function renderTemplates() {
    templateList.innerHTML = '';
    
    if (state.templates.length === 0) {
        templateList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">No templates saved yet.</p>';
        return;
    }

    state.templates.forEach(template => {
        const isComposite = template.items && template.items.length > 0;
        const div = document.createElement('div');
        div.className = 'template-item';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h4>${template.name} ${isComposite ? '<span style="font-size:0.7rem; background:#eee; padding:2px 4px; border-radius:3px;">Meal</span>' : ''}</h4>
                    <p>${template.mealType} • ${template.calories} cal</p>
                </div>
                <button class="btn-delete" style="background:none; border:none; color:#999; cursor:pointer;">&times;</button>
            </div>
        `;
        
        div.addEventListener('click', () => handleUseTemplate(template));
        div.querySelector('.btn-delete').addEventListener('click', (e) => handleDeleteTemplate(template.id, e));
        
        templateList.appendChild(div);
    });
}

function updateSummary() {
    const total = state.entries.reduce((sum, entry) => sum + entry.calories, 0);
    totalCaloriesSpan.textContent = total;
}

// Persistence - File Only
function saveToLocalStorage() {
    // Deprecated - use autoSave() for file-based storage instead
    console.warn('saveToLocalStorage is deprecated. Use autoSave() for file storage.');
}

function loadFromLocalStorage() {
    // Deprecated - use handleOpenFile() to load a file instead
    console.warn('loadFromLocalStorage is deprecated. Use handleOpenFile() to load a file.');
}

// File System Access API
async function handleCreateNewFile() {
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
                suggestedName: `food-diary-${new Date().toISOString().slice(0,10)}.json`
            });
            
            fileHandle = handle;
            state = { entries: [], templates: [], customStomachStatuses: [] };
            await autoSave();
            
            const file = await fileHandle.getFile();
            fileStatusSpan.innerHTML = `✓ Created: <strong>${file.name}</strong>`;
            renderTemplates();
            renderEntries();
            updateSummary();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                alert('Error creating file.');
            }
        }
    } else {
        alert('File creation not supported. Please use "Save As..." button.');
    }
}

async function handleOpenFile() {
    if ('showOpenFilePicker' in window) {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            
            fileHandle = handle;
            const file = await fileHandle.getFile();
            const contents = await file.text();
            
            processImportedData(contents);
            fileStatusSpan.innerHTML = `✓ Opened: <strong>${file.name}</strong>`;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                alert('Error opening file.');
            }
        }
    } else {
        // Fallback - trigger visible import button instead so Simple Browser users can open files
        importFileInput.click();
    }
}

async function handleSaveFileAs() {
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
                suggestedName: `food-diary-backup-${new Date().toISOString().slice(0,10)}.json`
            });
            
            fileHandle = handle;
            await autoSave();
            
            const file = await fileHandle.getFile();
            fileStatusSpan.innerHTML = `✓ Saved: <strong>${file.name}</strong>`;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                alert('Error saving file.');
            }
        }
    } else {
        // Fallback
        exportDataFallback();
    }
}

async function autoSave() {
    if (fileHandle) {
        try {
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(state, null, 2));
            await writable.close();
            console.log('Auto-saved to file.');
        } catch (err) {
            console.error('Auto-save failed:', err);
            fileStatusSpan.innerHTML = '⚠️ Auto-save failed (permission lost?)';
        }
    } else {
        console.warn('No file handle available. Data not saved to file. Click "Open File" or "Create New".');
    }
}

// Fallback Import/Export
function exportDataFallback() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `food-diary-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importDataFallback(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        processImportedData(e.target.result);
        event.target.value = '';
    };
    reader.readAsText(file);
}

function processImportedData(jsonString) {
    try {
        const importedState = JSON.parse(jsonString);
        if (Array.isArray(importedState.entries) && Array.isArray(importedState.templates)) {
            state = importedState;
            if (!state.customStomachStatuses) state.customStomachStatuses = [];
            renderTemplates();
            renderEntries();
            updateSummary();
            renderStomachOptions();
            alert('Data loaded successfully!');
        } else {
            alert('Invalid file format.');
        }
    } catch (err) {
        console.error(err);
        alert('Error reading file.');
    }
}

// Start App
init();
