const crypto = require('crypto');

function generateOrderId() {
  const randomString = crypto.randomBytes(8).toString('hex').substring(0, 16);
  return `order_${randomString}`;
}

function generatePaymentId() {
  const randomString = crypto.randomBytes(8).toString('hex').substring(0, 16);
  return `pay_${randomString}`;
}

function validateVPA(vpa) {
  const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return vpaRegex.test(vpa);
}

function validateCardNumber(cardNumber) {
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  
  if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

function detectCardNetwork(cardNumber) {
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  
  if (cleaned.startsWith('4')) {
    return 'visa';
  }
  
  const twoDigit = cleaned.substring(0, 2);
  const firstDigit = cleaned[0];
  
  if (['51', '52', '53', '54', '55'].includes(twoDigit)) {
    return 'mastercard';
  }
  
  if (['34', '37'].includes(twoDigit)) {
    return 'amex';
  }
  
  if (twoDigit === '60' || twoDigit === '65') {
    return 'rupay';
  }
  
  const twoDigitNum = parseInt(twoDigit);
  if (twoDigitNum >= 81 && twoDigitNum <= 89) {
    return 'rupay';
  }
  
  return 'unknown';
}

function validateExpiry(month, year) {
  const parsedMonth = parseInt(month, 10);
  if (parsedMonth < 1 || parsedMonth > 12) {
    return false;
  }

  let parsedYear = parseInt(year, 10);
  if (year.length === 2) {
    parsedYear = 2000 + parsedYear;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (parsedYear > currentYear) {
    return true;
  }
  
  if (parsedYear === currentYear && parsedMonth >= currentMonth) {
    return true;
  }

  return false;
}

function getProcessingDelay() {
  if (process.env.TEST_MODE === 'true') {
    return parseInt(process.env.TEST_PROCESSING_DELAY || '1000', 10);
  }
  
  const minDelay = parseInt(process.env.PROCESSING_DELAY_MIN || '5000', 10);
  const maxDelay = parseInt(process.env.PROCESSING_DELAY_MAX || '10000', 10);
  
  return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
}

function determinePaymentSuccess(method, cardNumber = null, vpa = null) {
  if (process.env.TEST_MODE === 'true') {
    return process.env.TEST_PAYMENT_SUCCESS === 'true';
  }
  
  // For UPI, only succeed for username@bank
  if (method === 'upi') {
    return vpa === 'username@bank';
  }
  
  // Always fail the test decline card number
  if (method === 'card' && cardNumber === '4000000000000002') {
    return false;
  }
  
  if (method === 'card') {
    const successRate = parseFloat(process.env.CARD_SUCCESS_RATE || '0.95');
    return Math.random() < successRate;
  }
  
  return false;
}

module.exports = {
  generateOrderId,
  generatePaymentId,
  validateVPA,
  validateCardNumber,
  detectCardNetwork,
  validateExpiry,
  getProcessingDelay,
  determinePaymentSuccess
};
