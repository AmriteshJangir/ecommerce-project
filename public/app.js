const bookingForm = document.getElementById('booking-form');
const serviceTypeSelect = document.getElementById('service-type');
const bookingResult = document.getElementById('booking-result');
const helpersList = document.getElementById('helpers-list');
const requestsList = document.getElementById('requests-list');

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function setResult(message, isSuccess) {
  bookingResult.textContent = message;
  bookingResult.className = isSuccess ? 'result success' : 'result error';
}

async function loadServices() {
  const services = await request('/api/services');
  serviceTypeSelect.innerHTML = services
    .map((service) => `<option value="${service}">${service}</option>`)
    .join('');
}

function helperCard(helper) {
  return `
    <div class="helper-item">
      <strong>${helper.name}</strong>
      <div class="helper-meta">
        ID: ${helper.id} | Rating: ${helper.rating} | Skills: ${helper.skills || '-'}
      </div>
      <div class="helper-meta">
        Status: ${helper.status} | GPS: ${helper.latitude}, ${helper.longitude} | Auto Response: ${helper.auto_response}
      </div>
      <div class="helper-controls">
        <button class="small-btn" onclick="updateStatus(${helper.id}, 'Available')">Set Available</button>
        <button class="small-btn" onclick="updateStatus(${helper.id}, 'Busy')">Set Busy</button>
        <button class="small-btn" onclick="updateResponse(${helper.id}, 'accepted')">Auto Accept</button>
        <button class="small-btn" onclick="updateResponse(${helper.id}, 'rejected')">Auto Reject</button>
      </div>
      <div class="helper-controls">
        <button class="small-btn" onclick="updateResponse(${helper.id}, 'no_response')">Auto No Response</button>
        <button class="small-btn" onclick="moveHelper(${helper.id}, 0.002, 0)">Move North</button>
        <button class="small-btn" onclick="moveHelper(${helper.id}, -0.002, 0)">Move South</button>
        <button class="small-btn" onclick="moveHelper(${helper.id}, 0, 0.002)">Move East</button>
      </div>
    </div>
  `;
}

async function loadHelpers() {
  const helpers = await request('/api/helpers');
  helpersList.innerHTML = helpers.map(helperCard).join('');
}

async function loadRequests() {
  const requests = await request('/api/requests');
  requestsList.innerHTML = requests.length
    ? requests
        .map(
          (r) => `
      <div class="request-item">
        <strong>Request #${r.id}</strong><br>
        User: ${r.user_name} | Service: ${r.service_type}<br>
        Status: ${r.status} | Attempts: ${r.attempts} | Assigned: ${r.assigned_helper || '-'}
      </div>
    `
        )
        .join('')
    : '<p>No bookings yet.</p>';
}

window.updateStatus = async (helperId, status) => {
  await request(`/api/helpers/${helperId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  await loadHelpers();
};

window.updateResponse = async (helperId, autoResponse) => {
  await request(`/api/helpers/${helperId}/response`, {
    method: 'PUT',
    body: JSON.stringify({ auto_response: autoResponse }),
  });
  await loadHelpers();
};

window.moveHelper = async (helperId, latDelta, lonDelta) => {
  const helpers = await request('/api/helpers');
  const helper = helpers.find((h) => h.id === helperId);
  if (!helper) {
    return;
  }

  await request(`/api/helpers/${helperId}/location`, {
    method: 'PUT',
    body: JSON.stringify({
      latitude: Number(helper.latitude) + latDelta,
      longitude: Number(helper.longitude) + lonDelta,
    }),
  });

  await loadHelpers();
};

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    user_name: document.getElementById('user-name').value.trim(),
    service_type: serviceTypeSelect.value,
    user_latitude: Number(document.getElementById('user-latitude').value),
    user_longitude: Number(document.getElementById('user-longitude').value),
  };

  try {
    const result = await request('/api/book', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (result.status === 'ASSIGNED') {
      const helper = result.helper;
      setResult(
        `Assigned: ${helper.name} | Distance: ${helper.distance_km} km | ETA: ${helper.eta_minutes} min | Attempts: ${result.attempts}`,
        true
      );
    } else {
      setResult(`${result.message} (Attempts: ${result.attempts})`, false);
    }

    await loadHelpers();
    await loadRequests();
  } catch (error) {
    setResult(error.message, false);
  }
});

async function boot() {
  await loadServices();
  await loadHelpers();
  await loadRequests();
}

boot();
