import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// 'online' (padrao do react-query) pausa a query em vez de falhar
			// quando navigator.onLine reporta offline. Irrelevante aqui: a API
			// e local (127.0.0.1), a conectividade geral do navegador nao diz
			// nada sobre ela estar no ar. Sem isso, uma falha real fica presa
			// em fetchStatus:'paused' para sempre (isLoading e isError ficam
			// os dois false, e a tela nunca sai do estado "carregando").
			networkMode: 'always',
		},
		mutations: {
			networkMode: 'always',
		},
	},
});