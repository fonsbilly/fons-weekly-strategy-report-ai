-- Weekly Strategy Report AI: seed the single org_settings row
-- Run after 0002_rls.sql

insert into org_settings (id) values (true);
