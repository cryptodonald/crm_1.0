'use client';

import { useState } from 'react';
import { ApiKeyData } from '@/lib/kv';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  MoreHorizontal, 
  Eye, 
  Edit2, 
  Trash2, 
  Copy, 
  CheckCircle,
  AlertTriangle,
  Calendar,
  Activity,
  Shield
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ApiKeysDataTableProps {
  apiKeys: ApiKeyData[];
  loading: boolean;
  onEdit: (apiKey: ApiKeyData) => void;
  onDelete: (id: string) => Promise<void>;
  onView: (apiKey: ApiKeyData) => void;
  className?: string;
}

export function ApiKeysDataTable({
  apiKeys,
  loading,
  onEdit,
  onDelete,
  onView,
  className
}: ApiKeysDataTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKeyData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (apiKey: ApiKeyData) => {
    setKeyToDelete(apiKey);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!keyToDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(keyToDelete.id);
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (apiKey: ApiKeyData) => {
    try {
      // We need to copy the full decrypted value, not the masked preview
      const response = await fetch(`/api/api-keys/${apiKey.id}`);
      if (response.ok) {
        const data = await response.json();
        // The API should return the full decrypted value for copying
        await navigator.clipboard.writeText(data.fullValue || apiKey.key);
        setCopiedKey(apiKey.id);
        setTimeout(() => setCopiedKey(null), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getStatusBadge = (apiKey: ApiKeyData) => {
    if (!apiKey.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    if (apiKey.expiresAt) {
      const expiryDate = new Date(apiKey.expiresAt);
      const now = new Date();
      const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiry <= 7) {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>;
      }
    }
    
    return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
  };

  const getPermissionsBadges = (permissions: string[]) => {
    const colors: { [key: string]: string } = {
      read: 'bg-blue-100 text-blue-800',
      write: 'bg-orange-100 text-orange-800',
      delete: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
    };

    return permissions.slice(0, 2).map((permission) => (
      <Badge
        key={permission}
        variant="secondary"
        className={`text-xs ${colors[permission] || 'bg-gray-100 text-gray-800'}`}
      >
        {permission}
      </Badge>
    ));
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className || ''}`}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className={`space-y-4 ${className || ''}`}>
        <div className="rounded-md border">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No API Keys Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first API key to start using the API
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{apiKey.name}</div>
                    {apiKey.description && (
                      <div className="text-sm text-muted-foreground">
                        {apiKey.description}
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {(apiKey as any).keyPreview || (apiKey.key as string)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(apiKey)}
                        className="h-6 w-6 p-0"
                        title={copiedKey === apiKey.id ? 'Copied!' : 'Copy API Key'}
                      >
                        {copiedKey === apiKey.id ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(apiKey)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getPermissionsBadges(apiKey.permissions)}
                    {apiKey.permissions.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{apiKey.permissions.length - 2} more
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Activity className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{apiKey.usageCount.toLocaleString()}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(apiKey.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {apiKey.lastUsed ? (
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(apiKey.lastUsed), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onView(apiKey)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(apiKey)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(apiKey)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Delete API Key</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the API key "{keyToDelete?.name}"? 
              This action cannot be undone and will immediately revoke access for any applications using this key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
