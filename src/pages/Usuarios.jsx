import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { useSession, Can } from '@/lib/auth/useAuth';
import { ROLES, ROLE_KEYS, MODULES, resolvePermissions } from '@/lib/auth/permissions';
import {
  listUsers, createUser, updateUser, setUserActive, deleteUser, changePassword,
} from '@/lib/auth/authService';
import { toast } from '@/components/ui/app-toast';
import {
  UserPlus, Shield, Mail, Trash2, Power, KeyRound, Loader2, X, Check, Users as UsersIcon, Pencil,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Usuarios() {
  const { user: me, can, refresh } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode:'create'|'edit', user }
  const [pwModal, setPwModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch (e) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canManage = can('usuarios:create') || can('usuarios:edit');

  const toggleActive = async (u) => {
    try {
      await setUserActive(u.id, u.active === false);
      toast.success(u.active === false ? 'Usuário ativado' : 'Usuário desativado');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Excluir o usuário ${u.name}? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteUser(u.id);
      toast.success('Usuário excluído');
      load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="page-container space-y-6">
      <Header title="Usuários & Permissões" subtitle="Controle quem acessa o sistema e o que cada perfil pode fazer">
        <button onClick={() => setPwModal(true)}
          className="px-3.5 py-2 rounded-[14px] text-[13px] font-semibold flex items-center gap-2"
          style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)', color: 'var(--text-primary)' }}>
          <KeyRound className="w-4 h-4" /> Minha senha
        </button>
        <Can perm="usuarios:create">
          <button onClick={() => setModal({ mode: 'create', user: { role: 'leitura', active: true } })}
            className="px-3.5 py-2 rounded-[14px] text-[13px] font-bold flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: '#fff', boxShadow: '4px 4px 10px rgba(0,0,0,0.18), -2px -2px 6px var(--nm-light)' }}>
            <UserPlus className="w-4 h-4" /> Novo usuário
          </button>
        </Can>
      </Header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={UsersIcon} label="Total" value={users.length} color="--accent" />
        <Kpi icon={Check} label="Ativos" value={users.filter(u => u.active !== false).length} color="--green" />
        <Kpi icon={Shield} label="Administradores" value={users.filter(u => u.role === 'admin').length} color="--red" />
        <Kpi icon={Power} label="Desativados" value={users.filter(u => u.active === false).length} color="--text-tertiary" />
      </div>

      {/* Lista de usuários */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>Usuários cadastrados</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>Nenhum usuário ainda.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {['Usuário', 'Perfil', 'Status', 'Último acesso', ''].map((h, i) => (
                    <th key={i} className="text-left text-[11px] font-bold uppercase tracking-wide px-5 py-3"
                      style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const role = ROLES[u.role];
                  return (
                    <tr key={u.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', opacity: u.active === false ? 0.55 : 1 }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[12px] flex items-center justify-center text-[12px] font-bold shrink-0"
                            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)', color: 'var(--accent)' }}>
                            {(u.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                              {u.name} {me?.id === u.id && <span style={{ color: 'var(--text-tertiary)' }}>(você)</span>}
                            </p>
                            <p className="text-[11px] truncate flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                              <Mail className="w-3 h-3" />{u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)', color: role?.color || 'var(--text-secondary)' }}>
                          <Shield className="w-3 h-3" />{role?.label || u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] font-bold" style={{ color: u.active === false ? 'var(--text-tertiary)' : 'var(--green)' }}>
                          {u.active === false ? 'Desativado' : 'Ativo'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {u.last_login ? new Date(u.last_login).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {canManage && (
                          <div className="flex items-center gap-1.5 justify-end">
                            <Can perm="usuarios:edit">
                              <IconBtn title="Editar" icon={Pencil} onClick={() => setModal({ mode: 'edit', user: u })} />
                              <IconBtn title={u.active === false ? 'Ativar' : 'Desativar'} icon={Power} onClick={() => toggleActive(u)} />
                            </Can>
                            <Can perm="usuarios:delete">
                              <IconBtn title="Excluir" icon={Trash2} danger onClick={() => remove(u)} />
                            </Can>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Matriz de perfis */}
      <RoleMatrix />

      {modal && (
        <UserModal
          mode={modal.mode}
          initial={modal.user}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); refresh(); }}
        />
      )}
      {pwModal && <ChangePasswordModal onClose={() => setPwModal(false)} />}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }) {
  return (
    <div className="kpi-card flex items-center gap-3">
      <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
        style={{ background: `var(${color}-muted, var(--accent-muted))`, boxShadow: 'var(--shadow-flat)' }}>
        <Icon className="w-5 h-5" style={{ color: `var(${color})` }} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title, danger }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all"
      style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-flat)'; }}>
      <Icon className="w-3.5 h-3.5" style={{ color: danger ? 'var(--red)' : 'var(--text-secondary)' }} />
    </button>
  );
}

// ── Matriz de perfis × permissões (referência visual) ──
function RoleMatrix() {
  return (
    <div className="card p-5">
      <h3 className="font-bold text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>Perfis de acesso</h3>
      <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
        O que cada perfil pode fazer. Atribua o perfil ao criar ou editar um usuário.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ROLE_KEYS.map((key) => {
          const role = ROLES[key];
          const set = resolvePermissions({ role: key });
          const mods = Object.entries(MODULES).filter(([m]) => set.has('*') || set.has(`${m}:read`) || [...set].some(p => p.startsWith(`${m}:`)));
          return (
            <div key={key} className="card-pressed p-4" style={{ borderRadius: 'var(--r-lg)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: role.color }} />
                <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{role.label}</span>
              </div>
              <p className="text-[12px] mb-3" style={{ color: 'var(--text-secondary)' }}>{role.description}</p>
              <div className="flex flex-wrap gap-1">
                {set.has('*') ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--red-muted)', color: 'var(--red)' }}>ACESSO TOTAL</span>
                ) : mods.map(([m, cfg]) => (
                  <span key={m} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)', color: 'var(--text-secondary)' }}>{cfg.label}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Modal criar/editar ──
function UserModal({ mode, initial, onClose, onSaved }) {
  const [form, setForm] = useState({ name: initial.name || '', email: initial.email || '', password: '', role: initial.role || 'leitura', active: initial.active !== false });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      if (mode === 'create') {
        await createUser(form);
        toast.success('Usuário criado. A senha inicial deve ser trocada no primeiro acesso.');
      } else {
        const patch = { name: form.name, email: form.email, role: form.role, active: form.active };
        if (form.password) patch.password = form.password;
        await updateUser(initial.id, patch);
        toast.success('Usuário atualizado');
      }
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>{mode === 'create' ? 'Novo usuário' : 'Editar usuário'}</h3>
        <IconBtn title="Fechar" icon={X} onClick={onClose} />
      </div>
      <div className="space-y-3.5">
        <Input label="Nome" value={form.name} onChange={set('name')} placeholder="Nome completo" />
        <Input label="E-mail" type="email" value={form.email} onChange={set('email')} placeholder="voce@empresa.com" />
        <Input label={mode === 'create' ? 'Senha inicial' : 'Nova senha (deixe vazio para manter)'} type="password" value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Perfil de acesso</label>
          <select value={form.role} onChange={set('role')}
            className="w-full px-3 py-2.5 text-sm rounded-[14px] outline-none"
            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', border: '1px solid var(--border-inner)', color: 'var(--text-primary)' }}>
            {ROLE_KEYS.map(k => <option key={k} value={k}>{ROLES[k].label}</option>)}
          </select>
          <p className="text-[12px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{ROLES[form.role]?.description}</p>
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} className="px-4 py-2.5 rounded-[14px] text-sm font-semibold" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)', color: 'var(--text-secondary)' }}>Cancelar</button>
        <button onClick={save} disabled={busy} className="px-5 py-2.5 rounded-[14px] text-sm font-bold flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: '#fff', boxShadow: '4px 4px 10px rgba(0,0,0,0.18), -2px -2px 6px var(--nm-light)', opacity: busy ? 0.6 : 1 }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
        </button>
      </div>
    </Overlay>
  );
}

function ChangePasswordModal({ onClose }) {
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await changePassword(cur, nw); toast.success('Senha alterada com sucesso'); onClose(); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>Alterar minha senha</h3>
        <IconBtn title="Fechar" icon={X} onClick={onClose} />
      </div>
      <div className="space-y-3.5">
        <Input label="Senha atual" type="password" value={cur} onChange={e => setCur(e.target.value)} />
        <Input label="Nova senha" type="password" value={nw} onChange={e => setNw(e.target.value)} placeholder="Mínimo 6 caracteres" />
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} className="px-4 py-2.5 rounded-[14px] text-sm font-semibold" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)', color: 'var(--text-secondary)' }}>Cancelar</button>
        <button onClick={save} disabled={busy} className="px-5 py-2.5 rounded-[14px] text-sm font-bold flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: '#fff', boxShadow: '4px 4px 10px rgba(0,0,0,0.18), -2px -2px 6px var(--nm-light)', opacity: busy ? 0.6 : 1 }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Alterar
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overlay-blur" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()} className="card w-full max-w-md p-6" style={{ borderRadius: 'var(--r-2xl)' }}>
        {children}
      </motion.div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm rounded-[14px] outline-none"
        style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', border: '1px solid var(--border-inner)', color: 'var(--text-primary)' }} />
    </div>
  );
}
