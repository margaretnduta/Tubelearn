
## Storage
- Profile pictures live in a PRIVATE `avatars` bucket; the workspace blocks public buckets. Files are stored at `<user_id>/avatar.jpg`, the path (not a URL) saved in `public.profiles.avatar_url`, and displayed via 7-day signed URLs resolved in `src/lib/avatar.ts` (`resolveAvatarUrl`, memory cache, invalidate after upload). Why: public-bucket creation is rejected by workspace policy.
