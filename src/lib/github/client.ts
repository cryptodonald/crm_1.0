/**
 * GitHub Integration Client
 * Secure GitHub API integration with webhook support
 */

import { Octokit } from '@octokit/rest';
import { env } from '@/lib/env';
import crypto from 'crypto';

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  htmlUrl: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  headRef: string;
  baseRef: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  htmlUrl: string;
}

export interface GitHubWebhookEvent {
  eventType: string;
  deliveryId: string;
  signature: string;
  payload: unknown;
  repository?: {
    id: number;
    name: string;
    fullName: string;
  };
}

/**
 * GitHub API Client
 */
export class GitHubClient {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token ?? env.GITHUB_TOKEN,
      userAgent: 'CRM-1.0/1.0.0',
    });
  }

  /**
   * Get user information
   */
  async getUser() {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    return data;
  }

  /**
   * List user repositories
   */
  async listRepositories(): Promise<GitHubRepository[]> {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    });

    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      htmlUrl: repo.html_url,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      defaultBranch: repo.default_branch,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
    }));
  }

  /**
   * Get repository details
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const { data } = await this.octokit.rest.repos.get({ owner, repo });

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      private: data.private,
      htmlUrl: data.html_url,
      language: data.language,
      stargazersCount: data.stargazers_count,
      forksCount: data.forks_count,
      openIssuesCount: data.open_issues_count,
      defaultBranch: data.default_branch,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * List repository issues
   */
  async listIssues(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<GitHubIssue[]> {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: state ?? 'open',
      per_page: 100,
    });

    return data.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state as 'open' | 'closed',
      labels: issue.labels.map(label => 
        typeof label === 'string' ? label : label.name || ''
      ).filter(Boolean),
      assignees: issue.assignees?.map(assignee => assignee.login) || [],
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      htmlUrl: issue.html_url,
    }));
  }

  /**
   * Create an issue
   */
  async createIssue(
    owner: string, 
    repo: string, 
    title: string, 
    body?: string, 
    labels?: string[]
  ): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state as 'open' | 'closed',
      labels: data.labels.map(label => 
        typeof label === 'string' ? label : label.name || ''
      ).filter(Boolean),
      assignees: data.assignees?.map(assignee => assignee.login) || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      htmlUrl: data.html_url,
    };
  }

  /**
   * List pull requests
   */
  async listPullRequests(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<GitHubPullRequest[]> {
    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state: state ?? 'open',
      per_page: 100,
    });

    return data.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state as 'open' | 'closed' | 'merged',
      draft: pr.draft,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      htmlUrl: pr.html_url,
    }));
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) {
      console.warn('[GitHub] Missing signature or secret');
      return false;
    }

    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace(/^sha256=/, '');

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    try {
      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(cleanSignature, 'hex')
      );
    } catch (error) {
      console.error('[GitHub] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Process webhook event
   */
  static async processWebhookEvent(event: GitHubWebhookEvent): Promise<void> {
    console.log(`[GitHub] Processing ${event.eventType} event for ${event.repository?.fullName}`);

    switch (event.eventType) {
      case 'push':
        await this.handlePushEvent(event.payload);
        break;
      case 'issues':
        await this.handleIssuesEvent(event.payload);
        break;
      case 'pull_request':
        await this.handlePullRequestEvent(event.payload);
        break;
      case 'repository':
        await this.handleRepositoryEvent(event.payload);
        break;
      default:
        console.log(`[GitHub] Unhandled event type: ${event.eventType}`);
    }
  }

  private static async handlePushEvent(payload: any): Promise<void> {
    const { repository, pusher, commits, ref } = payload;
    
    console.log('[GitHub] Push event details:', {
      repository: repository?.full_name,
      branch: ref?.replace('refs/heads/', ''),
      pusher: pusher?.name,
      commitsCount: commits?.length || 0,
    });

    // Here you could:
    // - Create activities in CRM for code changes
    // - Update project status
    // - Trigger notifications
    // - Log development activity
  }

  private static async handleIssuesEvent(payload: any): Promise<void> {
    const { action, issue, repository } = payload;
    
    console.log('[GitHub] Issues event:', {
      action,
      issueNumber: issue?.number,
      issueTitle: issue?.title,
      repository: repository?.full_name,
      author: issue?.user?.login,
    });

    // Here you could:
    // - Create leads from new issues
    // - Update CRM with issue status
    // - Assign issues to team members
    // - Track support requests
  }

  private static async handlePullRequestEvent(payload: any): Promise<void> {
    const { action, pull_request, repository } = payload;
    
    console.log('[GitHub] Pull request event:', {
      action,
      prNumber: pull_request?.number,
      prTitle: pull_request?.title,
      repository: repository?.full_name,
      author: pull_request?.user?.login,
      state: pull_request?.state,
    });

    // Here you could:
    // - Track code review progress
    // - Update project timelines
    // - Create activities for deliverables
  }

  private static async handleRepositoryEvent(payload: any): Promise<void> {
    const { action, repository } = payload;
    
    console.log('[GitHub] Repository event:', {
      action,
      repository: repository?.full_name,
      visibility: repository?.visibility,
      language: repository?.language,
    });

    // Here you could:
    // - Track new projects
    // - Update client portfolios
    // - Set up new project workflows
  }
}

// Singleton instance
let clientInstance: GitHubClient | null = null;

/**
 * Get GitHub client instance
 */
export function getGitHubClient(): GitHubClient {
  if (!clientInstance) {
    clientInstance = new GitHubClient();
  }
  return clientInstance;
}
