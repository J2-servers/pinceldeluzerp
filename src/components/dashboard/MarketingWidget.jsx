import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { erp } from '@/api/erpClient';
import { Loader2, Copy, Check, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
'Crie uma legenda para Instagram sobre presente personalizado a laser com 5 hashtags',
'Crie um hook de 3 segundos para TikTok mostrando o laser em ação',
'Escreva uma mensagem de WhatsApp para oferta de placa personalizada'];


export default function MarketingWidget({ delay = 0 }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [activePrompt, setActivePrompt] = useState(null);

  const generate = async (prompt, idx) => {
    setActivePrompt(idx);
    setLoading(true);
    setResult('');
    try {
      const res = await erp.integrations.Core.InvokeLLM({
        prompt: `Você é especialista em marketing digital da Pincel de Luz (pinceldeluz.store), empresa de corte e gravação a laser com 4.9★ e 12.500+ clientes. Responda em português, de forma criativa, pronta para publicar, com emojis. Seja conciso e direto. ${prompt}`
      });
      setResult(res);
    } catch (e) {
      setResult('❌ Erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--r-xl)' }}>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--red-muted)', boxShadow: 'var(--shadow-flat)', borderRadius: 'var(--r-md)' }}>
            <Megaphone className="lucide lucide-megaphone w-4 h-4" style={{ color: 'var(--red)' }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>IA de Marketing</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Gere conteúdo para redes sociais</p>
          </div>
        </div>
        <Link to={createPageUrl('MarketingIA')}>
          <Button size="sm" variant="ghost" className="text-xs" style={{ color: 'var(--red)' }}>
            Ver tudo →
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_PROMPTS.map((p, i) =>
        <button
          key={i}
          onClick={() => generate(p, i)}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={activePrompt === i ?
          { background: 'var(--red-muted)', color: 'var(--red)', boxShadow: 'var(--shadow-pressed)' } :
          { background: 'var(--bg)', color: 'var(--text-tertiary)', boxShadow: 'var(--shadow-flat)' }
          }>

            {i === 0 ? '📸 Instagram' : i === 1 ? '🎬 TikTok Hook' : '📱 WhatsApp'}
          </button>
        )}
      </div>

      {loading &&
      <div className="flex items-center gap-2 text-sm py-3" style={{ color: 'var(--text-tertiary)' }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--red)' }} />
          Gerando conteúdo...
        </div>
      }

      {result && !loading &&
      <div className="relative rounded-xl p-3" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
          <button onClick={copy} className="absolute top-2 right-2 p-1">
            {copied ? <Check className="w-3 h-3" style={{ color: 'var(--green)' }} /> : <Copy className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />}
          </button>
          <div className="text-sm pr-6" style={{ color: 'var(--text-secondary)' }}>
            <ReactMarkdown className="prose prose-sm max-w-none">
              {result}
            </ReactMarkdown>
          </div>
        </div>
      }

      {!result && !loading &&
      <p className="text-xs text-center py-2" style={{ color: 'var(--text-tertiary)' }}>Clique em uma opção para gerar conteúdo</p>
      }
    </motion.div>);

}