import { validateUrlForPlatform, extractExternalPostId } from './url-utils';

describe('URL Utils', () => {
  describe('validateUrlForPlatform', () => {
    it('should validate TikTok URLs', () => {
      expect(validateUrlForPlatform('https://www.tiktok.com/@user/video/123456', 'TIKTOK')).toBe(true);
      expect(validateUrlForPlatform('https://vm.tiktok.com/abc123/', 'TIKTOK')).toBe(true);
      expect(validateUrlForPlatform('https://www.instagram.com/reel/ABC/', 'TIKTOK')).toBe(false);
    });

    it('should validate Instagram URLs', () => {
      expect(validateUrlForPlatform('https://www.instagram.com/reel/ABC123/', 'INSTAGRAM')).toBe(true);
      expect(validateUrlForPlatform('https://instagram.com/p/XYZ789/', 'INSTAGRAM')).toBe(true);
      expect(validateUrlForPlatform('https://www.tiktok.com/@user/video/123', 'INSTAGRAM')).toBe(false);
    });

    it('should validate YouTube URLs', () => {
      expect(validateUrlForPlatform('https://www.youtube.com/shorts/abc123', 'YOUTUBE')).toBe(true);
      expect(validateUrlForPlatform('https://m.youtube.com/shorts/abc123', 'YOUTUBE')).toBe(true);
      expect(validateUrlForPlatform('https://www.tiktok.com/@user/video/123', 'YOUTUBE')).toBe(false);
    });
  });

  describe('extractExternalPostId', () => {
    it('should extract TikTok video ID', () => {
      expect(extractExternalPostId('https://www.tiktok.com/@user/video/7234567890123456789', 'TIKTOK'))
        .toBe('7234567890123456789');
    });

    it('should extract Instagram reel ID', () => {
      expect(extractExternalPostId('https://www.instagram.com/reel/CxYzAbCdEf/', 'INSTAGRAM'))
        .toBe('CxYzAbCdEf');
    });

    it('should extract Instagram post ID', () => {
      expect(extractExternalPostId('https://www.instagram.com/p/CxYzAbCdEf/', 'INSTAGRAM'))
        .toBe('CxYzAbCdEf');
    });

    it('should extract YouTube Shorts ID', () => {
      expect(extractExternalPostId('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'YOUTUBE'))
        .toBe('dQw4w9WgXcQ');
    });

    it('should return null for unmatched patterns', () => {
      expect(extractExternalPostId('https://www.tiktok.com/@user', 'TIKTOK')).toBeNull();
      expect(extractExternalPostId('https://www.instagram.com/stories/user/', 'INSTAGRAM')).toBeNull();
      expect(extractExternalPostId('https://www.youtube.com/watch?v=abc', 'YOUTUBE')).toBeNull();
    });
  });
});
