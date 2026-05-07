import Swal from 'sweetalert2';

// Success alerts for important actions
export const showSuccessAlert = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    toast: true,
    position: 'top-end',
    customClass: {
      popup: 'swal-success-popup'
    }
  });
};

// Login success alert
export const showLoginSuccess = (name: string, role: string) => {
  return Swal.fire({
    icon: 'success',
    title: 'Login Successful!',
    text: `Welcome back, ${name}!`,
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
    toast: true,
    position: 'top-end',
    customClass: {
      popup: 'swal-login-popup'
    }
  });
};

// Logout confirmation alert
export const showLogoutConfirm = () => {
  return Swal.fire({
    icon: 'question',
    title: 'Log out?',
    text: 'Do you want to log out of your account?',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Log out',
    cancelButtonText: 'Cancel',
    customClass: {
      popup: 'swal-logout-popup'
    }
  });
};

// Logout success alert
export const showLogoutSuccess = () => {
  return Swal.fire({
    icon: 'success',
    title: 'Logged out',
    text: 'You have been logged out.',
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true,
    toast: true,
    position: 'top-end',
    customClass: {
      popup: 'swal-logout-success-popup'
    }
  });
};

// Registration success alert
export const showRegistrationSuccess = (role: string) => {
  return Swal.fire({
    icon: 'success',
    title: 'Registration Submitted!',
    text: 'Your registration is awaiting admin approval.',
    showConfirmButton: true,
    confirmButtonText: 'Continue',
    confirmButtonColor: '#10b981',
    customClass: {
      popup: 'swal-registration-popup'
    }
  });
};

// Order/Booking success alert
export const showTransactionSuccess = (type: 'order' | 'booking', message?: string) => {
  const titles = {
    order: 'Order Placed Successfully!',
    booking: 'Booking Confirmed!'
  };
  
  const texts = {
    order: 'Your order has been placed and is being processed.',
    booking: 'Your booking has been confirmed. Check your email for details.'
  };

  return Swal.fire({
    icon: 'success',
    title: titles[type],
    text: message || texts[type],
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    toast: true,
    position: 'top-end',
    customClass: {
      popup: 'swal-transaction-popup'
    }
  });
};

// Product management success alert
export const showProductSuccess = (action: 'added' | 'updated' | 'deleted', productName?: string) => {
  const titles = {
    added: 'Product Added!',
    updated: 'Product Updated!',
    deleted: 'Product Deleted!'
  };

  const texts = {
    added: `${productName || 'Product'} has been added to your inventory.`,
    updated: `${productName || 'Product'} has been updated successfully.`,
    deleted: `${productName || 'Product'} has been removed from your inventory.`
  };

  return Swal.fire({
    icon: 'success',
    title: titles[action],
    text: texts[action],
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    toast: true,
    position: 'top-end',
    customClass: {
      popup: 'swal-product-popup'
    }
  });
};

// Status update success alert
export const showStatusUpdateSuccess = (type: 'order' | 'booking', id: string, status: string) => {
  return Swal.fire({
    icon: 'success',
    title: 'Status Updated!',
    text: `${type.charAt(0).toUpperCase() + type.slice(1)} ${id} has been updated to ${status}.`,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    toast: true,
    position: 'top-end',
    customClass: {
      popup: 'swal-status-popup'
    }
  });
};

// Error alert
export const showErrorAlert = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    toast: true,
    position: 'top-end',
    customClass: {
      popup: 'swal-error-popup'
    }
  });
};

// Confirmation alert
export const showConfirmAlert = (title: string, text: string) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  });
};