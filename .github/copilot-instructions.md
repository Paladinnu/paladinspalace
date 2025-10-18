- [ ] Scaffold Project
- [ ] Customize Project
- [ ] Documentation Complete

Moderation Notes:

- Image uploads (listings, upload-by-url, avatar, cover) are checked with a lightweight NSFW heuristic that estimates skin-tone ratio via sharp. If flagged, the API returns an error with code "NSFW".
- Environment variables:
	- MODERATION_BYPASS=1 to bypass checks (useful locally)
	- MODERATION_SKIN_THRESHOLD (default 0.38) to tune sensitivity. Lower = stricter, higher = looser.
- Limitations: heuristic may produce false positives/negatives. For production-grade moderation, integrate a dedicated provider (e.g., Sightengine, Hive, AWS Rekognition) behind the same moderateImage() interface.
