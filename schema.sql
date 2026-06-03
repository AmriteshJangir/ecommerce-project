CREATE TABLE IF NOT EXISTS helpers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rating REAL NOT NULL CHECK (rating >= 0 AND rating <= 5),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Available', 'Busy')) DEFAULT 'Available',
  auto_response TEXT NOT NULL CHECK (auto_response IN ('accepted', 'rejected', 'no_response')) DEFAULT 'accepted',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS helper_skills (
  helper_id INTEGER NOT NULL,
  service_type TEXT NOT NULL,
  PRIMARY KEY (helper_id, service_type),
  FOREIGN KEY (helper_id) REFERENCES helpers(id)
);

CREATE TABLE IF NOT EXISTS service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  user_latitude REAL NOT NULL,
  user_longitude REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Assigned', 'No Helper Available')) DEFAULT 'Pending',
  assigned_helper_id INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_helper_id) REFERENCES helpers(id)
);
