const STORAGE_KEY = 'saludagenda.appointments.v1';
const MEDICAL_RECORDS_KEY = 'saludagenda.medicalRecords.v1';
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
  appShell.classList.toggle('histories-only', view === 'histories');
  document.querySelectorAll('.topbar nav a[data-view]').forEach(link => {
    const active = link.dataset.view === view;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (view === 'appointments') document.querySelector('#citas').scrollIntoView({ behavior: 'smooth', block: 'start' });
  else if (view === 'histories') document.querySelector('#historias').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  setView(location.hash === '#citas' ? 'appointments' : location.hash === '#historias' ? 'histories' : 'summary');
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
const medicalRecordForm = document.querySelector('#medical-record-form');
const medicalRecordDialog = document.querySelector('#medical-record-dialog');
const dateInput = form.elements.date;
const timeInput = form.elements.time;
const patientInput = form.elements.patient;
const specialtySelect = form.elements.specialty;
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
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const localTime = date => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

Object.keys(doctorsBySpecialty).forEach(specialty => {
  const option = document.createElement('option');
  option.value = specialty;
  option.textContent = specialty;
  specialtySelect.append(option);
});

function loadAppointments() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function loadMedicalRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY) || '[]');
    if (!Array.isArray(records)) throw new TypeError('El almacenamiento de expedientes no contiene una lista.');
    return records;
  } catch (error) {
    console.error('No se pudieron cargar los expedientes médicos.', error);
    const storageError = document.querySelector('#medical-record-storage-error');
    storageError.textContent = 'No se pudieron cargar los expedientes guardados. No se podrán agregar nuevos registros para evitar sobrescribir los datos.';
    storageError.hidden = false;
    document.querySelector('#new-medical-record').disabled = true;
    return [];
  }
}
let appointments = loadAppointments();
let medicalRecords = loadMedicalRecords();
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateLabel = value => new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`));
const normalizeProfessional = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
const normalizeSearch = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
function hasScheduleConflict(candidate) {
  return appointments.some(appointment =>
    appointment.id !== candidate.id &&
    appointment.userEmail === candidate.userEmail &&
    appointment.date === candidate.date &&
    appointment.time === candidate.time &&
    normalizeProfessional(appointment.doctor) === normalizeProfessional(candidate.doctor)
  );
}
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
  const rawQuery = document.querySelector('#search').value;
  const query = normalizeSearch(rawQuery);
  const ownAppointments = appointments.filter(a => a.userEmail === currentUser.email);
  const sorted = [...ownAppointments].sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const visible = sorted.filter(a => normalizeSearch(a.patient).includes(query));
  document.querySelector('#appointment-list').innerHTML = visible.map(a => `<tr id="appointment-${escapeHtml(a.id)}" tabindex="-1">
    <td><strong>${escapeHtml(a.patient)}</strong><small>${escapeHtml(a.doctor)}</small></td>
    <td>${escapeHtml(a.specialty)}</td><td><strong>${dateLabel(a.date)}</strong><small>${escapeHtml(a.time)}</small></td>
    <td>${remainingLabel(a)}</td>
    <td><span class="badge ${a.status.toLowerCase()}">${a.status}</span></td>
    <td><div class="actions">${a.status==='Pendiente'?`<button class="row-action" data-action="confirm" data-id="${a.id}">Confirmar</button>`:''}<button class="row-action" data-action="edit" data-id="${a.id}">Editar</button><button class="row-action danger" data-action="cancel" data-id="${a.id}">Cancelar</button></div></td>
  </tr>`).join('');
  const empty = document.querySelector('#empty');
  empty.classList.toggle('visible', visible.length === 0);
  document.querySelector('#empty-title').textContent = query ? 'No se encontraron citas' : 'Aún no hay citas';
  document.querySelector('#empty-description').textContent = query ? `No hay citas para “${rawQuery.trim()}”. Prueba con otro nombre.` : 'Registra la primera cita para comenzar.';
  document.querySelector('#empty-new').hidden = Boolean(query);
  document.querySelector('#empty-clear-search').hidden = !query;
  document.querySelector('#today-count').textContent=ownAppointments.filter(a=>a.date===localToday).length;
  document.querySelector('#pending-count').textContent=ownAppointments.filter(a=>a.status==='Pendiente').length;
  document.querySelector('#confirmed-count').textContent=ownAppointments.filter(a=>a.status==='Confirmada').length;
  const pastConsultations = sorted.filter(a => new Date(`${a.date}T${a.time}:00`).getTime() <= Date.now()).reverse();
  document.querySelector('#history-list').innerHTML = pastConsultations.map(a => `<article class="history-card">
    <div class="history-card-head"><div><h3>${escapeHtml(a.patient)}</h3><p>${escapeHtml(a.specialty)} <span>•</span> ${escapeHtml(a.doctor)}</p></div><time datetime="${escapeHtml(a.date)}T${escapeHtml(a.time)}">${dateLabel(a.date)} · ${escapeHtml(a.time)}</time></div>
    <div class="history-notes"><strong>Observaciones</strong><p>${escapeHtml(a.notes?.trim() || 'Sin observaciones registradas.')}</p></div>
  </article>`).join('');
  document.querySelector('#history-empty').classList.toggle('visible', pastConsultations.length === 0);
  const ownMedicalRecords = medicalRecords
    .filter(record => record.userEmail === currentUser.email)
    .sort((a, b) => b.date.localeCompare(a.date));
  document.querySelector('#medical-record-list').innerHTML = ownMedicalRecords.map(record => `<article class="medical-record-card">
    <div class="history-card-head"><h4>${escapeHtml(record.patient)}</h4><time datetime="${escapeHtml(record.date)}">${dateLabel(record.date)}</time></div>
    <div class="medical-record-detail"><strong>Diagnóstico</strong><p>${escapeHtml(record.diagnosis)}</p></div>
    <div class="medical-record-detail"><strong>Tratamiento</strong><p>${escapeHtml(record.treatment)}</p></div>
    <div class="medical-record-detail"><strong>Observaciones</strong><p>${escapeHtml(record.notes?.trim() || 'Sin observaciones registradas.')}</p></div>
  </article>`).join('');
  document.querySelector('#medical-record-empty').classList.toggle('visible', ownMedicalRecords.length === 0);
}
function updateDoctors(selectedDoctor = ''){
  const specialty=specialtySelect.value;
  const doctors=doctorsBySpecialty[specialty]||[];
  doctorSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = doctors.length ? 'Seleccionar profesional' : 'Primero elige especialidad';
  doctorSelect.append(placeholder);
  doctors.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    doctorSelect.append(option);
  });
  doctorSelect.disabled=doctors.length===0;
  doctorSelect.value = doctors.includes(selectedDoctor) ? selectedDoctor : '';
}
let editingAppointmentId = null;
function openDialog(appointment = null){
  document.querySelector('#form-error').textContent='';form.reset();editingAppointmentId=appointment?.id??null;updateDoctors();dateInput.min=localDate(new Date());
  if(appointment){patientInput.value=appointment.patient;specialtySelect.value=appointment.specialty;updateDoctors(appointment.doctor);dateInput.value=appointment.date;timeInput.value=appointment.time;form.elements.notes.value=appointment.notes||'';document.querySelector('#appointment-dialog h2').textContent='Editar cita';document.querySelector('#appointment-dialog .dialog-description').textContent='Actualiza los datos de esta cita.';form.querySelector('button[type="submit"]').textContent='Guardar cambios';}
  else{document.querySelector('#appointment-dialog h2').textContent='Agendar una cita';document.querySelector('#appointment-dialog .dialog-description').textContent='Completa los datos para reservar un horario de atención.';form.querySelector('button[type="submit"]').textContent='Guardar cita';}
  updateTimeMinimum();
  updateAppointmentAvailability();
  dialog.showModal();form.elements.patient.focus();
}
function updateTimeMinimum() {
  const now = new Date();
  timeInput.min = dateInput.value === localDate(now) ? localTime(now) : '';
}
function updateAppointmentAvailability() {
  const availability = document.querySelector('#appointment-availability');
  const submitButton = form.querySelector('button[type="submit"]');
  const hasSchedule = specialtySelect.value && doctorSelect.value && dateInput.value && timeInput.value;
  if (!hasSchedule || !currentUser) {
    availability.textContent = 'Selecciona un profesional, fecha y hora para revisar la disponibilidad.';
    availability.classList.remove('is-available', 'is-unavailable');
    submitButton.disabled = false;
    return;
  }
  const now = new Date();
  if (dateInput.value < localDate(now) || (dateInput.value === localDate(now) && timeInput.value <= localTime(now))) {
    availability.textContent = 'La fecha y hora deben ser futuras.';
    availability.classList.remove('is-available');
    availability.classList.add('is-unavailable');
    submitButton.disabled = true;
    return;
  }
  const conflict = hasScheduleConflict({
    id: editingAppointmentId,
    userEmail: currentUser.email,
    doctor: doctorSelect.value,
    date: dateInput.value,
    time: timeInput.value,
  });
  availability.textContent = conflict
    ? 'Este profesional ya tiene una cita en ese horario. Elige otro horario o profesional.'
    : 'Horario disponible para reservar.';
  availability.classList.toggle('is-available', !conflict);
  availability.classList.toggle('is-unavailable', conflict);
  submitButton.disabled = conflict;
}
specialtySelect.addEventListener('change', () => {
  updateDoctors();
  updateAppointmentAvailability();
});
dateInput.addEventListener('change', () => {
  updateTimeMinimum();
  updateAppointmentAvailability();
});
doctorSelect.addEventListener('change', updateAppointmentAvailability);
timeInput.addEventListener('change', updateAppointmentAvailability);
form.addEventListener('input', () => {
  document.querySelector('#form-error').textContent = '';
  updateAppointmentAvailability();
});
form.addEventListener('change', updateAppointmentAvailability);
document.querySelector('#new-appointment').addEventListener('click', () => openDialog());
document.querySelector('#empty-new').addEventListener('click', () => openDialog());
document.querySelector('#empty-clear-search').addEventListener('click', () => {
  document.querySelector('#search').value = '';
  render();
  document.querySelector('#search').focus();
});
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
function openMedicalRecordDialog() {
  medicalRecordForm.reset();
  document.querySelector('#medical-record-error').textContent = '';
  medicalRecordForm.elements.date.max = localToday;
  medicalRecordDialog.showModal();
  medicalRecordForm.elements.patient.focus();
}
document.querySelector('#new-medical-record').addEventListener('click', openMedicalRecordDialog);
document.querySelector('#close-medical-record-dialog').addEventListener('click', () => medicalRecordDialog.close());
document.querySelector('#cancel-medical-record-dialog').addEventListener('click', () => medicalRecordDialog.close());
medicalRecordDialog.addEventListener('click', event => { if (event.target === medicalRecordDialog) medicalRecordDialog.close(); });
medicalRecordForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(medicalRecordForm);
  const record = {
    id: crypto.randomUUID(),
    userEmail: currentUser.email,
    patient: data.get('patient').trim(),
    date: data.get('date'),
    diagnosis: data.get('diagnosis').trim(),
    treatment: data.get('treatment').trim(),
    notes: data.get('notes').trim(),
  };
  if (record.date > localToday) {
    document.querySelector('#medical-record-error').textContent = 'La fecha de atención no puede ser futura.';
    return;
  }
  const updatedRecords = [...medicalRecords, record];
  try {
    localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(updatedRecords));
  } catch (error) {
    console.error('No se pudo guardar el expediente médico.', error);
    document.querySelector('#medical-record-error').textContent = 'No se pudo guardar el expediente. Verifica el espacio disponible en el navegador e inténtalo de nuevo.';
    return;
  }
  medicalRecords = updatedRecords;
  render();
  medicalRecordDialog.close();
});
document.querySelector('#search').addEventListener('input',render);
form.addEventListener('submit', event => {
  event.preventDefault();
  const wasEditing = Boolean(editingAppointmentId);
  const error = document.querySelector('#form-error');
  error.textContent = '';
  const data = new FormData(form);
  const patient = data.get('patient').trim();
  const specialty = data.get('specialty');
  const doctor = data.get('doctor');
  const date = data.get('date');
  const time = data.get('time');
  const selectedDoctors = doctorsBySpecialty[specialty];
  if (!patient) { error.textContent = 'Ingresa el nombre del paciente.'; patientInput.focus(); return; }
  if (patient.length > 70) { error.textContent = 'El nombre del paciente no puede superar los 70 caracteres.'; patientInput.focus(); return; }
  if (!selectedDoctors) { error.textContent = 'Selecciona una especialidad válida.'; specialtySelect.focus(); return; }
  if (!selectedDoctors.includes(doctor)) { error.textContent = 'Selecciona un profesional de la especialidad elegida.'; doctorSelect.focus(); return; }
  if (!date || !time) { error.textContent = 'Completa la fecha y la hora de la cita.'; (!date ? dateInput : timeInput).focus(); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || localDate(new Date(`${date}T12:00:00`)) !== date || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    error.textContent = 'Ingresa una fecha y hora válidas.';
    dateInput.focus();
    return;
  }
  const now = new Date();
  const currentDate = localDate(now);
  if (date < currentDate || (date === currentDate && time <= localTime(now))) {
    error.textContent = 'Selecciona una fecha y hora futuras.';
    (date < currentDate ? dateInput : timeInput).focus();
    return;
  }
  const appointment = {
    id: editingAppointmentId || crypto.randomUUID(),
    userEmail: currentUser.email,
    patient,
    specialty,
    doctor,
    date,
    time,
    notes: data.get('notes').trim(),
    status: 'Pendiente',
  };
  if(hasScheduleConflict(appointment)){error.textContent='Ese profesional ya tiene una cita a esa hora.';doctorSelect.focus();return;}
  let updatedAppointments;
  if (editingAppointmentId) {
    const existing = appointments.some(item => item.id === editingAppointmentId && item.userEmail === currentUser.email);
    if (!existing) { error.textContent = 'No se encontró la cita que intentas editar. Actualiza la página e inténtalo de nuevo.'; return; }
    updatedAppointments = appointments.map(item => item.id === editingAppointmentId && item.userEmail === currentUser.email ? { ...item, ...appointment } : item);
  } else {
    updatedAppointments = [...appointments, appointment];
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAppointments));
  } catch (storageError) {
    console.error('No se pudo guardar la cita.', storageError);
    error.textContent = 'No se pudo guardar la cita. Verifica el espacio disponible en el navegador e inténtalo de nuevo.';
    return;
  }
  appointments = updatedAppointments;
  editingAppointmentId = null;
  document.querySelector('#search').value = '';
  document.querySelector('#appointment-feedback').textContent = `Cita ${wasEditing ? 'actualizada' : 'guardada'} para ${appointment.patient}.`;
  dialog.close();
  render();
  setView('appointments');
  history.replaceState(null, '', '#citas');
  requestAnimationFrame(() => {
    const row = document.querySelector(`#appointment-${CSS.escape(appointment.id)}`);
    if (!row) return;
    row.classList.add('appointment-saved');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.focus({ preventScroll: true });
    window.setTimeout(() => row.classList.remove('appointment-saved'), 2200);
  });
});
document.querySelector('#appointment-list').addEventListener('click',e=>{
  const button=e.target.closest('button[data-action]');if(!button)return;
  if(button.dataset.action==='edit'){const appointment=appointments.find(a=>a.id===button.dataset.id&&a.userEmail===currentUser.email);if(appointment)openDialog(appointment);return;}
  let updatedAppointments;
  if(button.dataset.action==='cancel')updatedAppointments=appointments.filter(a=>!(a.id===button.dataset.id&&a.userEmail===currentUser.email));
  if(button.dataset.action==='confirm')updatedAppointments=appointments.map(a=>a.id===button.dataset.id&&a.userEmail===currentUser.email?{...a,status:'Confirmada'}:a);
  if (!updatedAppointments) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAppointments)); }
  catch (storageError) {
    console.error('No se pudo actualizar la cita.', storageError);
    document.querySelector('#appointment-feedback').textContent = 'No se pudo actualizar la cita. Verifica el almacenamiento del navegador.';
    return;
  }
  appointments = updatedAppointments;
  document.querySelector('#appointment-feedback').textContent = button.dataset.action === 'cancel' ? 'Cita cancelada.' : 'Cita confirmada.';
  render();
});
const savedEmail = localStorage.getItem(SESSION_KEY);
const savedUser = getUsers().find(item => item.email === savedEmail);
if (savedUser) showApp(savedUser);
window.setInterval(() => {
  if (currentUser) render();
}, 60000);
