const STORAGE_KEY = 'saludagenda.appointments.v1';
const USERS_KEY = 'saludagenda.users.v1';
const SESSION_KEY = 'saludagenda.session.v1';
const authScreen = document.querySelector('#auth-screen');
const appShell = document.querySelector('#app-shell');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
let authMode = 'login';
let currentUser = null;
function setView(view) {
  appShell.classList.toggle('appointments-only', view === 'appointments');
  document.querySelectorAll('.topbar nav a[data-view]').forEach(link => {
    const active = link.dataset.view === view;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (view === 'appointments') document.querySelector('#citas').scrollIntoView({ behavior: 'smooth', block: 'start' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.topbar nav a[data-view]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    setView(link.dataset.view);
    history.replaceState(null, '', link.getAttribute('href'));
  });
});

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}
function showApp(user) {
  currentUser = user;
  authScreen.hidden = true;
  appShell.hidden = false;
  document.querySelector('#user-name').textContent = user.name;
  document.querySelector('#user-avatar').textContent = user.name.trim().charAt(0).toUpperCase();
  setView(location.hash === '#citas' ? 'appointments' : 'summary');
  render();
}
function showAuth() {
  currentUser = null;
  appShell.hidden = true;
  authScreen.hidden = false;
  loginForm.reset();
  registerForm.reset();
}
function switchAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  const registering = authMode === 'register';
  loginForm.hidden = registering;
  registerForm.hidden = !registering;
  document.querySelector('#auth-title').textContent = registering ? 'Crea tu cuenta' : 'Inicia sesión';
  document.querySelector('#auth-subtitle').textContent = registering ? 'Regístrate para comenzar a organizar tus citas.' : 'Ingresa para administrar tus citas médicas.';
  document.querySelector('#switch-prompt').textContent = registering ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?';
  document.querySelector('#switch-auth').textContent = registering ? 'Inicia sesión' : 'Regístrate';
  document.querySelector('#login-error').textContent = '';
  document.querySelector('#register-error').textContent = '';
}
document.querySelector('#switch-auth').addEventListener('click', switchAuthMode);
document.querySelectorAll('.password-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const input = button.parentElement.querySelector('input');
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    button.setAttribute('aria-label', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
    button.setAttribute('aria-pressed', String(showing));
    button.textContent = showing ? '◎' : '◉';
  });
});
loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = loginForm.elements.email.value.trim().toLowerCase();
  const password = loginForm.elements.password.value;
  const user = getUsers().find(item => item.email === email && item.password === password);
  if (!user) {
    document.querySelector('#login-error').textContent = 'Correo o contraseña incorrectos. Si aún no tienes cuenta, regístrate.';
    return;
  }
  localStorage.setItem(SESSION_KEY, user.email);
  showApp(user);
});
registerForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = registerForm.elements.email.value.trim().toLowerCase();
  const users = getUsers();
  if (users.some(item => item.email === email)) {
    document.querySelector('#register-error').textContent = 'Ya existe una cuenta con ese correo. Inicia sesión.';
    return;
  }
  const user = { name: registerForm.elements.name.value.trim(), email, password: registerForm.elements.password.value };
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, user.email);
  showApp(user);
});
document.querySelector('#logout').addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  showAuth();
});
const form = document.querySelector('#appointment-form');
const dialog = document.querySelector('#appointment-dialog');
const dateInput = form.elements.date;
const doctorSelect = form.elements.doctor;
const doctorsBySpecialty = {
  'Medicina general': ['Dra. Camila Ruiz', 'Dr. Andrés Herrera'],
  'Odontología': ['Dra. Valentina Rojas', 'Dr. Felipe Mora'],
  'Psicología': ['Dra. Laura Méndez', 'Dr. Santiago Gil'],
  'Pediatría': ['Dra. Natalia Castro', 'Dr. Mateo León'],
  'Dermatología': ['Dra. Paula Torres', 'Dr. Juan David López'],
};
const today = new Date();
const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateInput.min = localToday;

