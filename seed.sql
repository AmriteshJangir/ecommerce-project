DELETE FROM helper_skills;
DELETE FROM service_requests;
DELETE FROM helpers;

INSERT INTO helpers (id, name, rating, latitude, longitude, status, auto_response) VALUES
(1, 'Riya', 4.8, 28.6139, 77.2090, 'Available', 'accepted'),
(2, 'Aman', 4.9, 28.6145, 77.2000, 'Available', 'rejected'),
(3, 'Neha', 4.7, 28.6201, 77.2150, 'Available', 'no_response'),
(4, 'Kabir', 4.6, 28.6250, 77.2050, 'Busy', 'accepted');

INSERT INTO helper_skills (helper_id, service_type) VALUES
(1, 'cleaning'),
(1, 'cooking'),
(2, 'cleaning'),
(3, 'cleaning'),
(3, 'babysitting'),
(4, 'plumbing');
