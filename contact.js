import { 
    db, collection, addDoc, onAuthStateChanged, auth
} from './firebase-config.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    try {
        setupAuthStateListener();
        setupContactForm();
    } catch (error) {
        showAlert('Failed to initialize contact form', 'error');
    }
});

function setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateContactFormVisibility();
        if (user) prefillUserInfo();
    });
}

function updateContactFormVisibility() {
    const contactForm = document.getElementById('contactForm');
    const loginRequired = document.getElementById('loginRequired');
    
    if (currentUser) {
        if (contactForm) contactForm.style.display = 'block';
        if (loginRequired) loginRequired.style.display = 'none';
    } else {
        if (contactForm) contactForm.style.display = 'none';
        if (loginRequired) loginRequired.style.display = 'block';
    }
}

function prefillUserInfo() {
    if (!currentUser) return;
    
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    
    if (nameField && !nameField.value) {
        nameField.value = currentUser.displayName || '';
    }
    
    if (emailField && !emailField.value) {
        emailField.value = currentUser.email || '';
    }
}

function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) {
        
        return;
    }
    
    form.addEventListener('submit', handleContactSubmission);
    
}

async function handleContactSubmission(event) {
    event.preventDefault();
    event.stopPropagation();
    
    
    
    const form = event.target;
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    const messageField = document.getElementById('message');
    
    const name = nameField.value.trim();
    const email = emailField.value.trim();
    const message = messageField.value.trim();
    
    // Clear previous validation errors
    clearValidationErrors();
    
    let hasErrors = false;
    
    // Validate name
    if (!name) {
        showFieldError('name', 'Name is required');
        hasErrors = true;
    }
    
    // Validate email
    if (!email) {
        showFieldError('email', 'Email is required');
        hasErrors = true;
    } else if (!isValidEmail(email)) {
        showFieldError('email', 'Please enter a valid email address');
        hasErrors = true;
    }
    
    // Validate message
    if (!message) {
        showFieldError('message', 'Message is required');
        hasErrors = true;
    }
    
    if (hasErrors) {
        form.classList.add('was-validated');
        showAlert('Please fill in all required fields correctly', 'error');
        return;
    }
    
    // Set loading state
    setLoadingState(true);
    
    try {
        const contactData = {
            name: name,
            email: email,
            message: message,
            status: 'new',
            userId: currentUser?.uid || null,
            userEmail: currentUser?.email || email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        
        
        const docRef = await addDoc(collection(db, 'contactSubmissions'), contactData);
        
        
        
        showAlert('Thank you for your message! We will get back to you soon.', 'success');
        
        // Reset form
        form.reset();
        form.classList.remove('was-validated');
        
        // Trigger cross-tab synchronization
        localStorage.setItem('contactUpdated', Date.now().toString());
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'contactUpdated',
            newValue: Date.now().toString()
        }));
        
    } catch (error) {
        
        showAlert('Failed to send message. Please try again.', 'error');
    } finally {
        setLoadingState(false);
    }
}

function clearValidationErrors() {
    const errorElements = document.querySelectorAll('.invalid-feedback');
    errorElements.forEach(element => {
        element.textContent = '';
    });
    
    const formControls = document.querySelectorAll('.form-control');
    formControls.forEach(control => {
        control.classList.remove('is-invalid');
    });
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.add('is-invalid');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function setLoadingState(loading) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    if (loading) {
        submitBtn.disabled = true;
        btnText.classList.add('d-none');
        btnLoading.classList.remove('d-none');
    } else {
        submitBtn.disabled = false;
        btnText.classList.remove('d-none');
        btnLoading.classList.add('d-none');
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

function testFirebaseConnection() {
    
    
    if (currentUser) {
        showAlert('Firebase connection working! User is logged in.', 'success');
    } else {
        showAlert('Firebase connection working! User is not logged in.', 'info');
    }
}

// Global exports
window.handleContactSubmission = handleContactSubmission;
window.testFirebaseConnection = testFirebaseConnection;
