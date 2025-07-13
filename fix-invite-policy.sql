-- Fix for invitation link issue
-- Run this in your Supabase SQL editor

-- Add policy for anonymous users to view students by invite token
CREATE POLICY "Anonymous users can view students by invite token" ON students
    FOR SELECT USING (invite_token IS NOT NULL);

-- Alternative: More specific policy that only allows viewing students with matching invite token
-- CREATE POLICY "Anonymous users can view students by invite token" ON students
--     FOR SELECT USING (invite_token IS NOT NULL AND invite_token::text = current_setting('request.headers')::json->>'x-invite-token'); 