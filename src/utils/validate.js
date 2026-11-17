'use strict';
const INDIAN_STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || ''));
const normPhone = (s) => String(s || '').replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
const isMobile = (s) => /^[6-9]\d{9}$/.test(normPhone(s));
const isPincode = (s) => /^[1-9]\d{5}$/.test(String(s || '').trim());
const strongPassword = (s) => typeof s === 'string' && s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s);

function validateAddress(a) {
  const errors = {};
  if (!String(a.name || '').trim()) errors.name = 'Full name is required';
  if (!isMobile(a.phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number';
  if (!String(a.line1 || '').trim()) errors.line1 = 'House / flat / street is required';
  if (!String(a.city || '').trim()) errors.city = 'City is required';
  if (!INDIAN_STATES.includes(a.state)) errors.state = 'Select a state';
  if (!isPincode(a.pincode)) errors.pincode = 'PIN code must be 6 digits';
  if (a.lat != null && a.lat !== '' && (isNaN(a.lat) || Math.abs(a.lat) > 90)) errors.lat = 'Invalid latitude';
  if (a.lng != null && a.lng !== '' && (isNaN(a.lng) || Math.abs(a.lng) > 180)) errors.lng = 'Invalid longitude';
  return errors;
}

module.exports = { INDIAN_STATES, isEmail, isMobile, normPhone, isPincode, strongPassword, validateAddress };
