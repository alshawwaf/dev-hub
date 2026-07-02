import React, { useEffect, useState } from 'react';
import { Braces, ExternalLink, Lock, ChevronRight, AlertTriangle } from 'lucide-react';
import api from '../services/api';

// Minimal shapes we read from the OpenAPI spec (rendered defensively).
interface OpenApiParam { name: string; in: string; required?: boolean; schema?: { type?: string }; }
interface OpenApiOp { summary?: string; description?: string; tags?: string[]; parameters?: OpenApiParam[]; requestBody?: unknown; responses?: Record<string, { description?: string }>; }
interface OpenApiSpec { info?: { title?: string; version?: string }; paths?: Record<string, Record<string, OpenApiOp>>; }

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const METHOD_COLOR: Record<string, string> = { get: '#22c55e', post: '#3b82f6', put: '#f59e0b', patch: '#a855f7', delete: '#ef4444' };

const reqBodyLabel = (rb: unknown): string => {
  try {
    const schema = (rb as { content?: Record<string, { schema?: { $ref?: string } }> }).content?.['application/json']?.schema;
    return schema?.$ref ? (schema.$ref.split('/').pop() as string) : 'JSON body';
  } catch { return 'JSON body'; }
};

const ApiReference: React.FC = () => {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('openapi.json')
      .then(r => { if (!cancelled) setSpec(r.data); })
      .catch(() => { if (!cancelled) setError('Could not load the API spec.'); });
    return () => { cancelled = true; };
  }, []);

  // Group operations by their first tag.
  const groups: Record<string, { method: string; path: string; op: OpenApiOp }[]> = {};
  for (const [path, item] of Object.entries(spec?.paths ?? {})) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? 'general';
      (groups[tag] ||= []).push({ method, path, op });
    }
  }
  const tags = Object.keys(groups).sort();

  return (
    <div className="os-guide os-api">
      <div className="os-guide-hero">
        <span className="os-guide-eyebrow"><Braces size={14} /> API Reference</span>
        <h1>{(spec?.info?.title || 'DevHub').replace(/ ?API$/i, '')} <span className="text-gradient">API</span></h1>
        <p>The REST API behind the hub — everything the desktop does runs through these endpoints{spec?.info?.version ? ` (v${spec.info.version})` : ''}.</p>
        <div className="os-guide-resources" style={{ justifyContent: 'center', marginTop: 16 }}>
          <a href="/api/docs" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Interactive Swagger (try it)</a>
          <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> OpenAPI JSON</a>
        </div>
      </div>

      <div className="os-callout info os-api-auth">
        <Lock size={17} />
        <div>Auth is <strong>JWT (Bearer)</strong>. Get a token from <code>POST /api/auth/login</code>, then send <code>Authorization: Bearer &lt;token&gt;</code>. Reads like the app catalog are open; writes need a token, and catalog changes need an admin.</div>
      </div>

      {error && (
        <div className="os-callout warn os-api-auth">
          <AlertTriangle size={17} />
          <div>{error} You can still use the <a className="inline" href="/api/docs" target="_blank" rel="noopener noreferrer">interactive Swagger</a>.</div>
        </div>
      )}
      {!spec && !error && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading the API spec…</p>}

      {tags.map(tag => (
        <section key={tag} className="os-api-group">
          <h2 className="os-api-tag">{tag}</h2>
          {groups[tag].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method)).map(({ method, path, op }, i) => (
            <details key={tag + i} className="os-api-ep">
              <summary>
                <span className="os-api-method" style={{ background: METHOD_COLOR[method] + '22', color: METHOD_COLOR[method], borderColor: METHOD_COLOR[method] + '66' }}>{method.toUpperCase()}</span>
                <code className="os-api-path">/api{path}</code>
                <span className="os-api-sum">{op.summary || ''}</span>
                <ChevronRight size={15} className="os-api-caret" />
              </summary>
              <div className="os-api-detail">
                {op.description && <p>{op.description}</p>}
                {op.parameters?.length ? (
                  <>
                    <h4>Parameters</h4>
                    <ul className="os-api-list">
                      {op.parameters.map((p, j) => (
                        <li key={j}>
                          <code>{p.name}</code>
                          <span className="os-api-tagmini">{p.in}</span>
                          {p.schema?.type && <span className="os-api-tagmini t">{p.schema.type}</span>}
                          {p.required && <span className="os-api-tagmini r">required</span>}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {op.requestBody ? <p><strong>Request body:</strong> <code>{reqBodyLabel(op.requestBody)}</code></p> : null}
                {op.responses && (
                  <>
                    <h4>Responses</h4>
                    <ul className="os-api-list">
                      {Object.entries(op.responses).map(([code, r]) => (
                        <li key={code}><span className={`os-api-status s${code[0]}`}>{code}</span> {r?.description || ''}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
};

export default ApiReference;
