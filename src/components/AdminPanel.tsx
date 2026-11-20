import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { BadgeCheck, ImagePlus, Pencil, Save, Search, ShieldAlert, Trash2, X } from 'lucide-react';

type Advertisement = {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  target_url: string;
  is_active: boolean | number;
  priority: number;
  starts_at?: string | null;
  ends_at?: string | null;
};

type AdminUser = { id: number; email: string; is_premium: boolean | number; is_admin: boolean | number };

const blankAd = { title: '', description: '', image_url: '', target_url: '', is_active: true, priority: 0, starts_at: '', ends_at: '' };

async function compressAdImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Không đọc được ảnh đã chọn.'));
    });
    const ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AdminPanelView() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [draft, setDraft] = useState({ ...blankAd });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    const sessionResponse = await apiFetch('/api/admin/session');
    if (!sessionResponse.ok) { setAuthorized(false); return; }
    setAuthorized(true);
    const [adResponse, userResponse] = await Promise.all([
      apiFetch('/api/admin/advertisements'),
      apiFetch('/api/admin/users?search=' + encodeURIComponent(search)),
    ]);
    const adData = await adResponse.json();
    const userData = await userResponse.json();
    if (adResponse.ok && Array.isArray(adData.data)) setAds(adData.data);
    if (userResponse.ok && Array.isArray(userData.data)) setUsers(userData.data);
  }, [search]);

  useEffect(() => { loadData().catch(() => setAuthorized(false)); }, [loadData]);

  const resetAd = () => { setDraft({ ...blankAd }); setEditingId(null); };

  const saveAd = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        ...draft,
        starts_at: draft.starts_at ? draft.starts_at.replace('T', ' ') : null,
        ends_at: draft.ends_at ? draft.ends_at.replace('T', ' ') : null,
      };
      const response = await apiFetch(editingId ? `/api/admin/advertisements/${editingId}` : '/api/admin/advertisements', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không lưu được quảng cáo.');
      setMessage('Đã lưu quảng cáo.');
      resetAd();
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không lưu được quảng cáo.');
    } finally { setBusy(false); }
  };

  const editAd = (ad: Advertisement) => {
    setEditingId(ad.id);
    setDraft({
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url,
      target_url: ad.target_url,
      is_active: !!ad.is_active,
      priority: ad.priority || 0,
      starts_at: ad.starts_at ? new Date(ad.starts_at).toISOString().slice(0, 16) : '',
      ends_at: ad.ends_at ? new Date(ad.ends_at).toISOString().slice(0, 16) : '',
    });
  };

  const deleteAd = async (ad: Advertisement) => {
    if (!window.confirm(`Xóa quảng cáo “${ad.title}”?`)) return;
    const response = await apiFetch(`/api/admin/advertisements/${ad.id}`, { method: 'DELETE' });
    if (!response.ok) { setMessage('Không xóa được quảng cáo.'); return; }
    await loadData();
  };

  const updateUser = async (user: AdminUser, patch: Partial<AdminUser>) => {
    const response = await apiFetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_premium: !!user.is_premium, is_admin: !!user.is_admin, ...patch }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || 'Không cập nhật được tài khoản.'); return; }
    await loadData();
  };

  if (authorized === null) return <div className="h-full grid place-items-center text-slate-500">Đang kiểm tra quyền quản trị…</div>;
  if (!authorized) return <div className="h-full grid place-items-center p-8 text-center text-rose-700"><div><ShieldAlert className="mx-auto mb-3 h-10 w-10" /><p className="font-bold">Tài khoản này không có quyền quản trị.</p></div></div>;

  return (
    <div className="h-full overflow-y-auto bg-[#eaf4ff] px-4 pb-28 pt-8 text-slate-900">
      <header className="mb-5 flex items-center justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Darling</p><h1 className="text-2xl font-extrabold">Quản trị ứng dụng</h1></div>
        <BadgeCheck className="h-8 w-8 text-sky-600" />
      </header>
      {message && <p className="mb-4 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-sky-800 shadow-sm">{message}</p>}

      <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold">Quảng cáo</h2>{editingId && <button onClick={resetAd} className="flex items-center gap-1 text-sm font-bold text-slate-500"><X className="h-4 w-4" />Hủy sửa</button>}</div>
        <form onSubmit={saveAd} className="space-y-3">
          <input required maxLength={255} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Tên sản phẩm / quảng cáo" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-500" />
          <textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Mô tả ngắn" rows={2} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-500" />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50 px-3 py-3 text-sm font-bold text-sky-800">
            <ImagePlus className="h-5 w-5" />Tải ảnh quảng cáo
            <input type="file" accept="image/*" className="hidden" onChange={async event => { const file = event.target.files?.[0]; if (file) { try { const imageUrl = await compressAdImage(file); setDraft(current => ({ ...current, image_url: imageUrl })); } catch (error) { setMessage(error instanceof Error ? error.message : 'Không đọc được ảnh.'); } } }} />
          </label>
          {draft.image_url && <img src={draft.image_url} alt="Xem trước" className="max-h-40 w-full rounded-xl object-cover" />}
          <input value={draft.image_url.startsWith('data:') ? '' : draft.image_url} onChange={event => setDraft({ ...draft, image_url: event.target.value })} placeholder="Hoặc dán URL ảnh HTTPS" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-500" />
          <input required type="url" value={draft.target_url} onChange={event => setDraft({ ...draft, target_url: event.target.value })} placeholder="Đường dẫn nút Tìm hiểu thêm (https://…)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-500" />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={draft.is_active} onChange={event => setDraft({ ...draft, is_active: event.target.checked })} />Đang hiển thị</label>
            <input type="number" value={draft.priority} onChange={event => setDraft({ ...draft, priority: Number(event.target.value) })} placeholder="Ưu tiên" className="min-w-0 rounded-xl border border-slate-200 px-3 py-2" />
          </div>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-3 font-extrabold text-white shadow-md disabled:opacity-60"><Save className="h-4 w-4" />{editingId ? 'Cập nhật quảng cáo' : 'Thêm quảng cáo'}</button>
        </form>
        <div className="mt-4 space-y-2">
          {ads.map(ad => <div key={ad.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
            <img src={ad.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{ad.title}</p><p className="truncate text-xs text-slate-500">{ad.target_url}</p><span className="text-[10px] font-bold text-sky-700">{ad.is_active ? 'Đang chạy' : 'Đã tắt'} · Ưu tiên {ad.priority}</span></div>
            <button onClick={() => editAd(ad)} title="Sửa" className="rounded-lg bg-sky-50 p-2 text-sky-700"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => deleteAd(ad)} title="Xóa" className="rounded-lg bg-rose-50 p-2 text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>)}
          {ads.length === 0 && <p className="py-3 text-center text-sm text-slate-500">Chưa có quảng cáo nào.</p>}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-extrabold">Tài khoản và quyền hạn</h2>
        <label className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm bằng email" className="min-w-0 flex-1 outline-none" /></label>
        <div className="space-y-2">
          {users.map(user => <div key={user.id} className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 truncate text-sm font-bold">{user.email}</p>
            <div className="flex gap-2">
              <button onClick={() => updateUser(user, { is_premium: !user.is_premium })} className={`flex-1 rounded-lg px-2 py-2 text-xs font-extrabold ${user.is_premium ? 'bg-amber-100 text-amber-800' : 'bg-white text-slate-600 border border-slate-200'}`}>{user.is_premium ? 'Premium đang bật' : 'Bật Premium'}</button>
              <button onClick={() => updateUser(user, { is_admin: !user.is_admin })} className={`flex-1 rounded-lg px-2 py-2 text-xs font-extrabold ${user.is_admin ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-slate-600 border border-slate-200'}`}>{user.is_admin ? 'Quyền admin' : 'Cấp quyền admin'}</button>
            </div>
          </div>)}
          {users.length === 0 && <p className="py-3 text-center text-sm text-slate-500">Không tìm thấy tài khoản.</p>}
        </div>
      </section>
    </div>
  );
}
