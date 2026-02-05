'use client';

import * as React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from '@/components/ui/kanban';
import { useDevIssues } from '@/hooks/use-dev-issues';
import { AirtableDevIssue } from '@/types/developer';
import { GripVertical, AlertCircle, Bug, Zap, Lightbulb, Filter } from 'lucide-react';
import Link from 'next/link';
import { NewIssueModal } from '@/components/developer/new-issue-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_COLUMNS = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
} as const;

const TYPE_ICONS = {
  bug: Bug,
  feature: Zap,
  improvement: Lightbulb,
  tech_debt: AlertCircle,
};

const PRIORITY_COLORS = {
  low: 'secondary',
  medium: 'primary',
  high: 'primary',
  critical: 'destructive',
} as const;

interface IssueCardProps {
  issue: AirtableDevIssue;
  asHandle?: boolean;
}

function IssueCard({ issue, asHandle }: IssueCardProps) {
  const Icon = TYPE_ICONS[issue.fields.Type as keyof typeof TYPE_ICONS];

  const cardContent = (
    <div className="rounded-md border bg-card p-3 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {Icon && <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />}
            <span className="line-clamp-2 font-medium text-sm">{issue.fields.Title}</span>
          </div>
          <Badge
            variant={PRIORITY_COLORS[issue.fields.Priority as keyof typeof PRIORITY_COLORS]}
            className="pointer-events-none h-5 rounded-sm px-1.5 text-[11px] capitalize shrink-0"
          >
            {issue.fields.Priority}
          </Badge>
        </div>

        {issue.fields.Description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{issue.fields.Description}</p>
        )}

        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <div />
          {issue.fields.Tags && issue.fields.Tags.length > 0 && (
            <div className="flex gap-1">
              {issue.fields.Tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <KanbanItem value={issue.id}>
      {asHandle ? <KanbanItemHandle>{cardContent}</KanbanItemHandle> : cardContent}
    </KanbanItem>
  );
}

interface IssueColumnProps {
  value: string;
  issues: AirtableDevIssue[];
  isOverlay?: boolean;
}

function IssueColumn({ value, issues, isOverlay }: IssueColumnProps) {
  return (
    <KanbanColumn value={value} className="rounded-md border bg-card p-2.5 shadow-xs">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-sm">{STATUS_COLUMNS[value as keyof typeof STATUS_COLUMNS]}</span>
          <Badge variant="secondary">{issues.length}</Badge>
        </div>
        <KanbanColumnHandle asChild>
          <Button variant="ghost" className="h-6 w-6 p-0">
            <GripVertical className="h-4 w-4" />
          </Button>
        </KanbanColumnHandle>
      </div>
      <KanbanColumnContent value={value} className="flex flex-col gap-2.5 p-0.5 min-h-[200px]">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} asHandle={!isOverlay} />
        ))}
      </KanbanColumnContent>
    </KanbanColumn>
  );
}

export default function IssuesPage() {
  const { issues, isLoading, mutate } = useDevIssues();
  const [isNewIssueOpen, setIsNewIssueOpen] = React.useState(false);
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');

  // Filter issues
  const filteredIssues = React.useMemo(() => {
    if (!issues) return [];
    return issues.filter((issue) => {
      const matchesPriority = priorityFilter === 'all' || issue.fields.Priority === priorityFilter;
      const matchesType = typeFilter === 'all' || issue.fields.Type === typeFilter;
      return matchesPriority && matchesType;
    });
  }, [issues, priorityFilter, typeFilter]);

  // Group issues by status
  const columns = React.useMemo(() => {
    const grouped: Record<string, AirtableDevIssue[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    filteredIssues.forEach((issue) => {
      const status = issue.fields.Status || 'backlog';
      if (grouped[status]) {
        grouped[status].push(issue);
      }
    });

    return grouped;
  }, [filteredIssues]);

  const handleMove = React.useCallback(
    async (event: any) => {
      const { overContainer } = event;
      const issueId = event.event.active.id as string;

      // Find issue being moved
      const issue = filteredIssues.find((i) => i.id === issueId);
      if (!issue) return;

      // Update issue status via API
      try {
        const res = await fetch(`/api/dev-issues/${issueId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Status: overContainer }),
        });
        if (!res.ok) {
          console.error('Failed to update issue status');
        }
      } catch (error) {
        console.error('Error updating issue:', error);
      }
    },
    [filteredIssues]
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[400px] bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Dev Issues" />
        
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dev Issues</h1>
          <p className="text-muted-foreground mt-1">Gestione bug e feature requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/developer">← Dashboard</Link>
          </Button>
          <Button onClick={() => setIsNewIssueOpen(true)}>Nuovo Issue</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priorità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="improvement">Improvement</SelectItem>
            <SelectItem value="tech_debt">Tech Debt</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground ml-auto">
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Kanban Board */}
      <Kanban value={columns} onValueChange={() => {}} getItemValue={(item) => item.id} onMove={handleMove}>
        <KanbanBoard className="grid auto-rows-fr grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(columns).map(([status, issues]) => (
            <IssueColumn key={status} value={status} issues={issues} />
          ))}
        </KanbanBoard>
        <KanbanOverlay>
          <div className="rounded-md bg-primary/10 backdrop-blur-sm size-full border-2 border-primary" />
        </KanbanOverlay>
      </Kanban>
          </div>
        </div>
      </div>

      {/* Modal per nuovo issue */}
      <NewIssueModal open={isNewIssueOpen} onOpenChange={setIsNewIssueOpen} onSuccess={() => mutate()} />
    </AppLayoutCustom>
  );
}
