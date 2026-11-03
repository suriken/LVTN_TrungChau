-- ==============================================================================
-- SCHEMA BẢNG DỮ LIỆU CLOUDFLARE D1 CHO KHẢO SÁT & QUẢN TRỊ PTV TRUNG CHÂU 1
-- ==============================================================================

CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  name TEXT,
  phone TEXT,
  is_anonymous INTEGER DEFAULT 0,
  role TEXT,
  unit TEXT,
  grad_level TEXT,
  tenure TEXT,
  region TEXT,
  avg_score REAL,
  scores_json TEXT,
  reasons_json TEXT,
  diet TEXT,
  practice TEXT,
  service_status TEXT,
  challenge TEXT,
  advantages TEXT,
  disadvantages TEXT,
  reality TEXT,
  suggestions TEXT,
  raw_json TEXT,
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_surveys_role ON surveys(role);
