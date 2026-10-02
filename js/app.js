import { registerUser, loginUser } from './firebase.js';

const qs = (selector) => document.querySelector(selector);
const formMessage = (form, message, tone = 'error') => { const target = form.querySelector('.form-status'); if (target) { target.textContent = message; target.style.color = tone === 'success' ? '#8be4b2' : '#ff8b91'; } };

document.querySelectorAll('.mobile-menu').forEach((button) => button.addEventListener('click', () => document.querySelector('.desktop-nav')?.classList.toggle('mobile-open')));
qs('#contact-form')?.addEventListener('submit', (event) => { event.preventDefault(); const form = event.currentTarget; form.reset(); formMessage(form, 'Thanks — your message is in the queue.', 'success'); });
qs('#newsletter-form')?.addEventListener('submit', (event) => { event.preventDefault(); const form = event.currentTarget; form.reset(); formMessage(form, 'You are on the list. Watch your inbox.', 'success'); });
qs('#register-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); button.disabled = true; formMessage(form, 'Creating your account…', 'success'); try { await registerUser(form.email.value, form.password.value, { name: form.name.value }); window.location.href = 'admin.html'; } catch (error) { formMessage(form, error.message || 'Unable to create the account.'); button.disabled = false; } });
qs('#login-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); button.disabled = true; formMessage(form, 'Checking your details…', 'success'); try { await loginUser(form.email.value, form.password.value); window.location.href = 'admin.html'; } catch (error) { formMessage(form, error.message || 'Unable to sign in.'); button.disabled = false; } });
