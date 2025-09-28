import { 
    db, auth, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, 
    query, where, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile,
    forceAddRoomsToFirebase, updateRoomStock, restoreRoomStock, checkRoomAvailability
} from './firebase-config.js';

let currentUser = null;
let rooms = [];
let reservations = [];
let selectedRoom = null;
let dataCache = {
    rooms: null,
    reservations: null,
    lastUpdated: null,
    cacheTimeout: 30000 // 30 seconds
};
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing BlueWave Authentication System...');
    
    // Show UI immediately - don't wait for data loading
    showInitialUI();
    
    try {
        // Set up auth listener immediately (non-blocking)
        setupAuthStateListener();
        console.log('✅ Auth state listener set up');
        
        // Set up event listeners immediately (non-blocking)
        setupEventListeners();
        console.log('✅ Event listeners set up');
        
        // Load data in parallel (non-blocking)
        Promise.all([
            loadRooms(),
            forceAddRoomsToFirebase()
        ]).then(() => {
            console.log('✅ All data loaded in parallel');
            updateStockDisplay();
            updateAccommodationsDisplay();
        }).catch(error => {
            console.error('❌ Error loading data:', error);
            // Show fallback UI even if data loading fails
            showFallbackUI();
        });
        
        console.log('🎉 Authentication system initialized successfully!');
        
    } catch (error) {
        console.error('❌ Error initializing authentication system:', error);
        showFallbackUI();
    }
});

function showInitialUI() {
    console.log('🎨 Showing initial UI immediately...');
    
    // Show login button immediately
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.style.display = 'block';
        loginBtn.innerHTML = '<i class="bi bi-person-circle"></i> Login';
    }
    
    // Show account button as hidden initially
    const accountBtn = document.getElementById('accountBtn');
    if (accountBtn) {
        accountBtn.style.display = 'none';
    }
    
    // Show loading indicators for dynamic content
    showLoadingStates();
}

function showLoadingStates() {
    // Add loading indicators to dynamic content areas
    const stockElements = document.querySelectorAll('.stock-text');
    stockElements.forEach(element => {
        element.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    });
    
    // Show skeleton for accommodations
    const accommodationCards = document.querySelectorAll('.accommodation-card');
    accommodationCards.forEach(card => {
        const priceElement = card.querySelector('.price');
        if (priceElement) {
            priceElement.innerHTML = '<span class="placeholder col-4"></span>';
        }
    });
}

function showFallbackUI() {
    console.log('🔄 Showing fallback UI...');
    
    // Show basic UI even if data loading fails
    const stockElements = document.querySelectorAll('.stock-text');
    stockElements.forEach(element => {
        element.innerHTML = '<span class="text-muted">Loading...</span>';
    });
}

function setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
        console.log('👤 Auth state changed:', user ? user.email : 'No user');
        currentUser = user;
        updateAuthUI();
        
        if (user) {
            loadUserReservations();
        }
    });
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const accountBtn = document.getElementById('accountBtn');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const myReservationsSection = document.getElementById('myReservations');

    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (accountBtn) accountBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        
        const adminEmails = [
            'admin@bluewaveresort.com',
            'manager@bluewaveresort.com',
            'supervisor@bluewaveresort.com',
            'wendellcruz398@gmail.com'
        ];
        
        if (adminEmails.includes(currentUser.email)) {
            if (adminBtn) adminBtn.style.display = 'inline-block';
        } else {
            if (adminBtn) adminBtn.style.display = 'none';
        }
        
        if (myReservationsSection) myReservationsSection.style.display = 'block';
        
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (accountBtn) accountBtn.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        
        if (myReservationsSection) myReservationsSection.style.display = 'none';
    }
}

function setupEventListeners() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        console.log('🔑 Setting up login button event listener');
        loginBtn.addEventListener('click', () => {
            console.log('🔑 Login button clicked');
            showLoginModal();
        });
        console.log('✅ Login button event listener set up');
    } else {
        console.error('❌ Login button not found');
    }

    const accountBtn = document.getElementById('accountBtn');
    if (accountBtn) {
        accountBtn.addEventListener('click', () => {
            console.log('👤 Account button clicked');
            showAccountModal();
        });
    }

    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            console.log('⚙️ Admin button clicked');
            window.location.href = 'admin.html';
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log('🚪 Logout button clicked');
            handleLogout();
        });
    }

    setupBookNowButtons();
}

