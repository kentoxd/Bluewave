import { 
    db, auth, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, 
    query, where, orderBy, onSnapshot, signOut, onAuthStateChanged,
    forceAddRoomsToFirebase, updateRoomStock, restoreRoomStock, checkRoomAvailability,
    cleanupDuplicateRooms
} from './firebase-config.js';

let currentUser = null;
let reservations = [];
let rooms = [];
let contacts = [];
let currentReplyContactId = null;
let currentRoomId = null;

document.addEventListener('DOMContentLoaded', async () => {
('🚀 Initializing Admin Dashboard...');
    
    // Show admin UI immediately - don't wait for data loading
    showAdminInitialUI();
    
    try {
        // Set up authentication state listener immediately (non-blocking)
        onAuthStateChanged(auth, (user) => {
('🔐 Auth state changed:', user ? `User: ${user.email}` : 'No user');
            if (user) {
        const adminEmails = ['admin@bluewaveresort.com', 'manager@bluewaveresort.com', 'supervisor@bluewaveresort.com', 'wendellcruz398@gmail.com'];
                
('📧 Checking admin access for:', user.email);
('📧 Admin emails:', adminEmails);
                
                if (adminEmails.includes(user.email)) {
                    currentUser = user;
('✅ Admin logged in:', user.email);
                    loadAdminContent();
                } else {
('❌ Unauthorized access attempt:', user.email);
                    alert('Unauthorized access. Only admins can access this page.');
                    window.location.href = 'index.html';
                }
            } else {
('❌ No user logged in');
                window.location.href = 'index.html';
            }
        });
        
        setupEventListeners();
('✅ Admin dashboard initialized successfully!');
        
    } catch (error) {
('❌ Error initializing admin dashboard:', error);
        showAdminFallbackUI();
    }
});

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (e) => {
            const target = e.target.getAttribute('href');
            if (target === '#reservations') {
                loadReservationsTable();
            } else if (target === '#rooms') {
                loadRoomsTable();
            } else if (target === '#contacts') {
                loadContactsTable();
            }
        });
    });
    
    // Image preview and processing
    const roomImageInput = document.getElementById('roomImage');
    if (roomImageInput) {
        roomImageInput.addEventListener('change', handleImageUpload);
    }
    
    // Listen for cross-tab synchronization
    window.addEventListener('storage', (e) => {
        if (e.key === 'roomsUpdated') {
('🔄 Rooms updated in another tab, refreshing...');
            loadRoomsTable();
        } else if (e.key === 'contactUpdated') {
('🔄 Contact messages updated in another tab, refreshing...');
            loadContacts();
            loadContactsTable();
        }
    });
}

function showAdminInitialUI() {
('🎨 Showing admin UI immediately...');
    
    // Show loading states for all tables
    showAdminLoadingStates();
}

function showAdminLoadingStates() {
    // Show loading for reservations table
    const reservationsTable = document.getElementById('reservationsTable');
    if (reservationsTable) {
        reservationsTable.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading reservations...</span>
                    </div>
                    <p class="mt-2 mb-0">Loading reservations...</p>
                </td>
            </tr>
        `;
    }
    
    // Show loading for rooms table
    const roomsTable = document.getElementById('roomsTable');
    if (roomsTable) {
        roomsTable.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading rooms...</span>
                    </div>
                    <p class="mt-2 mb-0">Loading rooms...</p>
                </td>
            </tr>
        `;
    }
    
    // Show loading for contacts table
    const contactsTable = document.getElementById('contactsTable');
    if (contactsTable) {
        contactsTable.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading contacts...</span>
                    </div>
                    <p class="mt-2 mb-0">Loading contacts...</p>
                </td>
            </tr>
        `;
    }
    
    // Show loading for stats cards
    const statsElements = ['totalReservations', 'confirmedReservations', 'pendingReservations', 'totalContacts'];
    statsElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        }
    });
}

function showAdminFallbackUI() {
('🔄 Showing admin fallback UI...');
    
    // Show error states
    const reservationsTable = document.getElementById('reservationsTable');
    if (reservationsTable) {
        reservationsTable.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p class="mt-2 mb-0">Failed to load reservations</p>
                </td>
            </tr>
        `;
    }
}

