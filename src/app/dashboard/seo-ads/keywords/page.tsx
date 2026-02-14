'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { SeoSubNav } from '@/components/seo-ads/seo-sub-nav';
import {
  microsToEuros,
  formatNumber,
  formatPosition,
} from '@/components/seo-ads/seo-currency-helpers';
import {
  useSeoKeywords,
  useCreateSeoKeyword,
  useDeleteSeoKeyword,
} from '@/hooks/use-seo-keywords';
import type { SeoKeyword, KeywordPriority } from '@/types/seo-ads';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  RefreshCw,
  Search,
  Trash2,
  ExternalLink,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

const priorityBadgeVariant = (p: KeywordPriority) => {
  switch (p) {
    case 'alta':
      return 'destructive' as const;
    case 'media':
      return 'secondary' as const;
    case 'bassa':
      return 'outline' as const;
  }
};

export default function SeoKeywordsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Filters
  const [search, setSearch] = useState('');
  const [cluster, setCluster] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [page, setPage] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SeoKeyword | null>(null);

  // Create form
  const [newKeyword, setNewKeyword] = useState('');
  const [newCluster, setNewCluster] = useState('');
  const [newLandingPage, setNewLandingPage] = useState('');
  const [newPriority, setNewPriority] = useState<KeywordPriority>('media');

  // Data
  const { keywords, total, isLoading, isValidating, error, mutate } = useSeoKeywords({
    search: search || undefined,
    cluster: cluster || undefined,
    priority: (priority || undefined) as KeywordPriority | undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const { createKeyword, isCreating } = useCreateSeoKeyword();
  const { deleteKeyword, isDeleting } = useDeleteSeoKeyword();

  // Extract unique clusters for filter
  const clusters = useMemo(() => {
    const set = new Set(keywords.map((k) => k.cluster));
    return Array.from(set).sort();
  }, [keywords]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  // Auth redirect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/seo-ads/keywords');
    }
  }, [status, router]);


  const handleCreate = useCallback(async () => {
    if (!newKeyword.trim() || !newCluster.trim()) {
      toast.error('Keyword e Cluster sono obbligatori');
      return;
    }

    const result = await createKeyword({
      keyword: newKeyword.trim(),
      cluster: newCluster.trim(),
      landing_page: newLandingPage.trim() || undefined,
      priority: newPriority,
    });

    if (result) {
      toast.success(`Keyword "${result.keyword}" creata`);
      setShowCreateModal(false);
      setNewKeyword('');
      setNewCluster('');
      setNewLandingPage('');
      setNewPriority('media');
    } else {
      toast.error('Errore nella creazione della keyword');
    }
  }, [newKeyword, newCluster, newLandingPage, newPriority, createKeyword]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const success = await deleteKeyword(deleteTarget.id);
    if (success) {
      toast.success(`Keyword "${deleteTarget.keyword}" eliminata`);
      setDeleteTarget(null);
    } else {
      toast.error('Errore nell\'eliminazione della keyword');
    }
  }, [deleteTarget, deleteKeyword]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary motion-reduce:animate-none" />
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="SEO & Ads" href="/dashboard/seo-ads" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-pretty">
                  Keyword Manager
                </h1>
                <p className="text-muted-foreground text-pretty">
                  Gestisci le keyword monitorate per SEO e Google Ads
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutate()}
                  disabled={isLoading || isValidating}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isLoading || isValidating ? 'animate-spin motion-reduce:animate-none' : ''}`}
                    aria-hidden="true"
                  />
                  {isLoading || isValidating ? 'Aggiornando…' : 'Aggiorna'}
                </Button>
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Nuova Keyword
                </Button>
              </div>
            </div>

            <SeoSubNav />

            {/* Error */}
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  {error.message || 'Errore nel caricamento'}
                </AlertDescription>
              </Alert>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Cerca keyword…"
                  aria-label="Cerca keyword"
                  spellCheck={false}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={cluster} onValueChange={(v) => { setCluster(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Cluster" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i cluster</SelectItem>
                  {clusters.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priorità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="bassa">Bassa</SelectItem>
                </SelectContent>
              </Select>
              {(search || cluster || priority) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setCluster('');
                    setPriority('');
                  }}
                >
                  Reset filtri
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Priorità</TableHead>
                    <TableHead className="text-right">Ricerche/mese</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead className="text-right">Posizione</TableHead>
                    <TableHead>Landing Page</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : keywords.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nessuna keyword trovata
                      </TableCell>
                    </TableRow>
                  ) : (
                    keywords.map((kw) => (
                      <TableRow key={kw.id}>
                        <TableCell className="font-medium">
                          {kw.keyword}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{kw.cluster}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityBadgeVariant(kw.priority)}>
                            {kw.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {kw.latest_avg_monthly_searches != null
                            ? formatNumber(kw.latest_avg_monthly_searches)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {kw.latest_avg_cpc_micros != null
                            ? `€${microsToEuros(kw.latest_avg_cpc_micros)}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {kw.latest_avg_position != null
                            ? formatPosition(kw.latest_avg_position)
                            : '—'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {kw.landing_page ? (
                            <a
                              href={kw.landing_page}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              {kw.landing_page.replace(/^https?:\/\//, '').slice(0, 30)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(kw)}
                            aria-label={`Elimina keyword ${kw.keyword}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {formatNumber(total)} keyword totali
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Pagina precedente"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <span className="text-sm tabular-nums">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Pagina successiva"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Keyword</DialogTitle>
            <DialogDescription>
              Aggiungi una keyword da monitorare per SEO e Google Ads.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="keyword">Keyword *</Label>
              <Input
                id="keyword"
                placeholder="es. materasso ortopedico"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cluster">Cluster *</Label>
              <Input
                id="cluster"
                placeholder="es. materassi"
                value={newCluster}
                onChange={(e) => setNewCluster(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="landing_page">Landing Page</Label>
              <Input
                id="landing_page"
                placeholder="https://www.doctorbed.it/materassi"
                value={newLandingPage}
                onChange={(e) => setNewLandingPage(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Priorità</Label>
              <Select
                value={newPriority}
                onValueChange={(v) => setNewPriority(v as KeywordPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="bassa">Bassa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={isCreating}
            >
              Annulla
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creazione…' : 'Crea Keyword'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare keyword?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare &quot;{deleteTarget?.keyword}&quot;. Questa azione
              rimuoverà anche tutte le metriche e i dati associati. Non è
              reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminazione…' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayoutCustom>
  );
}
