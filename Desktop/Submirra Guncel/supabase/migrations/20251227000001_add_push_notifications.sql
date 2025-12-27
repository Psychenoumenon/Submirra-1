-- ===========================================
-- PUSH NOTIFICATIONS SYSTEM
-- ===========================================

-- Device tokens table - stores FCM/APNs tokens for each user device
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own device tokens"
    ON device_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device tokens"
    ON device_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
    ON device_tokens FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
    ON device_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- Push notification queue table - for tracking sent notifications
CREATE TABLE IF NOT EXISTS push_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_push_queue_status ON push_notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_push_queue_user_id ON push_notification_queue(user_id);

-- Enable RLS
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access push queue
CREATE POLICY "Service role can manage push queue"
    ON push_notification_queue FOR ALL
    USING (auth.role() = 'service_role');

-- ===========================================
-- TRIGGER FUNCTIONS
-- ===========================================

-- Function to queue push notification when a new notification is created
CREATE OR REPLACE FUNCTION queue_push_for_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_body TEXT;
    actor_name TEXT;
BEGIN
    -- Get actor name if exists
    IF NEW.actor_id IS NOT NULL THEN
        SELECT full_name INTO actor_name FROM profiles WHERE id = NEW.actor_id;
    END IF;

    -- Set title and body based on notification type
    CASE NEW.type
        WHEN 'like' THEN
            notification_title := 'New Like';
            notification_body := COALESCE(actor_name, 'Someone') || ' liked your dream';
        WHEN 'comment' THEN
            notification_title := 'New Comment';
            notification_body := COALESCE(actor_name, 'Someone') || ' commented on your dream';
        WHEN 'follow' THEN
            notification_title := 'New Follower';
            notification_body := COALESCE(actor_name, 'Someone') || ' started following you';
        WHEN 'dream_completed' THEN
            notification_title := 'Dream Analysis Ready';
            notification_body := 'Your dream analysis is complete!';
        WHEN 'trial_expired' THEN
            notification_title := 'Trial Expired';
            notification_body := 'Your trial period has ended. Upgrade to continue!';
        ELSE
            notification_title := 'New Notification';
            notification_body := 'You have a new notification';
    END CASE;

    -- Insert into push queue
    INSERT INTO push_notification_queue (user_id, notification_id, title, body, data)
    VALUES (
        NEW.user_id,
        NEW.id,
        notification_title,
        notification_body,
        jsonb_build_object(
            'type', NEW.type,
            'notification_id', NEW.id,
            'dream_id', NEW.dream_id,
            'actor_id', NEW.actor_id
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue push notification when a new message is received
CREATE OR REPLACE FUNCTION queue_push_for_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
BEGIN
    -- Get sender name
    SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

    -- Insert into push queue
    INSERT INTO push_notification_queue (user_id, message_id, title, body, data)
    VALUES (
        NEW.receiver_id,
        NEW.id,
        COALESCE(sender_name, 'Someone'),
        CASE 
            WHEN NEW.message_text IS NOT NULL AND LENGTH(NEW.message_text) > 0 
            THEN LEFT(NEW.message_text, 100) || CASE WHEN LENGTH(NEW.message_text) > 100 THEN '...' ELSE '' END
            WHEN NEW.audio_url IS NOT NULL THEN '🎤 Voice message'
            WHEN NEW.media_url IS NOT NULL THEN '📷 Media'
            ELSE 'New message'
        END,
        jsonb_build_object(
            'type', 'message',
            'message_id', NEW.id,
            'sender_id', NEW.sender_id,
            'conversation_id', CASE 
                WHEN NEW.sender_id < NEW.receiver_id 
                THEN NEW.sender_id || '_' || NEW.receiver_id 
                ELSE NEW.receiver_id || '_' || NEW.sender_id 
            END
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue push notification for follow requests
CREATE OR REPLACE FUNCTION queue_push_for_follow_request()
RETURNS TRIGGER AS $$
DECLARE
    requester_name TEXT;
BEGIN
    -- Get requester name
    SELECT full_name INTO requester_name FROM profiles WHERE id = NEW.requester_id;

    -- Insert into push queue
    INSERT INTO push_notification_queue (user_id, title, body, data)
    VALUES (
        NEW.target_id,
        'Follow Request',
        COALESCE(requester_name, 'Someone') || ' wants to follow you',
        jsonb_build_object(
            'type', 'follow_request',
            'requester_id', NEW.requester_id
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- CREATE TRIGGERS
-- ===========================================

-- Trigger for new notifications
DROP TRIGGER IF EXISTS push_notification_trigger ON notifications;
CREATE TRIGGER push_notification_trigger
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION queue_push_for_notification();

-- Trigger for new messages
DROP TRIGGER IF EXISTS push_message_trigger ON messages;
CREATE TRIGGER push_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION queue_push_for_message();

-- Trigger for follow requests
DROP TRIGGER IF EXISTS push_follow_request_trigger ON follow_requests;
CREATE TRIGGER push_follow_request_trigger
    AFTER INSERT ON follow_requests
    FOR EACH ROW
    EXECUTE FUNCTION queue_push_for_follow_request();

-- ===========================================
-- HELPER FUNCTION TO GET USER'S ACTIVE TOKENS
-- ===========================================

CREATE OR REPLACE FUNCTION get_user_device_tokens(target_user_id UUID)
RETURNS TABLE (token TEXT, platform TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT dt.token, dt.platform
    FROM device_tokens dt
    WHERE dt.user_id = target_user_id AND dt.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