async function loadAdminContent() {
('📊 Loading admin content...');
    
    try {
('🔄 Starting to load all data in parallel...');
        
        // Load all data in parallel instead of sequentially
        const [reservationsResult, roomsResult, contactsResult, usersResult] = await Promise.allSettled([
            loadReservations(),
            loadRooms(),
            loadContacts(),
            loadUsers()
        ]);
        
        // Handle results
        if (reservationsResult.status === 'fulfilled') {
('✅ Reservations loaded successfully');
        } else {
('❌ Failed to load reservations:', reservationsResult.reason);
        }
        
        if (roomsResult.status === 'fulfilled') {
('✅ Rooms loaded successfully');
        } else {
('❌ Failed to load rooms:', roomsResult.reason);
        }
        
        if (contactsResult.status === 'fulfilled') {
('✅ Contacts loaded successfully');
        } else {
('❌ Failed to load contacts:', contactsResult.reason);
        }
        
        if (usersResult.status === 'fulfilled') {
('✅ Users loaded successfully');
        } else {
('❌ Failed to load users:', usersResult.reason);
        }
        
('📊 Data loaded - Rooms:', rooms.length, 'Reservations:', reservations.length, 'Contacts:', contacts.length, 'Users:', users.length);
        
        // Update UI with loaded data
        updateStatsCards();
        loadReservationsTable();
        loadRoomsTable();
        loadContactsTable();
        loadUsersTable();
        
('✅ Admin content loaded successfully');
        
    } catch (error) {
('❌ Error loading admin content:', error);
        showAlert('Failed to load admin content: ' + error.message, 'error');
    }
}

async function loadReservations() {
    try {
('📅 Loading reservations...');
        const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
        reservations = reservationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fix reservations with missing guest names
        const reservationsToUpdate = reservations.filter(r => !r.guestName || r.guestName === 'undefined');
        if (reservationsToUpdate.length > 0) {
('🔧 Fixing', reservationsToUpdate.length, 'reservations with missing guest names...');
            
            for (const reservation of reservationsToUpdate) {
                try {
                    const updateData = {
                        guestName: reservation.userEmail || 'Guest',
                        guestEmail: reservation.userEmail || reservation.guestEmail || 'No email',
                        updatedAt: new Date().toISOString()
                    };
                    
                    await updateDoc(doc(db, 'reservations', reservation.id), updateData);
                    
                    // Update local data
                    const index = reservations.findIndex(r => r.id === reservation.id);
                    if (index !== -1) {
                        reservations[index] = { ...reservations[index], ...updateData };
                    }
                } catch (error) {
('❌ Error updating reservation', reservation.id, ':', error);
                }
            }
            
('✅ Fixed reservations with missing guest names');
        }
        
('✅ Reservations loaded:', reservations.length);
    } catch (error) {
('❌ Error loading reservations:', error);
        throw error;
    }
}

async function loadRooms() {
    try {
('🏠 Loading rooms...');
        const roomsSnapshot = await getDocs(collection(db, 'rooms'));
        rooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
('✅ Rooms loaded:', rooms.length);
        
        // If no rooms found, initialize with sample data
        if (rooms.length === 0) {
('📝 No rooms found, initializing with sample data...');
            await forceAddRoomsToFirebase();
            // Reload rooms after adding sample data
            const newRoomsSnapshot = await getDocs(collection(db, 'rooms'));
            rooms = newRoomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
('✅ Sample rooms loaded:', rooms.length);
        }
    } catch (error) {
('❌ Error loading rooms:', error);
        throw error;
    }
}

