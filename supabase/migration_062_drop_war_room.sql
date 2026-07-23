-- migration_062_drop_war_room.sql
--
-- Removes the war room feature: built (migration_023_war_room.sql) but never
-- wired into any page (ParentWarRoomThread.tsx was dead code, no imports).
-- Product decision Jul 23: drop rather than finish wiring it up, since the
-- lighter shared_list_reactions feature (migration_060) now covers the
-- parent/family engagement need this was meant to serve.

drop table if exists war_room_comments;
