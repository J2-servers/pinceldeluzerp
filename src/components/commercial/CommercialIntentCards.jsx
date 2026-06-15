import React from 'react';
import { Brush, Package, Ruler, Scissors, Truck, Wrench } from 'lucide-react';

const intents = [
  { id: 'medida', title: 'Material por medida', icon: Ruler },
  { id: 'laser', title: 'Corte/gravacao', icon: Scissors },
  { id: 'produto', title: 'Produto pronto', icon: Package },
  { id: 'arte', title: 'Arte', icon: Brush },
  { id: 'servico', title: 'Servico extra', icon: Wrench },
  { id: 'frete', title: 'Entrega', icon: Truck },
];

export default function CommercialIntentCards({ selectedIntent, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      {intents.map((intent) => {
        const Icon = intent.icon;
        const selected = selectedIntent === intent.id;
        return (
          <button
            key={intent.id}
            type="button"
            onClick={() => onSelect(intent.id)}
            className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm font-black transition ${selected ? 'border-blue-300 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 leading-tight">{intent.title}</span>
          </button>
        );
      })}
    </div>
  );
}