async function loadContacts() {
    try {
('📧 Loading contact messages...');
        const contactsSnapshot = await getDocs(collection(db, 'contactSubmissions'));
        contacts = contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
('✅ Contact messages loaded:', contacts.length);
    } catch (error) {
('❌ Error loading contact messages:', error);
        throw error;
    }
}

function updateStatsCards() {
    const totalReservations = reservations.length;
    const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;
    const pendingReservations = reservations.filter(r => r.status === 'pending').length;
    const totalContacts = contacts.length;
    const totalUsers = users.length;
    
    document.getElementById('totalReservations').textContent = totalReservations;
    document.getElementById('confirmedReservations').textContent = confirmedReservations;
    document.getElementById('pendingReservations').textContent = pendingReservations;
    document.getElementById('totalContacts').textContent = totalContacts;
    document.getElementById('totalUsers').textContent = totalUsers;
}

function loadReservationsTable() {
    const tableBody = document.getElementById('reservationsTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = reservations.map(reservation => `
        <tr>
            <td>${reservation.id.substring(0, 8)}...</td>
            <td>${reservation.guestName || reservation.userEmail || 'Unknown Guest'}</td>
            <td>${reservation.guestEmail || reservation.userEmail || 'No email'}</td>
            <td>${reservation.roomName}</td>
            <td>${new Date(reservation.checkIn).toLocaleDateString()}</td>
            <td>${new Date(reservation.checkOut).toLocaleDateString()}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(reservation.status)}">
                    ${reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                </span>
            </td>
            <td>
                <div class="btn-group" role="group">
                    ${reservation.status === 'pending' ? 
                        `<button onclick="updateReservationStatus('${reservation.id}', 'confirmed')" class="btn btn-success btn-sm">
                            <i class="bi bi-check"></i> Confirm
                        </button>` : ''}
                    ${reservation.status === 'confirmed' ? 
                        `<button onclick="updateReservationStatus('${reservation.id}', 'completed')" class="btn btn-info btn-sm">
                            <i class="bi bi-check-all"></i> Complete
                        </button>` : ''}
                    <button onclick="cancelReservation('${reservation.id}')" class="btn btn-warning btn-sm">
                        <i class="bi bi-x"></i> Cancel
                    </button>
                    <button onclick="deleteReservation('${reservation.id}')" class="btn btn-danger btn-sm">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadRoomsTable() {
    const tableBody = document.getElementById('roomsTable');
    if (!tableBody) {
('⚠️ Rooms table body not found');
        return;
    }
    
('🏠 Loading rooms table with', rooms.length, 'rooms');
    
    if (rooms.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-house-door" style="font-size: 2rem;"></i>
                    <p class="mt-2 mb-0">No rooms found</p>
                    <small>Click "Add Room" to create your first room</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = rooms.map(room => `
        <tr>
            <td>
                <div>
                    <strong>${room.name}</strong>
                    ${room.description ? `<br><small class="text-muted">${room.description.substring(0, 50)}${room.description.length > 50 ? '...' : ''}</small>` : ''}
                </div>
            </td>
            <td>
                <span class="fw-bold text-success">₱${room.price.toLocaleString()}</span>
                <br><small class="text-muted">per night</small>
            </td>
            <td>
                <span class="badge ${room.stock > 0 ? 'bg-success' : 'bg-danger'}">
                    ${room.stock} available
                </span>
                <br><small class="text-muted">of ${room.totalStock || room.stock} total</small>
            </td>
            <td>
                <span class="badge ${room.status === 'available' ? 'bg-success' : 'bg-danger'}">
                    ${room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                </span>
            </td>
            <td>
                <img src="${room.image}" alt="${room.name}" class="room-image-thumbnail" 
                     style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #dee2e6;"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA2MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjhmOWZhIi8+CjxwYXRoIGQ9Ik0yMCAxNUg0MFYyNUgyMFYxNVoiIGZpbGw9IiNkZWUyZTYiLz4KPHBhdGggZD0iTTI1IDIwSDM1VjI1SDI1VjIwWiIgZmlsbD0iI2FkYjViYyIvPgo8L3N2Zz4K'">
                ${room.image && room.image.startsWith('data:') ? '<br><small class="text-success">✓ Processed Image</small>' : ''}
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button onclick="editRoom('${room.id}')" class="btn btn-primary btn-sm" title="Edit Room">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button onclick="deleteRoom('${room.id}')" class="btn btn-danger btn-sm" title="Delete Room">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadContactsTable() {
    const tableBody = document.getElementById('contactsTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = contacts.map(contact => `
        <tr class="${contact.status === 'new' ? 'table-warning' : ''}">
            <td><strong>${contact.name}</strong></td>
            <td>${contact.email}</td>
            <td>
                <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                     title="${contact.message}">
                    ${contact.message}
                </div>
            </td>
            <td>${new Date(contact.createdAt).toLocaleDateString()}</td>
            <td>
                <span class="badge ${getContactStatusBadgeClass(contact.status)}">
                    ${contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                </span>
            </td>
            <td>
                <div class="btn-group" role="group">
                    ${contact.status === 'new' ? 
                        `<button onclick="markContactAsRead('${contact.id}')" class="btn btn-success btn-sm">
                            <i class="bi bi-check"></i> Mark Read
                        </button>` : ''}
                    <button onclick="replyToContact('${contact.id}')" class="btn btn-primary btn-sm">
                        <i class="bi bi-reply"></i> Reply
                    </button>
                    <button onclick="deleteContact('${contact.id}')" class="btn btn-danger btn-sm">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'confirmed': return 'bg-success';
        case 'pending': return 'bg-warning';
        case 'completed': return 'bg-info';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function getContactStatusBadgeClass(status) {
    switch (status) {
        case 'new': return 'bg-warning';
        case 'read': return 'bg-info';
        case 'replied': return 'bg-success';
        default: return 'bg-secondary';
    }
}

// Reservation Management Functions
async function updateReservationStatus(reservationId, newStatus) {
    try {
        const reservation = reservations.find(r => r.id === reservationId);
        if (!reservation) {
            showAlert('Reservation not found', 'error');
            return;
        }
        
        await updateDoc(doc(db, 'reservations', reservationId), {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });
        
        // Update local data
        const reservationIndex = reservations.findIndex(r => r.id === reservationId);
        if (reservationIndex !== -1) {
            reservations[reservationIndex].status = newStatus;
            reservations[reservationIndex].updatedAt = new Date().toISOString();
        }
        
        // Handle room stock restoration for completed/cancelled reservations
        if (newStatus === 'completed' || newStatus === 'cancelled') {
            const room = rooms.find(r => r.name === reservation.roomName);
            if (room) {
                const stockRestore = await restoreRoomStock(room.id);
                if (stockRestore.success) {
('📦 Room stock restored after reservation completion');
                    await loadRooms();
                    showAlert(`Reservation ${newStatus} successfully! Room stock restored.`, 'success');
                } else {
('❌ Failed to restore room stock:', stockRestore.error);
                    showAlert(`Reservation ${newStatus} successfully! (Note: Stock restoration failed)`, 'warning');
                }
            } else {
                showAlert(`Reservation ${newStatus} successfully! (Note: Room ID not found)`, 'warning');
            }
        } else {
            showAlert(`Reservation ${newStatus} successfully!`, 'success');
        }
        
        loadAdminContent();
    } catch (error) {
('❌ Error updating reservation:', error);
        showAlert('Failed to update reservation', 'error');
    }
}

async function cancelReservation(reservationId) {
    if (confirm('Are you sure you want to cancel this reservation?')) {
        try {
            const reservation = reservations.find(r => r.id === reservationId);
            if (!reservation) {
                showAlert('Reservation not found', 'error');
                return;
            }
            
            await updateDoc(doc(db, 'reservations', reservationId), {
                status: 'cancelled',
                updatedAt: new Date().toISOString()
            });
            
            // Restore room stock
            const room = rooms.find(r => r.name === reservation.roomName);
            if (room) {
                const stockRestore = await restoreRoomStock(room.id);
                if (stockRestore.success) {
('📦 Room stock restored after reservation cancellation');
                    await loadRooms();
                    showAlert('Reservation cancelled successfully! Room stock restored.', 'success');
                } else {
('❌ Failed to restore room stock:', stockRestore.error);
                    showAlert('Reservation cancelled successfully! (Note: Stock restoration failed)', 'warning');
                }
            } else {
                showAlert('Reservation cancelled successfully! (Note: Room ID not found)', 'warning');
            }
            
            loadAdminContent();
        } catch (error) {
('❌ Error cancelling reservation:', error);
            showAlert('Failed to cancel reservation', 'error');
        }
    }
}

async function deleteReservation(reservationId) {
    if (confirm('Are you sure you want to permanently delete this reservation? This action cannot be undone.')) {
        try {
            await deleteDoc(doc(db, 'reservations', reservationId));
            
            // Remove from local data
            reservations = reservations.filter(r => r.id !== reservationId);
            
('🗑️ Reservation permanently deleted (stock not restored)');
            showAlert('Reservation permanently deleted! (Note: Room stock was not restored)', 'success');
            loadAdminContent();
        } catch (error) {
('❌ Error deleting reservation:', error);
            showAlert('Failed to delete reservation', 'error');
        }
    }
}

// Contact Management Functions
async function markContactAsRead(contactId) {
    try {
        await updateDoc(doc(db, 'contactSubmissions', contactId), {
            status: 'read',
            updatedAt: new Date().toISOString()
        });
        
        // Update local data
        const contactIndex = contacts.findIndex(c => c.id === contactId);
        if (contactIndex !== -1) {
            contacts[contactIndex].status = 'read';
            contacts[contactIndex].updatedAt = new Date().toISOString();
        }
        
        loadContactsTable();
        updateStatsCards();
        showAlert('Contact marked as read', 'success');
    } catch (error) {
('❌ Error marking contact as read:', error);
        showAlert('Failed to mark contact as read', 'error');
    }
}

function replyToContact(contactId) {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) {
        showAlert('Contact not found', 'error');
        return;
    }
    
    currentReplyContactId = contactId;
    
    // Pre-fill the reply form
    document.getElementById('replySubject').value = `Re: ${contact.message.substring(0, 50)}...`;
    document.getElementById('replyMessage').value = `Dear ${contact.name},\n\nThank you for contacting Blue Wave Resort. `;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('replyModal'));
    modal.show();
}

async function sendReply() {
    if (!currentReplyContactId) return;
    
    const contact = contacts.find(c => c.id === currentReplyContactId);
    if (!contact) return;
    
    const subject = document.getElementById('replySubject').value.trim();
    const message = document.getElementById('replyMessage').value.trim();
    const viaEmail = document.getElementById('replyViaEmail').checked;
    const saveToHistory = document.getElementById('replySaveToHistory').checked;
    
    if (!subject || !message) {
        showAlert('Please fill in both subject and message', 'error');
        return;
    }
    
    try {
        if (saveToHistory) {
            const replyData = {
                contactId: currentReplyContactId,
                subject: subject,
                message: message,
                adminName: currentUser?.displayName || 'Admin',
                adminEmail: currentUser?.email || 'admin@bluewave.com',
                createdAt: new Date().toISOString(),
                type: 'reply'
            };
            
            await addDoc(collection(db, 'contactReplies'), replyData);
        }
        
        if (viaEmail) {
            const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
            window.open(mailtoLink);
        }
        
        await updateDoc(doc(db, 'contactSubmissions', currentReplyContactId), {
            status: 'replied',
            updatedAt: new Date().toISOString(),
            lastReplyAt: new Date().toISOString()
        });
        
        showAlert('Reply sent successfully!', 'success');
        
        // Close modal
        const replyModal = bootstrap.Modal.getInstance(document.getElementById('replyModal'));
        replyModal.hide();
        
        // Refresh data
        await loadContacts();
        loadContactsTable();
        updateStatsCards();
        
    } catch (error) {
('❌ Error sending reply:', error);
        showAlert('Failed to send reply', 'error');
    }
}

async function deleteContact(contactId) {
    if (confirm('Are you sure you want to delete this contact message?')) {
        try {
            await deleteDoc(doc(db, 'contactSubmissions', contactId));
            
            // Remove from local data
            contacts = contacts.filter(c => c.id !== contactId);
            
            loadContactsTable();
            updateStatsCards();
            showAlert('Contact message deleted', 'success');
        } catch (error) {
('❌ Error deleting contact:', error);
            showAlert('Failed to delete contact message', 'error');
        }
    }
}

// Room Management Functions
function showAddRoomModal() {
('🏠 Opening Add Room modal...');
    try {
        currentRoomId = null;
        document.getElementById('roomModalLabel').textContent = 'Add Room';
        document.getElementById('roomForm').reset();
        document.getElementById('roomImageData').value = ''; // Clear image data
        document.getElementById('imagePreview').innerHTML = '<small class="text-muted">Image preview will appear here</small>';
        
        const modalElement = document.getElementById('roomModal');
        if (!modalElement) {
('❌ Modal element not found');
            showAlert('Modal element not found', 'error');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
('✅ Add Room modal opened successfully');
    } catch (error) {
('❌ Error opening Add Room modal:', error);
        showAlert('Failed to open Add Room modal: ' + error.message, 'error');
    }
}

function editRoom(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
        showAlert('Room not found', 'error');
        return;
    }
    
    currentRoomId = roomId;
    document.getElementById('roomModalLabel').textContent = 'Edit Room';
    
    // Fill form with room data
    document.getElementById('roomName').value = room.name;
    document.getElementById('roomPrice').value = room.price;
    document.getElementById('roomStock').value = room.stock;
    document.getElementById('roomStatus').value = room.status;
    document.getElementById('roomDescription').value = room.description || '';
    document.getElementById('roomCapacity').value = room.capacity || '';
    document.getElementById('roomTotalStock').value = room.totalStock || room.stock || 1;
    document.getElementById('roomAmenities').value = room.amenities ? room.amenities.join(', ') : '';
    
    // Handle image - set the current image data for preview
    if (room.image) {
        document.getElementById('roomImageData').value = room.image;
        document.getElementById('roomImage').value = ''; // Clear file input
    } else {
        document.getElementById('roomImageData').value = '';
        document.getElementById('roomImage').value = ''; // Clear file input
    }
    
    // Show image preview
    previewImage();
    
    const modal = new bootstrap.Modal(document.getElementById('roomModal'));
    modal.show();
}

async function saveRoom() {
('💾 Saving room...');
    const name = document.getElementById('roomName').value.trim();
    const price = parseInt(document.getElementById('roomPrice').value);
    const stock = parseInt(document.getElementById('roomStock').value);
    const totalStock = parseInt(document.getElementById('roomTotalStock').value) || stock;
    const status = document.getElementById('roomStatus').value;
    const description = document.getElementById('roomDescription').value.trim();
    const imageData = document.getElementById('roomImageData').value;
    const capacity = parseInt(document.getElementById('roomCapacity').value) || 1;
    
('📝 Room data:', { name, price, stock, totalStock, status, description, imageData: imageData ? 'Base64 data present' : 'No image', capacity });
    
    if (!name || !price || !stock || !imageData) {
('❌ Missing required fields');
        showAlert('Please fill in all required fields and upload an image', 'error');
        return;
    }
    
    try {
        const roomData = {
            name: name,
            price: price,
            stock: stock,
            totalStock: totalStock,
            status: status,
            description: description,
            image: imageData,
            capacity: capacity,
            lastUpdated: new Date().toISOString()
        };
        
        if (currentRoomId) {
            // Update existing room
            await updateDoc(doc(db, 'rooms', currentRoomId), roomData);
            showAlert('Room updated successfully!', 'success');
        } else {
            // Add new room
            await addDoc(collection(db, 'rooms'), roomData);
            showAlert('Room added successfully!', 'success');
        }
        
        // Refresh rooms data
        await loadRooms();
        loadRoomsTable();
        
        // Close modal
        const roomModal = bootstrap.Modal.getInstance(document.getElementById('roomModal'));
        roomModal.hide();
        
        // Trigger cross-tab synchronization
        localStorage.setItem('roomsUpdated', Date.now().toString());
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'roomsUpdated',
            newValue: Date.now().toString()
        }));
        
    } catch (error) {
('❌ Error saving room:', error);
        showAlert('Failed to save room: ' + error.message, 'error');
    }
}

async function deleteRoom(roomId) {
    if (confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
        try {
            await deleteDoc(doc(db, 'rooms', roomId));
            showAlert('Room deleted successfully!', 'success');
            await loadRooms();
            loadRoomsTable();
        } catch (error) {
('❌ Error deleting room:', error);
            showAlert('Failed to delete room: ' + error.message, 'error');
        }
    }
}

// Image processing functions
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        document.getElementById('roomImageData').value = '';
        previewImage();
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showAlert('Please select a valid image file', 'error');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAlert('Image file is too large. Please select an image smaller than 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Resize image to standard dimensions (800x600)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to standard room image dimensions
            canvas.width = 800;
            canvas.height = 600;
            
            // Draw and resize image
            ctx.drawImage(img, 0, 0, 800, 600);
            
            // Convert to base64
            const resizedImageData = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById('roomImageData').value = resizedImageData;
            
            // Show preview
            previewImage();
            
('✅ Image processed and resized to 800x600');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function previewImage() {
    const imageData = document.getElementById('roomImageData').value;
    const preview = document.getElementById('imagePreview');
    
    if (imageData) {
        preview.innerHTML = `
            <img src="${imageData}" alt="Room preview" 
                 style="max-width: 100%; max-height: 200px; object-fit: cover; border-radius: 4px;">
            <div class="mt-2">
                <small class="text-success">✅ Image ready (800x600)</small>
            </div>
        `;
    } else {
        preview.innerHTML = '<small class="text-muted">Image preview will appear here</small>';
    }
}

async function cleanupDuplicates() {
    if (confirm('This will remove duplicate rooms from the database. Continue?')) {
        try {
            await cleanupDuplicateRooms();
            showAlert('Duplicate rooms cleaned up successfully!', 'success');
            await loadRooms();
            loadRoomsTable();
        } catch (error) {
('❌ Error cleaning up duplicates:', error);
            showAlert('Failed to clean up duplicates: ' + error.message, 'error');
        }
    }
}

// Utility Functions
function refreshReservations() {
    loadReservations().then(() => {
        loadReservationsTable();
        updateStatsCards();
        showAlert('Reservations refreshed', 'success');
    });
}

function refreshContacts() {
    loadContacts().then(() => {
        loadContactsTable();
        updateStatsCards();
        showAlert('Contact messages refreshed', 'success');
    });
}

function markAllAsRead() {
    if (confirm('Mark all contact messages as read?')) {
        const unreadContacts = contacts.filter(c => c.status === 'new');
        const promises = unreadContacts.map(contact => 
            updateDoc(doc(db, 'contactSubmissions', contact.id), {
                status: 'read',
                updatedAt: new Date().toISOString()
            })
        );
        
        Promise.all(promises).then(() => {
            showAlert('All messages marked as read', 'success');
            loadContacts().then(() => {
                loadContactsTable();
                updateStatsCards();
            });
        }).catch(error => {
('❌ Error marking all as read:', error);
            showAlert('Failed to mark all as read', 'error');
        });
    }
}

function showAlert(message, type) {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alertDiv.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

async function handleLogout() {
    try {
        await signOut(auth);
        currentUser = null;
('✅ Logout successful');
        window.location.href = 'index.html';
    } catch (error) {
('❌ Logout error:', error);
        showAlert('Logout failed', 'error');
    }
}

// Global exports
window.updateReservationStatus = updateReservationStatus;
window.cancelReservation = cancelReservation;
window.deleteReservation = deleteReservation;
window.refreshReservations = refreshReservations;
window.handleLogout = handleLogout;
window.cleanupDuplicates = cleanupDuplicates;
window.refreshContacts = refreshContacts;
window.markAllAsRead = markAllAsRead;
window.markContactAsRead = markContactAsRead;
window.replyToContact = replyToContact;
window.sendReply = sendReply;
window.deleteContact = deleteContact;
window.showAddRoomModal = showAddRoomModal;
window.editRoom = editRoom;
window.saveRoom = saveRoom;
window.deleteRoom = deleteRoom;
window.previewImage = previewImage;
window.loadUsers = loadUsers;

// Global variables for users
let users = [];

// Load users from reservations and contact submissions
async function loadUsers() {
('👥 Loading registered users...');
    try {
        users = [];
        
        // Get unique users from reservations
        const reservationsQuery = query(collection(db, 'reservations'));
        const reservationsSnapshot = await getDocs(reservationsQuery);
        const userEmails = new Set();
        
        reservationsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.userEmail) {
                userEmails.add(data.userEmail);
            }
        });
        
        // Get unique users from contact submissions
        const contactsQuery = query(collection(db, 'contactSubmissions'));
        const contactsSnapshot = await getDocs(contactsQuery);
        
        contactsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.email) {
                userEmails.add(data.email);
            }
        });
        
        // Create user objects with data from reservations and contacts
        for (const email of userEmails) {
            const userReservations = reservationsSnapshot.docs
                .filter(doc => doc.data().userEmail === email)
                .map(doc => ({ id: doc.id, ...doc.data() }));
            
            const userContacts = contactsSnapshot.docs
                .filter(doc => doc.data().email === email)
                .map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Get user info from first reservation or contact
            const firstReservation = userReservations[0];
            const firstContact = userContacts[0];
            
            const user = {
                email: email,
                name: firstReservation?.guestName || firstContact?.name || 'Unknown',
                memberSince: firstReservation?.createdAt || firstContact?.createdAt || new Date().toISOString(),
                totalBookings: userReservations.length,
                lastLogin: firstReservation?.createdAt || firstContact?.createdAt || new Date().toISOString(),
                status: 'Active'
            };
            
            users.push(user);
        }
        
        // Sort by member since (newest first)
        users.sort((a, b) => new Date(b.memberSince) - new Date(a.memberSince));
        
('✅ Loaded', users.length, 'users');
        loadUsersTable();
        updateStatsCards();
        
    } catch (error) {
('❌ Error loading users:', error);
        showAlert('Failed to load users: ' + error.message, 'error');
    }
}

// Load users table
function loadUsersTable() {
    const tableBody = document.getElementById('usersTable');
    if (!tableBody) return;
    
    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-white py-4">
                    <i class="bi bi-people text-white" style="font-size: 2rem;"></i>
                    <p class="text-white mt-2">No registered users found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px; font-size: 0.8rem;">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <strong>${user.name}</strong>
                </div>
            </td>
            <td>${user.email}</td>
            <td>${new Date(user.memberSince).toLocaleDateString()}</td>
            <td>
                <span class="badge bg-info">${user.totalBookings} booking${user.totalBookings !== 1 ? 's' : ''}</span>
            </td>
            <td>${new Date(user.lastLogin).toLocaleDateString()}</td>
            <td>
                <span class="badge bg-success">${user.status}</span>
            </td>
        </tr>
    `).join('');
}
