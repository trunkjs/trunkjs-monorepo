import { markdownLoader } from './markdown-loader';

describe('markdownLoader', () => {
  it('should work', () => {
    expect(markdownLoader()).toEqual('markdown-loader');
  });
});
