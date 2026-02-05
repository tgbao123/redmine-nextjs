-- Delete Demo Project and all related records
-- Run with: npx prisma db execute --file scripts/delete-demo.sql

-- Get project ID first
SET @project_id = (SELECT id FROM projects WHERE name = 'Demo Project' LIMIT 1);

-- Delete related records
DELETE FROM enabled_modules WHERE project_id = @project_id;
DELETE FROM member_roles WHERE member_id IN (SELECT id FROM members WHERE project_id = @project_id);
DELETE FROM members WHERE project_id = @project_id;
DELETE FROM projects_trackers WHERE project_id = @project_id;
DELETE FROM custom_values WHERE customized_type = 'Project' AND customized_id = @project_id;

-- Delete the project
DELETE FROM projects WHERE id = @project_id;

SELECT 'Done!' as result;