function showLoginModal() {
    console.log('🔑 showLoginModal called');
    const modal = document.getElementById('loginModal');
    console.log('🔍 Login modal element found:', !!modal);
    
    if (modal) {
        console.log('🎭 Creating Bootstrap modal instance...');
        const bootstrapModal = new bootstrap.Modal(modal);
        console.log('✅ Bootstrap modal created, showing...');
        bootstrapModal.show();
        console.log('✅ Login modal should now be visible');
    } else {
        console.error('❌ Login modal element not found in DOM');
    }
}

function showAccountModal() {
    const modal = document.getElementById('accountModal');
    if (modal) {
        loadAccountContent();
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }
}


function showBookingModal() {
    console.log('📅 showBookingModal called');
    const modal = document.getElementById('bookingModal');
    console.log('🔍 Booking modal element found:', !!modal);
    
    if (modal) {
        console.log('📝 Loading booking content...');
        loadBookingContent();
        console.log('🎭 Showing booking modal...');
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        console.log('✅ Booking modal should now be visible');
    } else {
        console.error('❌ Booking modal not found in DOM');
    }
}

async function handleLogin() {
    console.log('🔐 Attempting login...');
    
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!email || !password) {
        showAlert('Please enter both email and password', 'error');
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        
        console.log('✅ Login successful:', currentUser.email);
        showAlert('Login successful!', 'success');
        
        // Close the modal with simplified approach
        setTimeout(() => {
            const modal = document.getElementById('loginModal');
            console.log('🔍 Modal element found:', modal);
            
            if (modal) {
                // Simple approach: just hide the modal
                modal.style.display = 'none';
                modal.classList.remove('show');
                modal.removeAttribute('aria-hidden');
                modal.removeAttribute('aria-modal');
                modal.removeAttribute('role');
                document.body.classList.remove('modal-open');
                
                // Remove ALL backdrops (there might be multiple)
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                    console.log('🔍 Removed backdrop');
                });
                
                // Also remove any backdrop that might be added to body
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                // Remove focus from any focused element
                const focusedElement = document.activeElement;
                if (focusedElement && modal.contains(focusedElement)) {
                    focusedElement.blur();
                }
                
                console.log('✅ Login modal closed successfully');
            }
            
            // Clear form fields
            const emailInput = document.getElementById('emailInput');
            const passwordInput = document.getElementById('passwordInput');
            
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
        }, 500); // Increased delay to ensure alert shows first
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Provide user-friendly error messages
        let errorMessage = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email. Please check your email or register for a new account.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled. Please contact support.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                break;
            default:
                errorMessage = `Login failed: ${error.message}`;
        }
        
        showAlert(errorMessage, 'error');
    }
}

async function handleRegister() {
    console.log('📝 Attempting registration...');
    
    const firstName = document.getElementById('firstNameInput').value.trim();
    const lastName = document.getElementById('lastNameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!firstName || !lastName || !email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        
        // Update the user's display name
        try {
            await updateProfile(currentUser, {
                displayName: `${firstName} ${lastName}`
            });
            console.log('✅ Display name updated successfully');
        } catch (profileError) {
            console.warn('⚠️ Could not update display name:', profileError);
            // Continue with registration even if display name update fails
        }
        
        console.log('✅ Registration successful:', currentUser.email);
        showAlert('Registration successful!', 'success');
        
        // Close the modal with simplified approach
        setTimeout(() => {
            const modal = document.getElementById('loginModal');
            console.log('🔍 Modal element found:', modal);
            
            if (modal) {
                // Simple approach: just hide the modal
                modal.style.display = 'none';
                modal.classList.remove('show');
                modal.removeAttribute('aria-hidden');
                modal.removeAttribute('aria-modal');
                modal.removeAttribute('role');
                document.body.classList.remove('modal-open');
                
                // Remove ALL backdrops (there might be multiple)
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                    console.log('🔍 Removed backdrop');
                });
                
                // Also remove any backdrop that might be added to body
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                // Remove focus from any focused element
                const focusedElement = document.activeElement;
                if (focusedElement && modal.contains(focusedElement)) {
                    focusedElement.blur();
                }
                
                console.log('✅ Modal closed successfully');
            }
            
            // Clear form fields
            const firstNameInput = document.getElementById('firstNameInput');
            const lastNameInput = document.getElementById('lastNameInput');
            const emailInput = document.getElementById('emailInput');
            const passwordInput = document.getElementById('passwordInput');
            
            if (firstNameInput) firstNameInput.value = '';
            if (lastNameInput) lastNameInput.value = '';
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
        }, 500); // Increased delay to ensure alert shows first
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        
        // Provide user-friendly error messages
        let errorMessage = 'Registration failed. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please try logging in instead or use a different email.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please choose a stronger password.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Registration is currently disabled. Please contact support.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                break;
            default:
                errorMessage = `Registration failed: ${error.message}`;
        }
        
        showAlert(errorMessage, 'error');
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        currentUser = null;
        console.log('✅ Logout successful');
        showAlert('Logged out successfully!', 'success');
    } catch (error) {
        console.error('❌ Logout error:', error);
        showAlert('Logout failed: ' + error.message, 'error');
    }
}

