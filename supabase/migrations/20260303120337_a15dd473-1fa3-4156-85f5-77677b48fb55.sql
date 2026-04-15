
-- Add avatar_url column to players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read avatars
CREATE POLICY "Public avatar read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated uploads (we use anon key with wallet-based auth, so allow all inserts)
CREATE POLICY "Anyone can upload avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- Allow update/delete own avatars
CREATE POLICY "Anyone can update avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can delete avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');
