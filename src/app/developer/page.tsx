'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useDevIssues } from '@/hooks/use-dev-issues';
import { useUserTasks } from '@/hooks/use-user-tasks';
import { useNotifications } from '@/hooks/use-notifications';
import { AlertCircle, Bug, CheckCircle2, Clock, Zap, Users, Bell } from 'lucide-react';
import Link from 'next/link';

export default function DeveloperDashboard() {
  const { issues, isLoading: issuesLoading } = useDevIssues();
  const { tasks, isLoading: tasksLoading } = useUserTasks();
  const { notifications, isLoading: notificationsLoading } = useNotifications();

  // Calculate stats
  const criticalIssues = issues?.filter((i) => i.fields.Priority === 'critical').length || 0;
  const highIssues = issues?.filter((i) => i.fields.Priority === 'high').length || 0;
  const openIssues = issues?.filter((i) => i.fields.Status !== 'done').length || 0;
  const inProgressIssues = issues?.filter((i) => i.fields.Status === 'in_progress').length || 0;

  const pendingTasks = tasks?.filter((t) => t.fields.Status !== 'done').length || 0;
  const overdueTasks =
    tasks?.filter((t) => t.fields.Status !== 'done' && t.fields.DueDate && new Date(t.fields.DueDate) < new Date()).length || 0;

  const unreadNotifications = notifications?.filter((n) => !n.fields.Read).length || 0;

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Developer Dashboard" />
        
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Developer Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Gestione bug, feature e task di sviluppo
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/developer/issues">Vai ai Issues</Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Issues Critici</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Richiedono attenzione immediata
            </p>
          </CardContent>
        </Card>

        {/* High Priority Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Issues High Priority</CardTitle>
            <Zap className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Da risolvere a breve
            </p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Lavorazione</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Issues attualmente aperti
            </p>
          </CardContent>
        </Card>

        {/* Total Open Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Issues Aperti</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Totale issues da completare
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks & Notifications Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Task Pendenti</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Task da completare
            </p>
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Task in Ritardo</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Scadenza superata
            </p>
          </CardContent>
        </Card>

        {/* Unread Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notifiche</CardTitle>
            <Bell className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadNotifications}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Non lette
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Issues Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          {issuesLoading ? (
            <div className="text-sm text-muted-foreground">Caricamento...</div>
          ) : issues && issues.length > 0 ? (
            <div className="space-y-3">
              {issues.slice(0, 5).map((issue) => (
                <div key={issue.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    {issue.fields.Type === 'bug' ? (
                      <Bug className="h-4 w-4 text-red-500" />
                    ) : (
                      <Zap className="h-4 w-4 text-blue-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{issue.fields.Title}</p>
                      <p className="text-xs text-muted-foreground">
                        {issue.fields.Type} • {issue.fields.Status}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      issue.fields.Priority === 'critical'
                        ? 'destructive'
                        : issue.fields.Priority === 'high'
                          ? 'primary'
                          : 'secondary'
                    }
                  >
                    {issue.fields.Priority}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Nessun issue trovato</div>
          )}
        </CardContent>
      </Card>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
