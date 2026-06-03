const path = require('path');
const express = require('express');
const { initializeDatabase, all, get, run } = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function estimateEtaMinutes(distanceKm) {
  const citySpeedKmPerHour = 25;
  const etaMinutes = (distanceKm / citySpeedKmPerHour) * 60;
  return Math.max(1, Math.round(etaMinutes));
}

async function pickBestHelper(serviceType, userLat, userLon, excludedIds) {
  const placeholders = excludedIds.map(() => '?').join(',');
  const params = [serviceType, ...excludedIds];

  const exclusionClause = excludedIds.length > 0 ? `AND h.id NOT IN (${placeholders})` : '';

  const rows = await all(
    `SELECT h.id, h.name, h.rating, h.latitude, h.longitude, h.status, h.auto_response
     FROM helpers h
     INNER JOIN helper_skills hs ON hs.helper_id = h.id
     WHERE hs.service_type = ?
       AND h.status = 'Available'
       ${exclusionClause}`,
    params
  );

  if (rows.length === 0) {
    return null;
  }

  const ranked = rows
    .map((helper) => {
      const distanceKm = haversineKm(userLat, userLon, helper.latitude, helper.longitude);
      return { ...helper, distanceKm };
    })
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return b.rating - a.rating;
    });

  return ranked[0];
}

app.get('/api/helpers', async (req, res) => {
  try {
    const helpers = await all(
      `SELECT h.id, h.name, h.rating, h.latitude, h.longitude, h.status, h.auto_response,
              GROUP_CONCAT(hs.service_type) AS skills
       FROM helpers h
       LEFT JOIN helper_skills hs ON hs.helper_id = h.id
       GROUP BY h.id
       ORDER BY h.id`
    );
    res.json(helpers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const rows = await all('SELECT DISTINCT service_type FROM helper_skills ORDER BY service_type');
    res.json(rows.map((row) => row.service_type));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/helpers/:id/location', async (req, res) => {
  try {
    const helperId = Number(req.params.id);
    const { latitude, longitude } = req.body;

    if (Number.isNaN(helperId) || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Invalid helper id or GPS coordinates.' });
    }

    await run(
      'UPDATE helpers SET latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [latitude, longitude, helperId]
    );

    res.json({ message: 'Helper GPS location updated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/helpers/:id/status', async (req, res) => {
  try {
    const helperId = Number(req.params.id);
    const { status } = req.body;

    if (!['Available', 'Busy'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Available or Busy.' });
    }

    await run('UPDATE helpers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, helperId]);
    res.json({ message: 'Helper status updated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/helpers/:id/response', async (req, res) => {
  try {
    const helperId = Number(req.params.id);
    const { auto_response: autoResponse } = req.body;

    if (!['accepted', 'rejected', 'no_response'].includes(autoResponse)) {
      return res.status(400).json({ error: 'auto_response must be accepted, rejected, or no_response.' });
    }

    await run('UPDATE helpers SET auto_response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [autoResponse, helperId]);
    res.json({ message: 'Helper auto response updated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/book', async (req, res) => {
  try {
    const { user_name: userName, service_type: serviceType, user_latitude: userLat, user_longitude: userLon } = req.body;

    if (!userName || !serviceType || typeof userLat !== 'number' || typeof userLon !== 'number') {
      return res.status(400).json({ error: 'Please provide user_name, service_type, user_latitude, and user_longitude.' });
    }

    const requestInsert = await run(
      `INSERT INTO service_requests (user_name, service_type, user_latitude, user_longitude, status)
       VALUES (?, ?, ?, ?, 'Pending')`,
      [userName, serviceType, userLat, userLon]
    );

    const requestId = requestInsert.lastID;
    const triedHelpers = [];
    let attempts = 0;

    while (true) {
      const helper = await pickBestHelper(serviceType, userLat, userLon, triedHelpers);

      if (!helper) {
        await run(
          `UPDATE service_requests
           SET status = 'No Helper Available', attempts = ?
           WHERE id = ?`,
          [attempts, requestId]
        );

        return res.json({
          request_id: requestId,
          status: 'NO_HELPER_AVAILABLE',
          attempts,
          message: 'No helper is currently available for this service.'
        });
      }

      attempts += 1;
      triedHelpers.push(helper.id);

      await run('UPDATE helpers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['Busy', helper.id]);

      if (helper.auto_response === 'accepted') {
        await run(
          `UPDATE service_requests
           SET status = 'Assigned', assigned_helper_id = ?, attempts = ?
           WHERE id = ?`,
          [helper.id, attempts, requestId]
        );

        return res.json({
          request_id: requestId,
          status: 'ASSIGNED',
          attempts,
          helper: {
            id: helper.id,
            name: helper.name,
            rating: helper.rating,
            distance_km: Number(helper.distanceKm.toFixed(2)),
            eta_minutes: estimateEtaMinutes(helper.distanceKm)
          },
          message: `Helper ${helper.name} assigned successfully.`
        });
      }

      await run('UPDATE helpers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['Available', helper.id]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const requests = await all(
      `SELECT r.id, r.user_name, r.service_type, r.status, r.attempts, r.created_at,
              h.name AS assigned_helper
       FROM service_requests r
       LEFT JOIN helpers h ON h.id = r.assigned_helper_id
       ORDER BY r.id DESC`
    );
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  });
