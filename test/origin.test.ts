import { describe, expect, it } from 'vitest'
import { convertRemoteUrl, parseRemoteUrl } from '../src/cli/origin'

describe('origin', () => {
  describe('parseRemoteUrl', () => {
    it('should parse HTTPS URL', () => {
      const result = parseRemoteUrl('https://github.com/YunYouJun/git-geass.git')
      expect(result).toEqual({
        type: 'https',
        host: 'github.com',
        owner: 'YunYouJun',
        repo: 'git-geass',
      })
    })

    it('should parse HTTPS URL without .git suffix', () => {
      const result = parseRemoteUrl('https://github.com/YunYouJun/git-geass')
      expect(result).toEqual({
        type: 'https',
        host: 'github.com',
        owner: 'YunYouJun',
        repo: 'git-geass',
      })
    })

    it('should parse SSH URL', () => {
      const result = parseRemoteUrl('git@github.com:YunYouJun/git-geass.git')
      expect(result).toEqual({
        type: 'ssh',
        host: 'github.com',
        owner: 'YunYouJun',
        repo: 'git-geass',
      })
    })

    it('should parse SSH URL without .git suffix', () => {
      const result = parseRemoteUrl('git@github.com:YunYouJun/git-geass')
      expect(result).toEqual({
        type: 'ssh',
        host: 'github.com',
        owner: 'YunYouJun',
        repo: 'git-geass',
      })
    })

    it('should handle custom hosts', () => {
      const result = parseRemoteUrl('git@gitlab.com:team/project.git')
      expect(result).toEqual({
        type: 'ssh',
        host: 'gitlab.com',
        owner: 'team',
        repo: 'project',
      })
    })

    it('should return unknown for invalid URLs', () => {
      const result = parseRemoteUrl('not-a-valid-url')
      expect(result.type).toBe('unknown')
    })
  })

  describe('convertRemoteUrl', () => {
    it('should convert HTTPS to SSH', () => {
      const result = convertRemoteUrl('https://github.com/YunYouJun/git-geass.git', 'ssh')
      expect(result).toBe('git@github.com:YunYouJun/git-geass.git')
    })

    it('should convert SSH to HTTPS', () => {
      const result = convertRemoteUrl('git@github.com:YunYouJun/git-geass.git', 'https')
      expect(result).toBe('https://github.com/YunYouJun/git-geass.git')
    })

    it('should convert HTTPS without .git to SSH with .git', () => {
      const result = convertRemoteUrl('https://github.com/YunYouJun/git-geass', 'ssh')
      expect(result).toBe('git@github.com:YunYouJun/git-geass.git')
    })

    it('should return original URL if unknown format', () => {
      const result = convertRemoteUrl('not-a-url', 'ssh')
      expect(result).toBe('not-a-url')
    })

    it('should work with custom hosts', () => {
      const result = convertRemoteUrl('https://gitlab.com/team/project.git', 'ssh')
      expect(result).toBe('git@gitlab.com:team/project.git')
    })
  })
})
