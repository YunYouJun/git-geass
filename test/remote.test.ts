import { describe, expect, it } from 'vitest'
import { buildBrowserUrl } from '../src/utils/remote'

describe('remote', () => {
  describe('buildBrowserUrl', () => {
    it('should convert SSH URL to browser URL', () => {
      const result = buildBrowserUrl('git@github.com:YunYouJun/git-geass.git')
      expect(result).toBe('https://github.com/YunYouJun/git-geass')
    })

    it('should convert HTTPS URL to browser URL (strip .git)', () => {
      const result = buildBrowserUrl('https://github.com/YunYouJun/git-geass.git')
      expect(result).toBe('https://github.com/YunYouJun/git-geass')
    })

    it('should handle HTTPS URL without .git suffix', () => {
      const result = buildBrowserUrl('https://github.com/YunYouJun/git-geass')
      expect(result).toBe('https://github.com/YunYouJun/git-geass')
    })

    it('should handle SSH URL without .git suffix', () => {
      const result = buildBrowserUrl('git@github.com:YunYouJun/git-geass')
      expect(result).toBe('https://github.com/YunYouJun/git-geass')
    })

    it('should work with GitLab URLs', () => {
      const result = buildBrowserUrl('git@gitlab.com:team/project.git')
      expect(result).toBe('https://gitlab.com/team/project')
    })

    it('should work with Bitbucket HTTPS URL with userinfo', () => {
      const result = buildBrowserUrl('https://username@bitbucket.org/team/repo.git')
      expect(result).toBe('https://bitbucket.org/team/repo')
    })

    it('should work with custom self-hosted Git hosts', () => {
      const result = buildBrowserUrl('git@git.example.com:org/my-project.git')
      expect(result).toBe('https://git.example.com/org/my-project')
    })

    it('should return null for invalid URLs', () => {
      expect(buildBrowserUrl('not-a-valid-url')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(buildBrowserUrl('')).toBeNull()
    })
  })
})
