-- Add meeting_link to study_groups table
-- This allows group managers to add virtual meeting links (Zoom, Google Meet, etc.)

ALTER TABLE public.study_groups
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Add index for faster lookups if needed
-- CREATE INDEX IF NOT EXISTS idx_study_groups_meeting_link ON public.study_groups(meeting_link);

-- Add comment to clarify the field
COMMENT ON COLUMN public.study_groups.meeting_link IS 'Virtual meeting link (Zoom, Google Meet, etc.) for online study sessions';

