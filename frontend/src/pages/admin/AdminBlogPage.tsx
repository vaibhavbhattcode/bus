import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { BlogPost } from '../../types';
import {
  Plus, Edit, Trash2, Search, Eye, X, BookOpen,
  CheckCircle, Clock, Tag, User, Calendar, Image,
  RefreshCw, FileText, Globe, EyeOff, Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import Modal from '../../components/Modal';

/* ── debounce ─────────────────────────────────────────────────────────────── */
function useDebounce<T>(value: T, ms = 350): T {
  const [d, setD] = useState(value);
  React.useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

/* ── reading time ─────────────────────────────────────────────────────────── */
function readingTime(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}

/* ── skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 bg-gray-100 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="flex gap-1.5">
              <div className="h-4 w-12 bg-gray-100 rounded-full" />
              <div className="h-4 w-16 bg-gray-100 rounded-full" />
            </div>
          </div>
        </div>
      </td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
      <td className="px-5 py-4"><div className="h-6 bg-gray-100 rounded-full w-20" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
      <td className="px-5 py-4 text-right"><div className="h-8 bg-gray-100 rounded-xl w-24 ml-auto" /></td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main page                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const AdminBlogPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search);

  /* ── Query ── */
  const { data: postsData, isLoading, isFetching, refetch } = useQuery<{ data: BlogPost[] }>({
    queryKey: ['admin-posts'],
    queryFn: () => api.get<{ data: BlogPost[] }>('/blog/admin/all?limit=1000'),
    staleTime: 60000,
  });

  /* ── Mutations ── */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/blog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success('Post deleted');
    },
    onError: () => toast.error('Failed to delete post'),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api.patch(`/blog/${id}`, { isPublished }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success(vars.isPublished ? 'Post published!' : 'Post unpublished');
    },
    onError: () => toast.error('Failed to update status'),
  });

  /* ── Derived data ── */
  const allPosts: BlogPost[] = postsData?.data ?? [];
  const publishedCount = allPosts.filter(p => p.isPublished).length;
  const draftCount = allPosts.length - publishedCount;

  const filteredPosts = allPosts.filter(post => {
    const term = debouncedSearch.toLowerCase();
    const matchSearch = !term ||
      post.title.toLowerCase().includes(term) ||
      post.author.toLowerCase().includes(term) ||
      post.tags.some(t => t.toLowerCase().includes(term)) ||
      post.excerpt.toLowerCase().includes(term);
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'published' ? post.isPublished : !post.isPublished);
    return matchSearch && matchStatus;
  });

  const handleEdit = (post: BlogPost) => { setEditingPost(post); setIsModalOpen(true); };
  const handleCreate = () => { setEditingPost(null); setIsModalOpen(true); };
  const handleDelete = (post: BlogPost) => {
    if (window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      deleteMutation.mutate(post.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Blog Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {allPosts.length} posts · {publishedCount} published · {draftCount} drafts
            {isFetching && !isLoading && <span className="ml-2 text-indigo-400 animate-pulse">· refreshing</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
            <Plus className="h-4 w-4" /> New Post
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Posts', value: allPosts.length, cls: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700', icon: BookOpen },
          { label: 'Published', value: publishedCount, cls: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700', icon: Globe },
          { label: 'Drafts', value: draftCount, cls: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700', icon: FileText },
        ].map(k => (
          <div key={k.label} className={`p-4 rounded-2xl border bg-gradient-to-br ${k.cls} flex items-center gap-3`}>
            <k.icon className="h-6 w-6 opacity-60 shrink-0" />
            <div>
              <p className="text-xs font-medium opacity-70">{k.label}</p>
              <p className="text-2xl font-black">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, author, tags…"
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
          {search && <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
          {(['all', 'published', 'draft'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${statusFilter === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
              {s === 'all' ? `All (${allPosts.length})` : s === 'published' ? `Published (${publishedCount})` : `Drafts (${draftCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Post', 'Author', 'Status', 'Published', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide ${i === 4 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : filteredPosts.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center">
                  <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-semibold">No posts found</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {search ? `No results for "${search}"` : 'Create your first blog post'}
                  </p>
                  {!search && (
                    <button onClick={handleCreate}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
                      Create Post
                    </button>
                  )}
                </td></tr>
              ) : filteredPosts.map(post => {
                const minutes = readingTime(post.content ?? '');
                const tags = post.tags?.slice(0, 3) ?? [];
                const createdAt = post.createdAt ? new Date(post.createdAt) : null;
                return (
                  <tr key={post.id} className="hover:bg-gray-50/80 transition-colors group">
                    {/* Post */}
                    <td className="px-5 py-4 max-w-sm">
                      <div className="flex items-start gap-3">
                        {/* Cover thumbnail */}
                        {post.coverImage ? (
                          <img src={post.coverImage} alt={post.title}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                            <Image className="h-5 w-5 text-indigo-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate leading-tight">{post.title}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5 line-clamp-1">{post.excerpt}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {tags.map(tag => (
                              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-semibold">
                                <Tag className="h-2.5 w-2.5" />{tag}
                              </span>
                            ))}
                            {(post.tags?.length ?? 0) > 3 && (
                              <span className="text-[10px] text-gray-400">+{post.tags.length - 3}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />{minutes} min read
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Author */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                          {(post.author || 'A')[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-700 truncate">{post.author}</span>
                      </div>
                    </td>

                    {/* Status + quick toggle */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => togglePublishMutation.mutate({ id: post.id, isPublished: !post.isPublished })}
                        disabled={togglePublishMutation.isPending}
                        title={post.isPublished ? 'Click to unpublish' : 'Click to publish'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 ${post.isPublished
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                        {togglePublishMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : post.isPublished ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        {post.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {createdAt && !isNaN(createdAt.getTime()) ? (
                        <div>
                          <p className="font-semibold text-gray-700">{format(createdAt, 'MMM d, yyyy')}</p>
                          <p className="text-gray-400">{format(createdAt, 'HH:mm')}</p>
                        </div>
                      ) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="View post">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleEdit(post)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Edit post">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(post)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40" title="Delete post">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Editor modal ── */}
      {isModalOpen && (
        <BlogEditorModal
          post={editingPost}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Blog Editor Modal                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
interface BlogEditorModalProps {
  post: BlogPost | null;
  onClose: () => void;
}

const FIELD_CLS = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

const BlogEditorModal = ({ post, onClose }: BlogEditorModalProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'write' | 'settings'>('write');
  const [formData, setFormData] = useState({
    title: post?.title || '',
    content: post?.content || '',
    excerpt: post?.excerpt || '',
    coverImage: post?.coverImage || '',
    author: post?.author || 'Admin',
    tags: post?.tags?.join(', ') || '',
    isPublished: post?.isPublished ?? false,
  });

  const words = formData.content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const payload = {
        ...data,
        tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      return post ? api.patch(`/blog/${post.id}`, payload) : api.post('/blog', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success(post ? 'Post updated!' : 'Post created!');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save post'),
  });

  const set = (key: keyof typeof formData, value: any) => setFormData(p => ({ ...p, [key]: value }));

  return (
    <Modal isOpen onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{post ? 'Edit Post' : 'New Blog Post'}</p>
            <p className="text-xs text-gray-400">{words} words · {minutes} min read</p>
          </div>
        </div>
      }
      maxWidth="max-w-5xl">
      <form onSubmit={e => { e.preventDefault(); mutation.mutate(formData); }} className="space-y-0">

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          {(['write', 'settings'] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
              {tab === 'write' ? '✍️ Write' : '⚙️ Settings'}
            </button>
          ))}
        </div>

        {activeTab === 'write' ? (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Title *</label>
              <input type="text" required value={formData.title} onChange={e => set('title', e.target.value)}
                className={`${FIELD_CLS} text-lg font-bold placeholder:font-normal placeholder:text-gray-300`}
                placeholder="An engaging blog post title…" />
            </div>

            {/* Excerpt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Excerpt *</label>
                <span className="text-xs text-gray-400">{formData.excerpt.length}/200</span>
              </div>
              <textarea required rows={2} maxLength={200} value={formData.excerpt} onChange={e => set('excerpt', e.target.value)}
                className={`${FIELD_CLS} resize-none`}
                placeholder="A short summary that appears in post listings…" />
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Content *</label>
                <span className="text-xs text-gray-400">{words} words · {minutes} min read</span>
              </div>
              <textarea required rows={14} value={formData.content} onChange={e => set('content', e.target.value)}
                className={`${FIELD_CLS} resize-y font-mono text-sm leading-relaxed`}
                placeholder="Write your full post content here. Markdown is supported." />
              <p className="text-xs text-gray-400 mt-1">💡 Markdown supported: **bold**, *italic*, `code`, ## headers</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Author */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <User className="h-3 w-3" /> Author *
                </label>
                <input type="text" required value={formData.author} onChange={e => set('author', e.target.value)}
                  className={FIELD_CLS} placeholder="Author name" />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </label>
                <input type="text" value={formData.tags} onChange={e => set('tags', e.target.value)}
                  className={FIELD_CLS} placeholder="travel, tips, news (comma-separated)" />
                {/* Preview */}
                {formData.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                        <Tag className="h-2.5 w-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Cover Image */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Image className="h-3 w-3" /> Cover Image URL
                </label>
                <input type="url" value={formData.coverImage} onChange={e => set('coverImage', e.target.value)}
                  className={FIELD_CLS} placeholder="https://example.com/image.jpg" />
                {formData.coverImage && (
                  <div className="mt-2 relative w-full h-40 rounded-xl overflow-hidden border border-gray-200">
                    <img src={formData.coverImage} alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <p className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">Preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Publish toggle */}
            <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.isPublished ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
              }`} onClick={() => set('isPublished', !formData.isPublished)}>
              <div className={`w-12 h-6 rounded-full relative transition-all ${formData.isPublished ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${formData.isPublished ? 'left-6' : 'left-0.5'}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${formData.isPublished ? 'text-emerald-700' : 'text-gray-600'}`}>
                  {formData.isPublished ? 'Published — visible to everyone' : 'Draft — only visible to admins'}
                </p>
                <p className="text-xs text-gray-400">
                  {formData.isPublished ? 'Uncheck to save as draft' : 'Toggle to publish immediately'}
                </p>
              </div>
              {formData.isPublished ? (
                <CheckCircle className="h-5 w-5 text-emerald-500 ml-auto" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-400 ml-auto" />
              )}
            </div>

            {/* Meta preview */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                <Globe className="h-3 w-3" /> SEO / Meta Preview
              </p>
              <div className="space-y-1">
                <p className="text-blue-600 font-medium text-sm line-clamp-1">
                  {formData.title || 'Post Title'}
                </p>
                <p className="text-green-600 text-xs">yourdomain.com/blog/{post?.slug ?? 'post-slug'}</p>
                <p className="text-gray-500 text-xs line-clamp-2">
                  {formData.excerpt || 'Post excerpt will appear here…'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-between gap-3 pt-5 mt-5 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            {post?.updatedAt ? `Last saved ${format(new Date(post.updatedAt), 'MMM d · HH:mm')}` : 'Unsaved new post'}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              Cancel
            </button>
            {/* Save as draft shortcut */}
            {!post && formData.isPublished && (
              <button type="button" onClick={() => { set('isPublished', false); setTimeout(() => mutation.mutate({ ...formData, isPublished: false }), 0); }}
                disabled={mutation.isPending}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-60">
                Save Draft
              </button>
            )}
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 disabled:opacity-60">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : formData.isPublished ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {mutation.isPending ? 'Saving…' : post ? 'Update Post' : (formData.isPublished ? 'Publish Now' : 'Create Draft')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