async function loadRooms() {
    console.log('🏨 Loading rooms...');
    
    // Check cache first
    if (dataCache.rooms && dataCache.lastUpdated && 
        (Date.now() - dataCache.lastUpdated) < dataCache.cacheTimeout) {
        console.log('📋 Using cached rooms data');
        rooms = dataCache.rooms;
        updateStockDisplay();
        updateAccommodationsDisplay();
        return;
    }
    
    try {
        const roomsSnapshot = await getDocs(collection(db, 'rooms'));
        rooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('📋 Rooms from Firebase:', rooms.length);
        
        if (rooms.length === 0) {
            console.log('📝 No rooms found in Firebase, using sample data');
            const { sampleRooms } = await import('./firebase-config.js');
            rooms = sampleRooms.map((room, index) => ({ id: `sample-room-${index}`, ...room }));
            console.log('📋 Sample rooms loaded:', rooms.length);
        }
        
        // Update cache
        dataCache.rooms = rooms;
        dataCache.lastUpdated = Date.now();
        
        console.log('📋 Final rooms loaded:', rooms.length);
        console.log('🏨 Room names:', rooms.map(r => r.name));
        
        // Ensure rooms array is properly set before updating display
        if (rooms && rooms.length > 0) {
            updateStockDisplay();
            updateAccommodationsDisplay();
        }
        
    } catch (error) {
        console.error('❌ Error loading rooms:', error);
        try {
            const { sampleRooms } = await import('./firebase-config.js');
            rooms = sampleRooms.map((room, index) => ({ id: `sample-room-${index}`, ...room }));
            console.log('📋 Fallback rooms loaded:', rooms.length);
            if (rooms && rooms.length > 0) {
                updateStockDisplay();
            }
        } catch (fallbackError) {
            console.error('❌ Fallback failed:', fallbackError);
        }
    }
}

async function loadUserReservations() {
    if (!currentUser) return;

    try {
        const allReservationsSnapshot = await getDocs(collection(db, 'reservations'));
        const allReservations = allReservationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        reservations = allReservations.filter(reservation => 
            reservation.userEmail === currentUser.email || reservation.userId === currentUser.uid
        );
        
        reservations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log('📅 Loaded', reservations.length, 'reservations for user');
        updateReservationsDisplay();
        
    } catch (error) {
        console.error('❌ Error loading reservations:', error);
    }
}