function loadAppointments() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
let appointments = loadAppointments();
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateLabel = value => new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`));
function remainingLabel(appointment) {
  const target = new Date(`${appointment.date}T${appointment.time}:00`).getTime();
  const delta = target - Date.now();
  if (delta <= 0) return '<span class="countdown finished">Cita finalizada</span>';
  const totalMinutes = Math.floor(delta / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const label = days ? `${days} d ${hours} h` : hours ? `${hours} h ${minutes} min` : `${minutes} min`;
  return `<span class="countdown">${label}</span>`;
}

function render() {
  if (!currentUser) return;
  const query = document.querySelector('#search').value.trim().toLocaleLowerCase('es');
  const ownAppointments = appointments.filter(a => a.userEmail === currentUser.email);
  const sorted = [...ownAppointments].sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const visible = sorted.filter(a => `${a.patient} ${a.specialty} ${a.doctor}`.toLocaleLowerCase('es').includes(query));
  document.querySelector('#appointment-list').innerHTML = visible.map(a => `<tr>
    <td><strong>${escapeHtml(a.patient)}</strong><small>${escapeHtml(a.doctor)}</small></td>
    <td>${escapeHtml(a.specialty)}</td><td><strong>${dateLabel(a.date)}</strong><small>${escapeHtml(a.time)}</small></td>
    <td>${remainingLabel(a)}</td>
    <td><span class="badge ${a.status.toLowerCase()}">${a.status}</span></td>
    <td><div class="actions">${a.status==='Pendiente'?`<button class="row-action" data-action="confirm" data-id="${a.id}">Confirmar</button>`:''}<button class="row-action" data-action="edit" data-id="${a.id}">Editar</button><button class="row-action danger" data-action="cancel" data-id="${a.id}">Cancelar</button></div></td>
  </tr>`).join('');
  document.querySelector('#empty').classList.toggle('visible', visible.length===0);
  document.querySelector('#today-count').textContent=ownAppointments.filter(a=>a.date===localToday).length;
  document.querySelector('#pending-count').textContent=ownAppointments.filter(a=>a.status==='Pendiente').length;
  document.querySelector('#confirmed-count').textContent=ownAppointments.filter(a=>a.status==='Confirmada').length;
}
function updateDoctors(){
  const specialty=form.elements.specialty.value;
  const doctors=doctorsBySpecialty[specialty]||[];
  doctorSelect.innerHTML=doctors.length?'<option value="">Seleccionar profesional</option>'+doctors.map(name=>`<option>${escapeHtml(name)}</option>`).join(''):'<option value="">Primero elige especialidad</option>';
  doctorSelect.disabled=doctors.length===0;
}
let editingAppointmentId = null;
function openDialog(appointment = null){
  document.querySelector('#form-error').textContent='';form.reset();editingAppointmentId=appointment?.id??null;updateDoctors();dateInput.min=localToday;
  if(appointment){form.elements.patient.value=appointment.patient;form.elements.specialty.value=appointment.specialty;updateDoctors();form.elements.doctor.value=appointment.doctor;form.elements.date.value=appointment.date;form.elements.time.value=appointment.time;form.elements.notes.value=appointment.notes||'';document.querySelector('#appointment-dialog h2').textContent='Editar cita';form.querySelector('button[type="submit"]').textContent='Guardar cambios';}
  else{document.querySelector('#appointment-dialog h2').textContent='Agendar una cita';form.querySelector('button[type="submit"]').textContent='Guardar cita';}
  dialog.showModal();form.elements.patient.focus();
}
form.elements.specialty.addEventListener('change',updateDoctors);
document.querySelector('#new-appointment').addEventListener('click',openDialog);
document.querySelector('#empty-new').addEventListener('click',openDialog);
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
document.querySelector('#search').addEventListener('input',render);
form.addEventListener('submit',e=>{
  e.preventDefault();
  const data=new FormData(form);
  const appointment={id:editingAppointmentId||crypto.randomUUID(),userEmail:currentUser.email,patient:data.get('patient').trim(),specialty:data.get('specialty'),doctor:data.get('doctor').trim(),date:data.get('date'),time:data.get('time'),notes:data.get('notes').trim(),status:'Pendiente'};
  if(appointment.date<localToday){document.querySelector('#form-error').textContent='Selecciona una fecha de hoy o posterior.';return;}
  const duplicate=appointments.some(a=>a.id!==editingAppointmentId&&a.userEmail===currentUser.email&&a.date===appointment.date&&a.time===appointment.time&&a.doctor.toLocaleLowerCase()===appointment.doctor.toLocaleLowerCase());
  if(duplicate){document.querySelector('#form-error').textContent='Ese profesional ya tiene una cita a esa hora.';return;}
  if(editingAppointmentId)appointments=appointments.map(a=>a.id===editingAppointmentId&&a.userEmail===currentUser.email?{...a,...appointment}:a);else appointments.push(appointment);
  editingAppointmentId=null;save();render();dialog.close();
});
document.querySelector('#appointment-list').addEventListener('click',e=>{
  const button=e.target.closest('button[data-action]');if(!button)return;
  if(button.dataset.action==='edit'){const appointment=appointments.find(a=>a.id===button.dataset.id&&a.userEmail===currentUser.email);if(appointment)openDialog(appointment);return;}
  if(button.dataset.action==='cancel')appointments=appointments.filter(a=>!(a.id===button.dataset.id&&a.userEmail===currentUser.email));
  if(button.dataset.action==='confirm')appointments=appointments.map(a=>a.id===button.dataset.id&&a.userEmail===currentUser.email?{...a,status:'Confirmada'}:a);
  save();render();
});
const savedEmail = localStorage.getItem(SESSION_KEY);
const savedUser = getUsers().find(item => item.email === savedEmail);
if (savedUser) showApp(savedUser);
window.setInterval(() => {
  if (currentUser) render();
}, 60000);
