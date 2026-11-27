-- Disposable local E2E seed for KAN-78 (no production data). Password for all: Kan78-local-only
INSERT INTO clubs(id,name,slug,city,country_division,country,status,active) VALUES
 ('11111111-1111-1111-1111-111111111111','Club Tandil Pádel','club-tandil','Tandil','Buenos Aires','AR','ACTIVE',true);
INSERT INTO club_sport_settings(club_id,default_opening_time,default_closing_time) VALUES ('11111111-1111-1111-1111-111111111111','09:00','23:00');
INSERT INTO users(id,email,password_hash,full_name,first_name,last_name,platform_role,is_active,status,email_verified_at) VALUES
 ('22222222-2222-2222-2222-222222222222','admin@kan78.test','$2b$10$PJaTE32qVWkUbBnMjXU91eIsylurkSRvTDJIDXlcDgamPlSHCEtfq','Ana Admin','Ana','Admin','USER',true,'ACTIVE',now()),
 ('33333333-3333-3333-3333-333333333333','staff@kan78.test','$2b$10$PJaTE32qVWkUbBnMjXU91eIsylurkSRvTDJIDXlcDgamPlSHCEtfq','Sergio Staff','Sergio','Staff','USER',true,'ACTIVE',now());
INSERT INTO club_memberships(club_id,user_id,role,status) VALUES
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','CLUB_ADMIN','ACTIVE'),
 ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','CLUB_STAFF','ACTIVE');
INSERT INTO venues(id,club_id,name,city,country) VALUES ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','Legon','Tandil','AR');
INSERT INTO courts(club_id,venue_id,name) VALUES ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','Cancha 1'),('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','Cancha 2');
-- Local-only: several journeys need several active events; FREE keeps MAX_DIVISIONS_PER_EVENT = 2 (under test).
UPDATE plan_features SET limit_value=NULL WHERE feature_key='MAX_ACTIVE_TOURNAMENTS' AND plan_id=(SELECT id FROM plans WHERE code='FREE');