function updateReservationsDisplay() {
    const myReservationsSection = document.getElementById('myReservations');
    if (!myReservationsSection) return;

    if (currentUser && reservations.length > 0) {
        myReservationsSection.innerHTML = `
            <h1>My Reservations</h1>
            <br>
            ${reservations.map(reservation => `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h5 class="card-title">${reservation.roomName}</h5>
                                <p class="card-text text-muted">
                                    ${new Date(reservation.checkIn).toLocaleDateString()} - ${new Date(reservation.checkOut).toLocaleDateString()}
                                </p>
                                <small class="text-muted">
                                    ${Math.ceil((new Date(reservation.checkOut) - new Date(reservation.checkIn)) / (1000 * 60 * 60 * 24))} night(s) • 
                                    ${reservation.guests} guest${reservation.guests > 1 ? 's' : ''}
                                </small>
                            </div>
                            <div class="col-md-4 text-end">
                                <span class="badge ${getStatusBadgeClass(reservation.status)} mb-2">
                                    ${reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                                </span>
                                <h6 class="text-primary">₱${reservation.totalPrice.toLocaleString()}</h6>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    } else if (currentUser) {
        myReservationsSection.innerHTML = `
            <h1>My Reservations</h1>
            <br>
            <div class="text-center">
                <i class="bi bi-calendar-x text-primary" style="font-size: 4rem;"></i>
                <h1>No Reservations yet</h1>
                <h1>Book your first day with us</h1>
                <br>
                <button class="btn btn-primary btn-lg" onclick="document.querySelector('.rooms').scrollIntoView({behavior: 'smooth'})">Book Now</button>
            </div>
        `;
    }
}

function loadBookingContent() {
    console.log('📝 loadBookingContent called');
    console.log('👤 Current user:', currentUser ? currentUser.email : 'No user');
    console.log('🏨 Selected room:', selectedRoom);
    
    if (!currentUser) {
        console.log('❌ No current user, returning');
        return;
    }

    const bookingContent = document.getElementById('bookingContent');
    console.log('🔍 Booking content element found:', !!bookingContent);
    
    if (!bookingContent || !selectedRoom) {
        console.log('❌ Missing booking content element or selected room');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    bookingContent.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h4>${selectedRoom.name}</h4>
                <img src="${selectedRoom.image}" alt="${selectedRoom.name}" class="img-fluid mb-3">
                <div class="room-details">
                    <p><strong>Price:</strong> ₱${selectedRoom.price.toLocaleString()}/night</p>
                    <p><strong>Capacity:</strong> ${selectedRoom.capacity} guests</p>
                    <p><strong>Available:</strong> 
                        <span class="badge ${selectedRoom.stock > 0 ? 'bg-success' : 'bg-danger'}">
                            ${selectedRoom.stock}  rooms available
                        </span>
                    </p>
                    <p><strong>Status:</strong> 
                        <span class="badge ${selectedRoom.status === 'available' ? 'bg-success' : 'bg-danger'}">
                            ${selectedRoom.status}
                        </span>
                    </p>
                    <p><strong>Amenities:</strong> ${selectedRoom.amenities ? selectedRoom.amenities.join(', ') : 'Standard amenities'}</p>
                </div>
            </div>
            <div class="col-md-6">
                <form id="bookingForm">
                    <div class="mb-3">
                        <label class="form-label">Check-in Date</label>
                        <input type="date" id="checkInDate" class="form-control" min="${today}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Check-out Date</label>
                        <input type="date" id="checkOutDate" class="form-control" min="${tomorrow}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Number of Guests</label>
                        <select id="guestCount" class="form-control" required>
                            ${Array.from({length: selectedRoom.capacity}, (_, i) => 
                                `<option value="${i + 1}">${i + 1} guest${i > 0 ? 's' : ''}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Special Requests</label>
                        <textarea id="specialRequests" class="form-control" rows="3" placeholder="Any special requests or notes..."></textarea>
                    </div>
                    <div id="totalPrice" class="mb-3 text-primary fw-bold fs-5">
                        Total: ₱${selectedRoom.price.toLocaleString()}
                    </div>
                    <button type="submit" class="btn btn-success w-100">
                        <i class="bi bi-credit-card me-2"></i>Confirm Reservation
                    </button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    document.getElementById('checkInDate').addEventListener('change', calculateTotal);
    document.getElementById('checkOutDate').addEventListener('change', calculateTotal);
}

function calculateTotal() {
    const checkIn = new Date(document.getElementById('checkInDate').value);
    const checkOut = new Date(document.getElementById('checkOutDate').value);
    
    if (checkIn && checkOut && checkOut > checkIn) {
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const total = nights * selectedRoom.price;
        document.getElementById('totalPrice').textContent = `Total: ₱${total.toLocaleString()} (${nights} night${nights > 1 ? 's' : ''})`;
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const checkIn = document.getElementById('checkInDate').value;
    const checkOut = document.getElementById('checkOutDate').value;
    const guests = parseInt(document.getElementById('guestCount').value);
    const specialRequests = document.getElementById('specialRequests').value;

    if (!checkIn || !checkOut) {
        showAlert('Please select both check-in and check-out dates', 'error');
        return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
        showAlert('Check-out date must be after check-in date', 'error');
        return;
    }

    try {
        const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        const totalPrice = nights * selectedRoom.price;

        console.log('📝 Creating reservation with room details:', {
            roomId: selectedRoom.id,
            roomName: selectedRoom.name,
            roomStock: selectedRoom.stock,
            roomStatus: selectedRoom.status
        });

        const reservation = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            guestName: currentUser.displayName || 'Guest',
            guestEmail: currentUser.email,
            roomId: selectedRoom.id,
            roomName: selectedRoom.name,
            checkIn: checkIn,
            checkOut: checkOut,
            guests: guests,
            totalPrice: totalPrice,
            specialRequests: specialRequests,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const availability = await checkRoomAvailability(selectedRoom.id);
        if (!availability.available) {
            showAlert(`Sorry, ${selectedRoom.name} is no longer available. Please try another room.`, 'error');
            return;
        }
        
        const reservationRef = await addDoc(collection(db, 'reservations'), reservation);
        
        const stockUpdate = await updateRoomStock(selectedRoom.id, 1);
        if (stockUpdate.success) {
            console.log('📦 Room stock updated successfully');
            await loadRooms();
        } else {
            console.error('❌ Failed to update room stock:', stockUpdate.error);
        }
        
        showAlert('Reservation submitted successfully!', 'success');
        
        const modal = document.getElementById('bookingModal');
        if (modal) {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) bootstrapModal.hide();
        }
        
        loadUserReservations();
        
    } catch (error) {
        console.error('❌ Error creating reservation:', error);
        showAlert('Failed to create reservation: ' + error.message, 'error');
    }
}

function loadAccountContent() {
    const accountContent = document.getElementById('accountContent');
    if (!accountContent) return;

    accountContent.innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <div class="card bg-gradient text-white mb-4" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-2">
                                <div class="bg-white bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                                    <i class="bi bi-person text-3xl"></i>
                                </div>
                            </div>
                            <div class="col-md-10">
                                <h2 class="card-title">Welcome back!</h2>
                                <p class="card-text">${currentUser.email}</p>
                                <small class="text-white-50">Member since ${new Date(currentUser.metadata?.creationTime || Date.now()).toLocaleDateString()}</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card text-center">
                            <div class="card-body">
                                <i class="bi bi-calendar-check text-primary" style="font-size: 2rem;"></i>
                                <h5 class="card-title">Total Bookings</h5>
                                <h3 class="text-primary">${reservations.length}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-center">
                            <div class="card-body">
                                <i class="bi bi-clock text-warning" style="font-size: 2rem;"></i>
                                <h5 class="card-title">Pending</h5>
                                <h3 class="text-warning">${reservations.filter(r => r.status === 'pending').length}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-center">
                            <div class="card-body">
                                <i class="bi bi-check-circle text-success" style="font-size: 2rem;"></i>
                                <h5 class="card-title">Confirmed</h5>
                                <h3 class="text-success">${reservations.filter(r => r.status === 'confirmed').length}</h3>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h5 class="card-title mb-0">My Reservations</h5>
                    </div>
                    <div class="card-body">
                        ${reservations.length > 0 ? reservations.map(reservation => `
                            <div class="card mb-3">
                                <div class="card-body">
                                    <div class="row align-items-center">
                                        <div class="col-md-8">
                                            <h6 class="card-title">${reservation.roomName}</h6>
                                            <p class="card-text text-muted">
                                                ${new Date(reservation.checkIn).toLocaleDateString()} - ${new Date(reservation.checkOut).toLocaleDateString()}
                                            </p>
                                            <small class="text-muted">
                                                ${Math.ceil((new Date(reservation.checkOut) - new Date(reservation.checkIn)) / (1000 * 60 * 60 * 24))} night(s) • 
                                                ${reservation.guests} guest${reservation.guests > 1 ? 's' : ''}
                                            </small>
                                        </div>
                                        <div class="col-md-4 text-end">
                                            <span class="badge ${getStatusBadgeClass(reservation.status)} mb-2">
                                                ${reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                                            </span>
                                            <h6 class="text-primary">₱${reservation.totalPrice.toLocaleString()}</h6>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="text-center py-5">
                                <i class="bi bi-calendar-x text-muted" style="font-size: 4rem;"></i>
                                <h5 class="text-muted">No reservations yet</h5>
                                <p class="text-muted">Start your journey with us by booking your first stay!</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadAdminContent() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;

    try {
        const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
        const allReservations = reservationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        adminContent.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">Total Reservations</h5>
                            <h3 class="text-primary">${allReservations.length}</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">Available Rooms</h5>
                            <h3 class="text-success">${rooms.filter(r => r.status === 'available').length}</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">Pending Reservations</h5>
                            <h3 class="text-warning">${allReservations.filter(r => r.status === 'pending').length}</h3>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">Reservations Management</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Guest</th>
                                    <th>Room</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Guests</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allReservations.map(reservation => `
                                    <tr>
                                        <td>${reservation.userEmail}</td>
                                        <td>${reservation.roomName}</td>
                                        <td>${new Date(reservation.checkIn).toLocaleDateString()}</td>
                                        <td>${new Date(reservation.checkOut).toLocaleDateString()}</td>
                                        <td>${reservation.guests}</td>
                                        <td>₱${reservation.totalPrice.toLocaleString()}</td>
                                        <td>
                                            <span class="badge ${getStatusBadgeClass(reservation.status)}">
                                                ${reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="btn-group" role="group">
                                                ${reservation.status === 'pending' ? 
                                                    `<button onclick="updateReservationStatus('${reservation.id}', 'confirmed')" 
                                                            class="btn btn-success btn-sm">Confirm</button>` : ''}
                                                ${reservation.status === 'confirmed' ? 
                                                    `<button onclick="updateReservationStatus('${reservation.id}', 'completed')" 
                                                            class="btn btn-primary btn-sm">Complete</button>` : ''}
                                                ${(reservation.status === 'pending' || reservation.status === 'confirmed') ? 
                                                    `<button onclick="cancelReservation('${reservation.id}')" 
                                                            class="btn btn-warning btn-sm">Cancel</button>` : ''}
                                                <button onclick="deleteReservation('${reservation.id}')" 
                                                        class="btn btn-danger btn-sm">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error loading admin content:', error);
        adminContent.innerHTML = '<div class="alert alert-danger">Failed to load admin data</div>';
    }
}

// Update reservation status
async function updateReservationStatus(reservationId, newStatus) {
    try {
        const reservationDoc = await getDocs(query(collection(db, 'reservations'), where('__name__', '==', reservationId)));
        
        if (!reservationDoc.empty) {
            const reservationData = reservationDoc.docs[0].data();
            const roomId = reservationData.roomId;
            const previousStatus = reservationData.status;
            
            await updateDoc(doc(db, 'reservations', reservationId), {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            
            if (newStatus === 'completed' && previousStatus !== 'completed') {
                console.log('🏨 Reservation completed, restoring room stock...');
                if (roomId) {
                    const stockRestore = await restoreRoomStock(roomId, 1);
                    if (stockRestore.success) {
                        console.log('📦 Room stock restored after reservation completion');
                        await loadRooms();
                        showAlert(`Reservation ${newStatus} successfully! Room stock restored.`, 'success');
                    } else {
                        console.error('❌ Failed to restore room stock:', stockRestore.error);
                        showAlert(`Reservation ${newStatus} successfully! (Note: Stock restoration failed)`, 'warning');
                    }
                } else {
                    showAlert(`Reservation ${newStatus} successfully! (Note: Room ID not found)`, 'warning');
                }
            } else {
                showAlert(`Reservation ${newStatus} successfully!`, 'success');
            }
            
            loadAdminContent();
        } else {
            showAlert('Reservation not found', 'error');
        }
    } catch (error) {
        console.error('❌ Error updating reservation:', error);
        showAlert('Failed to update reservation', 'error');
    }
}

async function cancelReservation(reservationId) {
    if (confirm('Are you sure you want to cancel this reservation? This will restore room stock.')) {
        try {
            const reservationDoc = await getDocs(query(collection(db, 'reservations'), where('__name__', '==', reservationId)));
            
            if (!reservationDoc.empty) {
                const reservationData = reservationDoc.docs[0].data();
                const roomId = reservationData.roomId;
                
                await updateDoc(doc(db, 'reservations', reservationId), {
                    status: 'cancelled',
                    updatedAt: new Date().toISOString()
                });
                
                if (roomId) {
                    const stockRestore = await restoreRoomStock(roomId, 1);
                    if (stockRestore.success) {
                        console.log('📦 Room stock restored after reservation cancellation');
                        await loadRooms();
                        showAlert('Reservation cancelled successfully! Room stock restored.', 'success');
                    } else {
                        console.error('❌ Failed to restore room stock:', stockRestore.error);
                        showAlert('Reservation cancelled successfully! (Note: Stock restoration failed)', 'warning');
                    }
                } else {
                    showAlert('Reservation cancelled successfully! (Note: Room ID not found)', 'warning');
                }
                
                loadAdminContent();
            } else {
                showAlert('Reservation not found', 'error');
            }
        } catch (error) {
            console.error('❌ Error cancelling reservation:', error);
            showAlert('Failed to cancel reservation', 'error');
        }
    }
}

async function deleteReservation(reservationId) {
    if (confirm('Are you sure you want to permanently delete this reservation? This will NOT restore room stock.')) {
        try {
            await deleteDoc(doc(db, 'reservations', reservationId));
            
            console.log('🗑️ Reservation permanently deleted (stock not restored)');
            showAlert('Reservation permanently deleted! (Note: Room stock was not restored)', 'success');
            loadAdminContent();
        } catch (error) {
            console.error('❌ Error deleting reservation:', error);
            showAlert('Failed to delete reservation', 'error');
        }
    }
}

function getStatusBadgeClass(status) {
    switch(status) {
        case 'confirmed': return 'bg-success';
        case 'pending': return 'bg-warning';
        case 'completed': return 'bg-info';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function switchToLogin() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    
    // Update modal header
    const modalHeader = modal.querySelector('.modal-header h5');
    if (modalHeader) {
        modalHeader.textContent = 'Login';
    }
    
    // Update modal content for login
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="auth-field mb-3">
                <label class="form-label">Email</label>
                <input type="email" id="emailInput" class="form-control auth-input" placeholder="name@gmail.com">
            </div>
            <div class="auth-field mb-3">
                <label class="form-label">Password</label>
                <input type="password" id="passwordInput" class="form-control auth-input" placeholder="Enter your password">
            </div>
            <button class="auth-primary mb-2" onclick="handleLogin()">Login</button>
            <div class="auth-switch">
                <a href="#" onclick="switchToRegister(); return false;">Don't have an account? Register</a>
            </div>
        `;
    }
    
    // Show the modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

function switchToRegister() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    
    // Update modal header
    const modalHeader = modal.querySelector('.modal-header h5');
    if (modalHeader) {
        modalHeader.textContent = 'Create Account';
    }
    
    // Update modal content for registration
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="auth-field mb-3">
                <label class="form-label">First Name</label>
                <input type="text" id="firstNameInput" class="form-control auth-input" placeholder="Wendell">
            </div>
            <div class="auth-field mb-3">
                <label class="form-label">Last Name</label>
                <input type="text" id="lastNameInput" class="form-control auth-input" placeholder="Cruz">
            </div>
            <div class="auth-field mb-3">
                <label class="form-label">Email</label>
                <input type="email" id="emailInput" class="form-control auth-input" placeholder="name@gmail.com">
            </div>
            <div class="auth-field mb-3">
                <label class="form-label">Password</label>
                <input type="password" id="passwordInput" class="form-control auth-input" placeholder="6+ characters">
            </div>
            <div class="auth-legal mb-3">
                By signing up you agree to <a data-bs-toggle="modal" data-bs-target="#termsModal">terms and conditions</a>.
            </div>
            <button class="auth-primary mb-2" onclick="handleRegister()">Register</button>
            <div class="auth-switch">
                <a href="#" onclick="switchToLogin(); return false;">Already have an account? Login</a>
            </div>
        `;
    }
    
    // Show the modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
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

function setupBookNowButtons() {
    console.log('🔄 Setting up Book Now buttons...');
    document.querySelectorAll('.book-now-btn').forEach(btn => {
        btn.removeEventListener('click', handleBookNowClick);
        btn.addEventListener('click', handleBookNowClick);
    });
    console.log('✅ Book Now buttons set up:', document.querySelectorAll('.book-now-btn').length);
}

async function handleBookNowClick(event) {
    console.log('🏨 Book Now button clicked');
    
    if (!currentUser) {
        console.log('❌ User not logged in, showing login modal');
        showAlert('Please login to make a reservation', 'warning');
        showLoginModal();
        return;
    }
    
    // Ensure rooms are loaded before proceeding
    if (rooms.length === 0) {
        console.log('🔄 Rooms not loaded, loading now...');
        try {
            await loadRooms();
            // Wait a bit for the rooms to be fully processed
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('❌ Error loading rooms:', error);
            showAlert('Failed to load room information. Please try again.', 'error');
            return;
        }
    }
    
    // Find the button element (in case user clicked on icon or text inside)
    let buttonElement = event.target;
    while (buttonElement && !buttonElement.classList.contains('book-now-btn')) {
        buttonElement = buttonElement.parentElement;
    }
    
    if (!buttonElement) {
        console.error('❌ Could not find book-now-btn element');
        showAlert('Invalid button element. Please try again.', 'error');
        return;
    }
    
    const roomName = buttonElement.getAttribute('data-room');
    console.log('🔍 Looking for room:', roomName);
    console.log('📋 Available rooms:', rooms.map(r => r.name));
    
    if (!roomName) {
        console.error('❌ No room name found in data-room attribute');
        console.log('🔍 Button element:', buttonElement);
        console.log('🔍 Button attributes:', buttonElement.attributes);
        showAlert('Invalid room selection. Please try again.', 'error');
        return;
    }
    
    selectedRoom = rooms.find(r => r.name === roomName);
    console.log('✅ Selected room:', selectedRoom);
    console.log('🔍 Room details:', selectedRoom ? {
        id: selectedRoom.id,
        name: selectedRoom.name,
        stock: selectedRoom.stock,
        status: selectedRoom.status
    } : 'null');
    console.log('🔍 All available rooms:', rooms.map(r => ({ name: r.name, id: r.id })));
    
    if (selectedRoom) {
        console.log('📦 Checking room availability...');
        console.log('📊 Room stock:', selectedRoom.stock, 'Status:', selectedRoom.status);
        
        if (selectedRoom.stock <= 0 || selectedRoom.status === 'unavailable') {
            console.log('❌ Room not available - no stock');
            showAlert(`Sorry, ${selectedRoom.name} is currently unavailable. No rooms in stock.`, 'error');
            return;
        }
        
        console.log('🎯 Opening booking modal for:', selectedRoom.name);
        showBookingModal();
    } else {
        console.error('❌ Room not found:', roomName);
        console.log('📋 Available room names:', rooms.map(r => r.name));
        showAlert(`Room "${roomName}" not found. Available rooms: ${rooms.map(r => r.name).join(', ')}`, 'error');
    }
}

function updateStockDisplay() {
    console.log('📊 Updating stock display on buttons...');
    console.log('📋 Current rooms loaded:', rooms.length);
    console.log('🏨 Room names:', rooms.map(r => r.name));
    
    const buttons = document.querySelectorAll('.book-now-btn');
    console.log('🔘 Found buttons:', buttons.length);
    
    buttons.forEach(btn => {
        const roomName = btn.getAttribute('data-room');
        console.log('🔍 Processing button for room:', roomName);
        
        const room = rooms.find(r => r.name === roomName);
        console.log('🏨 Found room data:', room);
        
        if (room) {
            const stockText = btn.querySelector('small');
            if (stockText) {
                if (room.stock > 0) {
                    stockText.textContent = `${room.stock} of ${room.totalStock} rooms available`;
                    stockText.className = 'd-block text-white';
                    btn.disabled = false;
                    btn.classList.remove('btn-secondary');
                    btn.classList.add('btn-primary');
                    console.log('✅ Updated button for', roomName, '- Available:', room.stock);
                } else {
                    stockText.textContent = 'No rooms available';
                    stockText.className = 'd-block text-white';
                    btn.disabled = true;
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-secondary');
                    console.log('❌ Updated button for', roomName, '- Unavailable');
                }
            } else {
                console.log('⚠️ No stock text element found for', roomName);
            }
        } else {
            console.log('⚠️ No room data found for', roomName);
            const stockText = btn.querySelector('small');
            if (stockText) {
                stockText.textContent = '5 rooms available';
                stockText.className = 'd-block text-white';
                btn.disabled = false;
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            }
        }
    });
    
    console.log('✅ Stock display update completed');
}

function updateAccommodationsDisplay() {
    console.log('🏨 Updating accommodations display...');
    console.log('📋 Current rooms loaded:', rooms.length);
    
    // Only update if we're on the accommodations page
    if (!window.location.pathname.includes('resort.html') && !window.location.pathname.includes('accommodation.html')) {
        console.log('📄 Not on accommodations page, skipping display update');
        return;
    }
    
    // Find the container where rooms should be displayed
    const roomsContainer = document.querySelector('.rooms-container');
    if (!roomsContainer) {
        console.log('⚠️ Rooms container not found, creating one...');
        // Find the first .rooms div and replace its content
        const firstRoomDiv = document.querySelector('.container-fluid.rooms');
        if (firstRoomDiv) {
            // Create a new container for dynamic rooms
            const newContainer = document.createElement('div');
            newContainer.className = 'rooms-container';
            newContainer.style.paddingTop = '120px';
            
            // Insert after the header
            firstRoomDiv.parentNode.insertBefore(newContainer, firstRoomDiv);
            
            // Hide the static content
            document.querySelectorAll('.container-fluid.rooms').forEach(div => {
                div.style.display = 'none';
            });
        } else {
            console.log('❌ No rooms container found');
            return;
        }
    }
    
    if (rooms.length === 0) {
        console.log('📝 No rooms to display');
        return;
    }
    
    // Generate dynamic room content
    const roomsHTML = rooms.map(room => `
        <div class="container-fluid rooms">
            <div class="row">
                <div class="col-md-6 desc">
                    <h4>${room.name}</h4>
                    <p>₱${room.price.toLocaleString()} / night</p>
                    <p>${room.description || 'Comfortable accommodation with modern amenities'}</p>
                    <p><strong>Capacity:</strong> ${room.capacity || 'N/A'} guests</p>
                    <button class="btn btn-primary book-now-btn" data-room="${room.name}">
                        <i class="bi bi-calendar-check me-1"></i>Book Now
                        <small class="d-block text-white">${room.stock} rooms available</small>
                    </button>
                    <br><br>
                    <p><i class="bi bi-calendar"></i> Availability</p>
                </div>
                <div class="col-md-6 roomimg">
                    <img src="${room.image}" alt="${room.name}" class="img-fluid">
                </div>
            </div>
        </div>
    `).join('');
    
    // Update the container
    const container = document.querySelector('.rooms-container');
    if (container) {
        container.innerHTML = roomsHTML;
        console.log('✅ Accommodations display updated with', rooms.length, 'rooms');
        
        // Re-setup event listeners for the new buttons
        setupBookNowButtons();
    }
}

window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.switchToLogin = switchToLogin;
window.switchToRegister = switchToRegister;
window.updateReservationStatus = updateReservationStatus;
window.cancelReservation = cancelReservation;
window.deleteReservation = deleteReservation;