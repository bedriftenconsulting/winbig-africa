CREATE TABLE IF NOT EXISTS ussd_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    msisdn          VARCHAR(20) NOT NULL,
    sequence_id     VARCHAR(100) NOT NULL,
    player_id       UUID REFERENCES players(id),
    session_state   VARCHAR(50) NOT NULL DEFAULT 'STARTED',
    current_menu    VARCHAR(100),
    user_input      TEXT,
    full_input_log  JSONB DEFAULT '[]',
    raw_request     JSONB,
    started_at      TIMESTAMP NOT NULL DEFAULT now(),
    last_activity   TIMESTAMP NOT NULL DEFAULT now(),
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ussd_sessions_msisdn      ON ussd_sessions (msisdn);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_sequence_id ON ussd_sessions (sequence_id);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_player_id   ON ussd_sessions (player_id);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_state       ON ussd_sessions (session_state);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_started     ON ussd_sessions (started_at);

CREATE TABLE IF NOT EXISTS ussd_registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    msisdn          VARCHAR(20) NOT NULL,
    player_id       UUID REFERENCES players(id),
    session_id      UUID REFERENCES ussd_sessions(id),
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    pin             VARCHAR(255),
    status          VARCHAR(20) DEFAULT 'PENDING',
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ussd_registrations_msisdn ON ussd_registrations (msisdn);
CREATE INDEX IF NOT EXISTS idx_ussd_registrations_player        ON ussd_registrations (player_id);

SELECT 'USSD tables created successfully' as result;
