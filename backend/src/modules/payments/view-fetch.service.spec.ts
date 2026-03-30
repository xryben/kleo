import { Test, TestingModule } from '@nestjs/testing';
import { ViewFetchService } from './view-fetch.service';
import * as childProcess from 'child_process';

jest.mock('child_process');

const mockExecFile = childProcess.execFile as unknown as jest.Mock;

describe('ViewFetchService', () => {
  let service: ViewFetchService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ViewFetchService],
    }).compile();

    service = module.get<ViewFetchService>(ViewFetchService);
  });

  it('should return view count from yt-dlp output', async () => {
    const ytDlpOutput = JSON.stringify({
      id: '123456',
      title: 'Test Video',
      view_count: 42500,
    });

    mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(null, ytDlpOutput, '');
    });

    const result = await service.fetchViewCount(
      'https://www.tiktok.com/@user/video/123456',
      'TIKTOK',
    );

    expect(result).toBe(42500);
    expect(mockExecFile).toHaveBeenCalledWith(
      'yt-dlp',
      ['--dump-json', '--no-download', 'https://www.tiktok.com/@user/video/123456'],
      expect.objectContaining({ timeout: 30000 }),
      expect.any(Function),
    );
  });

  it('should return 0 when view_count is missing', async () => {
    const ytDlpOutput = JSON.stringify({ id: '123', title: 'No views' });

    mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(null, ytDlpOutput, '');
    });

    const result = await service.fetchViewCount(
      'https://www.instagram.com/reel/ABC123/',
      'INSTAGRAM',
    );

    expect(result).toBe(0);
  });

  it('should return null on yt-dlp error', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(new Error('yt-dlp not found'), '', '');
    });

    const result = await service.fetchViewCount(
      'https://www.youtube.com/shorts/abc123',
      'YOUTUBE',
    );

    expect(result).toBeNull();
  });

  it('should return null on invalid JSON output', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(null, 'not json', '');
    });

    const result = await service.fetchViewCount(
      'https://www.tiktok.com/@user/video/123',
      'TIKTOK',
    );

    expect(result).toBeNull();
  });

  it('should work for all 3 platforms', async () => {
    const makeOutput = (views: number) =>
      JSON.stringify({ view_count: views });

    mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(null, makeOutput(1000), '');
    });

    const tiktok = await service.fetchViewCount(
      'https://www.tiktok.com/@user/video/111',
      'TIKTOK',
    );
    const instagram = await service.fetchViewCount(
      'https://www.instagram.com/reel/ABC/',
      'INSTAGRAM',
    );
    const youtube = await service.fetchViewCount(
      'https://www.youtube.com/shorts/xyz',
      'YOUTUBE',
    );

    expect(tiktok).toBe(1000);
    expect(instagram).toBe(1000);
    expect(youtube).toBe(1000);
    expect(mockExecFile).toHaveBeenCalledTimes(3);
  });
});
