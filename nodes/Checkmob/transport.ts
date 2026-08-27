import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function toNumArray(raw: string): number[] {
	return raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
}

export function toList(raw: unknown): IDataObject[] {
	if (Array.isArray(raw)) return raw as IDataObject[];
	if (Array.isArray((raw as IDataObject)?.dados)) return (raw as IDataObject).dados as IDataObject[];
	return raw != null ? [raw as IDataObject] : [];
}

export function parseJson(
	value: string,
	node: ReturnType<IExecuteFunctions['getNode']>,
	fieldName: string,
): IDataObject[] {
	try {
		return JSON.parse(value) as IDataObject[];
	} catch {
		throw new NodeOperationError(node, `Campo "${fieldName}" contém JSON inválido.`);
	}
}

export async function apiRequest(
	this: IExecuteFunctions,
	options: { method: string; url: string; headers: IDataObject; body?: IDataObject; qs?: IDataObject },
): Promise<{ statusCode: number; body: unknown }> {
	const res = await this.helpers.httpRequestWithAuthentication.call(this, 'checkmobApi', {
		method: options.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
		url: options.url,
		headers: options.headers,
		body: options.body,
		qs: options.qs,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	});

	let body = res.body;
	if (typeof body === 'string' && body.length) {
		try { body = JSON.parse(body); } catch { /* keep as string */ }
	}

	return { statusCode: res.statusCode as number, body };
}

interface ErroCampo {
	campo?: string | null;
	codigo?: string | null;
	mensagem?: string | null;
}

interface Problema {
	tipo?: string | null;
	titulo?: string | null;
	status?: number;
	codigo?: string | null;
	detalhe?: string | null;
	instancia?: string | null;
	erros?: ErroCampo[] | null;
}

export function assertApiSuccess(
	statusCode: number,
	body: unknown,
	node: ReturnType<IExecuteFunctions['getNode']>,
): void {
	if (statusCode >= 400) {
		const problema = body as Problema;
		const errMsg = extractErrorMessage(problema) ?? 'Erro retornado pela API.';
		const description = problema?.erros ? JSON.stringify(problema.erros) : undefined;
		throw new NodeOperationError(
			node,
			`HTTP ${statusCode} [${problema?.codigo ?? 'ERRO'}] — ${errMsg}`,
			{ description },
		);
	}
}

function extractErrorMessage(problema: Problema | undefined): string | undefined {
	if (!problema) return undefined;

	if (Array.isArray(problema.erros) && problema.erros.length > 0) {
		return problema.erros
			.map((e) => [e.campo, e.mensagem ?? e.codigo].filter(Boolean).join(': '))
			.join(' | ');
	}
	if (typeof problema.detalhe === 'string' && problema.detalhe) return problema.detalhe;
	if (typeof problema.titulo === 'string' && problema.titulo) return problema.titulo;
	return undefined;
}
