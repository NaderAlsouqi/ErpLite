// Login form handling
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');

    // Load saved credentials if "Remember me" was checked
    if (localStorage.getItem('rememberMe') === 'true') {
        const savedUsername = localStorage.getItem('savedUsername');
        if (savedUsername) {
            usernameInput.value = savedUsername;
            rememberCheckbox.checked = true;
        }
    }

    // Handle form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = rememberCheckbox.checked;

        // Basic validation
        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }

        // Save credentials if "Remember me" is checked
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedUsername', username);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('savedUsername');
        }

        // Simulate login process
        console.log('Login attempt:', { username, rememberMe });
        
        // Here you would typically send the data to a server
        // For now, we'll just show a success message
        alert('Login successful! (This is a demo)');
        
        // In a real application, you would redirect or handle the response:
        // window.location.href = '/dashboard';
    });

    // Add input focus effects
    const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });

    // Add smooth animations on load
    const loginCard = document.querySelector('.login-card');
    const logoContainer = document.querySelector('.logo-container');
    
    setTimeout(() => {
        loginCard.style.opacity = '0';
        loginCard.style.transform = 'translateY(20px)';
        loginCard.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        logoContainer.style.opacity = '0';
        logoContainer.style.transform = 'translateX(20px)';
        logoContainer.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            loginCard.style.opacity = '1';
            loginCard.style.transform = 'translateY(0)';
            
            logoContainer.style.opacity = '1';
            logoContainer.style.transform = 'translateX(0)';
        }, 100);
    }, 50);
});

