import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import ModuleHero from '@/components/system/ModuleHero';
import MetricCard from '@/components/system/MetricCard';
import SmartPanel from '@/components/system/SmartPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Edit, MessageCircle, Plus, Search, Star, Trash2, Truck, Wallet, AlertTriangle, PackageCheck } from 'lucide-react';
import moment from 'moment';

const categories = ['acrilico','mdf','metais','eletronicos','quimicos','ferramentas','embalagens','tecidos','tintas','gases','manutencao','outros'];
const defaultForm = { company_name: '', cnpj: '', contact_name: '', phone: '', email: '', address: '', category: 'outros', rating: 3, notes: '' };
const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function Fornecedores() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: 'all', rating: 'all' });
  const [formData, setFormData] = useState(defaultForm);

  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => erp.entities.Supplier.list('company_name') });
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ['purchaseOrders'], queryFn: () => erp.entities.PurchaseOrder.list('-created_date') });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => erp.entities.Product.list('name') });

  const saveSupplier = useMutation({ mutationFn: (data) => selectedSupplier ? erp.entities.Supplier.update(selectedSupplier.id, data) : erp.entities.Supplier.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setShowForm(false); setSelectedSupplier(null); setFormData(defaultForm); } });
  const deleteSupplier = useMutation({ mutationFn: (id) => erp.entities.Supplier.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }) });

  const enriched = useMemo(() => suppliers.map((supplier) => {
    const orders = purchaseOrders.filter((order) => order.supplier_id === supplier.id || order.supplier_name === supplier.company_name);
    const totalPurchased = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const lastPurchase = orders[0]?.created_date;
    const suppliedProducts = products.filter((product) => product.supplier_name === supplier.company_name).length;
    const risk = Number(supplier.rating || 0) <= 2 ? 'alto' : !lastPurchase ? 'sem_compras' : moment().diff(moment(lastPurchase), 'days') > 180 ? 'inativo' : 'normal';
    return { ...supplier, ordersCount: orders.length, totalPurchased, lastPurchase, suppliedProducts, risk };
  }), [suppliers, purchaseOrders, products]);

  const filtered = enriched.filter((supplier) => {
    const hay = normalize([supplier.company_name, supplier.cnpj, supplier.contact_name, supplier.email, supplier.phone].join(' '));
    return (!filters.search || hay.includes(normalize(filters.search))) && (filters.category === 'all' || supplier.category === filters.category) && (filters.rating === 'all' || Number(supplier.rating || 0) >= Number(filters.rating));
  });

  const stats = { total: suppliers.length, avgRating: suppliers.length ? suppliers.reduce((sum, s) => sum + Number(s.rating || 0), 0) / suppliers.length : 0, categories: new Set(suppliers.map((s) => s.category).filter(Boolean)).size, purchased: purchaseOrders.reduce((sum, order) => sum + Number(order.total || 0), 0), risk: enriched.filter((s) => s.risk === 'alto').length, products: products.filter((p) => p.supplier_name).length };
  const topSuppliers = [...enriched].sort((a, b) => b.totalPurchased - a.totalPurchased).slice(0, 6);

  const openForm = (supplier = null) => { setSelectedSupplier(supplier); setFormData(supplier ? { ...defaultForm, ...supplier } : defaultForm); setShowForm(true); };
  const exportCsv = () => { const rows = [['Fornecedor', 'CNPJ', 'Contato', 'Categoria', 'Rating', 'Compras'], ...filtered.map((s) => [s.company_name, s.cnpj, s.contact_name, s.category, s.rating, s.totalPurchased])]; const csv = rows.map((r) => r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(';')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })); link.download = 'fornecedores.csv'; link.click(); };
  const renderStars = (rating) => Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Number(rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />);

  return (
    <div className="space-y-6 page-neu">
      <Header title="Fornecedores" subtitle="Gestão de compras, risco, rating e carteira de suprimentos" />
      <ModuleHero eyebrow="Suprimentos" icon={Truck} tone="#16a34a" title="Fornecedores com rating, histórico de compras e risco operacional." subtitle="Controle cadastro, categorias, contatos, fornecedores críticos, produtos fornecidos e ranking de compras." actions={<><Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4" /> Exportar</Button><Button onClick={() => openForm()}><Plus className="w-4 h-4" /> Novo fornecedor</Button></>} />
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3"><MetricCard icon={Truck} label="Fornecedores" value={stats.total} color="#16a34a" /><MetricCard icon={Star} label="Rating médio" value={stats.avgRating.toFixed(1)} color="#f59e0b" /><MetricCard icon={PackageCheck} label="Categorias" value={stats.categories} color="#7c3aed" /><MetricCard icon={Wallet} label="Compras" value={money(stats.purchased)} color="#2563eb" /><MetricCard icon={AlertTriangle} label="Risco alto" value={stats.risk} color="#dc2626" /><MetricCard icon={PackageCheck} label="Itens vinculados" value={stats.products} color="#64748b" /></div>
      <SmartPanel title="Filtros de suprimentos" icon={Search} tone="#16a34a"><div className="grid grid-cols-1 md:grid-cols-4 gap-2"><Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Buscar fornecedor..." /><select className="clay-select" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="all">Todas categorias</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select><select className="clay-select" value={filters.rating} onChange={(e) => setFilters({ ...filters, rating: e.target.value })}><option value="all">Qualquer rating</option><option value="4">4+ estrelas</option><option value="3">3+ estrelas</option><option value="2">2+ estrelas</option></select><Button variant="outline" onClick={() => setFilters({ search: '', category: 'all', rating: 'all' })}>Limpar</Button></div></SmartPanel>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><SmartPanel title="Lista de fornecedores" icon={Truck} tone="#16a34a" className="xl:col-span-2"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Fornecedor','Contato','Categoria','Rating','Compras','Risco','Ações'].map((h) => <th key={h} className="text-left p-3 text-xs uppercase tracking-widest text-slate-500 font-black">{h}</th>)}</tr></thead><tbody>{filtered.map((s) => <tr key={s.id} className="border-t border-slate-100 hover:bg-green-50/40"><td className="p-3"><p className="font-black text-slate-800">{s.company_name}</p><p className="text-xs text-slate-500">{s.cnpj || 'sem CNPJ'}</p></td><td className="p-3"><p className="text-slate-700">{s.contact_name || '—'}</p><p className="text-xs text-slate-500">{s.phone || s.email || '—'}</p></td><td className="p-3"><span className="rounded-full px-2 py-1 text-xs font-bold bg-green-50 text-green-700">{s.category}</span></td><td className="p-3"><div className="flex gap-0.5">{renderStars(s.rating)}</div></td><td className="p-3 font-black text-blue-600">{money(s.totalPurchased)}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${s.risk === 'alto' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>{s.risk}</span></td><td className="p-3"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => s.phone && window.open(`https://wa.me/55${s.phone.replace(/\D/g, '')}`, '_blank')}><MessageCircle className="w-4 h-4 text-green-600" /></Button><Button size="sm" variant="ghost" onClick={() => openForm(s)}><Edit className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => deleteSupplier.mutate(s.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button></div></td></tr>)}</tbody></table></div></SmartPanel><SmartPanel title="Top fornecedores" icon={Star} tone="#f59e0b">{topSuppliers.map((s, i) => <div key={s.id} className="flex justify-between items-center py-2 border-b border-slate-100"><span className="font-bold text-slate-700 truncate">{i + 1}. {s.company_name}</span><span className="font-black text-blue-600">{money(s.totalPurchased)}</span></div>)}</SmartPanel></div>
      <Dialog open={showForm} onOpenChange={setShowForm}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{selectedSupplier ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle></DialogHeader><form onSubmit={(e) => { e.preventDefault(); saveSupplier.mutate(formData); }} className="space-y-4"><div><Label>Razão social</Label><Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} required /></div><div className="grid grid-cols-2 gap-3"><div><Label>CNPJ</Label><Input value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} /></div><div><Label>Contato</Label><Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} /></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Telefone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div><div><Label>Email</Label><Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Categoria</Label><Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div><div><Label>Rating</Label><Input type="number" min="1" max="5" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value || 3) })} /></div></div><div><Label>Endereço</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}