ALTER TABLE fotos ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video'));
ALTER TABLE fotos ADD COLUMN mime_type TEXT NOT NULL DEFAULT '';
